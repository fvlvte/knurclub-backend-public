export type IRCTwitchMessage = {
  _raw: string;
  timestamp: Date;
  command: string;
  event: string;
  channel: string;
  username: string;
  isSelf: boolean;
  message: string;
  tags: {
    badgeInfo: string;
    badges: {
      broadcaster?: boolean;
      subscriber?: number;
      twitchconNa2023?: string;
    };
    clientNonce: string;
    color: string;
    displayName: string;
    emotes: string[];
    firstMsg: string;
    flags: string;
    id: string;
    mod: string;
    returningChatter: string;
    roomId: string;
    subscriber: string;
    tmiSentTs: string;
    turbo: string;
    userId: string;
    userType: string;
    bits?: undefined;
    emoteSets: string[];
    username: string;
    isModerator: boolean;
  };
};
