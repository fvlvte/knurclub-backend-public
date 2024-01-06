import { default as axios } from "axios";
import { TokenStrimera } from "./TokenStrimera";

/*
client_id 	Yes 	String 	Your app’s registered client ID.
client_secret 	Yes 	String 	Your app’s registered client secret.
code 	Yes 	String 	The code that the /authorize response returned in the code query parameter.
grant_type 	Yes 	String 	Must be set to authorization_code.
redirect_uri 	Yes 	URI 	Your app’s registered redirect URI.
*/
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

export class TwitchZiomek {
  public static async odpalZiomkaZKodu(code: string, redirect?: string) {
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

    const redsfdsgdfsult = await axios.get<TwitchData>(
      `https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=${268563714}&user_id=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-Id": process.env.TWITCH_CLIENT_ID,
        },
      },
    );

    for (const sub of redsfdsgdfsult.data.data) {
      if (sub.tier === "1000" || sub.tier === "2000" || sub.tier === "3000") {
        const tkn = new TokenStrimera<Data>(
          {
            refresh_token: refreshToken,
            user_id: userId,
            is_sub: true,
            expires_at: Date.now() + 1000 * 60 * 60 * 24,
          } as Data,
          userId,
        );

        return tkn.encrypt();
      }
    }

    return null;
  }

  public static async getZiomoInfo(token: string) {
    return await TokenStrimera.getPayloadFromToken<Data>(token);
  }
}
