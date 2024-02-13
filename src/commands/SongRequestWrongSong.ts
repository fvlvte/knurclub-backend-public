import { CommandHandler } from "./CommandHandler";
import { TwitchMessage } from "../types/TwitchTypes";
import { TranslationManager } from "../TranslationManager";
import { Songrequest } from "../Songrequest";
import { TwitchClient } from "../TwitchClient";

export class SongRequestWrongSong extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const translationManager = TranslationManager.getInstance(
      await client.getStreamLanguage(),
      await client.getStreamerUsername(),
    );

    const sr = Songrequest.getInstance(await client.getBroadcasterId());

    const queue = sr.getQueue();

    const currentSong = sr.getCurrentSong();
    const song = queue.findLast(
      (v) => v.requestedBy.toLowerCase() === message.username.toLowerCase(),
    );

    if (!song) {
      if (
        currentSong?.requestedBy.toLowerCase() !==
        message.username.toLowerCase()
      ) {
        return await client.dispatchBotMessage(
          translationManager.translate("SR_WRONG_SONG_NOT_FOUND", {
            invokedBy: message.username,
          }),
        );
      } else {
        sr.skip();
        return await client.dispatchBotMessage(
          translationManager.translate("SR_WRONG_SONG_WIPED", {
            invokedBy: message.username,
            title: currentSong.title,
            url: currentSong.url,
          }),
        );
      }
    }

    sr.removeFromQueue(song);

    return await client.dispatchBotMessage(
      translationManager.translate("SR_WRONG_SONG_WIPED", {
        invokedBy: message.username,
        title: song.title,
        url: song.url,
      }),
    );
  }

  getMatchingExp(): RegExp {
    return /^(!wrongsong)|(!knurwrongsong)|(!kws)|(!ws)\s*$/i;
  }
}
