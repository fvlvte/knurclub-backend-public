import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
import {
  GatewayDispatchEvents,
  GatewayIntentBits,
  Client,
  ApplicationCommandsAPI,
  GatewayGuildMemberAddDispatchData,
  RESTGetAPIGuildMembersResult,
} from "@discordjs/core";
import OpenAI from "openai";

/*
const completion = await openai.createCompletion({
  model: "text-davinci-003",
  prompt: "Hello world",
});
console.log(completion.data.choices[0].text);
*/

export class DiscordApiClient {
  private client?: Client;
  private applicationCommnadsAPI?: ApplicationCommandsAPI;
  private wsManager?: WebSocketManager;
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async giveRoleToUser(username: string) {
    try {
      const members: RESTGetAPIGuildMembersResult = [];

      let r: RESTGetAPIGuildMembersResult | undefined = [];
      do {
        r = await this.client?.api.guilds.getMembers("934812690390605884", {
          limit: 1000,
          after: members[members.length - 1]?.user?.id,
        });

        if (Array.isArray(r) && r.length > 0) {
          members.push(...r);
        } else {
          break;
        }
        console.log("cvL dupsko");
      } while (r?.length > 0);

      const member = members?.find((member) => {
        return member.user?.username === username;
      });
      console.log(member);

      if (member) {
        await this.client?.api.guilds.addRoleToMember(
          "934812690390605884",
          member.user?.id || "scierwojad",
          "1126266755111735346",
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  async close(): Promise<void> {
    try {
      await this.wsManager?.destroy();
    } catch (err) {
      console.error(err);
    }
    try {
    } catch (err) {
      console.error(err);
    }
  }

  private generateRandomKey(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let key = "";
    for (let i = 0; i < 32; i++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
    return key;
  }

  private discordRoleToMinecraftRole(discordRole: string): string {
    if (discordRole.includes("939912624055926854")) return "KNURZY PREZES";
    if (discordRole.includes("1119005271847600209")) return "KNURZY NADZORCA";
    if (discordRole.includes("1100111107508674561")) return "KNURZY AGENT";
    if (discordRole.includes("1103416908713316412")) return "KNURZY SYPUKENT";
    return "KNUREK";
  }

  //1204898310868181054
  public async sendMessageToChannel(
    channelId: string,
    message: string,
    analytics: string,
    file?: string,
  ) {
    const files = [];
    if (file) {
      files.push({ name: "Kodzik.js", data: file });
    }
    files.push({ name: "analityka.json", data: JSON.stringify(analytics) });
    return this.client?.api.channels.createMessage(channelId, {
      files: files,
      content: message,
    });
  }

  async init(isMinimal?: boolean): Promise<void> {
    // TODO: fix prod creds
    return new Promise((resolve, reject) => {
      const rest = new REST({ version: "10" }).setToken(
        process.env[`DISCORD_BOT_${process.env.DISCORD_DEFAULT_APP_ID}`] || "",
      );

      this.wsManager = new WebSocketManager({
        token:
          process.env[`DISCORD_BOT_${process.env.DISCORD_DEFAULT_APP_ID}`] ||
          "pizda",
        intents:
          GatewayIntentBits.GuildMessages |
          GatewayIntentBits.MessageContent |
          GatewayIntentBits.Guilds |
          GatewayIntentBits.GuildMembers,
        rest,
      });

      this.client = new Client({ rest, gateway: this.wsManager });

      if (isMinimal) return resolve();
      if (!isMinimal) {
        this.client.on(
          GatewayDispatchEvents.GuildMemberAdd,
          async ({ data: interaction, api }) => {
            try {
              const ia = interaction as GatewayGuildMemberAddDispatchData;

              await api.guilds.addRoleToMember(
                "934812690390605884",
                ia.user?.id || "scierwojad",
                "1029774070507655260",
              );

              const dupskoPrompt =
                Math.random() > 0.5 ? "komplement" : "obelgę";

              const dupskoPrompts = [
                "z karty kredytowej mamy",
                "za pieniądze z komunii",
                "za rente",
                "za 500+",
              ];

              const dupskoPrompts2 = [
                "zostanie programista pythona",
                "zostanie programista clojure",
                "dostanie umyslu biedaka",
              ];

              const chatCompletion = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                max_tokens: 256,
                temperature: 1.05,
                messages: [
                  {
                    role: "user",
                    content:
                      "Wygeneruj powitanie dla nowego członka społeczności 'Knurownia' który nazywa się " +
                      ia.user?.username +
                      ` i powiedz mu ${dupskoPrompt} związany z jego nickiem oraz zeby kupił subskrypcje na Twitchu u knura ${
                        dupskoPrompts[
                          Math.floor(Math.random() * dupskoPrompts.length)
                        ]
                      } oraz żeby zrobil to jak najszybciej bo inaczej ${
                        dupskoPrompts2[
                          Math.floor(Math.random() * dupskoPrompts2.length)
                        ]
                      }, użyj maksymalnie 20 słów`,
                  },
                ],
              });

              await api.channels.createMessage("964679871668314212", {
                content: `<@${ia.user?.id}> ${chatCompletion.choices[0].message.content}`,
              });
            } catch (_e) {
              console.error(_e);
            }
          },
        );
        this.applicationCommnadsAPI = new ApplicationCommandsAPI(rest);

        this.wsManager.connect().then(resolve).catch(reject);

        this.applicationCommnadsAPI.createGuildCommand(
          process.env.DISCORD_DEFAULT_APP_ID || "",
          "934812690390605884",
          {
            name: "mclogin",
            description: "Logowanie do serwera minkraft non prejmium",
          },
        );
      }
    });
  }
}
