import { TwitchClientInterface } from "../interfaces/TwitchClientInterface";

export class MockedTwitchClient implements TwitchClientInterface {
  public outMessages: string[] = [];
  dispatchBotMessage(message: string): Promise<void> {
    this.outMessages.push(message);
    return Promise.resolve(undefined);
  }

  getBotUsername(): Promise<string> {
    return Promise.resolve("fvlvtebot");
  }

  getBroadcasterId(): Promise<string> {
    return Promise.resolve("268563714");
  }

  getStreamLanguage(): Promise<string> {
    return Promise.resolve("pl");
  }

  getStreamerUsername(): Promise<string> {
    return Promise.resolve("fvlvte");
  }

  initialize(): Promise<void> {
    return Promise.resolve(undefined);
  }

  shutdown(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
