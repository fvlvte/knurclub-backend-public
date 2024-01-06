import { DBDriver } from "../../DBDriver";
import { Migration } from "../Migration";

export default class AddLastUpdatedTimeStapToUser_1683231006588
  implements Migration
{
  async up(driver: DBDriver): Promise<void> {
    const queryBatch: string[] = [
      `ALTER TABLE "users" ADD COLUMN "last_updated" BIGINT NOT NULL DEFAULT 0`,
      `ALTER TABLE "users" ADD COLUMN "created_at" BIGINT NOT NULL DEFAULT 0`,
    ];

    await driver.queryBatch(queryBatch);
  }
  async down(driver: DBDriver): Promise<void> {
    const queryBatch: string[] = [
      `ALTER TABLE "users" DROP COLUMN "last_updated"`,
      `ALTER TABLE "users" DROP COLUMN "created_at"`,
    ];

    await driver.queryBatch(queryBatch);
  }

  getTimestamp(): number {
    return 1683231006588;
  }

  getName(): string {
    return "AddLastUpdatedTimeStapToUser";
  }

  getDescription(): string {
    return "Add last_updated and created_at columns to users table";
  }
}
