import { default as axios } from "axios";
import { AuthToken } from "./AuthToken";

type TokenType = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string[];
  token_type: "bearer";
};

export type Data = {
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
      janPawulon,
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

    const whitelistedUserIDs = [
      "197171878", // hyba hyba
      "883479198", // tortilka
      "268563714", // fulufte
      "27187817", // lewus aok
      "54234510", // juriko
      "68174363", // xbladejojo
      "25452828", // smaczny
    ];

    if (!whitelistedUserIDs.includes(userId)) {
      throw new Error("not whitelisted user");
    }

    const tkn = new AuthToken<Data>(
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

  public static async decodeToken(token: string) {
    return await AuthToken.getPayloadFromToken<Data>(token);
  }
}
