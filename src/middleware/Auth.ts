import { NextFunction, Response } from "express";
import { QuickCrypt } from "../util/QuickCrypt";
import { RequestWithUserId, AuthToken } from "../types/Auth";
import { MongoDBClient } from "../clients/MongoDBClient";
import { Logger } from "../util/Logger";

class AuthMiddleware {
  private readonly ACCEPTED_TOKEN_VERSIONS = [1];
  constructor() {}

  private tokenCache: Record<string, { expiresAt: number; token: AuthToken }> =
    {};

  async process(
    req: RequestWithUserId,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    // Allow OPTIONS for CORS.
    if (req.method === "OPTIONS") {
      return next();
    }

    const authHeader = req.headers["Authorization"];
    if (typeof authHeader === "string") {
      try {
        const tokenData = QuickCrypt.unwrap<AuthToken>(authHeader);

        if (tokenData.id) {
          const dbData =
            this.tokenCache[tokenData.id] &&
            this.tokenCache[tokenData.id].expiresAt >= new Date().getTime()
              ? this.tokenCache[tokenData.id].token
              : await MongoDBClient.getDefaultInstance().getTokenById(
                  tokenData.id,
                );

          if (dbData) {
            if (
              !this.tokenCache[tokenData.id] ||
              this.tokenCache[tokenData.id].expiresAt < new Date().getTime()
            ) {
              this.tokenCache[tokenData.id] = {
                expiresAt: new Date().getTime() + 60 * 5,
                token: dbData,
              };
            }

            if (dbData?.invalidated !== true) {
              if (
                tokenData.expiresAt >= new Date().getTime() &&
                this.ACCEPTED_TOKEN_VERSIONS.includes(tokenData.version)
              ) {
                req.authData = {
                  user_id: tokenData.userId,
                  refresh_token: "dont use xD",
                  is_sub: true,
                  expires_at: new Date().getTime(),
                };

                req.userId = tokenData.userId;
              }
            }
          }
        }
      } catch (e) {
        if (e instanceof Error) {
          Logger.getInstance().debug("Failed to process user token.", {
            error: { name: e.name, message: e.message, stack: e.stack },
          });
        }
      }
    }
  }
}

export function Auth() {
  const instance = new AuthMiddleware();
  return instance.process.bind(instance);
}

export async function makeAuthToken(
  data: AuthToken,
  client?: MongoDBClient,
): Promise<string> {
  const finalData = await (
    client ?? MongoDBClient.getDefaultInstance()
  ).createToken(data);
  data.id = finalData.insertedId.toString("hex");

  return QuickCrypt.wrap(data);
}
