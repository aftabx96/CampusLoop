import { MigrationInterface, QueryRunner } from 'typeorm';

/** Community feed: posts, comments and likes (see community.entity.ts). */
export class Community1720000001000 implements MigrationInterface {
  name = 'Community1720000001000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "community_posts" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "content" text NOT NULL,
      "imageUrl" varchar,
      "isAnnouncement" boolean NOT NULL DEFAULT false,
      "pinned" boolean NOT NULL DEFAULT false,
      "hidden" boolean NOT NULL DEFAULT false,
      "authorId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX "idx_posts_author" ON "community_posts" ("authorId")`);

    await q.query(`CREATE TABLE "post_comments" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "postId" uuid NOT NULL REFERENCES "community_posts"("id") ON DELETE CASCADE,
      "authorId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "content" text NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX "idx_comments_post" ON "post_comments" ("postId")`);

    await q.query(`CREATE TABLE "post_likes" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "postId" uuid NOT NULL REFERENCES "community_posts"("id") ON DELETE CASCADE,
      "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE UNIQUE INDEX "idx_post_likes_unique" ON "post_likes" ("postId", "userId")`);
    await q.query(`CREATE INDEX "idx_post_likes_post" ON "post_likes" ("postId")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const t of ['post_likes', 'post_comments', 'community_posts']) {
      await q.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
    }
  }
}
