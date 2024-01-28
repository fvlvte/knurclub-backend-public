import { V2TwitchClient } from "../V2TwitchClient";

export interface Timer {
  init(client: V2TwitchClient): void;
  shut(): void;
}
