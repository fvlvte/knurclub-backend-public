import { default as express } from "express";
import * as http from "http";
import { default as bodyParser } from "body-parser";
import * as cors from "cors";
import { TwitchDataFeed } from "./dataFeed/TwitchDataFeed";
import { HttpStatusCode } from "axios";
import { DiscordDataFeed } from "./dataFeed/DiscordDataFeed";
import { DiscordTwichBridge } from "./features/DiscordTwitchBridge";
import { ObjectManager } from "./ObjectManager";
import {
  KeyValueStorageSingleton,
  MinecraftAuthToken,
} from "./KeyValueStorage";

import { TwitchClient } from "./TwitchClient";
import { TwitchAuthGuard } from "./TwitchAuthGuard";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { google } from "@google-cloud/text-to-speech/build/protos/protos";
import ISynthesizeSpeechRequest = google.cloud.texttospeech.v1.ISynthesizeSpeechRequest;
import { Songrequest } from "./Songrequest";
import { TimerController } from "./TimerController";

const ttsClient = new TextToSpeechClient({ projectId: "knurski-projekcik" });

const UPTIME = Date.now();

export class HttpServer {
  private app: express.Application;
  private server: http.Server | null;

  constructor() {
    this.app = express();
    this.server = null;
    this.discordDataFeed = null;
    ObjectManager.getInstance().registerObject(this.constructor.name, this);
  }

  private completionCallbacks: {
    [id: string]: {
      timeout: NodeJS.Timeout;
      resolve: (param: unknown) => unknown;
      reject: (param: unknown) => unknown;
    };
  } = {};
  private discordDataFeed: DiscordDataFeed | null;
  private discordTwitchBridge?: DiscordTwichBridge;

  public async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server?.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async handleDump(
    req: express.Request,
    res: express.Response,
  ): Promise<void> {
    try {
      console.log(decodeURIComponent(req.query.data as string));
      /*await DatabaseClient.getInstance().setUserCache(
        process.env.DISCORD_FAKE_USER_NAME || "xd",
        atob(decodeURIComponent(req.query.data as string)),
      );*/
      res.status(201).send();
    } catch (e) {
      console.error(e);
      res.status(HttpStatusCode.InternalServerError).send(JSON.stringify(e));
    }
  }

  private async handleGetDiscordMemebers(
    req: express.Request,
    res: express.Response,
  ): Promise<void> {
    try {
      const guildMemeberList = this.discordDataFeed?.getGuildMemeberList();
      const array = [];
      if (guildMemeberList) {
        for (const key in guildMemeberList.bismallahUsers) {
          array.push(guildMemeberList.bismallahUsers[key]);
        }
      }
      res.status(HttpStatusCode.Ok).send(array);
    } catch (e) {
      console.error(e);
      res.status(HttpStatusCode.InternalServerError).send(JSON.stringify(e));
    }
  }

  public async requestCompletionCallback(requestId: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.completionCallbacks[requestId] = {
        timeout: setTimeout(reject, 10000),
        resolve,
        reject,
      };
    });
  }

  private async handleDelayedRequest(
    req: express.Request,
    res: express.Response,
  ) {
    console.log(typeof req.query.data);
    const data = req.query.data;
    const requestId = req.query.requestId as string;

    if (!requestId) {
      res.status(HttpStatusCode.BadRequest).send("zly warhlak");
      return;
    }

    if (this.completionCallbacks[requestId]) {
      this.completionCallbacks[requestId].resolve(data);
      clearTimeout(this.completionCallbacks[requestId].timeout);
      delete this.completionCallbacks[requestId];
    }

    res.status(HttpStatusCode.NoContent).send();
  }

  private async getTwitchViewers(req: express.Request, res: express.Response) {
    const twitchDataFeed = ObjectManager.getInstance().getObject(
      TwitchDataFeed.name,
    ) as TwitchDataFeed;
    const members = await twitchDataFeed.getChatMembers();
    res.send(members);
  }

  private async getUptime(req: express.Request, res: express.Response) {
    res.send({ uptime: (Date.now() - UPTIME) / 1000 / 60 / 60 });
  }

  private async verifyAuthToken(req: express.Request, res: express.Response) {
    const token = req.query.token as string;
    if (typeof token !== "string") {
      res.status(HttpStatusCode.BadRequest).send();
      return;
    }

    const userToken = KeyValueStorageSingleton.getInstance().get(
      `token_${token}`,
    ) as MinecraftAuthToken | undefined;

    if (typeof userToken !== "object") {
      res.status(HttpStatusCode.Unauthorized).send();
      return;
    }

    KeyValueStorageSingleton.getInstance().delete(`token_${token}`);

    res.status(HttpStatusCode.Ok).send(userToken);
  }

  private async getTwitchChat(req: express.Request, res: express.Response) {
    const twitchDataFeed = ObjectManager.getInstance().getObject(
      TwitchDataFeed.name,
    ) as TwitchDataFeed;
    const messages = twitchDataFeed.flushChatMessages();
    res.send(messages);
  }

  private v2GetTwitchEvent(_req: express.Request, res: express.Response) {
    const evt = TwitchClient.getInstance().getEventFromFeed();
    res.send({ event: evt || null });
  }

  private async getKochanegoFolowkaMeow(
    req: express.Request,
    res: express.Response,
  ) {
    const kicia = TwitchClient.getInstance().popKochanegoFolowka();
    if (!kicia) {
      res.send({ kicia: null });
    } else {
      res.send({ kicia });
    }
  }

  private async testTostPapiez(req: express.Request, res: express.Response) {
    TwitchClient.getInstance().dupnijFolowaByku();
    res.send("Sdfsdgdf");
  }

  private async getApplicationStatus(
    req: express.Request,
    res: express.Response,
  ) {
    const twitchDataFeed = ObjectManager.getInstance().getObject(
      TwitchDataFeed.name,
    ) as TwitchDataFeed;
    const status = {
      twitch: {
        initialized: twitchDataFeed.isInitialized(),
      },
    };

    res.send(status);
  }

  private async handleAuthRequest(req: express.Request, res: express.Response) {
    const token = req.body.code;
    const rediUrl = req.query.redirect as string;

    if (typeof token !== "string") {
      res.status(HttpStatusCode.BadRequest).send({ error: "invalid token 1" });
      return;
    }

    try {
      const result = await TwitchAuthGuard.generateToken(token, rediUrl);
      if (result === null) {
        console.log(result);
        throw new Error("invalid token 2");
      }
      res.status(HttpStatusCode.Ok).send({ authtoken: result });
    } catch (e) {
      console.log(e);
      res.status(HttpStatusCode.BadRequest).send({ error: "invalid token 3" });
      return;
    }
  }

  private async handleUserQuery(req: express.Request, res: express.Response) {
    try {
      const auth = req.headers.authorization;

      if (typeof auth !== "string") {
        res.status(HttpStatusCode.BadRequest).send({ error: "invalid token" });
        return;
      }

      const ziomoData = await TwitchAuthGuard.decodeToken(auth);
      res.status(HttpStatusCode.Ok).send({ id: ziomoData.user_id });
    } catch (e) {
      console.log(e);
      res.status(HttpStatusCode.BadRequest).send({ error: "invalid token 3" });
      return;
    }
  }

  private async handleSongrequestMediaQuery(
    req: express.Request,
    res: express.Response,
  ) {
    try {
      const song = Songrequest.getInstance().getNextSong(
        req.query.pop ? true : undefined,
      );
      if (!song) {
        res.status(HttpStatusCode.NoContent).send();
        return;
      } else {
        res.status(HttpStatusCode.Ok).send(song);
      }
    } catch (e) {
      res.status(HttpStatusCode.InternalServerError).send({ error: e });
      return;
    }
  }

  private async handleAlertSoundQuery(
    req: express.Request,
    res: express.Response,
  ) {
    try {
      const song = Songrequest.getInstance().getNextAlert();
      if (!song) {
        res.status(HttpStatusCode.NoContent).send();
        return;
      } else {
        res.status(HttpStatusCode.Ok).send(song);
      }
    } catch (e) {
      res.status(HttpStatusCode.InternalServerError).send({ error: e });
      return;
    }
  }

  private async handleSkipCheck(req: express.Request, res: express.Response) {
    res
      .status(HttpStatusCode.Ok)
      .send({ skip: Songrequest.getInstance().getAndUnsetSkipFlag() });
  }

  private async handleTimerTick(req: express.Request, res: express.Response) {
    res
      .status(HttpStatusCode.Ok)
      .send({ seconds: TimerController.getInstance().timerTick() });
  }

  private async handleTtsRequest(req: express.Request, res: express.Response) {
    try {
      const textData = req.query.data;

      // Construct the request
      const request = {
        input: { text: textData },
        // Select the language and SSML voice gender (optional)
        voice: { languageCode: "pl-PL", ssmlGender: "NEUTRAL" },
        // select the type of audio encoding
        audioConfig: { audioEncoding: "MP3" },
      };

      // Performs the text-to-speech request
      const [response] = await ttsClient.synthesizeSpeech(
        request as unknown as ISynthesizeSpeechRequest,
      );

      return res.send(response.audioContent);
    } catch (e) {
      console.log(e);
      res.status(HttpStatusCode.BadRequest).send({ error: "invalid token 3" });
      return;
    }
  }

  public async init(port?: number): Promise<void> {
    this.app.use((req, res, next) => {
      if (req.method === "OPTIONS") {
        return next();
      }

      if (
        typeof req.header("X-IP-Knur") === "string" &&
        req.header("X-Knur-Key") !== process.env.REACT_APP_KNUR_KEY
      ) {
        res.status(HttpStatusCode.Unauthorized).send("Unauthorized");
        return;
      } else next();
    });

    this.app.use(
      "/widget",
      express.static("../knurlements-widget/knurlements-widget/build"),
    );

    this.app.options("*", cors.default());
    this.app.use(bodyParser.json());
    this.app.use(cors.default());

    this.app.get("/papiesh", this.testTostPapiez.bind(this));
    this.app.get("/dump", this.handleDump.bind(this));
    this.app.get("/v1/tts", this.handleTtsRequest.bind(this));
    this.app.get(
      "/api/songrequest",
      this.handleSongrequestMediaQuery.bind(this),
    );
    this.app.get("/api/soundalert", this.handleAlertSoundQuery.bind(this));
    this.app.get("/api/sr/skip", this.handleSkipCheck.bind(this));
    this.app.get("/api/timer/tick", this.handleTimerTick.bind(this));
    this.app.get("/twitch/viewers", this.getTwitchViewers.bind(this));
    this.app.get("/uptime", this.getUptime.bind(this));
    this.app.get(
      "/twitch/folowekMeow",
      this.getKochanegoFolowkaMeow.bind(this),
    );
    this.app.get("/twitch/v2/event", this.v2GetTwitchEvent.bind(this));
    this.app.get("/papiesh", this.testTostPapiez.bind(this));
    this.app.get(
      "/knurclubcourses/v1/twitch/info",
      this.handleUserQuery.bind(this),
    );
    this.app.post(
      "/knurclubcourses/v1/twitch/oauth",
      this.handleAuthRequest.bind(this),
    );
    this.app.get("/twitch/chat", this.getTwitchChat.bind(this));
    this.app.get("/core/delayed", this.handleDelayedRequest.bind(this));
    this.app.get("/mc/auth", this.verifyAuthToken.bind(this));
    this.app.get("/core/status", this.getApplicationStatus.bind(this));
    this.app.get("/discord/members", this.handleGetDiscordMemebers.bind(this));

    this.discordTwitchBridge = ObjectManager.getInstance().getObject(
      DiscordTwichBridge.name,
    ) as DiscordTwichBridge;
    this.discordDataFeed = ObjectManager.getInstance().getObject(
      DiscordDataFeed.name,
    ) as DiscordDataFeed;

    this.server = this.app.listen(port);
  }
}
