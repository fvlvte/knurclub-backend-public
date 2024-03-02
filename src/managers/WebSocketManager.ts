import WebSocket, { WebSocketServer } from "ws";
import { createServer } from "http";
import { IncomingMessage, Server } from "node:http";
import { TwitchClient } from "../clients/TwitchClient";
import internal from "node:stream";
import { TwitchAuthGuard } from "../util/TwitchAuthGuard";
import { ClientManager } from "./ClientManager";

type WebSocketFrame = {
  type: string;
  param: string[];
};

const EVENT_LIST = ["songrequest.queue"];

export class WebSocketSession {
  constructor(ws: WebSocket, client: TwitchClient) {
    this.ws = ws;
    this.client = client;
  }

  private eventListeners: string[] = [];
  private ws: WebSocket;
  private client: TwitchClient;

  public getWebSocket() {
    return this.ws;
  }

  public getClient(): TwitchClient {
    return this.client;
  }

  public registerEventListener(event: string) {
    if (!this.eventListeners.includes(event) && EVENT_LIST.includes(event))
      this.eventListeners.push(event);
    console.log(this.eventListeners);
  }

  public deregisterEventListener(event: string) {
    this.eventListeners = this.eventListeners.filter((e) => e !== event);
    console.log(this.eventListeners);
  }
}
export class WebSocketManager {
  private wss?: WebSocketServer;
  private server?: Server;

  constructor() {}

  private async authenticateRequest(
    request: IncomingMessage,
  ): Promise<null | TwitchClient> {
    const token = request.url?.split("token=")[1];
    if (typeof token === "string") {
      const t = await TwitchAuthGuard.decodeToken(token);
      return ClientManager.getInstance().handleKeepAliveTick(
        t.user_id,
        t.refresh_token,
        true,
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
    } catch (e) {}
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
      function connection(
        ws: WebSocket,
        _request: unknown,
        client: WebSocketSession,
      ) {
        ws.on("error", () => {
          client.getClient().removeEventListener(client);
          ws.close();
        });

        ws.on("close", () => {
          client.getClient().removeEventListener(client);
        });

        client.getClient().registerEventListenerSession(client);

        ws.on("message", async function message(data) {
          const parsedData = (
            data instanceof Buffer
              ? JSON.parse(data.toString("utf-8"))
              : typeof data === "string"
                ? JSON.parse(data)
                : data
          ) as WebSocketFrame;

          switch (parsedData.type) {
            case "event.subscribe": {
              client.registerEventListener(parsedData.param[0]);
              client
                .getWebSocket()
                .send(JSON.stringify({ type: "ack", success: true }));
              break;
            }
            case "event.unsubscribe": {
              client.deregisterEventListener(parsedData.param[0]);
              client
                .getWebSocket()
                .send(JSON.stringify({ type: "ack", success: true }));
              break;
            }
          }

          console.log(
            `Received message ${JSON.stringify(parsedData)} from user ${await client.getClient().getBroadcasterId()}`,
          );
        });
      },
    );
  }
}
