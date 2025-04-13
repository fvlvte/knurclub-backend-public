import { Document, MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import { Logger } from "../util/Logger";
import { ConfigContainer } from "../managers/ConfigManager";
import { UserInfo } from "../types/UserInfo";
import { AuthToken } from "../types/Auth";
import { deepEqualHelper } from "../util/Common";
import { FiutPlayer } from "../types/FiutPlayer";

const FIUT_DB_PROD = "fiut3";
const FIUT_ITEM_CD = 60 * 60 * 1000;
const FIUT_COMBAT_ATTACK_CD = 15 * 60;

export class MongoDBClient {
  private client: MongoClient;

  private static default: MongoDBClient;

  public static getDefaultInstance() {
    if (!this.default) this.default = new MongoDBClient();
    return this.default;
  }

  constructor(c?: MongoClient) {
    this.client =
      c ??
      new MongoClient(
        process.env.MONGODB_CS ??
          "mongodb://127.0.0.1:27017/?maxPoolSize=20&w=majority",
        {
          serverApi: {
            version: ServerApiVersion.v1,
            strict: false,
            deprecationErrors: true,
          },
        },
      );
  }

  public async upsertUser(id: string, data: Partial<UserInfo>): Promise<void> {
    const users = this.client.db("users");
    const info = users.collection("info");
    await info.createIndex({ twitchUserId: 1 });
    await info.updateOne(
      { twitchUserId: id },
      {
        $set: {
          ...data,
        },
      },
      { upsert: true },
    );
  }

  public close(): Promise<void> {
    return this.client.close();
  }

  public async createToken(token: AuthToken) {
    const users = this.client.db("users");
    const tokens = users.collection<AuthToken>("tokens");
    return await tokens.insertOne(token);
  }

  public async getTokenById(id: string) {
    const users = this.client.db("users");
    const tokens = users.collection<AuthToken>("tokens");
    const data = await tokens.findOne({
      _id: ObjectId.createFromHexString(id),
    });

    if (data) {
      data.id = data._id.toString("hex");
    }

    return data;
  }

  public async fetchUserConfig(id: string) {
    try {
      const users = this.client.db("users");
      const config = users.collection<ConfigContainer>("config");

      return await config.findOne({ userId: id });
    } catch (e) {
      if (e instanceof Error) {
        Logger.getInstance().error("Failed to fetch user config.", {
          error: { message: e.message, name: e.name },
        });
      }
      return null;
    }
  }

  public async updateUserConfig(
    id: string,
    newObject: ConfigContainer,
    diffObject?: ConfigContainer,
  ): Promise<null | Document> {
    try {
      const users = this.client.db("users");
      const config = users.collection("config");

      if (!diffObject) {
        diffObject = { data: {} } as ConfigContainer;
      }
      const diff: Record<string, unknown> = {};
      for (const key in newObject.data) {
        if (
          !deepEqualHelper(
            (newObject.data as Record<string, unknown>)[key],
            (diffObject.data as Record<string, unknown>)[key],
          )
        ) {
          diff[`data.${key}`] = (newObject.data as Record<string, unknown>)[
            key
          ];
        }
      }
      return await config.updateOne(
        { userId: id },
        { $set: diff },
        { upsert: true },
      );
    } catch (e) {
      if (e instanceof Error) {
        Logger.getInstance().error("Failed to save user config.", {
          error: { message: e.message, name: e.name },
        });
      }
      return null;
    }
  }
  public async storeQueue(streamerId: string, q: unknown) {
    try {
      const sr = this.client.db("sr");
      const queue = sr.collection("queue");
      await queue.createIndex({
        streamerId: 1,
      });
      await queue.updateOne(
        { streamerId: { eq: streamerId } },
        {
          $set: {
            queue: q,
          },
        },
        { upsert: true },
      );
    } catch (e) {
      console.error(e);
    }
  }

  public async restoreQueue(streamerId: string): Promise<string | null> {
    try {
      const sr = this.client.db("sr");
      const queue = sr.collection("queue");
      await queue.createIndex({
        streamerId: 1,
      });
      const r = await queue.findOne({ streamerId: { eq: streamerId } });
      return r?.queue as string;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  public async storeRanking(streamerId: string, q: unknown) {
    try {
      const sr = this.client.db("sr");
      const ranking = sr.collection("ranking");
      await ranking.createIndex({
        streamerId: 1,
      });
      await ranking.updateOne(
        { streamerId: { eq: streamerId } },
        {
          $set: {
            ranking: q,
          },
        },
        { upsert: true },
      );
    } catch (e) {
      console.error(e);
    }
  }

  public async getFiut(userId: string): Promise<number | null> {
    try {
      const users = this.client.db("users");
      const fiut = users.collection<FiutPlayer>("fiut3");
      await fiut.createIndex({ userId: 1 });
      const result = await fiut.findOne({ userId: userId });

      return result?.rozmiarFiut ?? null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  public async setUserLastAttack(userId: string) {
    const db = this.client.db("users");
    const fiut = db.collection<FiutPlayer>(FIUT_DB_PROD);

    await fiut.updateOne(
      { userId },
      {
        $set: {
          lastCombatAt: Date.now(),
        },
      },
    );
  }

  public async getFiutPlayer(userId: string): Promise<FiutPlayer | null> {
    try {
      const users = this.client.db("users");
      const fiut = users.collection<FiutPlayer>("fiut3");
      await fiut.createIndex({ userId: 1 });

      return await fiut.findOne({ userId: userId });
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  public async updateFiut(userId: string, rozmiarFiut: number): Promise<void> {
    const isFiutSet = (await this.getFiut(userId)) !== null;

    const users = this.client.db("users");
    const fiut = users.collection<FiutPlayer>("fiut3");

    if (isFiutSet) {
      await fiut.updateOne({ userId }, { $set: { rozmiarFiut: rozmiarFiut } });
    } else {
      await fiut.insertOne({ userId, rozmiarFiut });
    }
  }

  public async checkFiutItemCooldown(userId: string): Promise<boolean> {
    const db = this.client.db("users");
    const fiut = db.collection<FiutPlayer>(FIUT_DB_PROD);

    const fiutek = await fiut.findOne({ userId });

    if (fiutek === null || typeof fiutek.lastItemGainedAt !== "number") {
      return true;
    }

    return Date.now() > fiutek.lastItemGainedAt + FIUT_ITEM_CD;
  }

  public async checkFiutCombatCooldown(userId: string): Promise<boolean> {
    const db = this.client.db("users");
    const fiut = db.collection<FiutPlayer>(FIUT_DB_PROD);

    const fiutek = await fiut.findOne({ userId });

    if (fiutek === null || typeof fiutek.lastCombatAt !== "number") {
      return true;
    }

    return Date.now() > fiutek.lastCombatAt + FIUT_COMBAT_ATTACK_CD;
  }

  public async setFiutItem(
    userId: string,
    itemId: number,
    exp: number,
  ): Promise<void> {
    const db = this.client.db("users");
    const fiut = db.collection<FiutPlayer>(FIUT_DB_PROD);

    await fiut.updateOne(
      { userId },
      {
        $set: {
          equippedItem: itemId,
          lastItemGainedAt: Date.now(),
          equippedItemExpiresAt: Date.now() + exp,
        },
      },
    );
  }

  public async updateRanking(userId: string, hostId: string, change: number) {
    try {
      const sr = this.client.db("users");
      const ranking = sr.collection("ranking");
      await ranking.updateOne(
        { userId },
        {
          $inc: {
            global: change,
            [`host_${hostId}`]: change,
          },
        },
        { upsert: true },
      );
    } catch (e) {
      console.error(e);
    }
  }

  public async getRankingPoints(
    userId: string,
    hostId?: string,
  ): Promise<number> {
    const sr = this.client.db("users");
    const ranking = sr.collection("ranking");
    const result = await ranking.findOne({ userId });
    if (!hostId) {
      return result?.global ?? 0;
    } else {
      return result?.[`host_${hostId}`] ?? 0;
    }
  }

  public async pdw(
    userId: string,
    targetId: string,
    hostId: string,
    change: number,
  ) {
    try {
      const users = this.client.db("users");
      const pdw = users.collection<{ userId: string; lastPDW: number }>("pdw");

      const result = await pdw.findOne({ userId });
      if (result && result.lastPDW > Date.now() - 24 * 60 * 60 * 1000) {
        return "ERR_ALREADY";
      }

      const rep = await this.getRankingPoints(targetId, hostId);

      if (rep < -50000) {
        return "ERR_UNKNOWN";
      }

      if (rep + change >= 0) {
        return "ERR_POSITIVE";
      }

      await pdw.updateOne(
        {
          userId,
        },
        {
          $set: {
            lastPDW: Date.now(),
          },
        },
        { upsert: true },
      );

      await this.updateRanking(targetId, hostId, change);
      return await this.getRankingPoints(targetId, hostId);
    } catch (e) {
      console.error(e);
      return "ERR_UNKNOWN";
    }
  }

  public async restoreRanking(streamerId: string): Promise<string | null> {
    try {
      const sr = this.client.db("sr");
      const ranking = sr.collection("ranking");
      await ranking.createIndex({
        streamerId: 1,
      });
      const r = await ranking.findOne({ streamerId: { eq: streamerId } });
      return r?.ranking as string;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  public async getRewardById(id: string) {
    try {
      const sr = this.client.db("sr");
      const alerts = sr.collection("alerts");
      await alerts.createIndex({
        streamerId: 1,
        rewardId: 1,
      });

      return alerts.findOne({ rewardId: { eq: id } });
    } catch (e) {
      console.error(e);
      return {};
    }
  }

  public async upsertRewardById(id: string, value: Record<string, unknown>) {
    try {
      const sr = this.client.db("sr");
      const alerts = sr.collection("alerts");
      await alerts.createIndex({
        streamerId: 1,
        rewardId: 1,
      });
      await alerts.updateOne(
        { rewardId: { eq: id } },
        {
          $set: {
            ...value,
          },
        },
        { upsert: true },
      );
    } catch (e) {
      console.error(e);
    }
  }
}
