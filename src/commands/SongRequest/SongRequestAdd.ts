import { CommandHandler } from "../CommandHandler";
import { TwitchMessage } from "../../types/TwitchTypes";
import { TranslationManager } from "../../managers/TranslationManager";
import { Songrequest } from "../../features/Songrequest";
import { TwitchClient } from "../../clients/TwitchClient";

export class SongRequestAdd extends CommandHandler {
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

    const result = await Songrequest.getInstance(
      await client.getBroadcasterId(),
    ).tryAddSong(
      ytLink,
      {
        subLevel,
        username,
      },
      false,
      message,
    );

    await client.dispatchBotMessage(
      translationManager.translate(result.message, {
        invokedBy: message.username,
        ...result.param,
      }),
    );
  }

  getMatchingExp(): RegExp {
    return /^([?!]ksr)|([?!]sr)|([?!]knursr)|([?!]songrequest)|([?!]knursongrequest)|([?!]wezpuscpiosenkeknurze)/i;
  }
}
