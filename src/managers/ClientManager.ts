import { TwitchClient } from "../clients/TwitchClient";
import { Logger } from "../util/Logger";
import { MongoDBClient } from "../clients/MongoDBClient";
import { QuickCrypt } from "../util/QuickCrypt";
import { Songrequest } from "../features/Songrequest";

export class ClientManager {
  private static instance: ClientManager;
  private readonly interval: NodeJS.Timeout;

  private readonly MAX_INACTIVE_TIME = 60 * 1000 * 60 * 24;

  private keepAliveWorker() {
    for (const key in this.records) {
      try {
        if (
          new Date().getTime() - this.records[key].getLastKeepAliveTick() >=
          this.MAX_INACTIVE_TIME
        ) {
          console.log(`Cleaning up session for ${key}`);
          this.records[key].shutdown().then().catch(console.error);
          delete this.records[key];
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  private constructor() {
    this.interval = setInterval(this.keepAliveWorker.bind(this), 60000);
  }

  public destroy() {
    clearInterval(this.interval);
    for (const key in this.records) {
      this.records[key].shutdown().then().catch(console.error);
    }
  }

  private records: Record<string, TwitchClient> = {};

  public static getInstance(): ClientManager {
    if (!ClientManager.instance) {
      ClientManager.instance = new ClientManager();
    }

    return ClientManager.instance;
  }

  public handleKeepAliveTick(uid: string, refreshToken: string, tmp?: boolean) {
    MongoDBClient.getDefaultInstance()
      .upsertUser(uid, {
        twitchRefreshToken: QuickCrypt.wrap(refreshToken),
        twitchUserId: uid,
      })
      .catch((e) => {
        if (e instanceof Error) {
          Logger.getInstance().error("Failed to save user info.", {
            error: { message: e.message, name: e.name, stack: e.stack },
          });
        }
      });
    if (this.records[uid] === undefined) {
      const client = new TwitchClient(refreshToken, uid);
      this.records[uid] = client;
      Songrequest.getInstance(uid).bindClient(client);
      if (!tmp) client.initialize().then().catch(console.error);
      return this.records[uid];
    } else {
      this.records[uid].keepAliveTick();
      return this.records[uid];
    }
  }

  public getTwitchRecord(uid: string): TwitchClient | undefined {
    return this.records[uid];
  }

  public addTwitchRecord(uid: string, twitchClient: TwitchClient): void {
    this.records[uid] = twitchClient;
  }
}
