import { Chat, ChatEvents, Messages } from "twitch-js";
import { default as axios } from "axios";
import {
  TwitchHelix_ChannelPoint_CreateReward,
  TwitchHelix_ChannelPoint_CreateReward_Response,
} from "../types/TwitchHelixTypes";
import WebSocket from "ws";
import { AlertInfo, AlertTypes } from "../types/API";
import { SecretsGuard } from "../util/SecretsGuard";
import { Songrequest } from "../features/Songrequest";
import { CommandHandler } from "../commands/CommandHandler";
import { CreateReward } from "../commands/CreateReward";
import { ReloadLocale } from "../commands/ReloadLocale";
import { FileReward } from "../types/FileReward";
import { SongRequestReputationVote } from "../commands/SongRequest/SongRequestReputationVote";
import {
  Entitsy,
  TransportMethods,
  TwitchHelix_SubscribeBody,
  TwitchMessage,
  TwitchMessageTypes,
  TwitchSubscriptionType,
  TwitchUserData,
  TwitchWebsocketBitsMessage,
  TwitchWebsocketMetadata,
  TwitchWebsocketRewardRedemption,
  TwitchWebsocketSubOdPaszy,
  TwitchWebsocketSubscribeMessage,
  TwitchWelcomeWebsocketMessage,
  TwitchWS_FollowEvent,
} from "../types/TwitchTypes";
import { SongRequestAdd } from "../commands/SongRequest/SongRequestAdd";
import { SongRequestQueue } from "../commands/SongRequest/SongRequestQueue";
import { SongRequestCurrent } from "../commands/SongRequest/SongRequestCurrent";
import { SongRequestSkipVote } from "../commands/SongRequest/SongRequestSkipVote";
import { SongRequestWrongSong } from "../commands/SongRequest/SongRequestWrongSong";
import { SongRequestMySong } from "../commands/SongRequest/SongRequestMySong";
import { StaticText } from "../commands/StaticText";
import { Timer } from "../timers/Timer";
import { StaticTextTimer } from "../timers/StaticTextTimer";
import { SongRequestWipe } from "../commands/SongRequest/SongRequestWipe";
import { MongoDBClient } from "./MongoDBClient";
import { SongRequestVolumeSet } from "../commands/SongRequest/SongRequestVolumeSet";
import { Logger } from "../util/Logger";

export class TwitchClient {
  constructor(refreshToken: string, userId: string) {
    this.streamerId = userId;
    this.TWITCH_REFRESH_TOKEN = refreshToken;
  }

  private TWITCH_ACCESS_TOKEN = process.env.TWITCH_ACCESS_TOKEN || "dupsko";
  private TWITCH_REFRESH_TOKEN = process.env.TWITCH_REFRESH_TOKEN || "dupsko";
  private TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || "dupsko";
  private TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || "dupsko";
  private TWITCH_BOT_REFRESH_TOKEN =
    process.env.TWITCH_BOT_REFRESH_TOKEN ?? "dupa";
  private TWITCH_BOT_ACCESS_TOKEN = "dupablada";

  private commandHandlers: CommandHandler[] = [
    new CreateReward(),
    new ReloadLocale(),
    new SongRequestReputationVote(),
    new SongRequestAdd(),
    new SongRequestQueue(),
    new SongRequestCurrent(),
    new SongRequestSkipVote(),
    new SongRequestWrongSong(),
    new SongRequestVolumeSet(),
    new SongRequestMySong(),
    new SongRequestWipe(),
    new StaticText(
      "SOCIALS_DISCORD",
      /^(!dc)|(!discord)|(!dsc)|(!jakijestserwerdiskord)\s*$/i,
    ),
    new StaticText(
      "SOCIALS_YT",
      /^(!yt)|(!youtube)|(!yubetube)|(!jakijestyutube)\s*$/i,
    ),
    new StaticText(
      "SOCIALS_PROJECT",
      /^(!projekt)|(!project)|(!cotykurwarobisz)|(!github)|(!gh)\s*$/i,
    ),
    new StaticText(
      "INFO_KNURCAMP",
      /^(!knurcamp)|(!camp)|(!butkamp)|(!bootcamp)\s*$/i,
    ),
  ];

  private timers: Timer[] = [
    new StaticTextTimer("TIMER_DISCORD", 1000 * 60 * 15),
    new StaticTextTimer("TIMER_YT", 1000 * 60 * 33),
  ];

  private chatClient?: Chat;
  private wsClientPubSub?: WebSocket;

  private sypukenciWyswietleni: { [id: string]: boolean } = {};

  private kohaneFolowkiMeowAraAra: string[] = [];
  private keepAliveTsLast = new Date().getTime();
  private isWebSocketRestarting = false;
  private isClosing = false;

  private refreshInterval?: NodeJS.Timeout;

  // internal id
  private streamerId?: string;
  // login
  private streamerLogin?: string;
  // display login (name)
  private displayName?: string;

  private eventQueue: { [queueId: string]: AlertInfo[] } = {
    default: [],
  };

  private async handlePasza(msg: TwitchWebsocketSubOdPaszy) {
    const { user_name, total } = msg.payload.event;
    this.eventQueue.default.push({
      type: AlertTypes.SUB_GIFCIK,
      innerHtml: `${user_name} dzięki za ${total} sypukcji w prezencie`,
      duration: 21370,
      entities: Entitsy,
    });
    this.kohaneFolowkiMeowAraAra.push(
      `${user_name} dzięki za ${total} sypukcji w prezencie`,
    );
  }

  getLastKeepAliveTick() {
    return this.keepAliveTsLast;
  }

  private async handleRewardRedemption(msg: TwitchWebsocketRewardRedemption) {
    const data = msg.payload.event;
    const rewardId = data.reward.id;

    const record =
      await MongoDBClient.getDefaultInstance().getRewardById(rewardId);

    if (record) {
      const dt: FileReward = record as unknown as FileReward;

      switch (dt.type) {
        case "SOUND_ALERT": {
          await Songrequest.getInstance(this.streamerId).tryAddSong(
            dt.param,
            { subLevel: 0, username: data.user_login },
            true,
          );
          break;
        }
        case "SR_SKIP_QUEUE": {
          Songrequest.getInstance(this.streamerId).tryAppendSongNoVerify(
            dt.param,
            { subLevel: 0, username: data.user_login },
            true,
          );
          break;
        }
        case "SKIP_SR": {
          Songrequest.getInstance(this.streamerId).skip();
          break;
        }
      }
    }
  }

  private async handleSypukent(msg: TwitchWebsocketSubscribeMessage) {
    const { user_name } = msg.payload.event;
    this.eventQueue.default.push({
      type: AlertTypes.SUB_GIFCIK,
      innerHtml: `${user_name} dzięki za sypukcje`,
      duration: 21370,
      entities: Entitsy,
    });
    this.kohaneFolowkiMeowAraAra.push(`${user_name} dzięki za sypukcje`);
  }

  private async handleBitsDajPieniondz(msg: TwitchWebsocketBitsMessage) {
    const { user_name, bits, message } = msg.payload.event;

    if (bits < 100) return;

    this.eventQueue.default.push({
      type: AlertTypes.SUB_GIFCIK,
      innerHtml: `${user_name} dzięki za pieniondz ${bits} $ \n ${message}`,
      duration: 21370,
      entities: Entitsy,
    });
    this.kohaneFolowkiMeowAraAra.push(
      `${user_name} dzięki za pieniondz ${bits} $ \n ${message}`,
    );
  }

  // @es-lint-ignore no-unused-vars
  private async handleFollowEvent(msg: TwitchWS_FollowEvent) {
    const { user_name } = msg.payload.event;

    /*if (this.sypukenciWyswietleni[user_name]) return;
    this.eventQueue.default.push({
      type: AlertTypes.SUB_GIFCIK,
      innerHtml: `${user_name} dzięki za folow`,
      duration: 21370 / 2,
      entities: [Entitsy[Math.floor(Math.random() * 5)]],
    });*/
    //this.kohaneFolowkiMeowAraAra.push(`${user_name} dzięki za folow`);
    this.sypukenciWyswietleni[user_name] = true;
  }

  public async dupnijFolowaByku() {
    this.eventQueue.default.push({
      type: AlertTypes.SUB_GIFCIK,
      innerHtml: "DZIENKI ZA SUBA NIIIGHTM4R3 UWU UWU MEOW :3",
      duration: 21370 / 2,
      entities: [...Entitsy],
    });
    this.kohaneFolowkiMeowAraAra.push(
      "DZIENKI ZA SUBA NIIIGHTM4R3 UWU UWU MEOW :3",
    );
  }

  public popKochanegoFolowka(): string | undefined {
    return this.kohaneFolowkiMeowAraAra.shift();
  }

  public getEventFromFeed(feedId: string = "default"): AlertInfo | undefined {
    return this.eventQueue[feedId].shift();
  }

  private async handleWelcomeMessage(msg: TwitchWelcomeWebsocketMessage) {
    try {
      await this.subscribeToHelix({
        type: TwitchSubscriptionType.channelFollow,
        version: "2",
        condition: {
          broadcaster_user_id: this.streamerId,
          moderator_user_id: this.streamerId,
        },
        transport: {
          method: TransportMethods.websocket,
          session_id: msg.payload.session.id,
        },
      });
    } catch (e) {
      console.error(e);
    }

    try {
      await this.subscribeToHelix({
        type: TwitchSubscriptionType.sypukcjaOdPaszy,
        version: "1",
        condition: {
          broadcaster_user_id: this.streamerId,
          moderator_user_id: this.streamerId,
        },
        transport: {
          method: TransportMethods.websocket,
          session_id: msg.payload.session.id,
        },
      });
    } catch (e) {
      console.error(e);
    }
    try {
      await this.subscribeToHelix({
        type: TwitchSubscriptionType.pointsRedemption,
        version: "1",
        condition: {
          broadcaster_user_id: this.streamerId,
        },
        transport: {
          method: TransportMethods.websocket,
          session_id: msg.payload.session.id,
        },
      });
    } catch (e) {
      console.error(e);
    }

    try {
      await this.subscribeToHelix({
        type: TwitchSubscriptionType.sypukcjaOkOk,
        version: "1",
        condition: {
          broadcaster_user_id: this.streamerId,
          moderator_user_id: this.streamerId,
        },
        transport: {
          method: TransportMethods.websocket,
          session_id: msg.payload.session.id,
        },
      });
    } catch (e) {
      console.error(e);
    }

    try {
      await this.subscribeToHelix({
        type: TwitchSubscriptionType.sypukcja2OkOk,
        version: "1",
        condition: {
          broadcaster_user_id: this.streamerId,
          moderator_user_id: this.streamerId,
        },
        transport: {
          method: TransportMethods.websocket,
          session_id: msg.payload.session.id,
        },
      });
    } catch (e) {
      console.error(e);
    }

    try {
      await this.subscribeToHelix({
        type: TwitchSubscriptionType.bits,
        version: "1",
        condition: {
          broadcaster_user_id: this.streamerId,
          moderator_user_id: this.streamerId,
        },
        transport: {
          method: TransportMethods.websocket,
          session_id: msg.payload.session.id,
        },
      });
    } catch (e) {
      console.error(e);
    }
  }

  public async getBroadcasterId(): Promise<string> {
    return this.streamerId ?? "";
  }

  private async onWebsocketMessage(
    data: TwitchWebsocketMetadata,
  ): Promise<void> {
    if (data.metadata.message_type === TwitchMessageTypes.session_welcome) {
      await this.handleWelcomeMessage(
        data as unknown as TwitchWelcomeWebsocketMessage,
      );
    } else if (data.metadata.subscription_type) {
      switch (data.metadata.subscription_type) {
        case TwitchSubscriptionType.channelFollow:
          await this.handleFollowEvent(data as unknown as TwitchWS_FollowEvent);
          break;
        case TwitchSubscriptionType.sypukcjaOkOk:
          //TimerController.getInstance().incrementTimer(-1 * 10 * 60);
          await this.handleSypukent(
            data as unknown as TwitchWebsocketSubscribeMessage,
          );
          break;
        case TwitchSubscriptionType.sypukcjaOdPaszy:
          await this.handlePasza(data as unknown as TwitchWebsocketSubOdPaszy);
          break;
        case TwitchSubscriptionType.pointsRedemption:
          await this.handleRewardRedemption(
            data as unknown as TwitchWebsocketRewardRedemption,
          );
          break;
        case TwitchSubscriptionType.sypukcja2OkOk:
          await this.handleSypukent(
            data as unknown as TwitchWebsocketSubscribeMessage,
          );
          break;
        case TwitchSubscriptionType.bits:
          await this.handleBitsDajPieniondz(
            data as unknown as TwitchWebsocketBitsMessage,
          );
          break;
      }
    }
  }

  async subscribeToHelix(param: TwitchHelix_SubscribeBody): Promise<void> {
    try {
      await axios.post<TwitchHelix_ChannelPoint_CreateReward_Response>(
        `https://api.twitch.tv/helix/eventsub/subscriptions`,
        param,
        {
          headers: {
            Authorization: `Bearer ${this.TWITCH_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
            "client-id": this.TWITCH_CLIENT_ID,
          },
        },
      );
    } catch (e) {
      console.error(e);
      console.error(`antileak klucza ok ok error 69 pl`);
    }
  }

  async createNewReward(
    broadcasterId: string,
    param: TwitchHelix_ChannelPoint_CreateReward,
  ): Promise<TwitchHelix_ChannelPoint_CreateReward_Response | null> {
    try {
      const result =
        await axios.post<TwitchHelix_ChannelPoint_CreateReward_Response>(
          `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${broadcasterId}`,
          param,
          {
            headers: {
              Authorization: `Bearer ${this.TWITCH_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
              "client-id": this.TWITCH_CLIENT_ID,
            },
          },
        );
      return result.data;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async setUpStreamerCredentials(): Promise<boolean> {
    try {
      const tokenRefresh = await axios.post(
        `https://id.twitch.tv/oauth2/token`,
        `grant_type=refresh_token&refresh_token=${this.TWITCH_REFRESH_TOKEN}&client_id=${this.TWITCH_CLIENT_ID}&client_secret=${this.TWITCH_CLIENT_SECRET}`,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      this.TWITCH_ACCESS_TOKEN = tokenRefresh.data.access_token;
      SecretsGuard.getInstance().putSecret(tokenRefresh.data.access_token);

      const botTokenRefresh = await axios.post(
        `https://id.twitch.tv/oauth2/token`,
        `grant_type=refresh_token&refresh_token=${this.TWITCH_BOT_REFRESH_TOKEN}&client_id=${this.TWITCH_CLIENT_ID}&client_secret=${this.TWITCH_CLIENT_SECRET}`,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      this.TWITCH_BOT_ACCESS_TOKEN = botTokenRefresh.data.access_token;
      SecretsGuard.getInstance().putSecret(botTokenRefresh.data.access_token);

      const userInfo = await axios.get<{ data: TwitchUserData[] }>(
        "https://api.twitch.tv/helix/users",
        {
          headers: {
            "Client-Id": this.TWITCH_CLIENT_ID,
            Authorization: `Bearer ${this.TWITCH_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );

      const { display_name, id, login } = userInfo.data.data[0];

      this.streamerId = id;
      this.displayName = display_name;
      this.streamerLogin = login;

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async setUpWebsockets() {
    this.isWebSocketRestarting = true;
    this.keepAliveTsLast = new Date().getTime();

    try {
      if (this.wsClientPubSub) {
        if (this.wsClientPubSub.readyState === this.wsClientPubSub.OPEN) {
          this.wsClientPubSub.close();
        }
      }
    } catch (e) {
      console.error(e);
    }

    this.wsClientPubSub = new WebSocket("wss://eventsub.wss.twitch.tv/ws");

    this.wsClientPubSub.on("open", () => {
      this.isWebSocketRestarting = false;
      console.log(
        `${this.constructor.name}: WSS ${"wss://eventsub.wss.twitch.tv/ws"} opened for ${this.streamerId}`,
      );
    });

    this.wsClientPubSub.on("close", () => {
      if (this.isClosing) return;
      if (!this.isWebSocketRestarting) this.setUpWebsockets();
    });

    this.wsClientPubSub.on("message", (data: Buffer) => {
      const jsonData = JSON.parse(data.toString());
      this.onWebsocketMessage(jsonData);
    });
  }

  async getStreamerUsername(): Promise<string> {
    return this.streamerLogin ?? "";
  }

  async getBotUsername(): Promise<string> {
    return "fvlvtebot";
  }

  async getStreamLanguage(): Promise<string> {
    return "pl";
  }

  async dispatchBotMessage(message: string) {
    try {
      await this.chatClient?.say(await this.getStreamerUsername(), message);
    } catch (e) {
      console.error(e);
    }
  }

  private async onIrcMessage(msg: Messages): Promise<void> {
    const castedMessage = msg as unknown as TwitchMessage;

    if (!castedMessage.message) return;

    console.log(castedMessage.tags.id);

    if (
      castedMessage.message.startsWith("!") ||
      castedMessage.message.startsWith("?")
    ) {
      for (const handler of this.commandHandlers) {
        if (castedMessage.message.match(handler.getMatchingExp()) !== null) {
          return await handler.preHandleCommand(this, castedMessage);
        }
      }
    }
  }

  private async printChatMOTD() {
    if (this.chatClient) {
      try {
        await this.chatClient.say(
          await this.getStreamerUsername(),
          "czy jakas ladna streamerka mi zamiauczy :3 ????",
        );

        await this.chatClient.say(
          await this.getStreamerUsername(),
          "czuje egirla SNIFFA SNIFFA SNIFFA SNIFFA",
        );

        await this.chatClient.say(
          await this.getStreamerUsername(),
          `KNUROBOT (wersja ${
            process.env.BUILD_TS ?? "local"
          }) sie włonczył :3`,
        );
      } catch (e) {
        if (e instanceof Error) {
          Logger.getInstance().error("Failed to print MOTD.", {
            class: this.constructor.name,
            userId: this.streamerId,
            error: { name: e.name, message: e.message, stack: e.stack },
          });
        }
      }
    }
  }

  private async printChatShutdown() {
    if (this.chatClient) {
      try {
        await this.chatClient.say(
          await this.getStreamerUsername(),
          `KNUROBOT sie wyłonczył :3`,
        );
      } catch (e) {
        if (e instanceof Error) {
          Logger.getInstance().error("Failed to print shutdown notice.", {
            class: this.constructor.name,
            userId: this.streamerId,
            error: { name: e.name, message: e.message, stack: e.stack },
          });
        }
      }
    }
  }
  private async setUpChatClient() {
    if (this.chatClient) {
      try {
        this.chatClient.removeAllListeners(ChatEvents.ALL);
        await this.chatClient.disconnect();
      } catch (e) {
        if (e instanceof Error) {
          Logger.getInstance().error(
            "Failed to clean up existing chat client.",
            {
              class: this.constructor.name,
              userId: this.streamerId,
              error: { name: e.name, message: e.message, stack: e.stack },
            },
          );
        }
      }
    }
    try {
      this.chatClient = new Chat({
        username: await this.getBotUsername(),
        token: this.TWITCH_BOT_ACCESS_TOKEN,
        log: { enabled: false },
      });

      // Connect to TTV IRC.
      await this.chatClient.connect();

      // Join target streamer's IRC channel.
      await this.chatClient.join(await this.getStreamerUsername());

      // Set up event listener.
      this.chatClient.on(ChatEvents.ALL, this.onIrcMessage.bind(this));

      await this.printChatMOTD();
    } catch (e) {
      if (e instanceof Error) {
        Logger.getInstance().error(
          "Failed to spin up new chat client instance.",
          {
            class: this.constructor.name,
            userId: this.streamerId,
            error: { name: e.name, message: e.message, stack: e.stack },
          },
        );
      }
    }
  }

  async initialize() {
    try {
      await this.setUpStreamerCredentials();

      this.refreshInterval = setInterval(
        this.setUpStreamerCredentials.bind(this),
        1000 * 60 * 30,
      );

      await this.setUpChatClient();
      await this.setUpWebsockets();

      for (const timer of this.timers) {
        timer.init(this);
      }
    } catch (e) {
      console.error(e);
    }
  }

  keepAliveTick() {
    this.keepAliveTsLast = new Date().getTime();
  }

  async shutdown() {
    this.isClosing = true;

    await this.printChatShutdown();

    this.chatClient?.disconnect();
    this.wsClientPubSub?.close();

    clearInterval(this.refreshInterval);

    for (const timer of this.timers) timer.shut();
  }
}
