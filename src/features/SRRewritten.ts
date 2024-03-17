import ytdl from "@distube/ytdl-core";
import { MongoDBClient } from "../clients/MongoDBClient";
import { ConfigManager } from "../managers/ConfigManager";
import { WebSocketSession } from "../managers/websocket/WebSocketSession";
import { findYtVideoByTitle, ytDlBufferBase64New } from "../util/SRUtils";
import { SRChecks } from "./SRChecks";

export type QueueEntry = {
  title: string;
  coverImage: string;
  requestedBy: string;
  mediaBase64: string;
  url: string;
  duration: number;
};

export type SRAddResult = {
  message: string;
  error: boolean;
  params: Record<string, unknown>;
};

export type SRUser = {
  id: string;
  username: string;
  reputation: number;
  isSub: boolean;
  isModerator: boolean;
  subLevel: number;
  isVIP: boolean;
};

export class SRRewritten {
  /** End user ID */
  private readonly id: string;

  /** User instances collection */
  private static instances: { [id: string]: SRRewritten } = {};

  private readonly mongo: MongoDBClient;

  private queue: QueueEntry[] = [];
  private session: WebSocketSession | null = null;
  private isPlaying: boolean = false;

  private configManager: ConfigManager;

  private currentSong: QueueEntry | null = null;

  private reputationRanking: { [username: string]: number } = {};

  private skipCounter: string[] = [];

  private currentSongVotes: string[] = [];

  private volume: number = 21; //.37

  private constructor(id: string) {
    this.id = id;
    this.mongo = MongoDBClient.getDefaultInstance();
    this.configManager = ConfigManager.getUserInstance(this.id);
  }

  public async init(): Promise<void> {
    try {
      const storedQueue = await this.mongo.restoreQueue(this.id);
      if (storedQueue) {
        // TODO: Apply stored queue.
      }
    } catch (e) {
      console.error("Failed to restore queue", e);
    }

    try {
      const storedRanking = await this.mongo.restoreRanking(this.id);
      if (storedRanking) {
        // TODO: Restore ranking.
      }
    } catch (e) {
      console.error("Failed to restore ranking", e);
    }
  }

  public static getInstance(id: string): SRRewritten {
    if (!this.instances[id]) {
      this.instances[id] = new SRRewritten(id);
    }
    return this.instances[id];
  }

  public bindWS(session: WebSocketSession) {
    this.session = session;
  }

  public getPlayingState() {
    return this.isPlaying;
  }

  public stop() {
    this.isPlaying = false;
  }

  public play() {
    this.isPlaying = true;
  }

  public async tryAppendSongNoVerify(
    audioSourceUrl: string,
    requestedBy: string,
    front: boolean = false,
  ): Promise<SRAddResult> {
    try {
      const data = await ytdl.getInfo(audioSourceUrl);

      const title = data.videoDetails.title;
      const length = parseInt(data.videoDetails.lengthSeconds);

      const base64Data = await ytDlBufferBase64New(audioSourceUrl);
      const songData = {
        title: title,
        coverImage: data.videoDetails.thumbnails[0].url,
        requestedBy: requestedBy,
        mediaBase64: base64Data,
        url: audioSourceUrl,
        duration: length,
      };

      if (front) {
        this.queue.unshift(songData);
      } else {
        this.queue.push(songData);
      }

      return { message: "SR_ADD_OK", error: false, params: {} };
    } catch (e) {
      console.error(e);
      return { message: "SR_ADD_UNKNOWN_ERROR", error: false, params: {} };
    }
  }

  /*public when(si: SongInfo) {
    const convertToHumanForm = (d: number) => {
      const minutePart = Math.floor(d / 60);
      const secondsPart = Math.floor(d % 60);
      const secondsPartString =
        secondsPart < 10 ? `0${secondsPart}` : `${secondsPart}`;
      return `${minutePart > 0 ? minutePart : ""}${
        minutePart > 0 ? "m" : ""
      }${secondsPartString}s`;
    };
    const index = this.queue.indexOf(si);

    if (index === -1) {
      return {
        when: convertToHumanForm(1),
        index: index + 1,
      };
    }

    let durationUntilSong = 0;
    for (let i = 0; i < index; i++) {
      durationUntilSong += this.queue[i].duration;
    }

    const tmp = (this.currentSong?.duration ?? 0) - this.currentPlayerMark;
    if (tmp > 0) durationUntilSong += tmp;

    return { when: convertToHumanForm(durationUntilSong), index: index + 1 };
  }*/

  public getCurrentSongUserReputation(): number {
    if (!this.currentSong) return 0;
    return this.reputationRanking[this.currentSong?.requestedBy] ?? 0;
  }

  public async tryAddSongByUser(
    audioSource: string,
    user: SRUser,
  ): Promise<SRAddResult> {
    const config = await this.configManager.getConfig();

    // TODO: Add vip check to config and skip check.
    const skipChecks = user.isModerator
      ? config.data.songRequest.modSkipLimits
      : false;

    if (
      audioSource.includes("youtube.com") ||
      audioSource.includes("youtu.be")
    ) {
      try {
        const songInfo = await ytdl.getInfo(audioSource);

        if (!skipChecks) {
          for (const check of SRChecks) {
            const ret = await check({
              source: audioSource,
              user: user,
              queue: this.queue,
              config: config,
              songInfo: songInfo,
            });

            if (ret !== null) {
              return ret;
            }
          }
        }

        return { message: "SR_ADD_OK", error: false, params: {} };
      } catch (e) {
        console.error(e);
        return { message: "SR_ADD_UNKNOWN_ERROR", error: true, params: {} };
      }
    } else {
      try {
        const d = await findYtVideoByTitle(audioSource);
        if (d === null) {
          return { message: "SR_NOT_FOUND", error: true, params: {} };
        }
        return this.tryAddSongByUser(d, user);
      } catch (e) {
        console.error(e);
        return { message: "SR_ADD_UNKNOWN_ERROR", error: true, params: {} };
      }
    }
  }

  public async voteSkip(username: string): Promise<number> {
    if (!this.skipCounter.includes(username)) {
      this.skipCounter.push(username);
    }

    const config = await this.configManager.getConfig();
    const requiredVotes = config.data.songRequest.requiredVotesToSkip;
    const skipCounter = requiredVotes - this.skipCounter.length;

    if (skipCounter < 1) {
      this.skipCounter = [];
      this.skip();
    }

    return skipCounter >= 0 ? skipCounter : 0;
  }

  public skip(): void {
    /* TODO: Implement skip */
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(v: number): void {
    this.volume = v;
  }

  public handleVote(from: SRUser, to: SRUser, amount: number): number {
    if (from === to) throw new Error("SR_ERROR_VOTE_SELF");

    if (this.currentSongVotes.includes(from.id)) {
      throw new Error("SR_ERROR_VOTE_MULTIPLE");
    }
    this.currentSongVotes.push(from.id);

    if (!this.reputationRanking[to.id]) this.reputationRanking[to.id] = 0;

    this.reputationRanking[to.id] += amount;

    MongoDBClient.getDefaultInstance()
      .storeRanking(this.id, JSON.stringify(this.reputationRanking))
      .catch(console.error);

    return this.reputationRanking[to.id];
  }

  public wipeQueue() {
    this.queue.length = 0;
    this.currentSong = null;
    this.skip();
  }

  public async fetch(url: string): Promise<string> {
    return ytDlBufferBase64New(url);
  }

  public getQueue(): QueueEntry[] {
    return [...this.queue];
  }

  public removeFromQueue(si: QueueEntry) {
    const index = this.queue.indexOf(si);
    if (index >= 0) {
      this.queue.splice(index, 1);
    }
  }

  public getCurrentSong(): QueueEntry | null {
    return this.currentSong;
  }
}
