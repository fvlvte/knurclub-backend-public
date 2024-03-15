import { Route, type Request, Method } from "../../Route";
import type { Response } from "express";
import { HttpStatusCode } from "axios";
import { TwitchAuthGuard } from "../../../util/TwitchAuthGuard";
import { ExternalServer } from "../../../ExternalServer";

export class AuthTwitchLogin implements Route<unknown> {
  async handle(
    _server: ExternalServer,
    req: Request<unknown>,
    res: Response,
  ): Promise<unknown> {
    const { authCode, redirectUrl } = req.query;

    if (typeof authCode !== "string" || typeof redirectUrl !== "string") {
      return res.status(HttpStatusCode.BadRequest).send();
    }

    try {
      const { token, id } = await TwitchAuthGuard.generateToken(
        authCode,
        redirectUrl,
      );
      if (!token) {
        return res.status(HttpStatusCode.Unauthorized).send();
      }

      res.status(HttpStatusCode.Ok).send({ token, id });
    } catch (e) {
      console.error(e);
      res.status(HttpStatusCode.Unauthorized).send();
    }
  }
  path(): RegExp | string {
    return "/auth/login/twitch";
  }
  method(): Method {
    return Method.GET;
  }
}
