import { CommandHandler } from "./CommandHandler";
import { TwitchMessage } from "../types/TwitchTypes";
import { TwitchClient } from "../clients/TwitchClient";
import { MongoDBClient } from "../clients/MongoDBClient";

export class DickSize extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const fiutZBazy = await MongoDBClient.getDefaultInstance().getFiut(
      message.username,
    );

    if (fiutZBazy !== null) {
      await client.dispatchBotMessage(
        `@${message.username} rozmiar twojej petardy to: ${fiutZBazy?.toFixed(2)} cm stary gratuluje`,
      );
      return;
    }

    const petardaMin = 5;
    const petardaMax = 33 - petardaMin;

    const petardaWylosowana = Math.random() * petardaMax + petardaMin;

    await MongoDBClient.getDefaultInstance().updateFiut(
      message.username,
      petardaWylosowana,
    );

    await client.dispatchBotMessage(
      `@${message.username} rozmiar twojej petardy to: ${petardaWylosowana.toFixed(2)} cm stary gratuluje`,
    );
  }

  getMatchingExp(): RegExp {
    return /^!(fiut)|(petarda)|(kutas)|(knaga)|(chuj)|(naganiacz)|(siurek)|(siur)|(sikadło)|(niemieckiKask)|(bazyliszek)|(bolszewik)|(benis)|(penis)$/i;
  }
}
