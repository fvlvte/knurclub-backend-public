import { default as express, NextFunction, Request, Response } from "express";
import * as http from "http";
import { HttpStatusCode } from "axios";
import { TwitchAuthGuard, Data } from "./TwitchAuthGuard";
import * as cors from "cors";
import { default as bodyParser } from "body-parser";
import { TwitchTennantManager } from "./TwitchKlienty";
import { Songrequest } from "./Songrequest";

type RequestWithAuthData = Request & { authData?: Data };

export class ExternalServer {
  private app: express.Application;
  private server?: http.Server;

  constructor() {
    this.app = express();
  }

  private authMiddleware(
    req: RequestWithAuthData,
    _res: Response,
    next: NextFunction,
  ) {
    if (req.method === "OPTIONS") {
      return next();
    }
    if (req.header("X-Knur-Key") !== undefined) {
      try {
        const token = req.header("X-Knur-Key");
        if (token) {
          TwitchAuthGuard.decodeToken(token)
            .then((d) => {
              req.authData = d;
              next();
            })
            .catch(next);
        }
      } catch (e) {
        console.error(e);
      }
    } else next();
  }

  private async handleAuthLoginTwitch(req: Request, res: Response) {
    const { authCode, redirectUrl } = req.query;

    if (typeof authCode !== "string" || typeof redirectUrl !== "string")
      return res.status(HttpStatusCode.BadRequest).send();
    try {
      const token = await TwitchAuthGuard.generateToken(authCode, redirectUrl);
      if (!token) throw new Error("Failed to generate token.");

      res.status(HttpStatusCode.Ok).send({ token });
    } catch (e) {
      console.error(e);
      res.status(HttpStatusCode.Unauthorized).send();
    }
  }

  private async handleKeepAliveTick(req: RequestWithAuthData, res: Response) {
    if (!req.authData) {
      return res.status(HttpStatusCode.Unauthorized).send();
    }

    TwitchTennantManager.getInstance().handleKeepAliveTick(
      req.authData.user_id,
      req.authData.refresh_token,
    );

    return res.status(HttpStatusCode.Ok).send({ git: req.authData.user_id });
  }

  private async handleSongRequestQuery(
    req: RequestWithAuthData,
    res: Response,
  ) {
    if (!req.authData) {
      return res.status(HttpStatusCode.Unauthorized).send();
    }

    const song = await Songrequest.getInstance(
      req.authData.user_id,
    ).getNextSong();
    if (!song) {
      res.status(HttpStatusCode.NoContent).send();
      return;
    } else {
      res.status(HttpStatusCode.Ok).send(song);
    }
  }

  private async handleSongRequestPlaybackQuery(
    req: RequestWithAuthData,
    res: Response,
  ) {
    if (!req.authData) {
      return res.status(HttpStatusCode.Unauthorized).send();
    }

    res.status(HttpStatusCode.Ok).send({
      skip: Songrequest.getInstance(req.authData.user_id).getAndUnsetSkipFlag(),
      volume: Songrequest.getInstance(req.authData.user_id).getVolume(),
    });
  }

  private async handleSoundAlertQuery(req: RequestWithAuthData, res: Response) {
    if (!req.authData) {
      return res.status(HttpStatusCode.Unauthorized).send();
    }

    const song = await Songrequest.getInstance(
      req.authData.user_id,
    ).getNextAlert();
    if (!song) {
      res.status(HttpStatusCode.NoContent).send();
      return;
    } else {
      res.status(HttpStatusCode.Ok).send(song);
    }
  }

  init(port?: number): boolean {
    try {
      this.app.use(this.authMiddleware.bind(this));

      this.app.options("*", cors.default());
      this.app.use(bodyParser.json());
      this.app.use(cors.default());

      this.app.get("/auth/login/twitch", this.handleAuthLoginTwitch.bind(this));
      this.app.get("/core/keep-alive", this.handleKeepAliveTick.bind(this));
      this.app.get("/v1/sr/queue", this.handleSongRequestQuery.bind(this));
      this.app.get(
        "/v1/sr/playback",
        this.handleSongRequestPlaybackQuery.bind(this),
      );
      this.app.get("/v1/sa/queue", this.handleSoundAlertQuery.bind(this));

      this.server = this.app.listen(port ?? 21377);
      return true;
    } catch (e) {
      console.error(e);
    }
    return false;
  }
}
