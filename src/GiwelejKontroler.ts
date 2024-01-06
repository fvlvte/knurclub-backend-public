import { TwitchClient } from "./TwitchClient";

export class Bambik {
  constructor(name: string, isSub = false) {
    this.name = name;
    this.isSub = isSub;
  }

  public getBambikName(): string {
    return this.name;
  }

  public isBambikSub(): boolean {
    return this.isSub;
  }

  private name: string;
  private isSub: boolean;
}

export class BambikWRafflu extends Bambik {
  private tickets: number = 0;

  constructor(name: string, isSub = false) {
    super(name, isSub);
  }

  public addTickets(count = 1) {
    this.tickets += count;
  }

  public getTickets(): number {
    return this.tickets;
  }
}

export class Giwełej {
  constructor(name: string) {
    this.name = name;
  }
  private name: string;
  private bambikiWGiwełeju: Map<string, BambikWRafflu> = new Map<
    string,
    BambikWRafflu
  >();

  public addBambik(bambik: BambikWRafflu) {
    this.bambikiWGiwełeju.set(bambik.getBambikName(), bambik);
  }

  public async closeGiwełej(isReal: boolean = false, name?: string) {
    const tickets = [];

    for (const bambik of this.bambikiWGiwełeju.values()) {
      if (bambik.isBambikSub()) {
        tickets.push(bambik);
        tickets.push(bambik);
        tickets.push(bambik);
        tickets.push(bambik);
        tickets.push(bambik);
        tickets.push(bambik);
      }
      tickets.push(bambik);
    }

    if (isReal) {
      const winner = tickets[Math.floor(Math.random() * tickets.length)];
      const duxpo = this.bambikiWGiwełeju.get(name!);
      const odds = (
        (1 / tickets.length) *
        100 *
        (duxpo?.isBambikSub() ? 7 : 1)
      ).toFixed(3);
      await TwitchClient.getInstance().strzelZUcha(
        `Wygrał bambik @${winner.getBambikName()} z szansom ${odds}%! Gratulacje uwu meow :3 :3 :3`,
      );
    } else {
      const duxpo = this.bambikiWGiwełeju.get(name!);
      const odds = (
        (1 / tickets.length) *
        100 *
        (duxpo?.isBambikSub() ? 7 : 1)
      ).toFixed(3);
      await TwitchClient.getInstance().strzelZUcha(
        `@${name} Zostałeś zapisany do knurorozdania ok meow i masz aktualnie ${odds}% szans (${
          duxpo?.isBambikSub() ? 7 : 1
        } / ${tickets.length})   ( ${
          duxpo?.isBambikSub()
            ? "masz suba to masz 7x wieksze szanse uwu meow"
            : "kup suba żeby dostać x7 szanse wiencej uwu"
        } :3 )`,
      );
    }
  }

  public async getOkuratneInfo(name?: string) {
    const tickets = [];

    for (const bambik of this.bambikiWGiwełeju.values()) {
      if (bambik.isBambikSub()) {
        tickets.push(bambik);
        tickets.push(bambik);
        tickets.push(bambik);
        tickets.push(bambik);
        tickets.push(bambik);
        tickets.push(bambik);
      }
      tickets.push(bambik);
    }

    const duxpo = this.bambikiWGiwełeju.get(name!);
    const odds = (
      (1 / tickets.length) *
      100 *
      (duxpo?.isBambikSub() ? 7 : 1)
    ).toFixed(3);
    await TwitchClient.getInstance().strzelZUcha(
      `@${name} Zostałeś zapisany do knurorozdania ok meow i masz aktualnie ${odds}% szans (${
        duxpo?.isBambikSub() ? 7 : 1
      } / ${tickets.length})   ( ${
        duxpo?.isBambikSub()
          ? "masz suba to masz 7x wieksze szanse uwu meow"
          : "kup suba żeby dostać x7 szanse wiencej uwu"
      } :3 )`,
    );
  }

  public getName(): string {
    return this.name;
  }
}

export class GiwełejKontroler {
  private static _instance: GiwełejKontroler;
  private giwełejState = new Map<string, Giwełej>();
  private currentGiwełej: Giwełej | undefined;

  public async createGiwełej(name: string) {
    const giwełej = new Giwełej(name);
    this.giwełejState.set(name, giwełej);
    this.currentGiwełej = giwełej;
    await TwitchClient.getInstance().strzelZUcha(
      `Giwełej ${name} został stworzony napisz !knurdajprezent żeby wzionć udział!`,
    );
  }

  public async closeGiwełej() {
    const copy = this.currentGiwełej;

    this.currentGiwełej = undefined;
    if (!copy)
      await TwitchClient.getInstance().strzelZUcha(`dsfdsgxdfzg xdxxdxd`);
    await copy?.closeGiwełej(true);
  }

  public async getOkuratneInfo(bambik: BambikWRafflu) {
    if (!this.currentGiwełej) return;
    this.currentGiwełej?.getOkuratneInfo(bambik.getBambikName());
  }

  public async addBambikToGiwełej(bambik: BambikWRafflu) {
    if (this.currentGiwełej) {
      try {
        this.currentGiwełej.addBambik(bambik);
      } catch (e) {
        await TwitchClient.getInstance().strzelZUcha(
          `@${bambik.getBambikName()} ${(e as Error).message}`,
        );
        return;
      }

      this.currentGiwełej.closeGiwełej(false, bambik.getBambikName());
    } else {
      await TwitchClient.getInstance().strzelZUcha(
        `@${bambik.getBambikName()} Nie ma żadnego giwełej w trakcie trwania ok meow :3 ${
          bambik.isBambikSub() ? "kohany sypukencie :3 :3 :3" : ""
        }`,
      );
    }
  }

  public static get instance(): GiwełejKontroler {
    if (!GiwełejKontroler._instance) {
      GiwełejKontroler._instance = new GiwełejKontroler();
    }

    return GiwełejKontroler._instance;
  }

  private constructor() {}
}
