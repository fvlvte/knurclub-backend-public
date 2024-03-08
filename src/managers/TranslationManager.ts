import { default as Handlebars } from "handlebars";
import { ConfigManager } from "./ConfigManager";

export class TranslationManager {
  private translationTable: Record<string, HandlebarsTemplateDelegate> = {};
  private readonly language: string;
  private readonly id: string;

  private static instances: Record<string, TranslationManager> = {};

  private constructor(language: string, streamer: string) {
    this.language = language;
    this.id = streamer;

    this.reloadLocale().catch(console.error);
  }

  public async reloadLocale() {
    try {
      const data: Record<string, string> = (
        await ConfigManager.getUserInstance(this.id).getConfig()
      ).data.translations;

      for (const key in data) {
        this.translationTable[key] = Handlebars.compile(data[key], {
          noEscape: true,
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  public static getInstance(language: string, id: string): TranslationManager {
    const key = `${language}_${id}`;
    if (this.instances[key] === undefined)
      this.instances[key] = new TranslationManager(language, id);

    return this.instances[key];
  }

  public translate(templateId: string, params: Record<string, unknown>) {
    if (!this.translationTable[templateId])
      return `${this.language}_${
        this.id
      } | ${templateId} | ${JSON.stringify(params)}`;
    return this.translationTable[templateId](params);
  }
}
