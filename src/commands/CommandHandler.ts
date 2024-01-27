import { TwitchClient, TwitchMessage } from "../TwitchClient";
import { V2TwitchClient } from "../V2TwitchClient";

export interface CommandHandler {
  handleCommand(
    client: TwitchClient | V2TwitchClient,
    message: TwitchMessage,
  ): Promise<void>;
  getMatchingExp(): RegExp;
}
