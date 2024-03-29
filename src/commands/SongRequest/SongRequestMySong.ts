import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { Songrequest } from "../../features/Songrequest";
import { TwitchClient } from "../../clients/TwitchClient";
import { FeatureFlag, isFeatureEnabled } from "../../util/FeatureFlag";
import { SRRewritten } from "../../features/SRRewritten";

export class SongRequestMySong extends CommandHandler {
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
      const sr = SRRewritten.getInstance(await client.getBroadcasterId());

      const queue = sr.getQueue();

      const song = queue.find(
        (v) => v.user.username.toLowerCase() === message.username.toLowerCase(),
      );

      if (!song) {
        return await client.dispatchBotMessage(
          translationManager.translate("SR_MY_SONG_NOT_FOUND", {
            invokedBy: message.username,
          }),
        );
      }

      return await client.dispatchBotMessage(
        translationManager.translate("SR_MY_SONG_INFO", {
          invokedBy: message.username,
          title: song.title,
          url: song.url,
          ...sr.when(song),
        }),
      );
    } else {
      // TODO: Remove old player.
      const sr = Songrequest.getInstance(await client.getBroadcasterId());

      const queue = sr.getQueue();

      const song = queue.find(
        (v) => v.requestedBy.toLowerCase() === message.username.toLowerCase(),
      );

      if (!song) {
        return await client.dispatchBotMessage(
          translationManager.translate("SR_MY_SONG_NOT_FOUND", {
            invokedBy: message.username,
          }),
        );
      }

      return await client.dispatchBotMessage(
        translationManager.translate("SR_MY_SONG_INFO", {
          invokedBy: message.username,
          title: song.title,
          url: song.url,
          ...sr.when(song),
        }),
      );
    }
  }

  getMatchingExp(): RegExp {
    return /^(!mysong)|(!knurmysong)|(!ms)|(!kms)\s*$/i;
  }
}
