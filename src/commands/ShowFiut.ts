import { CommandHandler } from "./CommandHandler";
import { TwitchMessage } from "../types/TwitchTypes";
import { TwitchClient } from "../clients/TwitchClient";
import { MongoDBClient } from "../clients/MongoDBClient";

const MENTION_REG_EXP = /@([A-Za-z0-9_]+)/g;

export class ShowFiut extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const oznaczonyKolega = message.message.match(MENTION_REG_EXP);
    if (!(Array.isArray(oznaczonyKolega) && oznaczonyKolega.length > 0)) {
      await client.dispatchBotMessage(
        `@${message.username} musisz oznaczyç kolege aby poznać jego siura`,
      );
      return;
    }

    const kumpel = oznaczonyKolega[0].replace(/@/g, "");

    const fiutKolegi = await MongoDBClient.getDefaultInstance().getFiut(kumpel);

    if (fiutKolegi === null) {
      await client.dispatchBotMessage(
        `@${message.username} twój kolega @${kumpel} jeszcze nie zmierzył fiuta musi napisać komende !fiut`,
      );
      return;
    }

    await client.dispatchBotMessage(
      `@${message.username} rozmiar fiuta @${kumpel} to: ${fiutKolegi.toFixed(2)} cm stary gratuluje`,
    );
  }

  getMatchingExp(): RegExp {
    return /^!(fiutKolegi)|(petardaKolegi)|(kutasKolegi)|(knagaKolegi)|(chujKolegi)|(naganiaczKolegi)|(siurekKolegi)|(siurKolegi)|(sikadłoKolegi)|(niemieckiKaskKolegi)|(bazyliszekKolegi)|(bolszewikKolegi)|(benisKolegi)|(penisKolegi)$/i;
  }
}
