import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { TwitchClient } from "../../clients/TwitchClient";
import { Songrequest } from "../../features/Songrequest";

export class SongRequestWrongSong extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const language = await client.getStreamLanguage();
    const hostId = await client.getBroadcasterId();

    const translationManager = TranslationManager.getInstance(language, hostId);

    const sr = Songrequest.getInstance(hostId);

    const queue = sr.getQueue();

    const currentSong = sr.getCurrentSong();
    const song = queue.findLast(
      (v) => v.user.username.toLowerCase() === message.username.toLowerCase(),
    );

    if (!song) {
      if (
        currentSong?.user.username.toLowerCase() !==
        message.username.toLowerCase()
      ) {
        return await client.dispatchBotMessage(
          translationManager.translate("SR_WRONG_SONG_NOT_FOUND", {
            invokedBy: message.username,
          }),
        );
      } else {
        if (song === currentSong) await sr.skip();
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
