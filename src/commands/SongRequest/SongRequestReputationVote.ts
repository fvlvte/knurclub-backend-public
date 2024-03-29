import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { Songrequest } from "../../features/Songrequest";
import { TwitchClient } from "../../clients/TwitchClient";
import { FeatureFlag, isFeatureEnabled } from "../../util/FeatureFlag";
import { SRRewritten } from "../../features/SRRewritten";
import { util_makeSrUserFromMessage } from "./util_makeSrUserFromMessage";

export class SongRequestReputationVote extends CommandHandler {
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
      const sr = SRRewritten.getInstance(await client.getBroadcasterId());
      const currentSong = sr.getCurrentSong();

      if (currentSong === null) {
        await client.dispatchBotMessage(
          translationManager.translate("SR_ERROR_NO_SONG", {
            invokedBy: message.username,
          }),
        );
        return;
      }

      try {
        const value =
          message.message.includes("syf") || message.message.includes("!ks")
            ? -1
            : 1;
        const ret = await sr.handleVote(
          util_makeSrUserFromMessage(message),
          value,
        );

        const template =
          value > 0 ? "SR_VOTE_GOOD_SUCCESS" : "SR_VOTE_BAD_SUCCESS";
        await client.dispatchBotMessage(
          translationManager.translate(template, {
            invokedBy: message.username,
            targetUser: currentSong.user.username,
            change: value,
            currentValue: ret,
          }),
        );
      } catch (e) {
        await client.dispatchBotMessage(
          translationManager.translate((e as Error).message, {
            invokedBy: message.username,
          }),
        );
        return;
      }
    } else {
      // TODO: Remove old player.
      const currentSong = Songrequest.getInstance(
        await client.getBroadcasterId(),
      ).getCurrentSong();

      if (currentSong === null) {
        await client.dispatchBotMessage(
          translationManager.translate("SR_ERROR_NO_SONG", {
            invokedBy: message.username,
          }),
        );
        return;
      }

      try {
        const value =
          message.message.includes("syf") || message.message.includes("!ks")
            ? -1
            : 1;
        const ret = Songrequest.getInstance(
          await client.getBroadcasterId(),
        ).handleVote(message.username, currentSong.requestedBy, value);

        const template =
          value > 0 ? "SR_VOTE_GOOD_SUCCESS" : "SR_VOTE_BAD_SUCCESS";
        await client.dispatchBotMessage(
          translationManager.translate(template, {
            invokedBy: message.username,
            targetUser: currentSong.requestedBy,
            change: value,
            currentValue: ret,
          }),
        );
      } catch (e) {
        await client.dispatchBotMessage(
          translationManager.translate((e as Error).message, {
            invokedBy: message.username,
          }),
        );
        return;
      }
    }
  }

  getMatchingExp(): RegExp {
    return /^(!knurgit)|(!knursyf)|(!git)|(!syf)|(!kg)|(!ks)\s*$/i;
  }
}
