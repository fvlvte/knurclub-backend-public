import { Document, MongoClient, ServerApiVersion } from "mongodb";
import { Logger } from "./Logger";
import { ConfigContainer } from "./ConfigManager";

export class MongoDBClient {
  private client: MongoClient;

  private static default: MongoDBClient;

  public static getDefaultInstance() {
    if (!this.default) this.default = new MongoDBClient();
    return this.default;
  }

  constructor(
    uri = process.env.MONGODB_CS ??
      "mongodb://127.0.0.1:27017/?maxPoolSize=20&w=majority",
  ) {
    this.client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
      },
    });
  }

  public async upsertUser(id: string, data: unknown): Promise<void> {
    try {
      const users = this.client.db("users");
      const info = users.collection("info");
      await info.createIndex({ twitchId: 1 });
      const ttvId = "";
      await info.updateOne(
        { streamerId: { eq: ttvId } },
        {
          $set: {
            data: data,
          },
        },
        { upsert: true },
      );
    } catch (e) {}
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

      function deepEqualHelper(a: unknown, b: unknown) {
        if (typeof a === "number" || typeof b === "string") {
          return a === b;
        } else if (typeof a === "object") {
          if (Array.isArray(a)) {
            if (!Array.isArray(b)) return false;
            if (a.length !== b.length) {
              return false;
            }
            for (let i = 0; i < a.length; i++) {
              if (!deepEqualHelper(a[i], b[i])) return false;
            }
            return true;
          } else {
            if (a === null && b === null) return true;
            if (a) {
              if (!b) return false;
              const aKeys = Object.keys(a);
              const bKeys = Object.keys(b);

              if (aKeys.length !== bKeys.length) return false;

              for (const key of aKeys) {
                if (
                  !deepEqualHelper(
                    (a as Record<string, unknown>)[key],
                    (b as Record<string, unknown>)[key],
                  )
                )
                  return false;
              }
              return true;
            }
          }
        } else if (typeof a === "undefined") {
          return typeof b === "undefined";
        } else if (typeof a === "string") {
          return a === b;
        } else if (typeof a === "boolean") {
          return a === b;
        } else {
          throw new Error("Unsupported equality check:" + typeof a);
        }
      }

      if (!diffObject) {
        await config.insertOne({ userId: id, ...newObject });
      } else {
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

        console.log(diff);

        console.log(
          await config.updateOne(
            { userId: id },
            {
              $set: {
                version: newObject.version,
                updatedAt: new Date().getTime(),
                ...diff,
              },
            },
          ),
        );
      }
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
