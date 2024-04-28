import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { TwitchClient } from "../../clients/TwitchClient";
import { SRRewritten } from "../../features/SRRewritten";

export class SongRequestStop extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const language = await client.getStreamLanguage();
    const hostId = await client.getBroadcasterId();

    const translationManager = TranslationManager.getInstance(language, hostId);

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
      SRRewritten.getInstance(await client.getBroadcasterId()).stop();
    }
  }

  getMatchingExp(): RegExp {
    return /^!(stop)|(pause)\s*$/i;
  }
}
