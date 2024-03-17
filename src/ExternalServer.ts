import { default as express, NextFunction, Request, Response } from "express";
import * as http from "node:http";
import { TwitchAuthGuard, Data } from "./util/TwitchAuthGuard";
import * as cors from "cors";
import { default as bodyParser } from "body-parser";
import { Logger } from "./util/Logger";
import {
  ApiKnurcampMetrics,
  AuthTwitchLogin,
  CoreKeepAlive,
  V1SaQueue,
  V1SrQueue,
  V1Timer,
} from "./routes";
import { V1SrPlayback } from "./routes/v1/sr/Playback";
import { V1Event } from "./routes";
import { V1ConfigGet } from "./routes/v1/ConfigGet";
import { V1ConfigSet } from "./routes/v1/ConfigSet";

/*
  LOCAL TEST ACC CREDENTIALS
  http://localhost:3000/new/player?token=BSEGDvcvmZaA5yk277ynPxH81eH5hPsR%2BqHc4b33Zek3SW7CePqOzl%2F9nxJRZyV%2BgZNtSTIoxz4Q8CBgMqbBQukEr3t5ZcIGXEviPURMM%2F0rXaE7zbBXtsOn8AsQa3%2BXVo6wtagDZOnmHMdo6CV%2BE1BjdnQBSRbIvgM4oMwuBcKXQJpwhhT%2BJnJ1qdYLx5li26s7JCIYVJwh7SB3zjf0NvuilU0wcsm5bYRjhcKlCEXaP0COEc2ZkBTa2AFBAZlGP0GscihIpJ%2F1lmZrXMuvXryVzW4ei7r%2Fc2d2%2BCFkBREhB%2B5J6NgDzH0%2FCIhN7wSmW5mCr72uultEodNeT%2F8moO8OTQa0HvBEAct3YU1Ba2fvnXL1tGZvLQ6I8WjsqNUGOtEWNEbjJpqZlZLqYwhnxQ%3D%3D
*/

import { WebSocketServer } from "ws";

type RequestWithAuthData = Request & { authData?: Data };
export type AuthData = { authData?: Data };

export class ExternalServer {
  private readonly app: express.Application;
  private server?: http.Server;
  private wsServer?: WebSocketServer;

  constructor() {
    this.app = express();
  }

  private timeoutLoggerMiddleware(
    req: RequestWithAuthData,
    _res: Response,
    next: NextFunction,
  ) {
    const timeout = setTimeout(() => {
      Logger.getInstance().warn(
        `Request to ${req.url} took too long to respond ${req.url} ${req.method} ${req.query} ${req.body}`,
      );
    }, 7500);
    req.on("end", () => {
      clearTimeout(timeout);
    });
    next();
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
            .then((d: Data) => {
              const r = req as RequestWithAuthData;
              r.authData = d;
              next();
            })
            .catch(next);
        } else {
          return next();
        }
      } catch (e) {
        console.error(e);
        next();
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
      this.app.use(this.timeoutLoggerMiddleware.bind(this));

      this.bindRoutes();

      this.server = this.app.listen(port);

      this.wsServer = new WebSocketServer({ noServer: true });

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
