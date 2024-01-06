import { TwitchClient } from "./TwitchClient";

export class TwitchClienty {
  private static instance: TwitchClienty;

  private constructor() {}

  private records: Record<string, TwitchClient> = {};

  public static getInstance(): TwitchClienty {
    if (!TwitchClienty.instance) {
      TwitchClienty.instance = new TwitchClienty();
    }

    return TwitchClienty.instance;
  }

  public getTwitchRecord(uid: string): TwitchClient | undefined {
    return this.records[uid];
  }

  public addTwitchRecord(uid: string, twitchClient: TwitchClient): void {
    this.records[uid] = twitchClient;
  }
}
