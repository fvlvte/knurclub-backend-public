import { default as express, NextFunction, Request, Response } from "express";
import * as http from "http";
import { TwitchAuthGuard, Data } from "./TwitchAuthGuard";
import * as cors from "cors";
import { default as bodyParser } from "body-parser";
import { Logger } from "./Logger";
import {
  ApiKnurcampMetrics,
  AuthTwitchLogin,
  CoreKeepAlive,
  V1SaQueue,
  V1SrQueue,
  V1Timer,
} from "./routes";
import { V1SrPlayback } from "./routes/v1/sr/Playback";
import { V1Event } from "./routes/v1/Event";
import { V1ConfigGet } from "./routes/v1/ConfigGet";
import { V1ConfigSet } from "./routes/v1/ConfigSet";

type RequestWithAuthData = Request & { authData?: Data };
export type AuthData = { authData?: Data };

export class ExternalServer {
  private readonly app: express.Application;
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

  private bindRoutes() {
    const routes = [
      new AuthTwitchLogin(),
      new CoreKeepAlive(),
      new V1SrQueue(),
      new V1SrPlayback(),
      new V1SaQueue(),
      new ApiKnurcampMetrics(),

      new V1Event(),
      new V1Timer(),
      new V1ConfigGet(),
      new V1ConfigSet(),
    ];

    for (const route of routes) {
      this.app[route.method()](route.path(), (req, res) => {
        route.handle(this, req, res).catch((e) => {
          Logger.getInstance().error(
            `Uncaught error from ${route.constructor.name}`,
            { error: e },
          );
        });
      });
    }
  }

  init(port: number): boolean {
    try {
      this.app.use(this.authMiddleware.bind(this));

      // TODO: use helmet or limit CORS.
      this.app.options("*", cors.default());
      this.app.use(cors.default());

      this.app.use(bodyParser.json());

      this.bindRoutes();

      this.server = this.app.listen(port);

      return true;
    } catch (e) {
      Logger.getInstance().crit(
        `${this.constructor.name}: Failed to set up express server`,
        { error: e },
      );
      return false;
    }
  }
}
