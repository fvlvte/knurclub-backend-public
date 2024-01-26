import { default as express, NextFunction, Request, Response } from "express";
import * as http from "http";
import { HttpStatusCode } from "axios";
import { TwitchAuthGuard } from "./TwitchAuthGuard";
import * as cors from "cors";
import { default as bodyParser } from "body-parser";
export class ExternalServer {
  private routesWithoutAuth: string[] = [];
  private app: express.Application;
  private server?: http.Server;

  constructor() {
    this.app = express();
  }

  private authMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.method === "OPTIONS") {
      return next();
    }
    /*if (
      !this.routesWithoutAuth.includes(req.path) &&
      req.header("X-Knur-Key") !== process.env.REACT_APP_KNUR_KEY
    ) {
      res.status(HttpStatusCode.Unauthorized).send("Unauthorized");
      return;
    } else next();*/
    next();
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

  private async handleKeepAliveTick(req: Request, res: Response) {}

  init(port?: number): boolean {
    try {
      this.app.use(this.authMiddleware.bind(this));

      this.app.options("*", cors.default());
      this.app.use(bodyParser.json());
      this.app.use(cors.default());

      this.app.get("/auth/login/twitch", this.handleAuthLoginTwitch.bind(this));

      this.server = this.app.listen(port ?? 21377);
      return true;
    } catch (e) {
      console.error(e);
    }
    return false;
  }
}
