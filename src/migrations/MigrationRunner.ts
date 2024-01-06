import { DBDriver } from "../DBDriver";
import { glob } from "glob";
import { Migration } from "./Migration";

export class MigrationRunner {
  private driver: DBDriver;

  constructor(driver: DBDriver) {
    this.driver = driver;
  }

  private async getMigrations(): Promise<Migration[]> {
    return new Promise((resolve) => {
      glob(
        __dirname +
          `/migrationScripts/*.${
            process.env.NODE_ENV === "production" ? "js" : "ts"
          }`,
      ).then(async (files) => {
        const migrations: Migration[] = [];

        for (const file of files) {
          const migration = await import(file);
          migrations.push(new migration.default());
        }

        migrations.sort((a, b) => a.getTimestamp() - b.getTimestamp());

        resolve(migrations);
      });
    });
  }

  public async run(): Promise<void> {
    try {
      const migrations = await this.getMigrations();

      await this.driver.query(
        "CREATE TABLE IF NOT EXISTS __migrations (name TEXT, timestamp BIGINT);",
      );

      const result = await this.driver.query(
        "SELECT * FROM __migrations ORDER BY timestamp DESC LIMIT 1;",
      );

      let lastMigrationTimestamp = 0;

      if (result.rowCount === 0) {
        console.log("No migrations found");
      } else {
        lastMigrationTimestamp = result.rows[0].timestamp;
      }

      for (const migration of migrations) {
        if (migration.getTimestamp() <= lastMigrationTimestamp) {
          continue;
        }

        await migration.up(this.driver);

        console.log(`Running migration ${migration.getName()}`);

        await this.driver.query(
          "INSERT INTO __migrations (name, timestamp) VALUES ($1, $2);",
          [migration.getName(), migration.getTimestamp()],
        );

        console.log(`Migration ${migration.getName()} finished`);
      }

      console.log("All migrations finished");
    } catch (e) {
      console.error(e);
    }
  }
}
