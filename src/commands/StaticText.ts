import { CommandHandler } from "./CommandHandler";
import { TwitchClient, TwitchMessage } from "../TwitchClient";
import { TranslationManager } from "../TranslationManager";
import { V2TwitchClient } from "../V2TwitchClient";

export class StaticText implements CommandHandler {
  private readonly translationId: string;
  private readonly regExp: RegExp;
  constructor(translationId: string, regExp: RegExp) {
    this.translationId = translationId;
    this.regExp = regExp;
  }
  async handleCommand(
    client: TwitchClient | V2TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const translationManager = TranslationManager.getInstance(
      await client.getStreamLanguage(),
      await client.getStreamerUsername(),
    );

    await client.dispatchBotMessage(
      translationManager.translate(this.translationId, {
        invokedBy: message.username,
      }),
    );
  }

  getMatchingExp(): RegExp {
    return this.regExp;
  }
}
