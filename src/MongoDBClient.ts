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
        deprecationErrors: true,
      },
    });
  }

  public async upsertUser(id: string, data: unknown): Promise<void> {
    try {
      const users = this.client.db("users");
      const info = await users.createCollection("info");
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
      const queue = await sr.createCollection("queue");
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
      const queue = await sr.createCollection("queue");
      await queue.createIndex({
        streamerId: 1,
      });
      const r = await queue.findOne({ streamerId: { eq: streamerId } });
      return r?.queue as string;
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  public async storeRanking(streamerId: string, q: unknown) {
    try {
      const sr = this.client.db("sr");
      const ranking = await sr.createCollection("ranking");
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
      const ranking = await sr.createCollection("ranking");
      await ranking.createIndex({
        streamerId: 1,
      });
      const r = await ranking.findOne({ streamerId: { eq: streamerId } });
      return r?.ranking as string;
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  public async getRewardById(id: string) {
    try {
      const sr = this.client.db("sr");
      const alerts = await sr.createCollection("alerts");
      await alerts.createIndex({
        streamerId: 1,
        rewardId: 1,
      });
      const alert = await alerts.findOne({ rewardId: { eq: id } });
      return alert;
    } catch (e) {
      console.error(e);
      return {};
    }
  }

  public async upsertRewardById(id: string, value: Record<string, unknown>) {
    try {
      const sr = this.client.db("sr");
      const alerts = await sr.createCollection("alerts");
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
