import WebSocket from "ws";
import { TwitchClient } from "../../clients/TwitchClient";
import { WSNetworkFrame } from "../../types/WSShared";
import { WebSocketHandler } from "./WebSocketHandler";

const EVENT_LIST = ["songrequest.queue"];

/* Pair of user client instance with WS socket */
export class WebSocketSession {
  constructor(ws: WebSocket, client: TwitchClient) {
    this.ws = ws;
    this.client = client;
  }

  private eventListeners: string[] = [];
  private readonly ws: WebSocket;
  private readonly client: TwitchClient;
  private readonly handler: WebSocketHandler = new WebSocketHandler(this);

  public sendFrameNoResponse(frame: WSNetworkFrame) {
    if (!frame.id) {
      frame.id =
        Math.random().toString(36).substring(2, 15) +
        new Date().getTime().toString();
    }

    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify(frame));
    } else {
      throw new Error("WebSocket not open");
    }
  }

  public getHandler(): WebSocketHandler {
    return this.handler;
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

  public async cleanShutdownSession(): Promise<void> {
    return new Promise((resolve) => {
      this.ws.send(
        JSON.stringify({ type: "session", status: "closed" }),
        () => {
          this.ws.close();
          resolve();
        },
      );
    });
  }
}
