import { CommandHandler } from "./CommandHandler";
import { TwitchMessage } from "../types/TwitchTypes";
import { TranslationManager } from "../managers/TranslationManager";
import { TwitchClient } from "../clients/TwitchClient";

export class StaticText extends CommandHandler {
  private readonly translationId: string;
  private readonly regExp: RegExp;
  constructor(translationId: string, regExp: RegExp) {
    super();

    this.translationId = translationId;
    this.regExp = regExp;
  }
  async handleCommand(
    client: TwitchClient,
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
