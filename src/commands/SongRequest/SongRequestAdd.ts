import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { TwitchClient } from "../../clients/TwitchClient";
import { SRRewritten } from "../../features/SRRewritten";
import { util_makeSrUserFromMessage } from "./util_makeSrUserFromMessage";

export class SongRequestAdd extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const language = await client.getStreamLanguage();
    const hostId = await client.getBroadcasterId();
    const translationManager = TranslationManager.getInstance(language, hostId);

    const array = message.message.split(" ");
    array.splice(0, 1);

    const ytLink = array.join(" ");

    const result = await SRRewritten.getInstance(
      await client.getBroadcasterId(),
    ).tryAddSongByUser(ytLink, util_makeSrUserFromMessage(message));

    await client.dispatchBotMessage(
      translationManager.translate(result.message, {
        invokedBy: message.username,
        ...result.params,
      }),
    );
  }

  getMatchingExp(): RegExp {
    return /^([?!]ksr)|([?!]sr)|([?!]knursr)|([?!]songrequest)|([?!]knursongrequest)|([?!]wezpuscpiosenkeknurze)/i;
  }
}
