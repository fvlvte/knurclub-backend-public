import { CommandHandler } from "./CommandHandler";
import { TwitchMessage } from "../types/TwitchTypes";
import { TwitchClient } from "../clients/TwitchClient";
import { MongoDBClient } from "../clients/MongoDBClient";
import { FiutItemMapping, FiutItemTypes } from "../types/FiutItemTypes";

export class GetFiutItem extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    const db = MongoDBClient.getDefaultInstance();
    const fiutZBazy = await db.getFiut(message.username);

    if (fiutZBazy === null) {
      await client.dispatchBotMessage(
        `@${message.username} nie możesz dostać itema bo nie masz fiuta xd wpisz komende !fiut aby nabyć fiut`,
      );
      return;
    }

    if (!(await db.checkFiutItemCooldown(message.username))) {
      await client.dispatchBotMessage(
        `@${message.username} sory można tylko raz na godzine dostać item fiucki`,
      );
      return;
    }

    const itemId = Math.floor(Math.random() * FiutItemTypes.ITEM_TYPE_LAST) + 1;

    const itemName = FiutItemMapping[itemId].name;

    await db.setFiutItem(message.username, itemId, 60 * 60 * 1000);

    await client.dispatchBotMessage(
      `@${message.username} uzbroiłeś petardę w ${itemName}`,
    );
  }

  getMatchingExp(): RegExp {
    return /^!zbrojenie$/i;
  }
}
