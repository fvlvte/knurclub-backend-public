import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { TwitchClient } from "../../clients/TwitchClient";
import { SRRewritten } from "../../features/SRRewritten";

export class SRAdd extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const translationManager = TranslationManager.getInstance(
      await client.getStreamLanguage(),
      await client.getBroadcasterId(),
    );

    const username = message.username;

    const array = message.message.split(" ");
    array.splice(0, 1);

    const ytLink = array.join(" ");
    const subLevel = typeof message.tags.badges.subscriber === "number" ? 1 : 0;

    const result = await SRRewritten.getInstance(
      await client.getBroadcasterId(),
    ).tryAddSongByUser(ytLink, {
      id: message.tags.userId,
      username,
      reputation: 2137,
      isSub: subLevel > 0 ?? false,
      subLevel: subLevel,
      isModerator: message.tags.isModerator ?? false,
      isVIP: false,
    });

    await client.dispatchBotMessage(
      translationManager.translate(result.message, {
        invokedBy: message.username,
        ...result.params,
      }),
    );
  }

  getMatchingExp(): RegExp {
    return /^([?!]nowyknursr)/i;
  }
}
