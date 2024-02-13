import {
  createLogger,
  type Logger as WinstonLogger,
  transports,
  format,
} from "winston";

export enum LogTypes {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

export class Logger {
  private handle: WinstonLogger;

  private constructor() {
    this.handle = createLogger();

    // Console log sink.
    this.handle.add(
      new transports.Console({
        format: format.combine(format.timestamp(), format.simple()),
      }),
    );
  }

  private static instance: Logger;

  static getInstance(): Logger {
    if (!this.instance) this.instance = new Logger();
    return this.instance;
  }

  log(type: LogTypes, message: string, ...meta: unknown[]): Logger {
    this.handle.log(type as string, message, meta);
    return this;
  }

  debug(message: string, ...meta: unknown[]): Logger {
    return this.log(LogTypes.DEBUG, message, meta);
  }

  info(message: string, ...meta: unknown[]): Logger {
    return this.log(LogTypes.INFO, message, meta);
  }

  warn(message: string, ...meta: unknown[]): Logger {
    return this.log(LogTypes.WARN, message, meta);
  }

  error(message: string, ...meta: unknown[]): Logger {
    return this.log(LogTypes.ERROR, message, meta);
  }

  crit(message: string, ...meta: unknown[]): Logger {
    return this.log(LogTypes.ERROR, message, meta);
  }
}
