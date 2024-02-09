import { V2TwitchClient } from "./V2TwitchClient";

export class TennantManager {
  private static instance: TennantManager;
  private interval: NodeJS.Timeout;

  private keepAliveWorker() {
    for (const key in this.records) {
      try {
        if (
          new Date().getTime() - this.records[key].getLastKeepAliveTick() >=
          60 * 1000 * 10
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

  private records: Record<string, V2TwitchClient> = {};

  public static getInstance(): TennantManager {
    if (!TennantManager.instance) {
      TennantManager.instance = new TennantManager();
    }

    return TennantManager.instance;
  }

  public handleKeepAliveTick(uid: string, refreshToken: string) {
    if (this.records[uid] === undefined) {
      const client = new V2TwitchClient(refreshToken, uid);
      this.records[uid] = client;
      client.initialize().then().catch(console.error);
    } else {
      this.records[uid].keepAliveTick();
    }
  }

  public getTwitchRecord(uid: string): V2TwitchClient | undefined {
    return this.records[uid];
  }

  public addTwitchRecord(uid: string, twitchClient: V2TwitchClient): void {
    this.records[uid] = twitchClient;
  }
}
