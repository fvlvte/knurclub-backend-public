//import path from "path";
import { Database } from "sqlite3";

export class DatabaseClient {
  private db?: Database | null;
  private static instance = new DatabaseClient();

  static getInstance(): DatabaseClient {
    return this.instance;
  }

  private constructor() {
    //this.db = new Database(path.join(__dirname, "..", "db", "cache.sqli"));
  }

  public async getUserCache(username: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.db?.get<{ value: string }>(
        "SELECT * FROM session_cache WHERE username = ?",
        [username],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.value || null);
        },
      );
    });
  }

  public async setUserCache(username: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db?.run(
        "INSERT INTO session_cache (username, value) VALUES (?, ?) ON CONFLICT(username) DO UPDATE SET value = excluded.value",
        [username, value],
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
  }

  public async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db?.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
