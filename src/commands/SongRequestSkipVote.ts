import { CommandHandler } from "./CommandHandler";
import { TwitchMessage } from "../types/TwitchTypes";
import { TranslationManager } from "../TranslationManager";
import { Songrequest } from "../Songrequest";
import { TwitchClient } from "../TwitchClient";

export class SongRequestSkipVote extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const translationManager = TranslationManager.getInstance(
      await client.getStreamLanguage(),
      await client.getStreamerUsername(),
    );

    const sr = Songrequest.getInstance(await client.getBroadcasterId());

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

    const counter = sr.voteSkip(message.username);

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
    return /^(!knurskip)|(!kskip)|(!skip)\s*$/i;
  }
}
