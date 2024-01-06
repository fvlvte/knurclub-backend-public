import { DiscordApiClient } from "./DiscordBotApiClient";
import { BrowserManager } from "./BrowserManager";

import { join } from "path";
import { readFileSync } from "fs";
import { TwitchDataFeed } from "./dataFeed/TwitchDataFeed";
import { HttpServer } from "./HttpServer";
import { DiscordDataFeed } from "./dataFeed/DiscordDataFeed";
import { DiscordTwichBridge } from "./features/DiscordTwitchBridge";
import { DBDriver } from "./DBDriver";
import { CronJobManager } from "./CronJobManager";
import { TwitchClient } from "./TwitchClient";

export async function initBot(): Promise<void> {
  const OBJECTS = {
    [TwitchDataFeed.name]: new TwitchDataFeed(),
    [BrowserManager.name]: new BrowserManager(),
    [DiscordTwichBridge.name]: new DiscordTwichBridge(),
    [DBDriver.name]: new DBDriver(),
    [DiscordDataFeed.name]: new DiscordDataFeed(),
    [HttpServer.name]: new HttpServer(),
    [DiscordApiClient.name]: new DiscordApiClient(),
    [CronJobManager.name]: new CronJobManager(),
  };

  const configPath = join(__dirname, "..", ".env.json");

  if (process.env.NODE_ENV === "production") {
    console.log("LOADING PRODUCTION ENVS ...");
    const envData = JSON.parse(readFileSync(configPath, "utf8"));

    for (const key in envData) {
      if (envData[key].startsWith("process.env.")) {
        process.env[key] =
          process.env[envData[key].replace("process.env.", "")];
      } else process.env[key] = envData[key];
    }
  }

  console.log("Initializing DiscordApiClient ...");
  await (OBJECTS[DiscordApiClient.name] as DiscordApiClient).init();
  console.log("DiscordApiClient initialized!");

  // 1126266755111735346
  const cvL = new TwitchClient();
  await cvL.guwnoxdLol();

  console.log("Initializing HttpServer ...");
  await (OBJECTS[HttpServer.name] as HttpServer).init(80);
  console.log("HttpServer initialized!");

  console.log("Initialization done!");
}
