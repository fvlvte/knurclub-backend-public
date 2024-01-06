import { Client, QueryResult } from "pg";
import { ObjectManager } from "./ObjectManager";

export class DBDriver {
  private client: Client | null;

  private readonly dbName = "knurobot_core";

  constructor() {
    this.client = null;
    ObjectManager.getInstance().registerObject(this.constructor.name, this);
  }

  public async connect(): Promise<void> {
    this.client = new Client({
      host: "localhost",
      port: 5432,
      database: this.dbName,
      user: "postgres",
      password: "dupsko",
    });

    await this.client.connect();
  }

  /*public async reset(): Promise<void> {
    if (process.env.CLEAN_DB !== "true") return;

    if (this.client === null) throw new Error("DBDriver is not connected");

    await this.client.query(`DROP SCHEMA public CASCADE;`);
    await this.client.query(`CREATE SCHEMA public;`);
  }*/

  public async disconnect(): Promise<void> {
    if (this.client !== null) await this.client.end();
  }

  public async query(query: string, params?: unknown[]): Promise<QueryResult> {
    if (this.client === null) throw new Error("DBDriver is not connected");

    const result = await this.client.query(query, params);
    return result;
  }

  public async queryBatch(query: string[]): Promise<void> {
    if (this.client === null) throw new Error("DBDriver is not connected");

    await this.client.query("BEGIN");
    for (const qr of query) {
      await this.client.query(qr);
    }
    await this.client.query("COMMIT");
  }
}
