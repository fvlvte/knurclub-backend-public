import { CDPSession, HTTPRequest, Page } from "puppeteer";
import { DataFeed } from "../interfaces/DataFeed";
import { BrowserManager } from "../BrowserManager";
import { default as axios } from "axios";
import { readFileSync } from "fs";
import path from "path";
import { default as pako } from "pako";
import {
  Discord_WS_User_D_Info,
  Discord_WS_User_Info,
} from "../types/DiscordTypes";

enum DiscordDataFeedState {
  IDLE,
  INITIALIZED,
}

async function sleep(interval: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, interval);
  });
}

function base64ToUint8Array(base64: string) {
  const binaryBuffer = Buffer.from(base64, "base64");
  const bytes = new Uint8Array(binaryBuffer.byteLength);
  for (let i = 0; i < binaryBuffer.byteLength; i++) {
    bytes[i] = binaryBuffer[i];
  }
  return bytes;
}

export enum DiscordDataFeedEvent {
  USER_LIST_UPDATE = "USER_LIST_UPDATE",
}

export class DiscordDataFeed implements DataFeed {
  private page: Page | null;

  constructor() {
    this.page = null;
    console.log(this.constructor.name);
  }

  private inflate = new pako.Inflate({
    to: "string",
    windowBits: 47,
    chunkSize: 65536 * 128,
  });
  private onEndCallack?: () => void;
  private workerInterval?: NodeJS.Timeout;
  private state: DiscordDataFeedState = DiscordDataFeedState.IDLE;
  private readonly workerIntervalTimeMin = 1000 * 10;
  private readonly workerIntervalTimeMax = 1000 * 20;

  private onUserListUpdateCallbacks: {
    [id: number]: (userlist: Discord_WS_User_Info[]) => unknown;
  } = {};

  public on(
    eventType: DiscordDataFeedEvent,
    callback: (data: Discord_WS_User_Info[]) => void,
  ): number {
    switch (eventType) {
      case DiscordDataFeedEvent.USER_LIST_UPDATE:
        const id = Math.random();
        this.onUserListUpdateCallbacks[id] = callback;
        return id;
      default:
        throw new Error("Unknown event type");
    }
  }

  private mashallahHotPatchApplied = false;
  private client: CDPSession | null = null;
  private gatewayRequestId = -1;
  private defaultServerId = "934812690390605884";
  private defaultChannelId = "964679871668314212";
  private decompressionState: { lastByteRead: number; chunkBuffer: string[] } =
    {
      lastByteRead: 0,
      chunkBuffer: [],
    };
  private guildMemberListState: {
    bismallahUsers: { [key: string]: Discord_WS_User_Info };
  } = {
    bismallahUsers: {},
  };

  public getGuildMemeberList() {
    return this.guildMemberListState;
  }

  private async handleGuildOpItem(item: {
    member: { user: Discord_WS_User_Info };
  }): Promise<void> {
    const user = item.member?.user;
    if (!user) return;

    this.guildMemberListState.bismallahUsers[user.id] = user;

    const array = Object.values(this.guildMemberListState.bismallahUsers);

    for (const key in this.onUserListUpdateCallbacks) {
      try {
        this.onUserListUpdateCallbacks[key](array as Discord_WS_User_Info[]);
      } catch (_e) {}
    }
  }

  private async handleGuildMemberListUpdate(message: {
    d: Discord_WS_User_D_Info;
  }): Promise<void> {
    if (!message.d) return;

    for (const op of message.d.ops) {
      if (Array.isArray(op.items)) {
        for (const item of op.items) {
          this.handleGuildOpItem(item);
        }
      } else if (op.item) {
        this.handleGuildOpItem(op.item);
      }
    }
  }

  private async discordWebsocetMessageHandler(message: {
    t: string;
    d: Discord_WS_User_D_Info;
  }) {
    if (message.t === "GUILD_MEMBER_LIST_UPDATE") {
      this.handleGuildMemberListUpdate(message);
    }
  }

  private async onEnd() {
    return new Promise(
      (resolve) => (this.onEndCallack = resolve as () => void),
    );
  }

  private async decompressionHelperMashallah(data: string): Promise<void> {
    try {
      const bf = base64ToUint8Array(data);
      const r = new DataView(bf.buffer);
      const i =
        r.byteLength >= 4 && 65535 === r.getUint32(r.byteLength - 4, !1);

      this.inflate.push(bf.buffer, !!i && pako.constants.Z_SYNC_FLUSH);

      const output = (<{ strm: { output: Uint8Array } }>(<unknown>this.inflate))
        .strm.output;

      const outputBuffer = Buffer.from(output);

      const nullIndex = outputBuffer.indexOf(0x00);

      const subBuffer = outputBuffer.subarray(
        0 + this.decompressionState.lastByteRead,
        nullIndex,
      );

      const outputString = subBuffer.toString("utf8");

      this.decompressionState.lastByteRead = nullIndex;

      this.decompressionState.chunkBuffer.push(outputString);

      if (this.decompressionState.chunkBuffer.length === 1) {
        try {
          const jsonObject = JSON.parse(this.decompressionState.chunkBuffer[0]);
          this.decompressionState.chunkBuffer = [];
          this.discordWebsocetMessageHandler(jsonObject);
        } catch (e) {
          console.error(`bismallah signle error`);
          console.error(e);
        }
      } else {
        try {
          const bigString = this.decompressionState.chunkBuffer.join("");
          const jsonObject = JSON.parse(bigString);
          this.decompressionState.chunkBuffer = [];
          this.discordWebsocetMessageHandler(jsonObject);
        } catch (e) {
          console.error(`bismallah join error`);
          console.error(e);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  private async mashallahHotPatcher(request: HTTPRequest) {
    if (request.url().includes("assets/049013e5f6245ad86d34.js")) {
      const ft = await axios.get(
        "https://discord.com/assets/049013e5f6245ad86d34.js",
      );

      ft.data = ft.data.replace("discord://", "sadsdfdsfd://");

      request.respond({
        status: 200,
        contentType: "application/javascript",
        body: ft.data,
      });

      this.mashallahHotPatchApplied = true;
    } else {
      request.continue();
    }
  }

  private async wsCreateHook(event: {
    requestId: number;
    url: string;
  }): Promise<void> {
    if (
      event.url ===
      "wss://gateway.discord.gg/?encoding=json&v=9&compress=zlib-stream"
    ) {
      this.gatewayRequestId = event.requestId;
    }
  }

  private async wsDataReceivedHook(event: {
    requestId: number;
    timestamp: number;
    response: {
      opcode: number;
      mask: boolean;
      payloadData: string;
    };
  }): Promise<void> {
    if (event.requestId !== this.gatewayRequestId) return;

    await this.decompressionHelperMashallah(event.response.payloadData);
  }

  async bootstrapFromIdle(): Promise<void> {
    if (!this.page) return;

    await this.page.setRequestInterception(true);

    this.page.on("request", async (request: HTTPRequest) => {
      await this.mashallahHotPatcher(request);
    });

    this.client = await this.page.target().createCDPSession();

    this.client.on("Network.webSocketCreated", async (event) => {
      await this.wsCreateHook(event);
    });

    this.client.on("Network.webSocketFrameReceived", async (event) => {
      await this.wsDataReceivedHook(event);
    });

    await this.client.send("Network.enable");

    /*const cache = await DatabaseClient.getInstance().getUserCache(
      process.env.DISCORD_FAKE_USER_NAME || "",
    );*/
    const cache = null;

    let isLoggedIn = false;

    let retryCounter = 0;

    while (!isLoggedIn) {
      if (retryCounter > 0) await sleep(5000);

      if (retryCounter > 3) {
        throw new Error("DiscordDataFeed: Failed to login");
      }

      if (cache !== null) {
        const jsCode = readFileSync(
          path.join(__dirname, "../../helpers/restoreLocalStorage.js"),
          "utf8",
        ).replace("###LOCAL_STORAGE###", cache);

        try {
          await this.page.evaluateOnNewDocument(jsCode);
        } catch (e) {
          console.error(`Failed to restore local storage - ln 275`);
          console.error(e);
        }

        await this.page.goto(
          `https://discord.com/channels/${this.defaultServerId}/${this.defaultChannelId}`,
        );

        try {
          await this.page.waitForNavigation({ timeout: 3000 });
        } catch (e) {
          isLoggedIn = true;
        }
      }

      if (!isLoggedIn) {
        await this.page.goto("https://discord.com/login");

        await this.page.waitForSelector('input[name="email"]');
        await this.page.click('input[name="email"]');

        await this.page.keyboard.type(process.env.DISCORD_FAKE_USER_NAME || "");

        await this.page.click('input[name="password"]');
        // TODO: napraw to debilu
        await this.page.keyboard.type(
          process.env.DISCORD_FAKE_USER_PASS + "$$$$$" || "",
        );

        await this.page.click('button[type="submit"]');

        await this.page.waitForNavigation({ timeout: 3000 });

        try {
          await this.page.evaluateOnNewDocument(
            "window._localStorage = window.localStorage;",
          );
        } catch (e) {
          console.error(`Failed to backup local storage - ln 313`);
          console.error(e);
        }

        await this.page.goto(
          `https://discord.com/channels/${this.defaultServerId}/${this.defaultChannelId}`,
          {},
        );

        const jsCode = readFileSync(
          path.join(__dirname, "../../helpers/dumpLocalStorage.js"),
          "utf8",
        );

        try {
          await this.page.evaluate(jsCode);
        } catch (e) {
          console.error(`Failed to dump local storage - ln 332`);
          console.error(e);
        }

        try {
          await this.page.waitForNavigation({ timeout: 3000 });
        } catch (e) {
          isLoggedIn = true;
        }
      }
      if (isLoggedIn) {
        await this.page.waitForSelector('div[aria-label="Show Member List"]');
        await this.page.click('div[aria-label="Show Member List"]');
      }
      retryCounter++;
    }
  }

  /*async scanUserProfile(userId: string) {
    if (!this.page) return;

    const jsCode = readFileSync(
      path.join(__dirname, "../../helpers/mashallahInjector.js"),
      "utf8",
    );

    const url = `https://discord.com/api/v9/users/${userId}/profile?with_mutual_guilds=true&with_mutual_friends_count=false&guild_id=934812690390605884`;

    try {
      const requestId = String(Math.random() * 100000000000000000);
      await this.page.evaluate(
        jsCode
          .replace("###URL###", url)
          .replace("###METHOD###", "GET")
          .replace("###REQUEST_ID###", requestId),
      );

     /* let data = (await httpServer.requestCompletionCallback(
        requestId,
      )) as Discord_API_V9_User;

      const dbDriver = ObjectManager.getInstance().getObject(
        DBDriver.name,
      ) as DBDriver;
      const runner = new QueryRunner(dbDriver);

      if (typeof data === "string")
        data = JSON.parse(data) as Discord_API_V9_User;

      if (!data.user) {
        await runner.deleteUser(userId);
        return;
      }

      const twitch = data.connected_accounts
        ? data.connected_accounts.find(
            (i: Discord_API_V9_User_Connection) => i.type === "twitch",
          )
        : null;

      const { username } = data.user;

      console.log(username);

      await runner.upsertUser(
        userId,
        `${username}`,
        twitch ? twitch.id : undefined,
        twitch ? twitch.name : undefined,
      );
    } catch (e) {
      console.error(`Failed to inject mashallah - ln 370`);
      console.error(e);
    }
  }*/

  async processMainTick(): Promise<void> {}

  async worker(): Promise<void> {
    try {
      switch (this.state) {
        case DiscordDataFeedState.IDLE: {
          if (!this.page) return;

          await this.bootstrapFromIdle();
          this.state = DiscordDataFeedState.INITIALIZED;
          break;
        }
        case DiscordDataFeedState.INITIALIZED: {
          if (!this.page) {
            this.state = DiscordDataFeedState.IDLE;
            return;
          }

          await this.processMainTick();
          break;
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (this.page) {
        const interval = Math.random() * this.workerIntervalTimeMax;
        this.workerInterval = setTimeout(
          this.worker.bind(this),
          interval + this.workerIntervalTimeMin,
        );
      }
    }
  }

  async init(): Promise<void> {
    if (this.page) throw new Error("DiscordDataFeed already initialized");

    try {
      const manager = new BrowserManager();
      this.page = await manager.spawnBlankPage();
      await this.worker();
    } catch (e) {
      console.error(e);
    }
  }

  async close(): Promise<void> {
    if (!this.page) throw new Error("DiscordDataFeed not initialized");

    await this.page.close();
    this.page = null;
  }
}
