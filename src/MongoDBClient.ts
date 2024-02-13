import { MongoClient, ServerApiVersion } from "mongodb";

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
