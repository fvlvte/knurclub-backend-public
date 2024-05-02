import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { TwitchClient } from "../../clients/TwitchClient";
import { Songrequest } from "../../features/Songrequest";
import { default as axios } from "axios";

export class SongRequestCurrentRep extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const language = await client.getStreamLanguage();
    const hostId = await client.getBroadcasterId();

    const translationManager = TranslationManager.getInstance(language, hostId);

    const sr = Songrequest.getInstance(await client.getBroadcasterId());

    try {
      const response = await axios.get(
        `https://emotes.adamcy.pl/v1/channel/${message.username}/id`,
      );
      const id = response.data.id as number;

      const ret = await sr.getUserRankingPoints(id.toString());

      await client.dispatchBotMessage(
        translationManager.translate("SR_REP_CURRENT", {
          invokedBy: message.username,
          current: ret,
        }),
      );
    } catch (e) {
      await client.dispatchBotMessage(
        translationManager.translate("SR_REP_ERR_UNKNOWN", {
          invokedBy: message.username,
        }),
      );
      return;
    }
  }

  getMatchingExp(): RegExp {
    return /^(!rep)|(!knuroreputacja)\s*$/i;
  }
}
