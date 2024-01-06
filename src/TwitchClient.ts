import { Chat, ChatEvents } from "twitch-js";
import { default as axios } from "axios";
import { ObjectManager } from "./ObjectManager";
import { DiscordApiClient } from "./DiscordBotApiClient";
import {
  TwitchHelix_ChannelPoint_CreateReward,
  TwitchHelix_ChannelPoint_CreateReward_Response,
  TwitchHelix_ChannelPoint_GetRedemptionState,
  TwitchHelix_ChannelPoint_GetRedemptionState_Response,
  TwitchHelix_RewardStatus,
} from "./types/TwitchHelixTypes";
import WebSocket from "ws";
import { BambikWRafflu, GiwełejKontroler } from "./GiwelejKontroler";
import { AlertInfo, AlertTypes } from "./types/API";
import { STRINGS_TO_PROTECT } from "./index.local";
import { SR_QUEUE } from "./HttpServer";
import ytdl from "ytdl-core";

enum TransportMethods {
  webhook = "webhook",
  websocket = "websocket",
}

type TwitchMessage = {
  _raw: string;
  timestamp: string; // or Date if you will convert it
  command: string;
  event: string;
  channel: string;
  username: string;
  isSelf: boolean;
  message: string;
  tags: {
    badgeInfo: string;
    badges: { subscriber: number };
    clientNonce: string;
    color: string;
    displayName: string;
    emotes: Array<unknown>; // Array of a certain type if you have a structure for emotes
    firstMsg: string; // or number if it is indeed a number
    flags: string;
    id: string;
    mod: string; // or number if it is indeed a number
    returningChatter: string; // or number if it is indeed a number
    roomId: string; // or number if it is indeed a number
    subscriber: string; // or number if it is indeed a number
    tmiSentTs: string; // or number if it is indeed a number
    turbo: string; // or number if it is indeed a number
    userId: string; // or number if it is indeed a number
    userType: string;
    bits: unknown; // specify type if you know what bits should be
    emoteSets: Array<unknown>; // Array of a certain type if you have a structure for emoteSets
    username: string;
    isModerator: boolean;
  };
};

interface TwitchHelix_SubscribeBody {
  type: string;
  version: string;
  condition: Record<string, unknown>;
  transport: {
    method: TransportMethods;
    callback?: string;
    secret?: string;
    session_id?: string;
  };
}

type TwitchWS_FollowEvent = {
  payload: {
    subscription: {
      id: string;
      status: string;
      type: string;
      version: string;
      condition: unknown;
      transport: unknown;
      created_at: string;
      cost: number;
    };
    event: {
      user_id: string;
      user_login: string;
      user_name: string;
      broadcaster_user_id: string;
      broadcaster_user_login: string;
      broadcaster_user_name: string;
      followed_at: string;
    };
  };
};

enum TwitchMessageTypes {
  session_welcome = "session_welcome",
  keep_alive = "session_keepalive",
}

enum TwitchSubscriptionType {
  channelFollow = "channel.follow",
  sypukcjaOkOk = "channel.subscribe",
  sypukcjaOdPaszy = "channel.subscription.gift",
  sypukcja2OkOk = "channel.subscription.message",
  bits = "channel.cheer",
}

type TwitchWebsocketSubscribeMessage = {
  payload: {
    event: {
      user_id: string;
      user_login: string;
      user_name: string;
      broadcaster_user_id: string;
      broadcaster_user_login: string;
      broadcaster_user_name: string;
      tier: string;
      is_gift: boolean;
    };
  };
};

interface TwitchWebsocketBitsMessage {
  payload: {
    event: {
      is_anonymous: boolean;
      user_id: string | null;
      user_login: string | null;
      user_name: string | null;
      broadcaster_user_id: string;
      broadcaster_user_login: string;
      broadcaster_user_name: string;
      message: string;
      bits: number;
    };
  };
}

type TwitchWebsocketSubOdPaszy = {
  payload: {
    event: {
      user_id: string;
      user_login: string;
      user_name: string;
      broadcaster_user_id: string;
      broadcaster_user_login: string;
      broadcaster_user_name: string;
      total: number;
      tier: string;
      cumulative_total: number | null; //null if anonymous or not shared by the user
      is_anonymous: boolean;
    };
  };
};

type TwitchWebsocketMetadata = {
  metadata: {
    message_id: string;
    message_type: TwitchMessageTypes;
    message_timestamp: string;
    subscription_type?: TwitchSubscriptionType;
  };
};

type TwitchWelcomeWebsocketMessage = {
  payload: {
    session: {
      id: string;
      status: string;
      connected_at: string;
      keepalive_timeout_seconds: number;
      reconnect_url: string | null;
    };
  };
};

const Entitsy = [
  "MARSHALL",
  "PAPIEŻKOPTER",
  "MAŁYSZ",
  "KUBICA",
  "TESTO",
  "MARIUSZ",
  "PREZENTKONON",
  "PREMIER",
  "ZONK", // BRAUN
];

export class TwitchClient {
  private chatClient?: Chat;

  private wsClientPubSub?: WebSocket;

  private static instance: TwitchClient;

  private sypukenciWyswietleni: { [id: string]: boolean } = {};

  private TWITCH_ACCESS_TOKEN = process.env.TWITCH_ACCESS_TOKEN || "dupsko";
  private TWITCH_REFRESH_TOKEN = process.env.TWITCH_REFRESH_TOKEN || "dupsko";
  private TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || "dupsko";
  private TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || "dupsko";
  private TWITCH_CZANEL = "fvlvte";
  private FULFTE_CHANNEL_ID = "268563714";

  private kohaneFolowkiMeowAraAra: string[] = [];
  private keepAliveTsLast = new Date().getTime();
  private isWebSocketRestarting = false;

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

  private async handleFollowEvent(msg: TwitchWS_FollowEvent) {
    const { user_name } = msg.payload.event;
    if (this.sypukenciWyswietleni[user_name]) return;
    this.eventQueue.default.push({
      type: AlertTypes.SUB_GIFCIK,
      innerHtml: `${user_name} dzięki za folow`,
      duration: 21370 / 2,
      entities: [Entitsy[Math.floor(Math.random() * 5)]],
    });
    this.kohaneFolowkiMeowAraAra.push(`${user_name} dzięki za folow`);
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

  public async strzelZUcha(msg: string) {
    try {
      this.chatClient?.say("fvlvte", msg);
    } catch (e) {
      console.error(e);
    }
  }

  public popKochanegoFolowka(): string | undefined {
    return this.kohaneFolowkiMeowAraAra.shift();
  }

  public getEventFromFeed(feedId: string = "default"): AlertInfo | undefined {
    return this.eventQueue[feedId].shift();
  }

  private async handleWelcomeMessage(msg: TwitchWelcomeWebsocketMessage) {
    await this.subscribeToHelix({
      type: TwitchSubscriptionType.channelFollow,
      version: "2",
      condition: {
        broadcaster_user_id: this.FULFTE_CHANNEL_ID,
        moderator_user_id: this.FULFTE_CHANNEL_ID,
      },
      transport: {
        method: TransportMethods.websocket,
        session_id: msg.payload.session.id,
      },
    });

    await this.subscribeToHelix({
      type: TwitchSubscriptionType.sypukcjaOdPaszy,
      version: "1",
      condition: {
        broadcaster_user_id: this.FULFTE_CHANNEL_ID,
        moderator_user_id: this.FULFTE_CHANNEL_ID,
      },
      transport: {
        method: TransportMethods.websocket,
        session_id: msg.payload.session.id,
      },
    });

    await this.subscribeToHelix({
      type: TwitchSubscriptionType.sypukcjaOkOk,
      version: "1",
      condition: {
        broadcaster_user_id: this.FULFTE_CHANNEL_ID,
        moderator_user_id: this.FULFTE_CHANNEL_ID,
      },
      transport: {
        method: TransportMethods.websocket,
        session_id: msg.payload.session.id,
      },
    });

    await this.subscribeToHelix({
      type: TwitchSubscriptionType.sypukcja2OkOk,
      version: "1",
      condition: {
        broadcaster_user_id: this.FULFTE_CHANNEL_ID,
        moderator_user_id: this.FULFTE_CHANNEL_ID,
      },
      transport: {
        method: TransportMethods.websocket,
        session_id: msg.payload.session.id,
      },
    });

    await this.subscribeToHelix({
      type: TwitchSubscriptionType.bits,
      version: "1",
      condition: {
        broadcaster_user_id: this.FULFTE_CHANNEL_ID,
        moderator_user_id: this.FULFTE_CHANNEL_ID,
      },
      transport: {
        method: TransportMethods.websocket,
        session_id: msg.payload.session.id,
      },
    });
  }

  private async onWebsocketMessage(
    data: TwitchWebsocketMetadata,
  ): Promise<void> {
    if (
      data.metadata.subscription_type &&
      data.metadata.subscription_type === TwitchSubscriptionType.channelFollow
    ) {
      await this.handleFollowEvent(data as unknown as TwitchWS_FollowEvent);
    } else if (
      data.metadata.subscription_type &&
      data.metadata.subscription_type === TwitchSubscriptionType.sypukcjaOkOk
    ) {
      await this.handleSypukent(
        data as unknown as TwitchWebsocketSubscribeMessage,
      );
    } else if (
      data.metadata.subscription_type &&
      data.metadata.subscription_type === TwitchSubscriptionType.sypukcjaOdPaszy
    ) {
      await this.handlePasza(data as unknown as TwitchWebsocketSubOdPaszy);
    } else if (
      data.metadata.subscription_type &&
      data.metadata.subscription_type === TwitchSubscriptionType.sypukcja2OkOk
    ) {
      await this.handleSypukent(
        data as unknown as TwitchWebsocketSubscribeMessage,
      );
    } else if (
      data.metadata.subscription_type &&
      data.metadata.subscription_type === TwitchSubscriptionType.bits
    ) {
      await this.handleBitsDajPieniondz(
        data as unknown as TwitchWebsocketBitsMessage,
      );
    } else if (
      data.metadata.message_type === TwitchMessageTypes.session_welcome
    ) {
      await this.handleWelcomeMessage(
        data as unknown as TwitchWelcomeWebsocketMessage,
      );
    } else if (data.metadata.message_type === TwitchMessageTypes.keep_alive) {
      this.keepAliveTsLast = new Date().getTime();
      //console.log(data);
    }
  }

  static getInstance(): TwitchClient {
    return TwitchClient.instance;
  }

  constructor() {
    TwitchClient.instance = this;
    this.chatClient = new Chat({
      username: this.TWITCH_CZANEL,
      token: this.TWITCH_ACCESS_TOKEN,
      log: { enabled: false },
    });
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

  async getRedemptions(
    param: TwitchHelix_ChannelPoint_GetRedemptionState,
  ): Promise<TwitchHelix_ChannelPoint_GetRedemptionState_Response | null> {
    try {
      const searchParams = new URLSearchParams(
        param as unknown as Record<string, string>,
      );
      const result =
        await axios.get<TwitchHelix_ChannelPoint_GetRedemptionState_Response>(
          `https://api.twitch.tv/helix/channel_points/custom_rewards?${searchParams.toString()}`,
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

  async setRedemptionState(
    broadcasterId: string,
    id: string,
    rewardId: string,
    status: TwitchHelix_RewardStatus,
  ) {
    try {
      const queryParam = new URLSearchParams({
        broadcast_id: broadcasterId,
        id,
        reward_id: rewardId,
      });
      await axios.patch(
        `https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?${queryParam.toString()}`,
        {
          status: status,
        },
        {
          headers: {
            "client-id": this.TWITCH_CLIENT_ID,
            Authorization: `Bearer ${this.TWITCH_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );
    } catch (e) {
      console.error(`anti leak dupsko xd`);
    }
  }

  /*
 const cvLllol = await axios.get(
  `https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?broadcaster_id=${"268563714"}&reward_id=${"e3c5caa2-84cc-4689-b74f-7e989d5f1ddb"}&status=${"UNFULFILLED"}`,
  {
    headers: {
      "client-id": TWITCH_CLIENT_ID,
      Authorization: `Bearer ${TWITCH_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  }
);

  */

  /*async getRedemptions() {
    try {
      const queryParam = new URLSearchParams({
        broadcast_id: broadcasterId,
        id,
        reward_id: rewardId,
      });
      await axios.patch(
        `https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?${queryParam.toString()}`,
        {
          status: status,
        },
        {
          headers: {
            "client-id": TWITCH_CLIENT_ID,
            Authorization: `Bearer ${TWITCH_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (e) {
      console.error(`anti leak dupsko xd`);
    }
  }*/

  async guwnoxd() {
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
      STRINGS_TO_PROTECT.push(tokenRefresh.data.access_token);
    } catch (e) {
      console.error(e);
    }
  }

  //async proces() {}

  async workerPrzymusowy() {
    try {
      const cvLllol = await axios.get(
        `https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?broadcaster_id=${"268563714"}&reward_id=${"e3c5caa2-84cc-4689-b74f-7e989d5f1ddb"}&status=${"UNFULFILLED"}`,
        {
          headers: {
            "client-id": this.TWITCH_CLIENT_ID,
            Authorization: `Bearer ${this.TWITCH_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );

      //console.log(cvLllol.data.data);

      for (const item of cvLllol.data.data) {
        const dscClient = ObjectManager.getInstance().getObject(
          DiscordApiClient.name,
        ) as DiscordApiClient;

        await dscClient.giveRoleToUser(item.user_input);

        await axios.patch(
          `https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?broadcaster_id=${"268563714"}&reward_id=${"e3c5caa2-84cc-4689-b74f-7e989d5f1ddb"}&id=${
            item.id
          }&status=${"FULFILLED"}`,
          {},
          {
            headers: {
              "client-id": this.TWITCH_CLIENT_ID,
              Authorization: `Bearer ${this.TWITCH_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
          },
        );
      }
    } catch (e) {
      //console.error("penis antileak");
      console.error(e);
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
        `${
          this.constructor.name
        }: WSS ${"wss://eventsub.wss.twitch.tv/ws"} opened!`,
      );
    });

    this.wsClientPubSub.on("close", () => {
      if (!this.isWebSocketRestarting) this.setUpWebsockets();
    });

    this.wsClientPubSub.on("message", (data: Buffer) => {
      const jsonData = JSON.parse(data.toString());
      this.onWebsocketMessage(jsonData);
    });
  }

  async guwnoxdLol() {
    try {
      await this.guwnoxd();

      setInterval(this.guwnoxd.bind(this), 1000 * 60 * 30);

      this.chatClient = new Chat({
        username: this.TWITCH_CZANEL,
        token: this.TWITCH_ACCESS_TOKEN,
        log: { enabled: false },
      });

      await this.chatClient?.connect();

      await this.chatClient?.join("fvlvte");
      await this.chatClient?.say(
        "fvlvte",
        "czy jakas ladna streamerka mi zamiauczy :3 ????",
      );

      await this.chatClient?.say(
        "fvlvte",
        "czuje egirla SNIFFA SNIFFA SNIFFA SNIFFA",
      );

      this.setUpWebsockets();

      const spamChamCounter = new Map<string, number>();

      //setInterval(this.workerPrzymusowy.bind(this), 10000);

      this.chatClient?.on(ChatEvents.ALL, async (xdd) => {
        const duxpo = xdd as unknown as TwitchMessage;
        if (!duxpo.message) return;

        if (duxpo.message.toLowerCase() === "!knurdajprezent") {
          if (!spamChamCounter.get(duxpo.username))
            spamChamCounter.set(duxpo.username, 1);
          else
            spamChamCounter.set(
              duxpo.username,
              spamChamCounter.get(duxpo.username) || 0 + 1,
            );

          const typescriptDlaczegoNie =
            spamChamCounter.get(duxpo.username) || 0;
          if (typescriptDlaczegoNie > 3) {
            await this.chatClient?.timeout("fvlvte", duxpo.username, 2137);
          }

          await GiwełejKontroler.instance.addBambikToGiwełej(
            new BambikWRafflu(
              duxpo.username,
              typeof duxpo.tags.badges.subscriber === "number",
            ),
          );
        } else if (duxpo.message.toLowerCase().includes("!giveway")) {
          await this.chatClient?.say(
            "fvlvte",
            `@${duxpo.username} brawo WYGRAŁEŚ :3 :3 meow :3 oto twoje Visual Studio Code https://code.visualstudio.com/sha/download?build=stable&os=win32-user`,
          );
        } else if (duxpo.message.toLowerCase().includes("!projekt")) {
          await this.chatClient?.say(
            "fvlvte",
            `@${duxpo.username} robimy teraz gre https://github.com/fvlvte/czysta-c-gjerka`,
          );
        } else if (duxpo.message.toLowerCase().includes("!knurstartprezent")) {
          spamChamCounter.clear();
          if (duxpo.username === "fvlvte") {
            const araArray = duxpo.message.split(" ");
            araArray.splice(0, 1);
            await GiwełejKontroler.instance.createGiwełej(araArray.join(" "));
          }
        } else if (duxpo.message.toLowerCase().includes("!knurzamknij")) {
          if (duxpo.username === "fvlvte") {
            await GiwełejKontroler.instance.closeGiwełej();
          }
        } else if (duxpo.message.toLowerCase().includes("!knursr")) {
          const ytLink = duxpo.message.split(" ")[1];

          ytdl
            .getInfo(ytLink)
            .then((info) => {
              const username = duxpo.username;
              const title = info.videoDetails.title;
              const length = parseInt(info.videoDetails.lengthSeconds);
              const thumb = info.videoDetails.thumbnails[0].url;

              const category = info.videoDetails.category;
              const ageRestricted = info.videoDetails.age_restricted;

              const allowedCategory = ["Gaming", "Music", "People & Blogs"];

              const bannedRury = ["shadoweeee"];

              if (
                title.toLowerCase().replace(/[\w]+/g, "").includes("earrape") ||
                title.toLowerCase().includes("ear rape")
              ) {
                this.chatClient?.say(
                  "fvlvte",
                  `@${duxpo.username} matke se z uho rapuj`,
                );
                return;
              }

              if (bannedRury.includes(username)) {
                this.chatClient?.say(
                  "fvlvte",
                  `@${duxpo.username} banned rura`,
                );
                return;
              }

              const views = info.videoDetails.viewCount;
              if (parseInt(views) < 21370) {
                this.chatClient?.say(
                  "fvlvte",
                  `@${duxpo.username} za malo wjusuw sory (21370)`,
                );
                return;
              }

              if (!allowedCategory.includes(category) || ageRestricted) {
                this.chatClient?.say(
                  "fvlvte",
                  `@${duxpo.username} sory niedozwolona kategoria (${category})`,
                );
                return;
              }
              if (length > 60 * 5) {
                this.chatClient?.say(
                  "fvlvte",
                  `@${duxpo.username} sory za dlugie (max 5 min)`,
                );
                return;
              }

              this.chatClient?.say(
                "fvlvte",
                `@${duxpo.username} dodaned do kolejki - pozycja ${
                  SR_QUEUE.length + 1
                }`,
              );

              const stream = ytdl(ytLink, { filter: "audio" });
              const buffers: Buffer[] = [];
              stream.on("data", function (buf: Buffer) {
                buffers.push(buf);
              });
              stream.on("end", function () {
                const data = Buffer.concat(buffers);
                SR_QUEUE.push({
                  mediaBase64: data.toString("base64"),
                  title: title,
                  requestedBy: username,
                  coverImage: thumb,
                });
              });
            })
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .catch((_e: unknown) => {
              this.chatClient?.say(
                "fvlvte",
                `@${duxpo.username} nie znalazlem mordo xd`,
              );
            });
          // }
        } else if (duxpo.message.toLowerCase().includes("!knurprezent")) {
          await GiwełejKontroler.instance.getOkuratneInfo(
            new BambikWRafflu(
              duxpo.username,
              typeof duxpo.tags.badges.subscriber === "number",
            ),
          );
        }
      });
    } catch (e) {
      console.error(e);
    }
  }
}
