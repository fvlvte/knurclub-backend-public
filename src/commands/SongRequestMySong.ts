import { CommandHandler } from "./CommandHandler";
import { TwitchMessage } from "../types/TwitchTypes";
import { TranslationManager } from "../TranslationManager";
import { Songrequest } from "../Songrequest";
import { V2TwitchClient } from "../V2TwitchClient";

export class SongRequestMySong extends CommandHandler {
  async handleCommand(
    client: V2TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const translationManager = TranslationManager.getInstance(
      await client.getStreamLanguage(),
      await client.getStreamerUsername(),
    );

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

  getMatchingExp(): RegExp {
    return /^(!mysong)|(!knurmysong)|(!ms)|(!kms)\s*$/i;
  }
}
