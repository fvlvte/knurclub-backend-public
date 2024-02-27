import { makeAuthToken } from "../../src/middleware/Auth";
import { MongoDBClient } from "../../src/clients/MongoDBClient";
import { MongoClient } from "mongodb";
import { QuickCrypt } from "../../src/util/QuickCrypt";
import { AuthToken } from "../../src/types/Auth";

describe("makeAuthToken", () => {
  let connection: MongoClient;
  let mongoDbClient: MongoDBClient;

  beforeEach(async () => {
    connection = await MongoClient.connect(process.env.MONGO_URL ?? "");
    mongoDbClient = new MongoDBClient(connection);

    const admin = connection.db().admin();
    const dbInfo = await admin.listDatabases();
    for (const d of dbInfo.databases) {
      const db = connection.db(d.databaseName);
      await db.dropDatabase();
    }
  });

  afterEach(async () => {
    await mongoDbClient.close();
  });

  test("should generate auth token", async () => {
    const token = await makeAuthToken(
      {
        expiresAt: new Date().getTime() + 60 * 60 * 24 * 30,
        version: 1,
        userId: "2137",
      },
      mongoDbClient,
    );

    const decodedData = QuickCrypt.unwrap<AuthToken>(token);

    if (!decodedData.id) return fail("Decoded data ID is not present.");

    const tokenFromDb = await mongoDbClient.getTokenById(decodedData.id);

    if (!tokenFromDb) return fail("Token is not present in the DB");

    expect(typeof token).toEqual("string");
    expect(tokenFromDb.id).toEqual(decodedData.id);
  });
});
