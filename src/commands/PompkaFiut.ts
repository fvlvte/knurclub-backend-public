import { CommandHandler } from "./CommandHandler";
import { TwitchMessage } from "../types/TwitchTypes";
import { TwitchClient } from "../clients/TwitchClient";
import { MongoDBClient } from "../clients/MongoDBClient";

const COOLDOWN: Record<string, boolean> = {};

export class PompkaFiut extends CommandHandler {
  private randomTier(): number {
    const tierRand = Math.random();

    if (tierRand < 0.05) {
      return 10;
    }
    if (tierRand < 0.15) {
      return 5;
    }
    return 3;
  }
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    if (!COOLDOWN[message.username]) {
      COOLDOWN[message.username] = true;
    } else {
      return;
    }

    const fiutZBazy = await MongoDBClient.getDefaultInstance().getFiut(
      message.username,
    );

    if (fiutZBazy === null) {
      await client.dispatchBotMessage(
        `@${message.username} nie możesz powiększyć petardy nie majonc jej wpisz !fiut aby pozyskać fiut`,
      );
      return;
    }

    const factor = Math.random() < 0.5 ? -1 : 1;
    const pct = this.randomTier() / 100;

    const nowyFiut = fiutZBazy + fiutZBazy * pct * factor;

    await MongoDBClient.getDefaultInstance().updateFiut(
      message.username,
      nowyFiut,
    );

    const tekscik =
      factor > 0
        ? "pompka zadziałała i powienkszyła twuj fiut o"
        : "pompka sie zepsuła i ujebała ci fiuta o";

    await client.dispatchBotMessage(
      `@${message.username} ${tekscik} ${pct * 100}% i teraz masz petarde ${nowyFiut.toFixed(2)} cm gratulacje stary`,
    );
  }

  getMatchingExp(): RegExp {
    return /^!(pompkaDoFiuta)|(pompka)$/i;
  }
}
