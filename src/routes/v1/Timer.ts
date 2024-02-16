import { Route, type Request, Method } from "../Route";
import type { Response } from "express";
import { HttpStatusCode } from "axios";
import { type AuthData, ExternalServer } from "../../ExternalServer";
import { Timer } from "../../features/Timer";

export class V1Timer implements Route<AuthData> {
  async handle(
    _server: ExternalServer,
    req: Request<AuthData>,
    res: Response,
  ): Promise<unknown> {
    if (!req.authData) {
      return res.status(HttpStatusCode.Unauthorized).send();
    }

    const userId = req.authData.user_id;
    res.send({ seconds: Timer.getInstance(userId).timerTick() });
  }
  path(): RegExp | string {
    return "/v1/timer";
  }
  method(): Method {
    return Method.GET;
  }
}
