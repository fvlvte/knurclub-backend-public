import { CommandHandler } from "./CommandHandler";
import { TwitchMessage } from "../types/TwitchTypes";
import { TranslationManager } from "../managers/TranslationManager";
import { TwitchClient } from "../clients/TwitchClient";

export class Spell extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    try {
      if (message.username !== (await client.getStreamerUsername())) {
        await client.dispatchBotMessage(
          TranslationManager.getInstance(
            await client.getStreamLanguage(),
            await client.getBroadcasterId(),
          ).translate("UNAUTHORIZED_COMMAND_CALL", {
            invokedBy: message.username,
          }),
        );
        return;
      }

      if (message.message.includes("unspell")) {
        client.unspell(message.message.split(" ")[1].replace("@", ""));
      } else {
        client.addSpell(message.message.split(" ")[1].replace("@", ""));
      }
    } catch (e) {
      console.error(e);
      await client.dispatchBotMessage(
        TranslationManager.getInstance(
          await client.getStreamLanguage(),
          await client.getBroadcasterId(),
        ).translate("UNKNOWN_ERROR", { invokedBy: message.username, error: e }),
      );
    }
  }

  getMatchingExp(): RegExp {
    return /^([?!]spell)|([?!]unspell)/i;
  }
}
