import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { Songrequest } from "../../features/Songrequest";
import { TwitchClient } from "../../clients/TwitchClient";
import { FeatureFlag, isFeatureEnabled } from "../../util/FeatureFlag";
import { SRRewritten } from "../../features/SRRewritten";

export class SongRequestPlay extends CommandHandler {
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
        SRRewritten.getInstance(await client.getBroadcasterId()).play();
      }
    } else {
      // TODO: Remove old player.
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
        Songrequest.getInstance(await client.getBroadcasterId()).play();
      }
    }
  }

  getMatchingExp(): RegExp {
    return /^!(play)|(!resume)|(!start)\s*$/i;
  }
}
