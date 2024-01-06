import { DBDriver } from "../../DBDriver";
import { Migration } from "../Migration";

export default class Initial_1682892716785 implements Migration {
  async up(driver: DBDriver): Promise<void> {
    const queryBatch: string[] = [
      `CREATE TABLE "users" (
                "id" SERIAL PRIMARY KEY NOT NULL, 
                "discord_id" VARCHAR(25) UNIQUE,
                "twitch_login" VARCHAR(25) UNIQUE,
                "instagram_login" VARCHAR(30) UNIQUE,
                "twitter_login" VARCHAR(15) UNIQUE,
                "points" INTEGER NOT NULL DEFAULT 0,
                "roleMask" INTEGER NOT NULL DEFAULT 0,
                "isBanned" BOOLEAN NOT NULL DEFAULT FALSE)`,
      `CREATE TABLE "point_transactions" (
                "id" SERIAL PRIMARY KEY NOT NULL,
                "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
                "amount" INTEGER NOT NULL,
                "reason" VARCHAR(255) NOT NULL,
                "timestamp" BIGINT NOT NULL
            )`,
      `CREATE TABLE "twitch_viewer_metadata" (
                "id" SERIAL PRIMARY KEY NOT NULL,
                "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
                "metadata" JSONB NOT NULL
                )`,
    ];

    await driver.queryBatch(queryBatch);
  }
  async down(driver: DBDriver): Promise<void> {
    const queryBatch: string[] = [
      `DROP TABLE "twitch_viewer_metadata"`,
      `DROP TABLE "point_transactions"`,
      `DROP TABLE "users"`,
    ];

    await driver.queryBatch(queryBatch);
  }

  getTimestamp(): number {
    return 1682892716785;
  }

  getName(): string {
    return "Initial";
  }

  getDescription(): string {
    return "Initial database layout setup";
  }
}
