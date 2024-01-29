import { MongoClient, ServerApiVersion } from "mongodb";
import { readdirSync } from "node:fs";
import { readFileSync } from "fs";

const uri = "mongodb://127.0.0.1:27017/?maxPoolSize=20&w=majority";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export async function storeQueue(streamerId: string, q: unknown) {
  try {
    const sr = client.db("sr");
    const queue = await sr.createCollection("queue");
    await queue.createIndex({
      streamerId: 1,
    });
    const r = await queue.updateOne(
      { streamerId: { eq: streamerId } },
      {
        $set: {
          queue: q,
        },
      },
      { upsert: true },
    );
    console.log(r);
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
    const r = await ranking.updateOne(
      { streamerId: { eq: streamerId } },
      {
        $set: {
          ranking: q,
        },
      },
      { upsert: true },
    );
    console.log(r);
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
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function getRewardById(id: string) {
  const sr = client.db("sr");
  const alerts = await sr.createCollection("alerts");
  await alerts.createIndex({
    streamerId: 1,
    rewardId: 1,
  });
  const alert = await alerts.findOne({ rewardId: { eq: id } });
  return alert;
}

export async function upsertRewardById(
  id: string,
  value: Record<string, unknown>,
) {
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
}

/*async function migrateRewardsJSON() {
  const files = readdirSync("./rewards/");
  for (const file of files) {
    const sr = client.db("sr");
    const data = JSON.parse(readFileSync(`./rewards/${file}`, "utf-8"));

    const alerts = await sr.createCollection("alerts");
    await alerts.createIndex({
      streamerId: 1,
      rewardId: 1,
    });
    const upsertEntry = await alerts.updateOne(
      { rewardId: { eq: file.split(".")[0] } },
      {
        $set: {
          type: data.type,
          param: data.param,
          name: data.name,
          streamerId: "268563714",
        },
      },
      { upsert: true },
    );
    console.log(upsertEntry);
  }
  console.log(files);
}*/

export default client;
