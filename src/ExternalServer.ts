import { default as express, NextFunction, Request, Response } from "express";
import { TwitchAuthGuard, Data } from "./util/TwitchAuthGuard";
import * as cors from "cors";
import { default as bodyParser } from "body-parser";
import { Logger } from "./util/Logger";
import {
  ApiKnurcampMetrics,
  AuthTwitchLogin,
  CoreKeepAlive,
  V1Timer,
} from "./routes";
import { V1Event } from "./routes";
import { V1ConfigGet } from "./routes/v1/ConfigGet";
import { V1ConfigSet } from "./routes/v1/ConfigSet";
import { CorsOptions } from "cors";
import helmet from "helmet";

type RequestWithAuthData = Request & { authData?: Data };
export type AuthData = { authData?: Data };

const ORIGIN_WHITELIST = [
  "http://localhost:3000",
  "https://mamm0n.knur.club",
  "https://knur.club",
];

const CORS_OPTIONS: CorsOptions = {
  origin: (origin, callback) => {
    if (ORIGIN_WHITELIST.indexOf(origin as unknown as string) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

export class ExternalServer {
  private readonly app: express.Application;

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

      this.app.options("*", cors.default(CORS_OPTIONS));
      this.app.use(cors.default(CORS_OPTIONS));
      this.app.use(helmet());

      this.app.use(bodyParser.json());
      this.app.use(this.timeoutLoggerMiddleware.bind(this));

      this.bindRoutes();

      this.app.listen(port);

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
