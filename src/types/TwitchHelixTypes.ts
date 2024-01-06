export type TwitchHelix_RewardStatus = "CANCELED" | "FULFILLED" | "UNFULFILLED";

export type TwitchHelix_ChannelPoint_CreateReward = {
  title: string;
  cost: number;
  prompt?: string;
  is_enabled?: boolean;
  background_color?: string;
  is_user_input_required?: boolean;
  is_max_per_stream_enabled?: boolean;
  max_per_stream?: number;
  is_max_per_user_per_stream_enabled?: boolean;
  max_per_user_per_stream?: number;
  is_global_cooldown_enabled?: boolean;
  global_cooldown_seconds?: number;
  should_redemptions_skip_request_queue?: boolean;
};

// credit @xnzq uwu
export type TwitchHelix_ChannelPoint_CreateReward_Response = {
  data: {
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    id: string;
    title: string;
    prompt: string;
    cost: number;
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
    is_user_input_required: boolean;
    max_per_stream_setting: {
      is_enabled: boolean;
      max_per_stream: number;
    };
    max_per_user_per_stream_setting: {
      is_enabled: boolean;
      max_per_user_per_stream: number;
    };
    global_cooldown_setting: {
      is_enabled: boolean;
      global_cooldown_seconds: number;
    };
    is_paused: boolean;
    is_in_stock: boolean;
    should_redemptions_skip_request_queue: boolean;
    redemptions_redeemed_current_stream: number;
    cooldown_expires_at: string;
  };
};

/*
268563714"}&reward_id=${"e3c5caa2-84cc-4689-b74f-7e989d5f1ddb"}&id=${
            item.id
          }&status=${"FULFILLED
*/

/*
d 	String 	No 	A list of IDs to filter the redemptions by. To specify more than one ID, include this parameter for each redemption you want to get. For example, id=1234&id=5678. You may specify a maximum of 50 IDs.

Duplicate IDs are ignored. The response contains only the IDs that were found. If none of the IDs were found, the response is 404 Not Found.
sort 	String 	No 	The order to sort redemptions by. The possible case-sensitive values are:

    OLDEST
    NEWEST

The default is OLDEST.
after 	String 	No 	The cursor used to get the next page of results. The Pagination object in the response contains the cursor’s value. Read more
first 	Integer 	No 	The maximum number of redemptions to return per page in the response. The minimum page size is 1 redemption per page and the maximum is 50. The default is 20.
*/

export type TwitchHelix_ChannelPoint_GetRedemptionState = {
  broadcaster_id: string;
  reward_id: string;
  status: TwitchHelix_RewardStatus;
  id?: string;
  sort?: "OLDEST" | "NEWEST";
  after?: string;
  first?: number;
};

export type TwitchHelix_ChannelPoint_GetRedemptionState_Response = {
  data: {
    broadcaster_name: string;
    broadcaster_login: string;
    broadcaster_id: string;
    id: string;
    user_id: string;
    user_name: string;
    user_input: string;
    status: TwitchHelix_RewardStatus;
    redeemed_at: string;
    reward: {
      id: string;
      title: string;
      prompt: string;
      cost: number;
    };
  }[];
};
