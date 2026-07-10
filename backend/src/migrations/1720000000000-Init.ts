import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1720000000000 implements MigrationInterface {
  name = 'Init1720000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ── enums ──
    await q.query(`CREATE TYPE "users_role_enum" AS ENUM ('STUDENT','STAFF','LOST_FOUND_OFFICER','ADMIN')`);
    await q.query(`CREATE TYPE "assets_category_enum" AS ENUM ('LAB_EQUIPMENT','AV_GEAR','STUDY_ROOM','TEXTBOOK','BICYCLE','SPORTS','OTHER')`);
    await q.query(`CREATE TYPE "assets_kind_enum" AS ENUM ('PHYSICAL_ITEM','ROOM','LOANABLE_GOOD')`);
    await q.query(`CREATE TYPE "asset_condition_enum" AS ENUM ('EXCELLENT','GOOD','FAIR','DAMAGED')`);
    await q.query(`CREATE TYPE "assets_availability_enum" AS ENUM ('AVAILABLE','BOOKED','MAINTENANCE','RETIRED')`);
    await q.query(`CREATE TYPE "bookings_status_enum" AS ENUM ('PENDING','APPROVED','DECLINED','CANCELLED','ACTIVE','RETURNED')`);
    await q.query(`CREATE TYPE "recommended_action_enum" AS ENUM ('READY_FOR_REUSE','NEEDS_REPAIR','RETIRE')`);
    await q.query(`CREATE TYPE "loan_status_enum" AS ENUM ('REQUESTED','ACCEPTED','DECLINED','ACTIVE','RETURNED','OVERDUE','DISPUTED')`);
    await q.query(`CREATE TYPE "lost_status_enum" AS ENUM ('OPEN','MATCHED','CLAIMED','CLOSED')`);
    await q.query(`CREATE TYPE "found_status_enum" AS ENUM ('LOGGED','MATCHED','RETURNED','DONATION_FLAGGED')`);
    await q.query(`CREATE TYPE "study_style_enum" AS ENUM ('SOLO','GROUP','DISCUSSION')`);
    await q.query(`CREATE TYPE "match_status_enum" AS ENUM ('PROPOSED','ACCEPTED_BY_ONE','CONFIRMED','DECLINED')`);

    // ── departments ──
    await q.query(`CREATE TABLE "departments" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "name" varchar NOT NULL UNIQUE,
      "faculty" varchar NOT NULL,
      "building" varchar
    )`);

    // ── users ──
    await q.query(`CREATE TABLE "users" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "email" varchar NOT NULL UNIQUE,
      "passwordHash" varchar NOT NULL,
      "fullName" varchar NOT NULL,
      "role" "users_role_enum" NOT NULL DEFAULT 'STUDENT',
      "departmentId" uuid REFERENCES "departments"("id") ON DELETE SET NULL,
      "studentNumber" varchar,
      "reputationScore" double precision NOT NULL DEFAULT 5.0,
      "ratingsCount" integer NOT NULL DEFAULT 0,
      "lendingEligible" boolean NOT NULL DEFAULT true,
      "refreshTokenHash" varchar,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);

    // ── assets ──
    await q.query(`CREATE TABLE "assets" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "name" varchar NOT NULL,
      "description" text NOT NULL DEFAULT '',
      "category" "assets_category_enum" NOT NULL,
      "kind" "assets_kind_enum" NOT NULL DEFAULT 'PHYSICAL_ITEM',
      "condition" "asset_condition_enum" NOT NULL DEFAULT 'GOOD',
      "availability" "assets_availability_enum" NOT NULL DEFAULT 'AVAILABLE',
      "departmentId" uuid NOT NULL REFERENCES "departments"("id"),
      "tags" text NOT NULL DEFAULT '',
      "bookingLeadTimeHours" integer NOT NULL DEFAULT 0,
      "value" numeric(10,2) NOT NULL DEFAULT 0,
      "photoUrl" varchar,
      "attributes" jsonb NOT NULL DEFAULT '{}',
      "searchVector" tsvector,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX "idx_assets_name" ON "assets" ("name")`);
    await q.query(`CREATE INDEX "idx_assets_search" ON "assets" USING GIN ("searchVector")`);
    // full-text search vector maintained at the database level (spec 3.2)
    await q.query(`
      CREATE OR REPLACE FUNCTION assets_search_trigger() RETURNS trigger AS $$
      BEGIN
        NEW."searchVector" :=
          setweight(to_tsvector('english', coalesce(NEW."name", '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW."description", '')), 'B') ||
          setweight(to_tsvector('english', replace(coalesce(NEW."tags", ''), ',', ' ')), 'A');
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql`);
    await q.query(`CREATE TRIGGER trg_assets_search BEFORE INSERT OR UPDATE ON "assets"
      FOR EACH ROW EXECUTE FUNCTION assets_search_trigger()`);

    // ── bookings ──
    await q.query(`CREATE TABLE "bookings" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "assetId" uuid NOT NULL REFERENCES "assets"("id") ON DELETE CASCADE,
      "requesterId" uuid NOT NULL REFERENCES "users"("id"),
      "startsAt" timestamptz NOT NULL,
      "endsAt" timestamptz NOT NULL,
      "status" "bookings_status_enum" NOT NULL DEFAULT 'PENDING',
      "purpose" varchar,
      "decidedById" uuid,
      "decidedAt" timestamptz,
      "conditionAtBorrow" "asset_condition_enum",
      "conditionAtReturn" "asset_condition_enum",
      "returnNotes" text,
      "returnPhotoUrl" varchar,
      "recommendedAction" "recommended_action_enum",
      "aiAssessment" jsonb,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "chk_booking_range" CHECK ("endsAt" > "startsAt")
    )`);
    await q.query(`CREATE INDEX "idx_bookings_asset_time" ON "bookings" ("assetId","startsAt","endsAt")`);
    // Second line of defence against double-booking: DB exclusion constraint
    await q.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
    await q.query(`ALTER TABLE "bookings" ADD CONSTRAINT "excl_booking_overlap"
      EXCLUDE USING gist (
        "assetId" WITH =,
        tstzrange("startsAt","endsAt") WITH &&
      ) WHERE ("status" IN ('PENDING','APPROVED','ACTIVE'))`);

    // ── peer lending ──
    await q.query(`CREATE TABLE "lending_listings" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "title" varchar NOT NULL,
      "description" text NOT NULL DEFAULT '',
      "category" varchar NOT NULL,
      "photoUrl" varchar,
      "maxLoanDays" integer NOT NULL DEFAULT 7,
      "active" boolean NOT NULL DEFAULT true,
      "ownerId" uuid NOT NULL REFERENCES "users"("id"),
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE TABLE "loan_requests" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "listingId" uuid NOT NULL REFERENCES "lending_listings"("id") ON DELETE CASCADE,
      "borrowerId" uuid NOT NULL REFERENCES "users"("id"),
      "status" "loan_status_enum" NOT NULL DEFAULT 'REQUESTED',
      "dueAt" timestamptz NOT NULL,
      "returnedAt" timestamptz,
      "escalationLevel" integer NOT NULL DEFAULT 0,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE TABLE "loan_ratings" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "loanId" uuid NOT NULL REFERENCES "loan_requests"("id") ON DELETE CASCADE,
      "raterId" uuid NOT NULL,
      "ratedUserId" uuid NOT NULL,
      "score" integer NOT NULL CHECK ("score" BETWEEN 1 AND 5),
      "comment" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "uq_rating_per_loan" UNIQUE ("loanId","raterId")
    )`);

    // ── lost & found ──
    await q.query(`CREATE TABLE "lost_reports" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "title" varchar NOT NULL,
      "description" text NOT NULL,
      "lastSeenLocation" varchar NOT NULL,
      "photoUrl" varchar,
      "status" "lost_status_enum" NOT NULL DEFAULT 'OPEN',
      "reporterId" uuid NOT NULL REFERENCES "users"("id"),
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE TABLE "found_items" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "title" varchar NOT NULL,
      "description" text NOT NULL,
      "foundLocation" varchar NOT NULL,
      "conditionNotes" text,
      "photoUrl" varchar,
      "status" "found_status_enum" NOT NULL DEFAULT 'LOGGED',
      "matchedLostReportId" uuid,
      "loggedById" uuid NOT NULL REFERENCES "users"("id"),
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);

    // ── study groups ──
    await q.query(`CREATE TABLE "study_profiles" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "userId" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
      "modules" text NOT NULL,
      "availableSlots" text NOT NULL,
      "studyStyle" "study_style_enum" NOT NULL DEFAULT 'GROUP',
      "seekingPartners" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE TABLE "study_matches" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "userAId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "userBId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "compatibilityScore" double precision NOT NULL,
      "summary" text,
      "status" "match_status_enum" NOT NULL DEFAULT 'PROPOSED',
      "acceptedBy" text NOT NULL DEFAULT '',
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);

    // ── notifications ──
    await q.query(`CREATE TABLE "notifications" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "userId" uuid NOT NULL,
      "type" varchar NOT NULL,
      "title" varchar NOT NULL,
      "body" text NOT NULL,
      "read" boolean NOT NULL DEFAULT false,
      "data" jsonb,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX "idx_notifications_user" ON "notifications" ("userId")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const t of [
      'notifications', 'study_matches', 'study_profiles', 'found_items', 'lost_reports',
      'loan_ratings', 'loan_requests', 'lending_listings', 'bookings', 'assets', 'users', 'departments',
    ]) {
      await q.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
    }
    await q.query(`DROP FUNCTION IF EXISTS assets_search_trigger CASCADE`);
    for (const e of [
      'users_role_enum','assets_category_enum','assets_kind_enum','asset_condition_enum',
      'assets_availability_enum','bookings_status_enum','recommended_action_enum','loan_status_enum',
      'lost_status_enum','found_status_enum','study_style_enum','match_status_enum',
    ]) {
      await q.query(`DROP TYPE IF EXISTS "${e}"`);
    }
  }
}
