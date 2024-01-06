import { DBDriver } from "./DBDriver";

export enum UserRatingDataType {
  TWITCH_COMMMON = 0,
  TWITCH_CHAT_ACTIVITY,
  TWITCH_VIEWING_ACTIVITY,
}

export type DB_User = {
  id: number;
  discord_id: string | null;
  twitch_login: string | null;
  instagram_login: string | null;
  twitter_login: string | null;
  points: number;
  roleMask: number;
  isBanned: boolean;
};

export interface DB_PartialUser {
  discord_id: string;
  last_updated: number;
}

export class QueryRunner {
  private driver: DBDriver;

  constructor(driver: DBDriver) {
    this.driver = driver;
  }

  async upsertUser(
    discordUserId: string,
    discordDisplayName: string,
    twithcId?: string,
    twitchLogin?: string,
  ): Promise<void> {
    await this.driver
      .query(`INSERT INTO "public"."users"(discord_id, twitch_login, discord_display_name, twitch_id, last_updated, created_at) VALUES (
            '${discordUserId}',
            ${twitchLogin ? `'${twitchLogin}'` : "NULL"},
            '${discordDisplayName}',
            ${twithcId ? `'${twithcId}'` : "NULL"},
            ${new Date().getTime()},
            ${new Date().getTime()}
        ) ON CONFLICT (discord_id) DO UPDATE SET
            twitch_login = ${twitchLogin ? `'${twitchLogin}'` : "NULL"},
            last_updated = ${new Date().getTime()},
            discord_display_name = '${discordDisplayName}',
            twitch_id = ${twithcId ? `'${twithcId}'` : "NULL"}
            `);
  }

  async deleteUser(discordUserId: string): Promise<void> {
    await this.driver.query(
      `DELETE FROM "public"."users" WHERE discord_id = '${discordUserId}'`,
    );
  }

  async getUsersToScan(all?: boolean): Promise<DB_PartialUser[]> {
    if (all) {
      const result = await this.driver.query(
        `SELECT last_updated, discord_id FROM "public"."users"`,
      );
      return result.rows;
    } else {
      const result = await this.driver.query(
        `SELECT last_updated, discord_id FROM "public"."users" WHERE last_updated < ${
          new Date().getTime() - 1000 * 60 * 60 * 24
        } ORDER BY last_updated ASC LIMIT 10`,
      );
      return result.rows;
    }
  }

  async adjustUserPoints(
    value: number,
    discord_user_id?: string,
    twitch_login?: string,
  ): Promise<void> {
    if (!discord_user_id && !twitch_login) throw new Error("No user specified");

    const result = await this.driver.query(
      `UPDATE "public"."users" SET points = points + ${Number(value).toFixed(0)}
        WHERE 
        ${discord_user_id ? ` discord_id = '${discord_user_id}' ` : ""}
        ${discord_user_id && twitch_login ? " AND " : ""} 
        ${twitch_login ? ` discord_id = '${discord_user_id}' ` : ""}
        AND points + ${Number(value).toFixed(0)} >= 0
        `,
    );
    if (result.rowCount === 0)
      throw new Error("No user found or user is negative on balce.");
  }

  async getUserPoints(
    discord_user_id?: string,
    twitch_login?: string,
  ): Promise<number> {
    if (!discord_user_id && !twitch_login) throw new Error("No user specified");

    const result = await this.driver.query(
      `SELECT points FROM "public"."users"
        WHERE 
        ${discord_user_id ? ` discord_id = '${discord_user_id}' ` : ""}
        ${discord_user_id && twitch_login ? " AND " : ""} 
        ${twitch_login ? ` discord_id = '${discord_user_id}' ` : ""}
        `,
    );
    if (result.rowCount === 0) return 0;
    else return result.rows[0].points;
  }

  async saveMetadata(
    metadataType: UserRatingDataType,
    metadata: unknown,
    discord_user_id?: string,
    twitch_login?: string,
  ): Promise<void> {
    if (!discord_user_id && !twitch_login) throw new Error("No user specified");

    const user = await this.driver.query(`
      SELECT id FROM "public"."users"
        WHERE discord_id = '${discord_user_id}'
        OR twitch_login = '${twitch_login}'`);
    if (user.rowCount === 0) throw new Error("No user found");

    const result = await this.driver.query(
      `INSERT INTO "public"."user_rating_data"(user_id, type, data, timestamp) 
        VALUES (
          ${user.rows[0].id},
          ${metadataType},
          '${JSON.stringify(metadata)}',
          ${new Date().getTime()}
        )`,
    );
    if (result.rowCount === 0)
      throw new Error("No user found or user is negative on balce.");
  }

  async getMetadata(
    metadataType: UserRatingDataType,
    discord_user_id?: string,
    twitch_login?: string,
  ): Promise<null | unknown> {
    if (!discord_user_id && !twitch_login) throw new Error("No user specified");

    const user = await this.driver.query(`
      SELECT id FROM "public"."users"
        WHERE discord_id = '${discord_user_id}'
        OR twitch_login = '${twitch_login}'`);
    if (user.rowCount === 0) throw new Error("No user found");

    const result = await this.driver.query(
      `SELECT * FROM "public"."user_rating_data" WHERE user_id = ${user.rows[0].id} AND type = ${metadataType} ORDER BY timestamp DESC LIMIT 1`,
    );
    if (result.rowCount === 0) return null;

    return typeof result.rows[0].data === "string"
      ? JSON.parse(result.rows[0].data)
      : result;
  }

  async getUsersWithLinkedTwitch(): Promise<DB_User[]> {
    const result = await this.driver.query(
      `SELECT * FROM "public"."users" WHERE twitch_login IS NOT NULL`,
    );
    return result.rows;
  }
}
