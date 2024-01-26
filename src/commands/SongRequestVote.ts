import { CommandHandler } from "./CommandHandler";
import { TwitchClient, TwitchMessage } from "../TwitchClient";
import { TranslationManager } from "../TranslationManager";
import { Songrequest } from "../Songrequest";

export class SongRequestVote implements CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const translationManager = TranslationManager.getInstance(
      await client.getStreamLanguage(),
      await client.getStreamerUsername(),
    );

    const currentSong = Songrequest.getInstance().getCurrentSong();

    if (currentSong === null) {
      await client.dispatchBotMessage(
        translationManager.translate("SR_ERROR_NO_SONG", {
          invokedBy: message.username,
        }),
      );
      return;
    }

    try {
      const value = message.message.includes("syf") ? -1 : 1;
      const ret = Songrequest.getInstance().handleVote(
        message.username,
        currentSong.requestedBy,
        value,
      );

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
      console.log(e);
      await client.dispatchBotMessage(
        translationManager.translate((e as Error).message, {
          invokedBy: message.username,
        }),
      );
      return;
    }
  }

  getMatchingExp(): RegExp {
    return /^(!knurgit)|(!knursyf)/;
  }
}
