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

    const time =
      typeof req.query.time === "string" ? parseInt(req.query.time) : null;
    const si =
      typeof req.query.song === "string"
        ? JSON.parse(decodeURIComponent(req.query.song))
        : null;

    if (time && si) {
      Songrequest.getInstance(req.authData.user_id).handlePlaybackFeedback(
        time,
        si,
      );
    }

    res.status(HttpStatusCode.Ok).send({
      skip: Songrequest.getInstance(req.authData.user_id).getAndUnsetSkipFlag(),
      volume: Songrequest.getInstance(req.authData.user_id).getVolume(),
      reputation: Songrequest.getInstance(
        req.authData.user_id,
      ).getCurrentSongUserReputation(),
    });
  }
  path(): RegExp | string {
    return "/v1/sr/playback";
  }
  method(): Method {
    return Method.GET;
  }
}
