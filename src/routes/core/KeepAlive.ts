import { Route, type Request, Method } from "../Route";
import type { Response } from "express";
import { HttpStatusCode } from "axios";
import { type AuthData, ExternalServer } from "../../ExternalServer";
import { TennantManager } from "../../TwitchKlienty";

export class CoreKeepAlive implements Route<AuthData> {
  async handle(
    _server: ExternalServer,
    req: Request<AuthData>,
    res: Response,
  ): Promise<unknown> {
    if (!req.authData) {
      return res.status(HttpStatusCode.Unauthorized).send();
    }

    TennantManager.getInstance().handleKeepAliveTick(
      req.authData.user_id,
      req.authData.refresh_token,
    );

    return res.status(HttpStatusCode.Ok).send();
  }
  path(): RegExp | string {
    return "/core/keep-alive";
  }
  method(): Method {
    return Method.GET;
  }
}
