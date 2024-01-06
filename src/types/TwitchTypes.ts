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
