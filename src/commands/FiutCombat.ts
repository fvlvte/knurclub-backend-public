import { CommandHandler } from "./CommandHandler";
import { TwitchMessage } from "../types/TwitchTypes";
import { TwitchClient } from "../clients/TwitchClient";
import { MongoDBClient } from "../clients/MongoDBClient";
import { FiutCombatManager } from "../managers/FiutCombatManager";
import { FiutItemMapping } from "../types/FiutItemTypes";

const MENTION_REG_EXP = /@([A-Za-z0-9_]+)/g;

export class FiutCombat extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    /*if (
      !(await MongoDBClient.getDefaultInstance().checkFiutCombatCooldown(
        message.username,
      ))
    ) {
      await client.dispatchBotMessage(
        `@${message.username} sory możesz walczyć na fiuty tylko raz na 15 min`,
      );
      return;
    }*/

    const oznaczonyKolega = message.message.match(MENTION_REG_EXP);
    if (!(Array.isArray(oznaczonyKolega) && oznaczonyKolega.length > 0)) {
      await client.dispatchBotMessage(
        `@${message.username} musisz oznaczyç kolege aby zawalczyć na siurensa`,
      );
      return;
    }

    const kumpel = oznaczonyKolega[0].replace(/@/g, "").toLowerCase();

    if (kumpel.toLowerCase() === message.username.toLowerCase()) {
      await client.dispatchBotMessage(
        `@${message.username} nie możesz sam ze sobom walczyć na petardy`,
      );
      return;
    }

    const fiutKolegi =
      await MongoDBClient.getDefaultInstance().getFiutPlayer(kumpel);

    if (fiutKolegi === null) {
      await client.dispatchBotMessage(
        `@${message.username} twój kolega @${kumpel} jeszcze nie zmierzył fiuta musi napisać komende !fiut aby walczyć`,
      );
      return;
    }

    const mujFiut = await MongoDBClient.getDefaultInstance().getFiutPlayer(
      message.username,
    );

    if (mujFiut === null) {
      await client.dispatchBotMessage(
        `@${message.username} nie możesz walczyć na fiuty nie majonc go wpisz !fiut aby pozyskać fiut`,
      );
      return;
    }

    await MongoDBClient.getDefaultInstance().setUserLastAttack(
      message.username,
    );

    const combatResult = FiutCombatManager.getInstance().handleBattle(
      mujFiut,
      fiutKolegi,
    );

    await client.dispatchBotMessage(
      `@${message.username} (BP: ${combatResult.bp} / item: ${mujFiut.equippedItemExpiresAt && mujFiut.equippedItemExpiresAt > Date.now() && mujFiut.equippedItem ? FiutItemMapping[mujFiut.equippedItem].name : "BRAK"}) zaatakował fiutem @${kumpel} (DP: ${combatResult.dp} / item: ${fiutKolegi.equippedItemExpiresAt && fiutKolegi.equippedItemExpiresAt > Date.now() && fiutKolegi.equippedItem ? FiutItemMapping[fiutKolegi.equippedItem].name : "BRAK"}) `,
    );

    setTimeout(async () => {
      try {
        if (combatResult.winner === mujFiut) {
          await client.dispatchBotMessage(
            `@${message.username} (BP ${combatResult.bp} / CM ${mujFiut.rozmiarFiut.toFixed(2)}) wygrał walke na fiuty z @${kumpel} (DP ${combatResult.dp} / CM ${fiutKolegi.rozmiarFiut.toFixed(2)}) kok`,
          );
        } else {
          await client.dispatchBotMessage(
            `@${kumpel} (DP ${combatResult.dp} / CM ${fiutKolegi.rozmiarFiut.toFixed(2)}) wygrał walke na fiuty z @${message.username} (BP ${combatResult.bp} / CM ${mujFiut.rozmiarFiut.toFixed(2)}) kok`,
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          await client.dispatchBotMessage(`@${message.username} ${e.message}`);
        }
        return;
      }
    }, 2500);
  }

  getMatchingExp(): RegExp {
    return /^!walka /i;
  }
}
