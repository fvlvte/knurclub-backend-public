export type PubSubMessage = {
  metadata: { [key: string]: string };
  timestamp: number;
  userDisplayName: string;
  message: string;
};

export type TwitchChatMemeber = {
  displayName: string;
  role: string;
  updatedAt: number;
};

export type Twitch_Channel_Info = {
  username: string;
  isLive: boolean;
  streamTitle: string;
  vieverCount: number;
  category: string;
};

export type TwitchPacket_WS_RedeemReward = {
  type: string;
  data: {
    timestamp: string;
    redemption: {
      id: string;
      user: {
        id: string;
        login: string;
        display_name: string;
        channel_id: string;
        redeemed_at: string;
      };
      reward: {
        id: string;
        channel_id: string;
        title: string;
        prompt: string;
        cost: number;
        is_user_input_required: boolean;
        is_sub_only: boolean;
        image: {
          url_1x: string;
          url_2x: string;
          url_4x: string;
        };
        default_image: {
          url_1x: string;
          url_2x: string;
          url_4x: string;
        };
        background_color: string;
        is_enabled: boolean;
        is_paused: boolean;
        is_in_stock: boolean;
        max_per_stream: {
          is_enabled: boolean;
          max_per_stream: number;
        };
        should_redemptions_skip_request_queue: boolean;
        template_id: unknown;
        updated_for_indicator_at: string;
        max_per_user_per_stream: {
          is_enabled: boolean;
          max_per_user_per_stream: number;
        };
        global_cooldown: {
          is_enabled: boolean;
          global_cooldown_seconds: number;
        };
        redemptions_redeemed_current_stream: unknown;
        cooldown_expires_at: unknown;
      };
      status: string;
      cursor: string;
    };
  };
};

export type TwitchPacket_CommunityTab = {
  channel: {
    id: string;
    name: string;
    chatters: {
      broadcasters: {
        login: string;
        __typename: string;
      }[];
      moderators: {
        login: string;
        __typename: string;
      }[];
      vips: {
        login: string;
        __typename: string;
      }[];
      staff: {
        login: string;
        __typename: string;
      }[];
      viewers: {
        login: string;
        __typename: string;
      }[];
      count: number;
      __typename: string;
    };
    __typename: string;
  };
  subscriptionProducts: {
    id: string;
    self: {
      canGiftInChannel: boolean;
      __typename: string;
    };
    __typename: string;
  }[];
  isPartner: boolean;
  stream: {
    id: string;
    title: string;
    game: {
      id: string;
      name: string;
      __typename: string;
    };
    __typename: string;
  };
  __typename: string;
};

export enum TwitchDataFeedEvents {
  "message" = "message",
  "rewardRedemption" = "rewardRedemption",
  "userlistUpdate" = "userlistUpdate",
}

export type TwitchRedemptionEvent = {
  login: string;
  reward: string;
};

export enum TransportMethods {
  webhook = "webhook",
  websocket = "websocket",
}

export type TwitchMessage = {
  _raw: string;
  timestamp: string; // or Date if you will convert it
  command: string;
  event: string;
  channel: string;
  username: string;
  isSelf: boolean;
  message: string;
  tags: {
    badgeInfo: string;
    badges: { subscriber: number };
    clientNonce: string;
    color: string;
    displayName: string;
    emotes: Array<unknown>; // Array of a certain type if you have a structure for emotes
    firstMsg: string; // or number if it is indeed a number
    flags: string;
    id: string;
    mod: string; // or number if it is indeed a number
    returningChatter: string; // or number if it is indeed a number
    roomId: string; // or number if it is indeed a number
    subscriber: string; // or number if it is indeed a number
    tmiSentTs: string; // or number if it is indeed a number
    turbo: string; // or number if it is indeed a number
    userId: string; // or number if it is indeed a number
    userType: string;
    bits: unknown; // specify type if you know what bits should be
    emoteSets: Array<unknown>; // Array of a certain type if you have a structure for emoteSets
    username: string;
    isModerator: boolean;
  };
};

export interface TwitchHelix_SubscribeBody {
  type: string;
  version: string;
  condition: Record<string, unknown>;
  transport: {
    method: TransportMethods;
    callback?: string;
    secret?: string;
    session_id?: string;
  };
}

export type TwitchWS_FollowEvent = {
  payload: {
    subscription: {
      id: string;
      status: string;
      type: string;
      version: string;
      condition: unknown;
      transport: unknown;
      created_at: string;
      cost: number;
    };
    event: {
      user_id: string;
      user_login: string;
      user_name: string;
      broadcaster_user_id: string;
      broadcaster_user_login: string;
      broadcaster_user_name: string;
      followed_at: string;
    };
  };
};

export type TwitchUserData = {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  view_count: number;
  email: string;
  created_at: string;
};

export enum TwitchMessageTypes {
  session_welcome = "session_welcome",
  keep_alive = "session_keepalive",
}

export enum TwitchSubscriptionType {
  channelFollow = "channel.follow",
  pointsRedemption = "channel.channel_points_custom_reward_redemption.add",
  sypukcjaOkOk = "channel.subscribe",
  sypukcjaOdPaszy = "channel.subscription.gift",
  sypukcja2OkOk = "channel.subscription.message",
  bits = "channel.cheer",
}

export type TwitchWebsocketSubscribeMessage = {
  payload: {
    event: {
      user_id: string;
      user_login: string;
      user_name: string;
      broadcaster_user_id: string;
      broadcaster_user_login: string;
      broadcaster_user_name: string;
      tier: string;
      is_gift: boolean;
    };
  };
};

export interface TwitchWebsocketBitsMessage {
  payload: {
    event: {
      is_anonymous: boolean;
      user_id: string | null;
      user_login: string | null;
      user_name: string | null;
      broadcaster_user_id: string;
      broadcaster_user_login: string;
      broadcaster_user_name: string;
      message: string;
      bits: number;
    };
  };
}

interface Reward {
  id: string;
  title: string;
  cost: number;
  prompt: string;
}

export interface TwitchWebsocketRewardRedemption {
  payload: {
    event: {
      id: string;
      broadcaster_user_id: string;
      broadcaster_user_login: string;
      broadcaster_user_name: string;
      user_id: string;
      user_login: string;
      user_name: string;
      user_input: string;
      status: string;
      reward: Reward;
      redeemed_at: string;
    };
  };
}
export type TwitchWebsocketSubOdPaszy = {
  payload: {
    event: {
      user_id: string;
      user_login: string;
      user_name: string;
      broadcaster_user_id: string;
      broadcaster_user_login: string;
      broadcaster_user_name: string;
      total: number;
      tier: string;
      cumulative_total: number | null; //null if anonymous or not shared by the user
      is_anonymous: boolean;
    };
  };
};

export type TwitchWebsocketMetadata = {
  metadata: {
    message_id: string;
    message_type: TwitchMessageTypes;
    message_timestamp: string;
    subscription_type?: TwitchSubscriptionType;
  };
};

export type TwitchWelcomeWebsocketMessage = {
  payload: {
    session: {
      id: string;
      status: string;
      connected_at: string;
      keepalive_timeout_seconds: number;
      reconnect_url: string | null;
    };
  };
};

export const Entitsy = [
  "MARSHALL",
  "PAPIEŻKOPTER",
  "MAŁYSZ",
  "KUBICA",
  "TESTO",
  "MARIUSZ",
  "PREZENTKONON",
  "PREMIER",
  "ZONK", // BRAUN
];
