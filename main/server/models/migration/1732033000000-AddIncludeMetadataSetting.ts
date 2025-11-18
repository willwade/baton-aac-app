import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIncludeMetadataSetting1732033000000
  implements MigrationInterface
{
  name = "AddIncludeMetadataSetting1732033000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add includeMetadata column to settings table with default false
    await queryRunner.query(
      `ALTER TABLE "settings" ADD COLUMN "includeMetadata" boolean NOT NULL DEFAULT 0`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the column if we need to rollback
    await queryRunner.query(
      `ALTER TABLE "settings" DROP COLUMN "includeMetadata"`
    );
  }
}
