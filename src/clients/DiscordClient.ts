import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
import {
  GatewayDispatchEvents,
  GatewayIntentBits,
  Client,
  //ApplicationCommandsAPI,
  GatewayGuildMemberAddDispatchData,
  //RESTGetAPIGuildMembersResult,
  //ApplicationCommandOptionType,
} from "@discordjs/core";
import OpenAI from "openai";

export class DiscordClient {
  private client?: Client;
  //private applicationCommnadsAPI?: ApplicationCommandsAPI;
  private wsManager?: WebSocketManager;
  private openai: OpenAI;
  //private dialogCache: Record<string, { fromBot: boolean; value: string }[]> =
  //  {};

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /*async giveRoleToUser(username: string) {
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
      } while (r?.length > 0);

      const member = members?.find((member) => {
        return member.user?.username === username;
      });

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
  }*/

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

  /*private generateRandomKey(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let key = "";
    for (let i = 0; i < 32; i++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
    return key;
  }*/

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

        // Zamrażarka - czeka na lepsze czas AI.
        /*this.client.on(
         GatewayDispatchEvents.InteractionCreate,
         async ({ data: interaction, api }) => {
           try {
             const ia = interaction as APIApplicationCommandInteraction & {
               data: {
                 options: [
                   {
                     value: string;
                     type: number;
                     name: string;
                   },
                 ];
               };
             };
             if (
               interaction.type === InteractionType.ApplicationCommand ||
               ia.data?.name === "skamer"
             ) {
               if (ia.member?.user) {
                 if (!this.dialogCache[ia.member.user.id]) {
                   this.dialogCache[ia.member.user.id] = [];
                 }
                 if (this.dialogCache[ia.member.user.id].length > 10) {
                   this.dialogCache[ia.member.user.id] = this.dialogCache[
                     ia.member.user.id
                   ].splice(0, 50);
                 }

                 const { value } = ia.data.options[0];

                 const chatCompletion =
                   await this.openai.chat.completions.create({
                     model: "gpt-4-turbo-preview",
                     max_tokens: 256,
                     temperature: 1.05,
                     messages: [
                       {
                         role: "user",
                         content: `
                          Robisz szkolne przedstawienie na temat oszustw internetowych.
                          Pragniesz kupić coś taniej o wiele poniżej ceny rynkowej.
                          Zazwyczaj zgadzasz się po chwili zastanowienia na transakckje z kodem BLIK.
                          Prowadisz rozmowę ze sprzedawcą i wyrażasz zainteresowanie zakupem.
                          To jest aktualny kontekst rozmowy:
                          ${this.dialogCache[ia.member.user.id].map((v) => `- ${v.fromBot ? "TY" : "SPRZEDAWCA"}: "${v.value}"`).join("\n")}
                          Wygeneruj odpowiedź na otrzymaną wiadomość od sprzedawcy: "${value}"
                          Jeśli sprzedawca poprosił o kod wygeneruj mu losowy 6 cyfrowy kod.
                          Jeśli kod nie działa wygeneruj nowy losowy 6 cyfrowy kod.
                          Odpowiedz tylko odpowiedzią do sprzedawcy.
                          Poczekaj spokojnie aż sprzedawca będzie pod bankomatem.
                          Nie zdradzaj, że jesteś AI.
                          Nie zgadzaj się na odbiór osobisty bo jesteś w delegacji.
                          `,
                       },
                     ],
                   });

                 console.log(chatCompletion.choices[0].message.content);
                 this.dialogCache[ia.member.user.id] = [
                   {
                     fromBot: true,
                     value:
                       chatCompletion.choices[0].message.content ?? "kasztan",
                   },
                   { fromBot: false, value },
                   ...this.dialogCache[ia.member.user.id],
                 ];
                 await api.channels.createMessage(
                   interaction.channel_id ?? "dupa",
                   {
                     content:
                       chatCompletion.choices[0].message.content ?? "kasztan",
                   },
                 );
               }
             }
           } catch (_e) {
             console.error(_e);
           }
          },
        );*/
        //this.applicationCommnadsAPI = new ApplicationCommandsAPI(rest);

        this.wsManager.connect().then(resolve).catch(reject);

        /*this.applicationCommnadsAPI.createGuildCommand(
          process.env.DISCORD_DEFAULT_APP_ID || "",
          "934812690390605884",
          {
            name: "skamer",
            description: "Rozmowa ze skamerem",
            options: [
              {
                name: "tekscik",
                description: "tekscik lol",
                type: ApplicationCommandOptionType.String,
                required: true,
              },
            ],
          },
        );*/
      }
    });
  }
}
