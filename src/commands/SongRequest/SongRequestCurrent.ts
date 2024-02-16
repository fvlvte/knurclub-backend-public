import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { Songrequest } from "../../features/Songrequest";
import { TwitchClient } from "../../clients/TwitchClient";

export class SongRequestCurrent extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const translationManager = TranslationManager.getInstance(
      await client.getStreamLanguage(),
      await client.getStreamerUsername(),
    );

    const songInfo = Songrequest.getInstance(
      await client.getBroadcasterId(),
    ).getCurrentSong();

    if (!songInfo) {
      return await client.dispatchBotMessage(
        translationManager.translate("SR_ERR_NO_SONG", {
          invokedBy: message.username,
        }),
      );
    }

    return await client.dispatchBotMessage(
      translationManager.translate("SR_SONG_INFO", {
        invokedBy: message.username,
        title: songInfo.title,
        rep: songInfo.userReputation ?? 0,
        url: songInfo.url,
        requestedBy: songInfo.requestedBy,
      }),
    );
  }

  getMatchingExp(): RegExp {
    return /^(!knursrsong)|(!ksrs)|(!song)|(!knursong)\s*$/i;
  }
}
