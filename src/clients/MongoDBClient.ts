import { Document, MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import { Logger } from "../util/Logger";
import { ConfigContainer } from "../managers/ConfigManager";
import { UserInfo } from "../types/UserInfo";
import { AuthToken } from "../types/Auth";
import { deepEqualHelper } from "../util/Common";

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

  public async getUserInfoByTwitchId(id: string): Promise<UserInfo | null> {
    const users = this.client.db("users");
    const info = users.collection<UserInfo>("info");
    return await info.findOne({ twitchUserId: id });
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
