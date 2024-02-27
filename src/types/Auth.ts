import { Request } from "express";
import { Data } from "../util/TwitchAuthGuard";

export type RequestWithUserId = Request & { userId?: string } & {
  authData?: Data; // TODO: Remove once migrated endpoint handlers.
};

export type AuthToken = {
  id?: string;
  version: number;
  userId: string;
  expiresAt: number;
  scopes?: string[];
  invalidated?: boolean;
};
