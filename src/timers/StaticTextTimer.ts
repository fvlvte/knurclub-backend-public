import { Timer } from "./Timer";
import { TwitchClient } from "../clients/TwitchClient";
import { TranslationManager } from "../managers/TranslationManager";

export class StaticTextTimer implements Timer {
  private translationId: string;
  private intervalTime: number;
  constructor(tid: string, ivt: number) {
    this.translationId = tid;
    this.intervalTime = ivt;
  }

  private client?: TwitchClient;
  private interval?: number;

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

  init(client: TwitchClient) {
    this.client = client;
    this.interval = window.setInterval(
      this.doTick.bind(this),
      this.intervalTime,
    );
  }
  shut() {
    if (this.interval) window.clearInterval(this.interval);
  }
}
