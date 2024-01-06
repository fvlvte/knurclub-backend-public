import { DBDriver } from "../DBDriver";
import { ObjectManager } from "../ObjectManager";
import { QueryRunner } from "../QueryRunner";
import {
  DiscordDataFeed,
  DiscordDataFeedEvent,
} from "../dataFeed/DiscordDataFeed";
import { TwitchDataFeed } from "../dataFeed/TwitchDataFeed";
import { Discord_WS_User_Info } from "../types/DiscordTypes";
import {
  PubSubMessage,
  TwitchChatMemeber,
  TwitchDataFeedEvents,
} from "../types/TwitchTypes";

export class DiscordTwichBridge {
  private twitchDataFeed?: TwitchDataFeed;
  private discordDataFeed?: DiscordDataFeed;

  private twitchMessageCallbackId?: number;
  private discordUserListRefreshCallbackId?: number;
  private twitchUserListRefreshCallbackId?: number;

  private workerInterval?: NodeJS.Timeout;

  private isWorking = false;
  private tickInterval = 60000;

  private discordUserList: Discord_WS_User_Info[] = [];
  private twitchUserList: TwitchChatMemeber[] = [];
  private twitchMessageList: PubSubMessage[] = [];

  constructor() {
    ObjectManager.getInstance().registerObject(this.constructor.name, this);
  }

  private onTwitchMessageCallback(event: PubSubMessage): void {
    this.twitchMessageList.push(event);
  }

  private onDiscordUserListRefreshCallback(
    discordUsers: Discord_WS_User_Info[],
  ): void {
    this.discordUserList = Array(...discordUsers);
  }

  private onTwitchUserListRefreshCallback(
    twitchViewers: TwitchChatMemeber[],
  ): void {
    this.twitchUserList = Array(...twitchViewers);
  }

  private async countActivityCrossplatform(): Promise<void> {
    const driver = ObjectManager.getInstance().getObject(
      DBDriver.name,
    ) as DBDriver;
    const runner = new QueryRunner(driver);

    const dbUserList = await runner.getUsersWithLinkedTwitch();

    const twitchChatList = Array(...this.twitchMessageList);

    this.twitchMessageList = [];
    const pointsAttributed: string[] = [];

    for (let i = 0; i < twitchChatList.length; i++) {
      const dbUser = dbUserList.find(
        (it) => it.twitch_login === twitchChatList[i].userDisplayName,
      );

      if (!dbUser) {
        //console.log("not found in db ", twitchChatList[i].userDisplayName);
        continue;
      } // User was not found in DB - skip this tick

      if (!pointsAttributed.includes(twitchChatList[i].userDisplayName)) {
        //console.log("found ", twitchChatList[i].userDisplayName);

        await runner.adjustUserPoints(
          parseInt(String(Math.random() * 9 + 1)),
          dbUser?.discord_id || "",
        );
        pointsAttributed.push(twitchChatList[i].userDisplayName);
      }
    }
  }

  private async worker(): Promise<void> {
    try {
      await this.countActivityCrossplatform();
      /* console.log(this.twitchMessageList);
      console.log(this.discordUserList);
      console.log(this.twitchUserList);*/
    } catch (e) {
      console.error(`Error in DiscordTwitchBridge: ${e}`);
    } finally {
      if (this.isWorking)
        this.workerInterval = setTimeout(
          this.worker.bind(this),
          this.tickInterval,
        );
    }
  }

  public async init(): Promise<void> {
    this.discordDataFeed = ObjectManager.getInstance().getObject(
      DiscordDataFeed.name,
    ) as DiscordDataFeed;
    this.twitchDataFeed = ObjectManager.getInstance().getObject(
      TwitchDataFeed.name,
    ) as TwitchDataFeed;

    this.isWorking = true;

    this.twitchMessageCallbackId = this.twitchDataFeed.on(
      TwitchDataFeedEvents.message,
      this.onTwitchMessageCallback.bind(this),
    );
    this.discordUserListRefreshCallbackId = this.discordDataFeed.on(
      DiscordDataFeedEvent.USER_LIST_UPDATE,
      this.onDiscordUserListRefreshCallback.bind(this),
    );
    this.twitchUserListRefreshCallbackId = this.twitchDataFeed.on(
      TwitchDataFeedEvents.userlistUpdate,
      this.onTwitchUserListRefreshCallback.bind(this),
    );

    this.worker();
  }

  public async deinit(): Promise<void> {
    this.isWorking = false;
    if (this.workerInterval) clearTimeout(this.workerInterval);
  }
}
