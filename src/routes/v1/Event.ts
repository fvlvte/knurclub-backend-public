import { Route, type Request, Method } from "../Route";
import type { Response } from "express";
import { HttpStatusCode } from "axios";
import { type AuthData, ExternalServer } from "../../ExternalServer";
import { ClientManager } from "../../managers/ClientManager";

export class V1Event implements Route<AuthData> {
  async handle(
    _server: ExternalServer,
    req: Request<AuthData>,
    res: Response,
  ): Promise<unknown> {
    if (!req.authData) {
      return res.status(HttpStatusCode.Unauthorized).send();
    }

    const userId = req.authData.user_id;
    const twitchClient = ClientManager.getInstance().getTwitchRecord(userId);

    if (!twitchClient) {
      return res.status(HttpStatusCode.Ok).send({ event: null });
    }

    const evt = twitchClient.getEventFromFeed();
    res.send({ event: evt || null });
  }
  path(): RegExp | string {
    return "/v1/event";
  }
  method(): Method {
    return Method.GET;
  }
}
