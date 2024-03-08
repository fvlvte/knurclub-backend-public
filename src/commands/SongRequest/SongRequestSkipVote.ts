import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { Songrequest } from "../../features/Songrequest";
import { TwitchClient } from "../../clients/TwitchClient";
import { ConfigManager } from "../../managers/ConfigManager";

export class SongRequestSkipVote extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const translationManager = TranslationManager.getInstance(
      await client.getStreamLanguage(),
      await client.getBroadcasterId(),
    );

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
        const ret = sr.handleVote(message.username, song.requestedBy, -1);
        await client.dispatchBotMessage(
          translationManager.translate("SR_VOTE_BAD_SUCCESS", {
            invokedBy: message.username,
            targetUser: song.requestedBy,
            change: -1,
            currentValue: ret,
          }),
        );
      } catch (_e) {}
    }

    if (
      message.tags.isModerator ||
      message.username.toLowerCase() ===
        (await client.getStreamerUsername()).toLowerCase()
    ) {
      await client.dispatchBotMessage(
        translationManager.translate("SR_ADMIN_SKIP", {
          invokedBy: message.username,
        }),
      );
      sr.skip();
      return;
    }

    if (!config.data.songRequest.allowSkipVote) {
      return;
    }

    const counter = await sr.voteSkip(message.username);

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
    return /^(!knurskip)|(!kskip)|(!skip)|(!sskip)\s*$/i;
  }
}
