import WebSocket, { WebSocketServer } from "ws";
import { createServer } from "http";
import { IncomingMessage, Server } from "node:http";
import { TwitchClient } from "../../clients/TwitchClient";
import internal from "node:stream";
import { Data, TwitchAuthGuard } from "../../util/TwitchAuthGuard";
import { ClientManager } from "../ClientManager";
import { SRRewritten } from "../../features/SRRewritten";
import {
  SR_V1_CACHE_QUERY_BULK_RESULT,
  SR_V1_FETCH,
  WSNetworkFrame,
  WSNetworkFrameType,
} from "../../types/WSShared";
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

    const processRawFrame = async (data: string, client: WebSocketSession) => {
      try {
        if (this.data?.user_id && this.data?.refresh_token) {
          ClientManager.getInstance().handleKeepAliveTick(
            this.data.user_id,
            this.data.refresh_token,
          );
        }

        const parsedData = JSON.parse(data.toString()) as WSNetworkFrame;

        switch (parsedData.type) {
          case WSNetworkFrameType.SR_V1_CACHE_QUERY_BULK_RESULT: {
            const packetData = parsedData as SR_V1_CACHE_QUERY_BULK_RESULT;
            for (let i = 0; i < packetData.params.length; i++) {
              const sr = SRRewritten.getInstance(
                await client.getClient().getBroadcasterId(),
              );
              const entry = packetData.params[i];
              if (!entry.hit) {
                const data = await sr.fetch(entry.url);

                client.sendFrameNoResponse({
                  isReply: true,
                  id: parsedData.id,
                  type: WSNetworkFrameType.SR_V1_CACHE_STORE,
                  params: [entry.url, JSON.stringify(data)],
                });
              }
            }
            break;
          }
          case WSNetworkFrameType.SR_V1_FETCH: {
            const { params } = parsedData as SR_V1_FETCH;
            const sr = SRRewritten.getInstance(
              await client.getClient().getBroadcasterId(),
            );

            for (let i = 0; i < params.length; i++) {
              const data = await sr.fetch(params[i]);
              client.sendFrameNoResponse({
                id: parsedData.id,
                type: WSNetworkFrameType.SR_V1_CACHE_STORE,
                params: [params[i], data],
              });
            }
            break;
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

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
              await processRawFrame(message.toString(), client);
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
