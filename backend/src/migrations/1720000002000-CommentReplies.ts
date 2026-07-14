import { MigrationInterface, QueryRunner } from 'typeorm';

/** Threaded replies: a self-referencing parent on post_comments. */
export class CommentReplies1720000002000 implements MigrationInterface {
  name = 'CommentReplies1720000002000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "post_comments" ADD COLUMN "parentId" uuid REFERENCES "post_comments"("id") ON DELETE CASCADE`,
    );
    await q.query(`CREATE INDEX "idx_comments_parent" ON "post_comments" ("parentId")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "idx_comments_parent"`);
    await q.query(`ALTER TABLE "post_comments" DROP COLUMN IF EXISTS "parentId"`);
  }
}
