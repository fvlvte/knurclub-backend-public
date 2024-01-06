import { DBDriver } from "../../DBDriver";
import { Migration } from "../Migration";

export default class AddUserRatingDataTable_1683404833189 implements Migration {
  async up(driver: DBDriver): Promise<void> {
    const queryBatch: string[] = [
      `CREATE TABLE "user_rating_data" (
        "id" SERIAL PRIMARY KEY NOT NULL,
        "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
        "type" INTEGER NOT NULL,
        "data" JSONB NOT NULL,
        "timestamp" BIGINT NOT NULL
    )`,
    ];

    await driver.queryBatch(queryBatch);
  }
  async down(driver: DBDriver): Promise<void> {
    const queryBatch: string[] = [`DROP TABLE "user_rating_data"`];

    await driver.queryBatch(queryBatch);
  }

  getTimestamp(): number {
    return 1683404833189;
  }

  getName(): string {
    return "AddUserRatingDataTable";
  }

  getDescription(): string {
    return "Add table user_rating_data";
  }
}
