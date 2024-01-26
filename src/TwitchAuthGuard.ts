import { default as axios } from "axios";
import { TwitchAuthToken } from "./TwitchAuthToken";

type TokenType = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string[];
  token_type: "bearer";
};

type Data = {
  refresh_token: string;
  user_id: string;
  is_sub: boolean;
  expires_at: number;
};

type TokenInfoType = {
  client_id: string;
  login: string;
  scopes: string[];
  user_id: string;
  expires_in: number;
};

type TwitchData = {
  data: {
    broadcaster_id: string;
    broadcaster_name: string;
    broadcaster_login: string;
    is_gift: boolean;
    tier: string;
  }[];
};

export class TwitchAuthGuard {
  public static async generateToken(code: string, redirect?: string) {
    const data = {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri:
        redirect ||
        process.env.TWITCH_REDIRECT_URI ||
        "http://localhost:3001/oauth-flow",
    };
    const janPawulon = new URLSearchParams(
      data as unknown as Record<string, string>,
    );
    const r = await axios.post<TokenType>(
      "https://id.twitch.tv/oauth2/token",
      janPawulon.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );

    const refreshToken = r.data.refresh_token;
    const accessToken = r.data.access_token;

    const vr = await axios.get<TokenInfoType>(
      "https://id.twitch.tv/oauth2/validate",
      {
        headers: { Authorization: `OAuth ${accessToken}` },
      },
    );
    const userId = vr.data.user_id;

    const whitelistedUserIDs = ["1024010545"];

    if (!whitelistedUserIDs.includes(userId)) {
      throw new Error("not whitelisted user");
    }

    const tkn = new TwitchAuthToken<Data>(
      {
        refresh_token: refreshToken,
        user_id: userId,
        is_sub: true,
        expires_at: Date.now() + 1000 * 60 * 60 * 24 * 30,
      } as Data,
      userId,
    );

    return tkn.encrypt();

    /* const redsfdsgdfsult = await axios.get<TwitchData>(
      `https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=${268563714}&user_id=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-Id": process.env.TWITCH_CLIENT_ID,
        },
      },
    );

    for (const sub of redsfdsgdfsult.data.data) {
      if (sub.broadcaster_name === "fvlvtebot") {
     const tkn = new TwitchAuthToken<Data>(
              {
                refresh_token: refreshToken,
                user_id: userId,
                is_sub: true,
                expires_at: Date.now() + 1000 * 60 * 60 * 24 * 30,
              } as Data,
              userId,
            );

        return tkn.encrypt();
      }
    }*/

    return null;
  }

  public static async decodeToken(token: string) {
    return await TwitchAuthToken.getPayloadFromToken<Data>(token);
  }
}
