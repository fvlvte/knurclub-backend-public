import { CommandHandler } from "./CommandHandler";
import { TwitchMessage } from "../types/TwitchTypes";
import { TranslationManager } from "../managers/TranslationManager";
import { MongoDBClient } from "../clients/MongoDBClient";
import { TwitchClient } from "../clients/TwitchClient";

export class CreateReward extends CommandHandler {
  async handleCommand(
    client: TwitchClient,
    message: TwitchMessage,
  ): Promise<void> {
    try {
      if (message.username !== (await client.getStreamerUsername())) {
        await client.dispatchBotMessage(
          TranslationManager.getInstance(
            await client.getStreamLanguage(),
            await client.getBroadcasterId(),
          ).translate("UNAUTHORIZED_COMMAND_CALL", {
            invokedBy: message.username,
          }),
        );
      }

      const [, type, name, description, cost, param] =
        message.message.split(" ");

      const fullName = name.replace(/_/g, " ");

      const result = await client.createNewReward(
        await client.getBroadcasterId(),
        {
          title: fullName,
          prompt: description.replace(/_/g, " "),
          cost: parseInt(cost),
        },
      );

      if (!result) {
        throw new Error("Failed to create reward");
      }

      const rewardJson = {
        type: type,
        name: fullName,
        param: param,
      };

      await MongoDBClient.getDefaultInstance().upsertRewardById(
        result.data[0].id,
        rewardJson,
      );

      await client.dispatchBotMessage(
        TranslationManager.getInstance(
          await client.getStreamLanguage(),
          await client.getBroadcasterId(),
        ).translate("SUCCESS", { invokedBy: message.username }),
      );
    } catch (e) {
      console.error(e);
      await client.dispatchBotMessage(
        TranslationManager.getInstance(
          await client.getStreamLanguage(),
          await client.getBroadcasterId(),
        ).translate("UNKNOWN_ERROR", { invokedBy: message.username, error: e }),
      );
    }
  }

  getMatchingExp(): RegExp {
    return /^[?!]rewardadd/i;
  }
}
