import { TwitchMessage } from "../types/TwitchTypes";
import { V2TwitchClient } from "../V2TwitchClient";
import { TranslationManager } from "../TranslationManager";

export abstract class CommandHandler {
  abstract handleCommand(
    client: V2TwitchClient,
    message: TwitchMessage,
  ): Promise<void>;
  async preHandleCommand(
    client: V2TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    if (message.message.startsWith("?")) {
      await client.dispatchBotMessage(
        TranslationManager.getInstance(
          await client.getStreamLanguage(),
          await client.getStreamerUsername(),
        ).translate(`CMD_${this.constructor.name}_HELP`, {
          invokedBy: message.username,
        }),
      );
    } else {
      return this.handleCommand(client, message);
    }
  }
  abstract getMatchingExp(): RegExp;
}
