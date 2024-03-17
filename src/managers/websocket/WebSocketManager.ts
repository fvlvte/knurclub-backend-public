import WebSocket, { WebSocketServer } from "ws";
import { createServer } from "http";
import { IncomingMessage, Server } from "node:http";
import { TwitchClient } from "../../clients/TwitchClient";
import internal from "node:stream";
import { Data, TwitchAuthGuard } from "../../util/TwitchAuthGuard";
import { ClientManager } from "../ClientManager";
import { WSNetworkFrameType } from "../../types/WSShared";
import { WebSocketSession } from "./WebSocketSession";

export class WebSocketManager {
  private wss?: WebSocketServer;
  private server?: Server;
  private data?: Data;

  constructor() {}

  private async authenticateRequest(
    request: IncomingMessage,
  ): Promise<null | TwitchClient> {
    const token = request.url?.split("token=")[1];
    if (typeof token === "string") {
      const t = await TwitchAuthGuard.decodeToken(token);
      this.data = t;
      return ClientManager.getInstance().handleKeepAliveTick(
        t.user_id,
        t.refresh_token,
      );
    } else {
      return null;
    }
  }

  private async upgrade(
    request: IncomingMessage,
    socket: internal.Duplex,
    head: Buffer,
  ) {
    socket.on("error", () => {});

    try {
      const result = await this.authenticateRequest(request);
      if (!result) {
        console.log("auth error");
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      socket.removeListener("error", (e) => {
        console.error(e);
        socket.destroy();
      });

      this.wss?.handleUpgrade(request, socket, head, (ws) => {
        this.wss?.emit(
          "connection",
          ws,
          request,
          new WebSocketSession(ws, result),
        );
      });
    } catch (e) {
      console.error(e);
    }
  }

  init(): void {
    this.server = createServer();
    this.wss = new WebSocketServer({
      noServer: true,
    });

    this.server.on("upgrade", this.upgrade.bind(this));

    this.server.listen(8080);

    this.wss.on(
      "connection",
      async function connection(
        ws: WebSocket,
        _request: unknown,
        client: WebSocketSession,
      ) {
        try {
          ws.on("error", async () => {
            try {
              await client.getClient().removeEventListener(client);
              ws.close();
            } catch (e) {
              console.error(e);
            }
          });

          ws.on("close", async () => {
            try {
              await client.getClient().removeEventListener(client);
            } catch (e) {
              console.error(e);
            }
          });

          await client.getClient().registerEventListenerSession(client);

          ws.on("message", async (message) => {
            try {
              const refreshToken = await client.getClient().getRefreshToken();
              const userId = await client.getClient().getBroadcasterId();
              ClientManager.getInstance().handleKeepAliveTick(
                userId,
                refreshToken,
              );
              await client.getHandler().processRawFrame(message.toString());
            } catch (e) {
              console.error(e);
            }
          });

          client.sendFrameNoResponse({
            type: WSNetworkFrameType.SERVER_HELLO,
            params: {
              version: "1.0",
              serverId: process.env.SERVER_ID ?? "local",
            },
          });
        } catch (e) {
          console.error(e);
        }
      },
    );
  }
}
