import { Route, type Request, Method } from "../../Route";
import type { Response } from "express";
import { HttpStatusCode } from "axios";
import { type AuthData, ExternalServer } from "../../../ExternalServer";
import { Songrequest } from "../../../features/Songrequest";

export class V1SrPlayback implements Route<AuthData> {
  async handle(
    _server: ExternalServer,
    req: Request<AuthData>,
    res: Response,
  ): Promise<unknown> {
    if (!req.authData) {
      return res.status(HttpStatusCode.Unauthorized).send();
    }

    res.status(HttpStatusCode.Ok).send({
      skip: Songrequest.getInstance(req.authData.user_id).getAndUnsetSkipFlag(),
      volume: Songrequest.getInstance(req.authData.user_id).getVolume(),
    });
  }
  path(): RegExp | string {
    return "/v1/sr/playback";
  }
  method(): Method {
    return Method.GET;
  }
}
