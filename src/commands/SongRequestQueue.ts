import { CommandHandler } from "./CommandHandler";
import { TwitchClient, TwitchMessage } from "../TwitchClient";
import { TranslationManager } from "../TranslationManager";
import { Songrequest } from "../Songrequest";
import { V2TwitchClient } from "../V2TwitchClient";

export class SongRequestQueue implements CommandHandler {
  async handleCommand(
    client: TwitchClient | V2TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const translationManager = TranslationManager.getInstance(
      await client.getStreamLanguage(),
      await client.getStreamerUsername(),
    );

    const queue = [
      ...Songrequest.getInstance(await client.getBroadcasterId()).getQueue(),
    ];
    const songInfo: string[] = [];

    for (let i = 0; i < 3; i++) {
      const si = queue[i];
      if (si) {
        songInfo.push(
          `${i + 1}. ${si.title} - @${si.requestedBy} (${
            si.userReputation ?? 0
          }) - ${si.url}`,
        );
      }
    }

    console.log(songInfo);

    if (songInfo.length === 0) {
      return await client.dispatchBotMessage(
        translationManager.translate("SR_EMPTY_QUEUE", {
          invokedBy: message.username,
        }),
      );
    }

    return await client.dispatchBotMessage(
      translationManager.translate("SR_QUEUE_PRINT", {
        invokedBy: message.username,
        queue: songInfo.join(", "),
      }),
    );
  }

  getMatchingExp(): RegExp {
    return /^(!kqueue)|(!kq)|(!queue)|(!knurqueue)|(!q)\s*$/i;
  }
}
