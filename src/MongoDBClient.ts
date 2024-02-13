import { MongoClient, ServerApiVersion } from "mongodb";

const uri =
  process.env.MONGODB_CS ??
  "mongodb://127.0.0.1:27017/?maxPoolSize=20&w=majority";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export async function upsertUser(id: string, data: unknown): Promise<void> {
  try {
    const users = client.db("users");
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

export async function storeQueue(streamerId: string, q: unknown) {
  try {
    const sr = client.db("sr");
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

export async function restoreQueue(streamerId: string): Promise<string | null> {
  try {
    const sr = client.db("sr");
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

export async function storeRanking(streamerId: string, q: unknown) {
  try {
    const sr = client.db("sr");
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

export async function restoreRanking(
  streamerId: string,
): Promise<string | null> {
  try {
    const sr = client.db("sr");
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

export async function getRewardById(id: string) {
  try {
    const sr = client.db("sr");
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

export async function upsertRewardById(
  id: string,
  value: Record<string, unknown>,
) {
  try {
    const sr = client.db("sr");
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
