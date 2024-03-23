import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { Songrequest } from "../../features/Songrequest";
import { TwitchClient } from "../../clients/TwitchClient";
import { FeatureFlag, isFeatureEnabled } from "../../util/FeatureFlag";
import { SRRewritten } from "../../features/SRRewritten";

export class SongRequestWipe extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const language = await client.getStreamLanguage();
    const hostId = await client.getBroadcasterId();

    const translationManager = TranslationManager.getInstance(language, hostId);

    if (isFeatureEnabled(FeatureFlag.FF_NEW_PLAYER, hostId)) {
      const sr = SRRewritten.getInstance(hostId);

      if (
        message.tags.isModerator ||
        message.username.toLowerCase() ===
          (await client.getStreamerUsername()).toLowerCase()
      ) {
        sr.wipeQueue();

        await client.dispatchBotMessage(
          translationManager.translate("SR_ADMIN_SKIP", {
            invokedBy: message.username,
          }),
        );
      }
    } else {
      // TODO: Remove old player.
      const sr = Songrequest.getInstance(await client.getBroadcasterId());

      if (
        message.tags.isModerator ||
        message.username.toLowerCase() ===
          (await client.getStreamerUsername()).toLowerCase()
      ) {
        sr.wipeQueue();
        sr.skip();

        await client.dispatchBotMessage(
          translationManager.translate("SR_ADMIN_SKIP", {
            invokedBy: message.username,
          }),
        );
        sr.skip();
        return;
      }
    }
  }

  getMatchingExp(): RegExp {
    return /^(!knurwipe)|(!kwipe)|(!wipe)\s*$/i;
  }
}
