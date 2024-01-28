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
import { ExternalServer } from "./ExternalServer";

export async function initBot(): Promise<void> {
  const OBJECTS = {
    [TwitchDataFeed.name]:
      process.env.IS_HOSTED !== "true" ? new TwitchDataFeed() : null,
    [BrowserManager.name]:
      process.env.IS_HOSTED !== "true" ? new BrowserManager() : null,
    [DiscordTwichBridge.name]:
      process.env.IS_HOSTED !== "true" ? new DiscordTwichBridge() : null,
    [DBDriver.name]: new DBDriver(),
    [DiscordDataFeed.name]:
      process.env.IS_HOSTED !== "true" ? new DiscordDataFeed() : null,
    [HttpServer.name]:
      process.env.IS_HOSTED !== "true" ? new HttpServer() : null,
    [DiscordApiClient.name]:
      process.env.IS_HOSTED !== "true" ? new DiscordApiClient() : null,
    [CronJobManager.name]:
      process.env.IS_HOSTED !== "true" ? new CronJobManager() : null,
    [ExternalServer.name]: new ExternalServer(),
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

  (OBJECTS[ExternalServer.name] as ExternalServer).init(21377);

  console.log("Initializing DiscordApiClient ...");
  process.env.IS_HOSTED !== "true" &&
    (await (OBJECTS[DiscordApiClient.name] as DiscordApiClient).init());
  console.log("DiscordApiClient initialized!");

  if (process.env.IS_HOSTED !== "true") {
    const cvL = new TwitchClient();
    await cvL.guwnoxdLol();
  }

  console.log("Initializing HttpServer ...");
  process.env.IS_HOSTED !== "true" &&
    (await (OBJECTS[HttpServer.name] as HttpServer).init(80));
  console.log("HttpServer initialized!");

  console.log("Initialization done!");
}
