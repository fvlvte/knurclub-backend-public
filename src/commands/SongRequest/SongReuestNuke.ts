import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TwitchClient } from "../../clients/TwitchClient";
import { Songrequest } from "../../features/Songrequest";
import { default as axios } from "axios";

export class SongRequestNuke extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    if (message.username.toLowerCase() !== "fvlvte") {
      return;
    }

    const sr = Songrequest.getInstance(await client.getBroadcasterId());

    try {
      let target = message.message.split(" ")[1];
      if (target) target = target.replace("@", "");

      const response = await axios.get(
        `https://emotes.adamcy.pl/v1/channel/${target}/id`,
      );
      const id = response.data.id as number;

      await sr.handleNuke(
        id.toString(),
        message.message.split(" ")[0] === "!denuke" ? 100000 : -100000,
      );
    } catch (e) {
      return;
    }
  }

  getMatchingExp(): RegExp {
    return /^(!nuke )|(!denuke )\s*$/i;
  }
}
