import { BrowserManager } from "./BrowserManager";
import { DBDriver } from "./DBDriver";
import { DiscordApiClient } from "./DiscordBotApiClient";
import { QueryRunner } from "./QueryRunner";
import { DiscordDataFeed } from "./dataFeed/DiscordDataFeed";
import { TwitchDataFeed } from "./dataFeed/TwitchDataFeed";
import { DiscordTwichBridge } from "./features/DiscordTwitchBridge";

export type ManagableObjects =
  | DiscordDataFeed
  | TwitchDataFeed
  | DiscordTwichBridge
  | DBDriver
  | QueryRunner
  | BrowserManager
  | DiscordApiClient;

export class ObjectManager {
  private static instance: ObjectManager = new ObjectManager();

  public static getInstance(): ObjectManager {
    return this.instance;
  }

  private objectTable: Map<string, ManagableObjects>;

  private constructor() {
    this.objectTable = new Map<string, ManagableObjects>();
  }

  public registerObjectIfNotExists(
    name: string,
    object: ManagableObjects,
  ): void {
    if (this.objectTable.has(name)) return;
    this.registerObject(name, object);
  }

  public registerObject(name: string, object: ManagableObjects): void {
    this.objectTable.set(name, object);
  }

  public getObject(name: string): ManagableObjects | undefined {
    return this.objectTable.get(name);
  }
}
