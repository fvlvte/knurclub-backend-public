import ytdl from "@distube/ytdl-core";
import { MongoDBClient } from "../../clients/MongoDBClient";
import { ConfigManager } from "../../managers/ConfigManager";
import { WebSocketSession } from "../../managers/websocket/WebSocketSession";
import { findYtVideoByTitle, ytDlBufferBase64New } from "../../util/SRUtils";
import { Checks } from "./checks";
import {
  BackendSong,
  PlaybackState,
  SR_V1_PLAYBACK_CONTROL_UPDATE,
  WSNetworkFrameType,
} from "../../types/WSShared";
import { TwitchClient } from "../../clients/TwitchClient";

export type SRAddResult = {
  message: string;
  error: boolean;
  params: Record<string, unknown>;
};

export type SRUser = {
  id: string;
  username: string;
  reputation?: number;
  isSub: boolean;
  isModerator: boolean;
  subLevel: number;
  isVIP: boolean;
};

export type QueueEntry = {
  title: string;
  coverImage: string;
  url: string;
  user: SRUser;
  duration: number;
};

export class Songrequest {
  /** End user ID */
  private readonly id: string;

  /** User instances collection */
  private static instances: { [id: string]: Songrequest } = {};

  private skippedSongs: { url: string; expires: number }[] = [];

  private readonly mongo: MongoDBClient;

  private client?: TwitchClient;

  private queue: QueueEntry[] = [];
  private session: WebSocketSession | null = null;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;

  private configManager: ConfigManager;

  private currentSong: QueueEntry | null = null;
  private currentSongTimeMark: number = 0;

  private skipCounter: string[] = [];

  private requiredVotesToSkipDynamic = 0;

  private currentSongVotes: string[] = [];

  private currentSongDiff: number = 0;

  private userTrap: { [id: string]: boolean } = {};

  private volume: number = 0.21; //.37
  // TODO: implement idle health checks
  private frontendPlaybackState: PlaybackState = {
    playing: false,
  };

  private controllerInterval: NodeJS.Timeout | null = null;
  private constructor(id: string) {
    this.id = id;
    this.mongo = MongoDBClient.getDefaultInstance();
    this.configManager = ConfigManager.getUserInstance(this.id);
  }

  public async handlePlaybackStateChange(state: PlaybackState) {
    this.frontendPlaybackState = state;
    this.currentSongTimeMark = state.playerState?.currentTime ?? 0;
  }

  private async tryInitiatePlayback() {
    const config = await ConfigManager.getUserInstance(this.id).getConfig();
    if (this.queue.length > 0) {
      const cs = this.queue.shift() ?? null;
      if (cs) {
        this.isPlaying = true;
        this.isPaused = false;
        this.currentSongVotes = [];
        this.skipCounter.length = 0;
        this.currentSongDiff = 0;
        this.frontendPlaybackState = {
          playing: true,
          playerState: {
            currentTime: 0,
            duration: cs.duration ?? 0,
          },
          songId: cs.url,
        };
      }
      if (this.client) {
        this.requiredVotesToSkipDynamic =
          config.data.songRequest.dynamicSkipThreshold *
          this.client?.getAverageCountOfActiveChattersForPeriod(
            config.data.songRequest.dynamicSkipActivityPeriod,
          );
        this.requiredVotesToSkipDynamic = Math.round(
          this.requiredVotesToSkipDynamic,
        );
      } else {
        this.requiredVotesToSkipDynamic =
          config.data.songRequest.requiredVotesToSkip;
      }
    } else {
      await this.changeCurrentSong(null);
    }
  }

  private async changeCurrentSong(song: QueueEntry | null) {
    if (song !== this.currentSong) this.currentSongTimeMark = 0;
    this.currentSong = song;
    if (song === null) {
      this.isPlaying = false;
      this.frontendPlaybackState = {
        playing: false,
      };
    }
    const frames = [
      {
        type: WSNetworkFrameType.SR_V1_CHANGE_CURRENT_SONG,
        params: song
          ? ({
              title: song.title,
              audioSourceURL: song.url,
              iconSource: song.coverImage,
              user: {
                id: song.user.id,
                name: song.user.username,
                reputation: await this.mongo.getRankingPoints(song.user.id),
              },
              duration: song.duration,
              playing: true,
              startFrom: this.currentSongTimeMark,
            } as BackendSong)
          : null,
      },
      this.playbackControlUpdate(false),
    ];
    this.session?.sendFrameNoResponse(frames);
  }

  private async worker() {
    try {
      if (this.isPaused) return;
      if (
        !this.frontendPlaybackState.playing &&
        !this.isPaused &&
        this.queue.length > 0
      ) {
        await this.tryInitiatePlayback();
        return;
      }
    } catch (e) {
    } finally {
      this.playbackControlUpdate(true);
    }
  }

  private async initWorker() {
    this.controllerInterval = setInterval(this.worker.bind(this), 1000);
  }

  public bindClient(client: TwitchClient) {
    this.client = client;
  }

  public async restart() {
    if (this.controllerInterval) {
      clearInterval(this.controllerInterval);
      this.controllerInterval = null;
    }
    await this.initWorker();
  }

  public async init(): Promise<void> {
    try {
      const storedQueue = await this.mongo.restoreQueue(this.id);
      if (storedQueue) {
        this.queue = JSON.parse(storedQueue);
      }
    } catch (e) {
      console.error("Failed to restore queue", e);
    }
  }

  public static getInstance(id: string): Songrequest {
    if (!this.instances[id]) {
      this.instances[id] = new Songrequest(id);
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
    this.isPaused = true;
    this.playbackControlUpdate(true);
  }

  public play() {
    this.isPaused = false;
    this.playbackControlUpdate(true);
  }

  async tryAppendSongNoVerify(
    data: ytdl.videoInfo,
    user: SRUser,
    front: boolean = false,
  ): Promise<SRAddResult> {
    const title = data.videoDetails.title;
    const length = parseInt(data.videoDetails.lengthSeconds);

    this.skippedSongs = this.skippedSongs.filter((x) => x.expires < Date.now());

    const skipped = this.skippedSongs.find(
      (x) => x.url === data.videoDetails.video_url,
    );

    if (skipped && user.id !== this.id) {
      return {
        message: "SR_ADD_BANNED_SONG_24H",
        error: true,
        params: {
          invokedBy: user.username,
          url: data.videoDetails.video_url,
          title: data.videoDetails.title,
        },
      };
    }

    const songData = {
      title: title,
      coverImage: data.videoDetails.thumbnails[0].url,
      user,
      url: data.videoDetails.video_url,
      duration: length,
    };

    if (front) {
      this.queue.unshift(songData);
    } else {
      this.queue.push(songData);
      await this.mongo.storeQueue(this.id, JSON.stringify(this.queue));
    }

    return {
      message: "SR_ADD_OK",
      error: false,
      params: {
        invokedBy: user.username,
        url: data.videoDetails.video_url,
        title: data.videoDetails.title,
        ...this.when(songData),
      },
    };
  }

  public when(si: QueueEntry) {
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

    const tmp =
      (this.currentSong?.duration ?? 0) -
      (this.frontendPlaybackState.playerState?.currentTime ?? 0);
    if (tmp > 0) durationUntilSong += tmp;

    return { when: convertToHumanForm(durationUntilSong), index: index + 1 };
  }

  public async tryAddSongByUser(
    audioSource: string,
    user: SRUser,
  ): Promise<SRAddResult> {
    try {
      const config = await this.configManager.getConfig();

      // TODO: Add vip check to config and skip check.
      const skipChecks = user.isModerator
        ? config.data.songRequest.modSkipLimits
        : false;

      if (
        audioSource.includes("youtube.com") ||
        audioSource.includes("youtu.be")
      ) {
        if (this.userTrap[user.username]) {
          return { message: "SR_USER_TRAP_HAUS", error: true, params: {} };
        }

        try {
          this.userTrap[user.username] = true;

          const songInfo = await ytdl.getInfo(audioSource);

          if (!skipChecks) {
            for (const check of Checks) {
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

          return this.tryAppendSongNoVerify(songInfo, user, false);
        } catch (e) {
          console.error(e);
          return { message: "SR_ADD_UNKNOWN_ERROR", error: true, params: {} };
        } finally {
          this.userTrap[user.username] = false;
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
    } catch (e) {
      console.error(e);
      return { message: "SR_USER_TRAP_HAUS2", error: true, params: {} };
    }
  }

  public async voteSkip(username: string): Promise<number> {
    if (!this.skipCounter.includes(username)) {
      this.skipCounter.push(username);
    }

    const config = await this.configManager.getConfig();
    const requiredVotes = config.data.songRequest.useDynamicSkip
      ? this.requiredVotesToSkipDynamic
      : config.data.songRequest.requiredVotesToSkip;
    const skipCounter = requiredVotes - this.skipCounter.length;

    if (skipCounter < 1) {
      this.skipCounter = [];
      await this.skip();
    }

    return skipCounter >= 0 ? skipCounter : 0;
  }

  public async skip(): Promise<void> {
    if (this.currentSong) {
      if (!this.skippedSongs.find((x) => x.url === this.currentSong?.url)) {
        this.skippedSongs.push({
          url: this.currentSong.url,
          expires: Date.now() + 1000 * 60 * 60 * 24,
        });
      }
    }
    await this.changeCurrentSong(null);
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(v: number): void {
    this.volume = v;
    this.playbackControlUpdate(true);
  }

  private playbackControlUpdate(send?: boolean) {
    const frame = {
      type: WSNetworkFrameType.SR_V1_PLAYBACK_CONTROL_UPDATE,
      params: {
        isPaused: this.isPaused,
        volume: this.volume,
        pointsChange: this.currentSongDiff,
      },
    } as SR_V1_PLAYBACK_CONTROL_UPDATE;
    if (send) {
      this.session?.sendFrameNoResponse(frame);
    }
    return frame;
  }

  public async handleVote(
    from: SRUser,
    amount: number,
  ): Promise<{ diff: number; total: number }> {
    const to = this.currentSong?.user;
    if (!to) throw new Error("SR_ERROR_NO_SONG");

    if (from.id === to.id) throw new Error("SR_ERROR_VOTE_SELF");

    if (this.currentSongVotes.includes(from.id)) {
      throw new Error("SR_ERROR_VOTE_MULTIPLE");
    }
    this.currentSongVotes.push(from.id);

    await this.mongo.updateRanking(to.id, this.id, amount);

    this.currentSongDiff += amount;

    this.playbackControlUpdate(true);

    return {
      diff: this.currentSongDiff,
      total: await this.mongo.getRankingPoints(to.id),
    };
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
