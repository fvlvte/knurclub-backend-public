export type MinecraftAuthToken = {
  discordUser: string;
  discordRole: string;
};

export class KeyValueStorageSingleton {
  private static instance: KeyValueStorageSingleton;
  private storage: { [key: string]: unknown };

  private constructor() {
    this.storage = {};
  }

  public static getInstance(): KeyValueStorageSingleton {
    if (!KeyValueStorageSingleton.instance) {
      KeyValueStorageSingleton.instance = new KeyValueStorageSingleton();
    }

    return KeyValueStorageSingleton.instance;
  }

  public set(key: string, value: unknown): void {
    this.storage[key] = value;
  }

  public get(key: string): unknown {
    return this.storage[key];
  }

  public delete(key: string): void {
    delete this.storage[key];
  }
}
