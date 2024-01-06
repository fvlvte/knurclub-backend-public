import { DBDriver } from "../../DBDriver";
import { Migration } from "../Migration";

export default class AddTwitchIdAndDiscordDisplayNameToUser_1683233964889
  implements Migration
{
  async up(driver: DBDriver): Promise<void> {
    const queryBatch: string[] = [
      `ALTER TABLE "users" ADD COLUMN "discord_display_name" VARCHAR(255)`,
      `ALTER TABLE "users" ADD COLUMN "twitch_id" VARCHAR(255)`,
    ];

    await driver.queryBatch(queryBatch);
  }
  async down(driver: DBDriver): Promise<void> {
    const queryBatch: string[] = [
      `ALTER TABLE "users" DROP COLUMN "discord_display_name"`,
      `ALTER TABLE "users" DROP COLUMN "twitch_id"`,
    ];

    await driver.queryBatch(queryBatch);
  }

  getTimestamp(): number {
    return 1683233964889;
  }

  getName(): string {
    return "AddTwitchIdAndDiscordDisplayNameToUser";
  }

  getDescription(): string {
    return "Add twitch_id and discord_display_name columns to users table";
  }
}
