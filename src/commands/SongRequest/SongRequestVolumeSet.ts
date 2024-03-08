import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { Songrequest } from "../../features/Songrequest";
import { TwitchClient } from "../../clients/TwitchClient";
import { ConfigManager } from "../../managers/ConfigManager";

export class SongRequestVolumeSet extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const config = await ConfigManager.getUserInstance(
      await client.getBroadcasterId(),
    ).getConfig();
    const translationManager = TranslationManager.getInstance(
      await client.getStreamLanguage(),
      await client.getBroadcasterId(),
    );

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

  getMatchingExp(): RegExp {
    return /^(!kv)|(!knurvolume)|(!volume) /i;
  }
}
