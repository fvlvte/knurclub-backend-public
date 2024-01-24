import { CommandHandler } from "./CommandHandler";
import { TwitchClient, TwitchMessage } from "../TwitchClient";
import { TranslationManager } from "../TranslationManager";

export class ReloadLocale implements CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const translationManager = TranslationManager.getInstance(
      await client.getStreamLanguage(),
      await client.getStreamerUsername(),
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

    translationManager.reloadLocale();
    await client.dispatchBotMessage(
      translationManager.translate("SUCCESS", { invokedBy: message.username }),
    );
  }

  getMatchingExp(): RegExp {
    return /^\$lcreload/;
  }
}
