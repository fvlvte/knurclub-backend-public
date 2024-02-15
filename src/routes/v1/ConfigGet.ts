import { Route, type Request, Method } from "../Route";
import type { Response } from "express";
import { HttpStatusCode } from "axios";
import { type AuthData, ExternalServer } from "../../ExternalServer";
import { ConfigManager } from "../../ConfigManager";

export class V1ConfigGet implements Route<AuthData> {
  async handle(
    _server: ExternalServer,
    req: Request<AuthData>,
    res: Response,
  ): Promise<unknown> {
    if (!req.authData) {
      return res.status(HttpStatusCode.Unauthorized).send();
    }
    const userId = req.authData.user_id;
    const config = await ConfigManager.getUserInstance(userId).getConfig();

    res.send(config);
  }
  path(): RegExp | string {
    return "/v1/config";
  }
  method(): Method {
    return Method.GET;
  }
}
