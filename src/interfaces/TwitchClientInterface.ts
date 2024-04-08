export interface TwitchClientInterface {
  //registerEventListenerSession(ses: WebSocketSession): Promise<void>;

  //removeEventListener(ses: WebSocketSession): Promise<void>;

  //getLastKeepAliveTick(): number;

  //popKochanegoFolowka(): string | undefined;

  //getEventFromFeed(feedId: string): AlertInfo | undefined;

  getBroadcasterId(): Promise<string>;

  //subscribeToHelix(param: TwitchHelix_SubscribeBody): Promise<void>;

  /*createNewReward(
    broadcasterId: string,
    param: TwitchHelix_ChannelPoint_CreateReward,
  ): Promise<TwitchHelix_ChannelPoint_CreateReward_Response | null>;*/

  //setUpStreamerCredentials(): Promise<boolean>;

  //setUpWebsockets(): Promise<void>;

  getStreamerUsername(): Promise<string>;

  getBotUsername(): Promise<string>;

  getStreamLanguage(): Promise<string>;

  //getRefreshToken(): Promise<string>;

  dispatchBotMessage(message: string): Promise<void>;

  initialize(): Promise<void>;

  //keepAliveTick(): void;

  shutdown(): Promise<void>;
}
