import { Browser, launch } from "puppeteer";
//import { Config } from "./Config";
import { Page } from "puppeteer";

export type HtmlRedererOutput = {
  type: string;

  width: number;
  height: number;

  dataPrefix: string;
  dataType: "base64" | "buffer";
  data: string | Buffer;
};

export type HtmlRendererOptions = {
  selector?: string;
  encoding?: "base64" | "buffer";
  quality?: number;
  type?: "jpeg" | "png";
};

export class BrowserManager {
  public static readonly DEFAULT_QUALITY = 95;

  private browser: Browser | null;

  constructor() {
    this.browser = null;
  }

  public async init(): Promise<void> {
    if (this.browser) return;

    this.browser = await launch({
      headless: process.env.NODE_ENV === "production" ? "new" : false,
      args:
        process.env.NODE_ENV === "production"
          ? ["--no-sandbox", "--disable-setuid-sandbox"]
          : [],
    });
  }

  public async close(): Promise<void> {
    if (!this.browser) return;

    await this.browser.close();
    this.browser = null;
  }

  public async spawnBlankPage(): Promise<Page> {
    if (!this.browser) throw new Error("Browser not initialized");

    return await this.browser.newPage();
  }
}
