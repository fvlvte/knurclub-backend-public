import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { Songrequest } from "../../features/Songrequest";
import { TwitchClient } from "../../clients/TwitchClient";
import { FeatureFlag, isFeatureEnabled } from "../../util/FeatureFlag";
import { SRRewritten } from "../../features/SRRewritten";
import { util_makeSrUserFromMessage } from "./util_makeSrUserFromMessage";

export class SongRequestAdd extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const language = await client.getStreamLanguage();
    const hostId = await client.getBroadcasterId();
    const translationManager = TranslationManager.getInstance(language, hostId);

    const array = message.message.split(" ");
    array.splice(0, 1);

    const ytLink = array.join(" ");

    if (
      isFeatureEnabled(
        FeatureFlag.FF_NEW_PLAYER,
        await client.getBroadcasterId(),
      )
    ) {
      const result = await SRRewritten.getInstance(
        await client.getBroadcasterId(),
      ).tryAddSongByUser(ytLink, util_makeSrUserFromMessage(message));

      await client.dispatchBotMessage(
        translationManager.translate(result.message, {
          invokedBy: message.username,
          ...result.params,
        }),
      );
    } else {
      // TODO: Remove old player.
      const subLevel =
        typeof message.tags.badges.subscriber === "number" ? 1 : 0;

      const username = message.username;

      const result = await Songrequest.getInstance(
        await client.getBroadcasterId(),
      ).tryAddSong(
        ytLink,
        {
          subLevel,
          username,
          isMod: message.tags.isModerator ?? false,
        },
        false,
      );

      await client.dispatchBotMessage(
        translationManager.translate(result.message, {
          invokedBy: message.username,
          ...result.param,
        }),
      );
    }
  }

  getMatchingExp(): RegExp {
    return /^([?!]ksr)|([?!]sr)|([?!]knursr)|([?!]songrequest)|([?!]knursongrequest)|([?!]wezpuscpiosenkeknurze)/i;
  }
}
