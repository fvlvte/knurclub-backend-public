import { type Request as ExpressType, type Response } from "express";
import { ExternalServer } from "../ExternalServer";

export type Request<T> = ExpressType & T;

export enum Method {
  GET = "get",
  POST = "post",
}

export interface Route<T> {
  handle(
    server: ExternalServer,
    req: Request<T>,
    res: Response,
  ): Promise<unknown>;
  path(): RegExp | string;
  method(): Method;
}
