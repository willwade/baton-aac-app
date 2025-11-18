import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMetadata1732032000000 implements MigrationInterface {
  name = "AddMetadata1732032000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add metadata and source columns to sentence table
    await queryRunner.query(
      `ALTER TABLE "sentence" ADD COLUMN "metadata" text`
    );
    await queryRunner.query(
      `ALTER TABLE "sentence" ADD COLUMN "source" varchar`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the columns if we need to rollback
    await queryRunner.query(`ALTER TABLE "sentence" DROP COLUMN "metadata"`);
    await queryRunner.query(`ALTER TABLE "sentence" DROP COLUMN "source"`);
  }
}
