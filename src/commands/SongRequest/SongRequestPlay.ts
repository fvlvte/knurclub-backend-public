import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { Songrequest } from "../../features/Songrequest";
import { TwitchClient } from "../../clients/TwitchClient";

export class SongRequestPlay extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const translationManager = TranslationManager.getInstance(
      await client.getStreamLanguage(),
      await client.getBroadcasterId(),
    );

    const sr = Songrequest.getInstance(await client.getBroadcasterId());

    if (
      message.tags.isModerator ||
      message.username.toLowerCase() ===
        (await client.getStreamerUsername()).toLowerCase()
    ) {
      await client.dispatchBotMessage(
        translationManager.translate("SR_ADMIN_PLAY", {
          invokedBy: message.username,
        }),
      );
      sr.play();
    }
  }

  getMatchingExp(): RegExp {
    return /^!(play)|(!resume)|(!start)\s*$/i;
  }
}
