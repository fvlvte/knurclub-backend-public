export interface Discord_API_V9_User_Connection {
  type: string;
  id: string;
  name: string;
  verified: boolean;
}

export interface Discord_API_V9_User_MutualGuild {
  id: string;
  nick: null | string;
}

export interface Discord_API_V9_User_Badge {
  id: string;
  description: string;
  icon: string;
  link: string;
}

export interface Discord_API_V9_User {
  user: {
    id: string;
    username: string;
    global_name: null | string;
    display_name: null | string;
    avatar: null | string;
    discriminator: string;
    public_flags: number;
    flags: number;
    banner: null | string;
    banner_color: string;
    accent_color: number;
    bio: string;
    avatar_decoration: null | string;
  };
  connected_accounts: Discord_API_V9_User_Connection[];
  premium_since: string | null;
  premium_type: number | null;
  premium_guild_since: string | null;
  profile_themes_experiment_bucket: number;
  mutual_guilds: Discord_API_V9_User_MutualGuild[];
  guild_member: {
    avatar: null | string;
    communication_disabled_until: null | string;
    flags: number;
    joined_at: string;
    nick: null | string;
    pending: boolean;
    premium_since: number | string;
    roles: string[];
    user_profile: {
      bio: string;
      accent_color: number;
      banner: string | null;
      theme_colors: number[];
      popout_animation_particle_type: string | unknown;
      emoji: string | null;
    };
    guild_member_profile: {
      guild_id: string;
      bio: string;
      banner: null | string;
      accent_color: null | number;
      theme_colors: number | null | number[];
      popout_animation_particle_type: null | string;
      emoji: null | string;
    };
    badges: Discord_API_V9_User_Badge[];
    guild_badges: Discord_API_V9_User_Badge[];
  };
}

export interface Discord_WS_User_Info {
  username: string;
  public_flags: number;
  id: string;
  global_name: null | string;
  display_name: null | string;
  discriminator: string;
  bot: boolean;
  avatar_decoration: null | string;
  avatar: null | string;
}

export interface Discord_WS_User_D_Info {
  ops: [
    {
      items?: { member: { user: Discord_WS_User_Info } }[] | undefined;
      item?: { member: { user: Discord_WS_User_Info } } | undefined;
    },
  ];
}
