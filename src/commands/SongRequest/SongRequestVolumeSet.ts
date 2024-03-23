import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { Songrequest } from "../../features/Songrequest";
import { TwitchClient } from "../../clients/TwitchClient";
import { ConfigManager } from "../../managers/ConfigManager";
import { FeatureFlag, isFeatureEnabled } from "../../util/FeatureFlag";
import { SRRewritten } from "../../features/SRRewritten";

export class SongRequestVolumeSet extends CommandHandler {
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
      const config = await ConfigManager.getUserInstance(hostId).getConfig();

      if (
        !(
          (message.tags.isModerator &&
            config.data.songRequest.allowModsControlVolume) ||
          message.username.toLowerCase() ===
            (await client.getStreamerUsername()).toLowerCase()
        )
      ) {
        return;
      }

      const sr = SRRewritten.getInstance(hostId);

      const [, v] = message.message.split(" ");
      const i = parseInt(v);

      if (isNaN(i) || i / 100 < 0 || i / 100 > 1) {
        await client.dispatchBotMessage(
          translationManager.translate("SR_INVALID_VOLUME_VALUE", {
            invokedBy: message.username,
          }),
        );
        return;
      }
      const realVolume = i / 100;

      sr.setVolume(realVolume);

      await client.dispatchBotMessage(
        translationManager.translate("SR_VOLUME_SET", {
          invokedBy: message.username,
        }),
      );
    } else {
      // TODO: Remove old player.
      const config = await ConfigManager.getUserInstance(hostId).getConfig();

      if (
        !(
          (message.tags.isModerator &&
            config.data.songRequest.allowModsControlVolume) ||
          message.username.toLowerCase() ===
            (await client.getStreamerUsername()).toLowerCase()
        )
      ) {
        return;
      }

      const sr = Songrequest.getInstance(await client.getBroadcasterId());

      const [, v] = message.message.split(" ");
      const i = parseInt(v);

      if (isNaN(i) || i / 100 < 0 || i / 100 > 1) {
        await client.dispatchBotMessage(
          translationManager.translate("SR_INVALID_VOLUME_VALUE", {
            invokedBy: message.username,
          }),
        );
        return;
      }
      const realVolume = i / 100;

      sr.setVolume(realVolume);

      await client.dispatchBotMessage(
        translationManager.translate("SR_VOLUME_SET", {
          invokedBy: message.username,
        }),
      );
    }
  }

  getMatchingExp(): RegExp {
    return /^(!kv)|(!knurvolume)|(!volume) /i;
  }
}
