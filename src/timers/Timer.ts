import { TwitchClient } from "../TwitchClient";

export interface Timer {
  init(client: TwitchClient): void;
  shut(): void;
}
