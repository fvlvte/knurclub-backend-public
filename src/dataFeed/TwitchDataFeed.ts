import { Page } from "puppeteer";
import { BrowserManager } from "../BrowserManager";
import { default as axios } from "axios";

import {
  PubSubMessage,
  TwitchRedemptionEvent,
  TwitchChatMemeber,
  TwitchDataFeedEvents,
  TwitchPacket_CommunityTab,
  TwitchPacket_WS_RedeemReward,
  Twitch_Channel_Info,
} from "../types/TwitchTypes";
import { HeadlessTestable } from "../interfaces/HeadlessTestable";
import { DataFeed } from "../interfaces/DataFeed";
import { ObjectManager } from "../ObjectManager";
import { Plugin } from "../interfaces/Plugin";

interface HealthMarkError {
  error: Error;
  timestamp: number;
}

const enum HealthCheckTypes {
  "headlessBrowser" = "headlessBrowser",
  "graphQLHook" = "graphQLHook",
  "pubSubHook" = "pubSubHook",
  "ircChatHook" = "ircChatHook",
}

export class TwitchDataFeed implements DataFeed, HeadlessTestable, Plugin {
  getName(): string {
    return TwitchDataFeed.name;
  }

  async initialize(): Promise<boolean> {
    await this.init("fvlvte");
    return true;
  }

  async unload(): Promise<void> {
    await this.deinit();
  }

  async getRouterHandler(): Promise<() => void> {
    return this.onRouterHandler.bind(this);
  }

  private page: Page | null;
  private requestIdOfPubSub: string | null;
  private requestIdOfChatIrc: string | null;
  private messageBuffer: PubSubMessage[];

  private onRouterHandler(): void {
    console.log("dupsko");
  }

  private onTwitchMessageCallbacks: {
    [id: number]: (message: PubSubMessage) => unknown;
  } = {};
  private onTwitchUserListUpdateCallbacks: {
    [id: number]: (message: TwitchChatMemeber[]) => unknown;
  } = {};
  private onTwitchRedeemRewardCallbacks: {
    [id: number]: (event: TwitchRedemptionEvent) => unknown;
  } = {};

  private onEndCallack?: () => void;
  private vieverList: TwitchChatMemeber[];
  private refreshInterval: NodeJS.Timeout | null;

  private healthMarks: Record<
    HealthCheckTypes,
    { isGood: boolean; errors: HealthMarkError[]; lastSuccessTimestamp: number }
  > = {
    headlessBrowser: {
      errors: [],
      lastSuccessTimestamp: new Date().getTime(),
      isGood: true,
    },
    graphQLHook: {
      errors: [],
      lastSuccessTimestamp: new Date().getTime(),
      isGood: true,
    },
    pubSubHook: {
      errors: [],
      lastSuccessTimestamp: new Date().getTime(),
      isGood: true,
    },
    ircChatHook: {
      errors: [],
      lastSuccessTimestamp: new Date().getTime(),
      isGood: true,
    },
  };

  public async healthCheck(): Promise<boolean> {
    return true;
  }

  constructor(isTemorary = false) {
    this.page = null;
    this.requestIdOfPubSub = null;
    this.requestIdOfChatIrc = null;
    this.messageBuffer = [];
    this.vieverList = [];
    this.refreshInterval = null;
    if (!isTemorary)
      ObjectManager.getInstance().registerObject(this.constructor.name, this);
  }

  public async deinit(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.page = null;
    this.onEnd();
  }

  public on(
    event: TwitchDataFeedEvents,
    callback:
      | ((event: PubSubMessage) => void)
      | ((event: TwitchRedemptionEvent) => void)
      | ((event: TwitchChatMemeber[]) => void),
  ): number {
    if (event === TwitchDataFeedEvents.message) {
      const id = Math.random();
      this.onTwitchMessageCallbacks[id] = callback as (
        event: PubSubMessage,
      ) => void;
      return id;
    } else if (event === TwitchDataFeedEvents.rewardRedemption) {
      const id = Math.random();
      this.onTwitchRedeemRewardCallbacks[id] = callback as (
        event: TwitchRedemptionEvent,
      ) => void;
      return id;
    } else if (event === TwitchDataFeedEvents.userlistUpdate) {
      const id = Math.random();
      this.onTwitchUserListUpdateCallbacks[id] = callback as (
        event: TwitchChatMemeber[],
      ) => void;
      return id;
    } else {
      throw new Error(`Unknown event: ${event}`);
    }
  }

  private async handlerOfPubSub(response: string): Promise<void> {
    const data = JSON.parse(response);

    if (response.includes("reward-redeemed")) {
      const msg: TwitchPacket_WS_RedeemReward = JSON.parse(data.data.message);

      for (const id in this.onTwitchRedeemRewardCallbacks) {
        this.onTwitchRedeemRewardCallbacks[id]({
          login: msg.data.redemption.user.login,
          reward: msg.data.redemption.reward.title,
        });
      }
    }

    this.healthMarks[HealthCheckTypes.ircChatHook].lastSuccessTimestamp =
      new Date().getTime();
  }

  public isInitialized(): boolean {
    return this.page !== null;
  }

  public flushChatMessages(): PubSubMessage[] {
    const messages = this.messageBuffer;
    this.messageBuffer = [];
    return messages;
  }

  private async handlerOfChatIrc(response: string): Promise<void> {
    const splits = response.split(" ");

    const [prefix, user, command] = splits;
    const message = splits.slice(3).join(" ");

    if (command === "PRIVMSG") {
      const displayName = user.split("@")[1].split(".")[0];
      const messageSplits = message.split(":");
      const cleanMessage = messageSplits.splice(1).join(":").trim();

      const userMetaData: { [key: string]: string } = {};

      const prefixData = prefix.split(";");

      for (const data of prefixData) {
        const [key, value] = data.split("=");
        userMetaData[key] = value;
      }

      const event = {
        metadata: userMetaData,
        timestamp: Date.now(),
        message: cleanMessage,
        userDisplayName: displayName,
      };

      for (const key in this.onTwitchMessageCallbacks) {
        this.onTwitchMessageCallbacks[key](event);
      }

      this.messageBuffer.push(event);
    }
    this.healthMarks[HealthCheckTypes.ircChatHook].lastSuccessTimestamp =
      new Date().getTime();
  }

  private async onEnd() {
    return new Promise(
      (resolve) => (this.onEndCallack = resolve as () => void),
    );
  }

  private async internalWorker() {
    try {
      if (this.page?.isClosed()) {
        throw new Error("Page is closed");
      }

      await this.page?.click("[aria-label='Users in Chat']");
      await this.page?.waitForTimeout(1000);
      await this.page?.click("[aria-label='Users in Chat']");
      this.healthMarks[HealthCheckTypes.headlessBrowser].lastSuccessTimestamp =
        new Date().getTime();
    } catch (e) {
      this.healthMarks[HealthCheckTypes.headlessBrowser].errors.push({
        timestamp: new Date().getTime(),
        error: e as Error,
      });
      this.healthMarks[HealthCheckTypes.headlessBrowser].isGood = false;
    }
  }

  private async parseCommunityTab(
    communityTabInfo: TwitchPacket_CommunityTab,
  ): Promise<void> {
    this.vieverList = [];

    for (const broadcaster of communityTabInfo.channel.chatters.broadcasters) {
      this.vieverList.push({
        role: "Broadcaster",
        displayName: broadcaster.login,
        updatedAt: Date.now(),
      });
    }

    for (const moderator of communityTabInfo.channel.chatters.moderators) {
      this.vieverList.push({
        role: "Moderator",
        displayName: moderator.login,
        updatedAt: Date.now(),
      });
    }
    for (const vip of communityTabInfo.channel.chatters.vips) {
      this.vieverList.push({
        role: "VIP",
        displayName: vip.login,
        updatedAt: Date.now(),
      });
    }

    for (const staff of communityTabInfo.channel.chatters.staff) {
      this.vieverList.push({
        role: "Staff",
        displayName: staff.login,
        updatedAt: Date.now(),
      });
    }

    for (const viewer of communityTabInfo.channel.chatters.viewers) {
      this.vieverList.push({
        role: "Viewer",
        displayName: viewer.login,
        updatedAt: Date.now(),
      });
    }

    for (const key in this.onTwitchUserListUpdateCallbacks) {
      this.onTwitchUserListUpdateCallbacks[key](this.vieverList);
    }
  }

  public async fetchTwitchStreamData(
    username: string,
  ): Promise<Twitch_Channel_Info> {
    if (this.page != null) throw new Error("Page is already injected");

    this.page = await (
      ObjectManager.getInstance().getObject(
        BrowserManager.name,
      ) as BrowserManager
    ).spawnBlankPage();

    await this.page.goto(`https://www.twitch.tv/${username}`, {
      waitUntil: "networkidle0",
    });

    let isLive = true;

    try {
      await this.page.waitForSelector("a[status='offline']", {
        timeout: 100,
      });
      const offlineStreamElement = await this.page.$("a[status='offline']");
      if (offlineStreamElement) {
        await offlineStreamElement.click();
        isLive = false;
      } else {
        isLive = true;
      }
    } catch (_e) {}

    await this.page.waitForSelector("[data-a-target='stream-title']");

    const streamTitleElement = await this.page.$(
      "[data-a-target='stream-title']",
    );
    const streamTitle = await this.page.evaluate(
      (el) => el.textContent,
      streamTitleElement,
    );

    const streamCategoryElement = await this.page.$(
      "a[data-a-target='stream-game-link']:first-child",
    );
    const streamCategory = await this.page.evaluate(
      (el) => el.textContent,
      streamCategoryElement,
    );

    const viewerCountElement = await this.page.$(
      "p[data-a-target='animated-channel-viewers-count']",
    );
    let viewerCount = "0";
    if (viewerCountElement) {
      viewerCount = await this.page.evaluate(
        (el) => el.textContent,
        viewerCountElement,
      );
    }

    await this.page.close();
    this.onEnd();

    return {
      username,
      streamTitle,
      category: streamCategory,
      vieverCount: parseInt(viewerCount),
      isLive,
    };
  }

  public async init(username: string): Promise<void> {
    if (this.page != null) throw new Error("Page is already injected");

    this.page = await (
      ObjectManager.getInstance().getObject(
        BrowserManager.name,
      ) as BrowserManager
    ).spawnBlankPage();

    await this.page.setRequestInterception(true);

    this.page.on("request", async (request) => {
      if (request.url().includes("gql.twitch.tv/gql")) {
        try {
          const data = request.postData();
          const headers = request.headers();

          if (data) {
            if (data.includes("ChatViewers")) {
              const resp = await axios.post("https://gql.twitch.tv/gql", data, {
                headers,
              });

              for (const object of resp.data) {
                if (
                  object.extensions &&
                  object.extensions.operationName &&
                  object.extensions.operationName === "ChatViewers"
                ) {
                  await this.parseCommunityTab(object.data);
                }
              }

              request.respond({
                status: 200,
                headers: resp.headers,
                contentType: "application/json",
                body: JSON.stringify(resp.data),
              });

              this.healthMarks[
                HealthCheckTypes.graphQLHook
              ].lastSuccessTimestamp = new Date().getTime();
            } else request.continue();
          } else request.continue();
        } catch (e) {
          console.error(e);
          this.healthMarks[HealthCheckTypes.graphQLHook].errors.push({
            timestamp: Date.now(),
            error: e as Error,
          });
          request.continue();
        }
      } else request.continue();
    });

    const client = await this.page.target().createCDPSession();
    await client.send("Network.enable");

    client.on("Network.webSocketCreated", ({ url, requestId }) => {
      if (url.includes("pubsub-edge.twitch.tv")) {
        this.requestIdOfPubSub = requestId;
        this.healthMarks[HealthCheckTypes.pubSubHook].isGood = true;
      } else if (url.includes("irc-ws.chat.twitch.tv")) {
        this.requestIdOfChatIrc = requestId;
        this.healthMarks[HealthCheckTypes.ircChatHook].isGood = true;
      } else {
        console.warn(`Unknown websocket created: ${url}`);
      }
    });

    client.on("Network.webSocketClosed", ({ requestId }) => {
      if (this.requestIdOfChatIrc === requestId) {
        this.healthMarks[HealthCheckTypes.ircChatHook].errors.push({
          timestamp: Date.now(),
          error: new Error("Chat websocket closed"),
        });
        this.healthMarks[HealthCheckTypes.ircChatHook].isGood = false;
      } else if (this.requestIdOfPubSub === requestId) {
        this.healthMarks[HealthCheckTypes.pubSubHook].errors.push({
          timestamp: Date.now(),
          error: new Error("PubSub websocket closed"),
        });
        this.healthMarks[HealthCheckTypes.pubSubHook].isGood = false;
      }
    });

    client.on("Network.webSocketFrameReceived", ({ requestId, response }) => {
      if (
        requestId !== this.requestIdOfPubSub &&
        requestId !== this.requestIdOfChatIrc
      )
        return;

      if (requestId === this.requestIdOfPubSub) {
        return this.handlerOfPubSub(response.payloadData);
      } else if (requestId === this.requestIdOfChatIrc) {
        return this.handlerOfChatIrc(response.payloadData);
      }
    });

    await this.page.goto(
      `https://www.twitch.tv/popout/${username}/chat?popout=`,
      { waitUntil: "networkidle0" },
    );

    await this.page.waitForSelector("[aria-label='Users in Chat']");
    await this.internalWorker();

    this.refreshInterval = setInterval(
      this.internalWorker.bind(this),
      1000 * 60,
    );
  }

  public async getChatMembers(): Promise<TwitchChatMemeber[]> {
    return this.vieverList;
  }

  public async close(): Promise<void> {
    try {
      if (this.refreshInterval) clearInterval(this.refreshInterval);

      await this.page?.close();

      if (this.onEndCallack) this.onEndCallack();
    } catch (e) {
      console.error(e);
    }
  }
}
