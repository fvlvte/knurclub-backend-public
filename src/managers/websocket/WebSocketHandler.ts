import { WebSocketSession } from "./WebSocketSession";
import {
  SR_V1_CACHE_QUERY_BULK_RESULT,
  SR_V1_FETCH,
  WSNetworkFrame,
  WSNetworkFrameType,
} from "../../types/WSShared";
import { SRRewritten } from "../../features/SRRewritten";

export class WebSocketHandler {
  private session: WebSocketSession;
  private clientHelloExchange = false;

  constructor(webSocketSession: WebSocketSession) {
    this.session = webSocketSession;
  }

  private async handleClientHello() {
    if (!this.clientHelloExchange) {
      this.clientHelloExchange = true;
      const id = await this.session.getClient().getBroadcasterId();
      SRRewritten.getInstance(id).bindWS(this.session);
      await SRRewritten.getInstance(id).restart();
    }
  }

  public async processRawFrame(data: string) {
    try {
      const userId = await this.session.getClient().getBroadcasterId();
      const parsedData = JSON.parse(data.toString()) as WSNetworkFrame;

      switch (parsedData.type) {
        case WSNetworkFrameType.SR_V1_CACHE_QUERY_BULK_RESULT: {
          const packetData = parsedData as SR_V1_CACHE_QUERY_BULK_RESULT;
          for (let i = 0; i < packetData.params.length; i++) {
            const sr = SRRewritten.getInstance(userId);
            const entry = packetData.params[i];
            if (!entry.hit) {
              const data = await sr.fetch(entry.url);

              this.session.sendFrameNoResponse({
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
          const sr = SRRewritten.getInstance(userId);

          for (let i = 0; i < params.length; i++) {
            const data = await sr.fetch(params[i]);
            this.session.sendFrameNoResponse({
              id: parsedData.id,
              type: WSNetworkFrameType.SR_V1_CACHE_STORE,
              params: [params[i], data],
            });
          }
          break;
        }
        case WSNetworkFrameType.CLIENT_HELLO: {
          this.handleClientHello();
          break;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
}
