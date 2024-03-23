import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { Songrequest } from "../../features/Songrequest";
import { TwitchClient } from "../../clients/TwitchClient";
import { FeatureFlag, isFeatureEnabled } from "../../util/FeatureFlag";
import { SRRewritten } from "../../features/SRRewritten";

export class SongRequestCurrent extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const language = await client.getStreamLanguage();
    const hostId = await client.getBroadcasterId();

    const translationManager = TranslationManager.getInstance(language, hostId);

    if (
      isFeatureEnabled(
        FeatureFlag.FF_NEW_PLAYER,
        await client.getBroadcasterId(),
      )
    ) {
      const result = SRRewritten.getInstance(
        await client.getBroadcasterId(),
      ).getCurrentSong();

      if (!result) {
        return await client.dispatchBotMessage(
          translationManager.translate("SR_ERR_NO_SONG", {
            invokedBy: message.username,
          }),
        );
      }

      await client.dispatchBotMessage(
        translationManager.translate("SR_SONG_INFO", {
          invokedBy: message.username,
          title: result.title,
          url: result.url,
          requestedBy: result.user.username,
        }),
      );
    } else {
      // TODO: Remove old player.
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
  }

  getMatchingExp(): RegExp {
    return /^(!knursrsong)|(!ksrs)|(!song)|(!knursong)\s*$/i;
  }
}
