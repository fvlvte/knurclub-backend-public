import { CommandHandler } from "./CommandHandler";
import { TwitchMessage } from "../types/TwitchTypes";
import { TranslationManager } from "../managers/TranslationManager";
import { TwitchClient } from "../clients/TwitchClient";

export class ReloadLocale extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const translationManager = TranslationManager.getInstance(
      await client.getStreamLanguage(),
      await client.getBroadcasterId(),
    );
    try {
      if (message.username !== (await client.getStreamerUsername())) {
        await client.dispatchBotMessage(
          translationManager.translate("UNAUTHORIZED_COMMAND_CALL", {
            invokedBy: message.username,
          }),
        );
      }
    } catch (e) {}

    await translationManager.reloadLocale();
    await client.dispatchBotMessage(
      translationManager.translate("SUCCESS", { invokedBy: message.username }),
    );
  }

  getMatchingExp(): RegExp {
    return /^[?!]lcreload\s*$/i;
  }
}
