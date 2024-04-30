import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { TwitchClient } from "../../clients/TwitchClient";
import { Songrequest } from "../../features/Songrequest";
import { util_makeSrUserFromMessage } from "./util_makeSrUserFromMessage";
import { default as axios } from "axios";

export class SongRequestPDW extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const language = await client.getStreamLanguage();
    const hostId = await client.getBroadcasterId();

    const translationManager = TranslationManager.getInstance(language, hostId);

    const sr = Songrequest.getInstance(await client.getBroadcasterId());

    try {
      let target = message.message.split(" ")[1];
      if (!target) {
        await client.dispatchBotMessage(
          translationManager.translate("SR_PDW_ERR_WHO", {
            invokedBy: message.username,
          }),
        );
        return;
      }
      if (target) target = target.replace("@", "");

      const response = await axios.get(
        `https://emotes.adamcy.pl/v1/channel/${target}/id`,
      );
      const id = response.data.id as number;

      const ret = await sr.handlePDW(
        util_makeSrUserFromMessage(message),
        id.toString(),
      );

      if (typeof ret === "number") {
        await client.dispatchBotMessage(
          translationManager.translate("SR_PDW_SUCCESS", {
            invokedBy: message.username,
            target: target,
            current: ret,
          }),
        );
      } else {
        await client.dispatchBotMessage(
          translationManager.translate("SR_PDW_" + ret, {
            invokedBy: message.username,
            target: target,
          }),
        );
      }
    } catch (e) {
      await client.dispatchBotMessage(
        translationManager.translate("SR_PDW_ERR_UNKNOWN", {
          invokedBy: message.username,
        }),
      );
      return;
    }
  }

  getMatchingExp(): RegExp {
    return /^(!pdw )|(!pozdrowieniadowienzienia )\s*$/i;
  }
}
