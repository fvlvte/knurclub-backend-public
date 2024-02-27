import { Route, type Request, Method } from "../Route";
import type { Response } from "express";
import { HttpStatusCode } from "axios";
import { type AuthData, ExternalServer } from "../../ExternalServer";

export class V1Timer implements Route<AuthData> {
  async handle(
    _server: ExternalServer,
    req: Request<AuthData>,
    res: Response,
  ): Promise<unknown> {
    if (!req.authData) {
      return res.status(HttpStatusCode.Unauthorized).send();
    }

    res.send({ seconds: 0 });
  }
  path(): RegExp | string {
    return "/v1/timer";
  }
  method(): Method {
    return Method.GET;
  }
}
