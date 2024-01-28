import { Timer } from "./Timer";
import { V2TwitchClient } from "../V2TwitchClient";
import { TranslationManager } from "../TranslationManager";

export class StaticTextTimer implements Timer {
  private translationId: string;
  private intervalTime: number;
  constructor(tid: string, ivt: number) {
    this.translationId = tid;
    this.intervalTime = ivt;
  }

  private client?: V2TwitchClient;
  private interval?: NodeJS.Timer;

  private async doTick() {
    try {
      await this.client?.dispatchBotMessage(
        TranslationManager.getInstance(
          await this.client?.getStreamLanguage(),
          await this.client?.getStreamerUsername(),
        ).translate(this.translationId, {}),
      );
    } catch (e) {
      console.error(e);
    }
  }

  init(client: V2TwitchClient) {
    this.client = client;
    this.interval = setInterval(this.doTick.bind(this), this.intervalTime);
  }
  shut() {
    clearInterval(this.interval);
  }
}
