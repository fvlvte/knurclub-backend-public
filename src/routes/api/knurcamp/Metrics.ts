import { Route, type Request, Method } from "../../Route";
import type { Response } from "express";
import { HttpStatusCode } from "axios";
import { ExternalServer } from "../../../ExternalServer";
import { AuthToken } from "../../../util/AuthToken";
import { DiscordClient } from "../../../clients/DiscordClient";
import { Logger } from "../../../util/Logger";

export class ApiKnurcampMetrics implements Route<unknown> {
  async handle(
    _server: ExternalServer,
    req: Request<unknown>,
    res: Response,
  ): Promise<unknown> {
    const token = req.query.token;
    if (typeof token !== "string")
      return res.status(HttpStatusCode.Unauthorized).send();

    try {
      const payload = await AuthToken.getPayloadFromToken<{
        username: string;
        threadId: string;
      }>(token, "hex");
      const { username, threadId } = payload;

      const data = req.body;

      const taskId =
        typeof req.query.tid === "string" ? req.query.tid : "unknown";

      const file = data.file;
      delete data.file;

      data.username = username;
      data.taskId = taskId;

      let message = "";

      for (const key in data) {
        message += `${key} = ${data[key]}\n`;
      }

      const client = new DiscordClient();
      await client.init(true);
      await client.sendMessageToChannel(threadId, message, data, file);

      res.status(HttpStatusCode.NoContent).send();
    } catch (e) {
      Logger.getInstance().error("Failed to handle request.", { error: e });
      res.status(HttpStatusCode.InternalServerError).send();
    }
  }
  path(): RegExp | string {
    return "/api/knurcamp/metrics";
  }
  method(): Method {
    return Method.POST;
  }
}
