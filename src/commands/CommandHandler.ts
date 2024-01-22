import { TwitchClient, TwitchMessage } from "../TwitchClient";

export interface CommandHandler {
  handleCommand(client: TwitchClient, message: TwitchMessage): Promise<void>;
  getMatchingExp(): RegExp;
}
