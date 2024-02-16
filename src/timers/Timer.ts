import { TwitchClient } from "../clients/TwitchClient";

export interface Timer {
  init(client: TwitchClient): void;
  shut(): void;
}
