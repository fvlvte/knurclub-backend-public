import { CommandHandler } from "./CommandHandler";
import { TwitchClient, TwitchMessage } from "../TwitchClient";
import { TranslationManager } from "../TranslationManager";
import { Songrequest } from "../Songrequest";

export class SongRequestWipe implements CommandHandler {
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

  getMatchingExp(): RegExp {
    return /^(!knurwipe)|(!kwipe)|(!wipe)\s*$/i;
  }
}
