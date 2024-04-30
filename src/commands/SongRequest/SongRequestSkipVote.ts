import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { TwitchClient } from "../../clients/TwitchClient";
import { ConfigManager } from "../../managers/ConfigManager";
import { Songrequest } from "../../features/Songrequest";
import { util_makeSrUserFromMessage } from "./util_makeSrUserFromMessage";

//const BANNED_SPELLE = ["miinioo_"];

export class SongRequestSkipVote extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const language = await client.getStreamLanguage();
    const hostId = await client.getBroadcasterId();

    /*if (BANNED_SPELLE.includes(message.username.toLowerCase())) {
      return;
    }*/

    const translationManager = TranslationManager.getInstance(language, hostId);

    const config = await ConfigManager.getUserInstance(
      await client.getBroadcasterId(),
    ).getConfig();

    const sr = Songrequest.getInstance(await client.getBroadcasterId());

    const song = sr.getCurrentSong();

    if (!song) {
      return;
    }

    if (message.message.includes("sskip")) {
      try {
        const ret = await sr.handleVote(
          util_makeSrUserFromMessage(message),
          -1,
        );
        await client.dispatchBotMessage(
          translationManager.translate("SR_VOTE_BAD_SUCCESS", {
            invokedBy: message.username,
            targetUser: song.user.username,
            change: -1,
            currentValue: ret.total,
          }),
        );
      } catch (_e) {}
    }

    if (!config.data.songRequest.allowSkipVote) {
      return;
    }

    const counter = await sr.voteSkip(
      message.username,
      config.data.songRequest.useDynamicSkip
        ? config.data.songRequest.dynamicSkipThreshold *
            client.getAverageCountOfActiveChattersForPeriod(
              config.data.songRequest.dynamicSkipActivityPeriod * 1000,
            )
        : undefined,
    );

    if (counter > 0) {
      await client.dispatchBotMessage(
        translationManager.translate("SR_SKIP_VOTE_IN_PROGRESS", {
          invokedBy: message.username,
          counter: counter,
        }),
      );
    } else {
      await client.dispatchBotMessage(
        translationManager.translate("SR_SKIP_VOTE_SUCCESS", {
          invokedBy: message.username,
        }),
      );
    }
  }

  getMatchingExp(): RegExp {
    return /^(!voteskip)|(!vskip)|(!skipvote)|(!knurprzewintoprosze)\s*$/i;
  }
}
