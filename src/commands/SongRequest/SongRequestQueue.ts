import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { Songrequest } from "../../features/Songrequest";
import { TwitchClient } from "../../clients/TwitchClient";
import { FeatureFlag, isFeatureEnabled } from "../../util/FeatureFlag";
import { SRRewritten } from "../../features/SRRewritten";

export class SongRequestQueue extends CommandHandler {
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
      const queue = SRRewritten.getInstance(hostId).getQueue();
      const songInfo: string[] = [];

      for (let i = 0; i < 3; i++) {
        const si = queue[i];
        if (si) {
          songInfo.push(
            `${i + 1}. ${si.title} - @${si.user.username} - ${si.url}`,
          );
        }
      }

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
    } else {
      // TODO: Remove old player.
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
  }

  getMatchingExp(): RegExp {
    return /^(!kqueue)|(!kq)|(!queue)|(!knurqueue)|(!q)\s*$/i;
  }
}
