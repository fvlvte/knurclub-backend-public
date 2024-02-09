import { Route, type Request, Method } from "../../Route";
import type { Response } from "express";
import { HttpStatusCode } from "axios";
import { type AuthData, ExternalServer } from "../../../ExternalServer";
import { Songrequest } from "../../../Songrequest";

export class V1SaQueue implements Route<AuthData> {
  async handle(
    _server: ExternalServer,
    req: Request<AuthData>,
    res: Response,
  ): Promise<unknown> {
    if (!req.authData) {
      return res.status(HttpStatusCode.Unauthorized).send();
    }

    const song = await Songrequest.getInstance(
      req.authData.user_id,
    ).getNextAlert();

    if (!song) {
      return res.status(HttpStatusCode.NoContent).send();
    }
    res.status(HttpStatusCode.Ok).send(song);
  }
  path(): RegExp | string {
    return "/v1/sa/queue";
  }
  method(): Method {
    return Method.GET;
  }
}
