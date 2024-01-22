import { default as Handlebars } from "handlebars";
import { readFileSync } from "fs";

export class TranslationManager {
  private translationTable: Record<string, HandlebarsTemplateDelegate> = {};
  private language: string;
  private streamer: string;

  private static instances: Record<string, TranslationManager> = {};

  private constructor(language: string, streamer: string) {
    this.language = language;
    this.streamer = streamer;

    this.reloadLocale();
  }

  public reloadLocale() {
    try {
      const data: Record<string, string> = JSON.parse(
        readFileSync(
          `./locale/locale_${this.language}_${this.streamer}.json`,
          "utf-8",
        ),
      );

      for (const key in data) {
        this.translationTable[key] = Handlebars.compile(data[key]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  public static getInstance(
    language: string = "pl",
    streamer: string = "fvlvte",
  ): TranslationManager {
    const key = `${language}_${streamer}`;
    if (this.instances[key] === undefined)
      this.instances[key] = new TranslationManager(language, streamer);

    return this.instances[key];
  }

  public translate(templateId: string, params: Record<string, unknown>) {
    if (!this.translationTable[templateId])
      return `${this.language}_${
        this.streamer
      } | ${templateId} | ${JSON.stringify(params)}`;
    return this.translationTable[templateId](params);
  }
}
