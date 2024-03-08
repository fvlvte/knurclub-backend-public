import { MongoDBClient } from "../clients/MongoDBClient";
import { readFileSync } from "node:fs";

const TRANSLATION_TEMPLATE = JSON.parse(
  readFileSync("./locale/locale_pl_fvlvte.json", "utf-8"),
);

type TieredLimit = { all: number; follower: number; paid: number };

export type SongRequestV1Config = {
  vipSkipLimits: boolean;
  modSkipLimits: boolean;

  allowNonFollowers: boolean;

  queueMax: number;

  allowModsControlVolume: boolean;

  viewLimit: TieredLimit;
  lengthLimit: TieredLimit;
  queueLimit: TieredLimit;

  allowSkipVote: boolean;
  requiredVotesToSkip: number;

  badVoteLimit: number;
  badVoteDecay: number;
};

export type ConfigV1 = {
  songRequest: SongRequestV1Config;
  translations: Record<string, string>;
};

export type ConfigContainer = {
  version: number;
  updatedAt: number;
  data: ConfigV1;
};

const V1DefaultConfig: ConfigV1 = {
  songRequest: {
    vipSkipLimits: false,
    modSkipLimits: true,

    allowNonFollowers: false,

    queueMax: 50,

    allowModsControlVolume: false,

    viewLimit: { all: 300000, follower: 21370, paid: 21370 / 2 },
    lengthLimit: { all: 3 * 60, follower: 5 * 60, paid: 7 * 60 },
    queueLimit: { all: 1, follower: 2, paid: 4 },

    allowSkipVote: true,
    requiredVotesToSkip: 10,

    badVoteLimit: 25,
    badVoteDecay: 10,
  },
  translations: {},
};

export class ConfigManager {
  private static userInstances: Record<string, ConfigManager> = {};
  public static getUserInstance(userId: string) {
    if (typeof this.userInstances[userId] === "undefined") {
      this.userInstances[userId] = new ConfigManager(userId);
    }
    return this.userInstances[userId];
  }

  private userId: string;
  constructor(userId: string) {
    this.userId = userId;
  }

  private config?: ConfigContainer;

  public async getConfig(): Promise<ConfigContainer> {
    if (!this.config) {
      return await this.loadConfig();
    }
    return this.config;
  }

  public async loadConfig(): Promise<ConfigContainer> {
    const cfg = await MongoDBClient.getDefaultInstance().fetchUserConfig(
      this.userId,
    );
    if (!cfg) {
      const newConfig: ConfigContainer = {
        version: 1,
        updatedAt: new Date().getTime(),
        data: { ...V1DefaultConfig },
      };

      newConfig.data.translations = Object.assign(
        TRANSLATION_TEMPLATE,
        newConfig.data.translations,
      );

      await MongoDBClient.getDefaultInstance().updateUserConfig(
        this.userId,
        newConfig,
      );

      this.config = newConfig;

      return newConfig;
    }
    const upgradedConfig = {
      ...V1DefaultConfig,
      ...cfg.data,
    };

    this.config = {
      version: 1,
      updatedAt: new Date().getTime(),
      data: upgradedConfig,
    };

    this.config.data.translations = Object.assign(
      TRANSLATION_TEMPLATE,
      upgradedConfig.translations,
    );
    return this.config;
  }

  public async saveConfig(newCfg: ConfigContainer) {
    await this.getConfig();

    await MongoDBClient.getDefaultInstance().updateUserConfig(
      this.userId,
      newCfg,
      this.config,
    );

    this.config = { ...this.config, ...newCfg };
  }

  //public async queryWithFallback(path: string): unknown {}
}
