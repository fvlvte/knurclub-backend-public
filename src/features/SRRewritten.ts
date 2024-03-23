import ytdl from "@distube/ytdl-core";
import { MongoDBClient } from "../clients/MongoDBClient";
import { ConfigManager } from "../managers/ConfigManager";
import { WebSocketSession } from "../managers/websocket/WebSocketSession";
import { findYtVideoByTitle, ytDlBufferBase64New } from "../util/SRUtils";
import { SRChecks } from "./SRChecks";
import {
  BackendSong,
  PlaybackState,
  SR_V1_PLAYBACK_CONTROL_UPDATE,
  WSNetworkFrameType,
} from "../types/WSShared";

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

export class SRRewritten {
  /** End user ID */
  private readonly id: string;

  /** User instances collection */
  private static instances: { [id: string]: SRRewritten } = {};

  private readonly mongo: MongoDBClient;

  private queue: QueueEntry[] = [];
  private session: WebSocketSession | null = null;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;

  private configManager: ConfigManager;

  private currentSong: QueueEntry | null = null;

  private skipCounter: string[] = [];

  private currentSongVotes: string[] = [];

  private currentSongDiff: number = 0;

  private userTrap: { [id: string]: boolean } = {};

  private volume: number = 0.21; //.37
  // TODO: implement idle health checks
  private playbackState: PlaybackState = {
    playing: false,
  };

  private controllerInterval: NodeJS.Timeout | null = null;
  private constructor(id: string) {
    this.id = id;
    this.mongo = MongoDBClient.getDefaultInstance();
    this.configManager = ConfigManager.getUserInstance(this.id);
  }

  public async handlePlaybackStateChange(state: PlaybackState) {
    this.playbackState = state;
  }

  private async tryPlayNextSong() {
    if (this.queue.length > 0) {
      const cs = this.queue.shift() ?? null;
      await this.changeCurrentSong(cs);
      if (cs) {
        this.isPlaying = true;
        this.isPaused = false;
        this.currentSongVotes = [];
        this.skipCounter.length = 0;
        this.currentSongDiff = 0;
        this.playbackState = {
          playing: true,
          playerState: {
            currentTime: 0,
            duration: this.currentSong?.duration ?? 0,
          },
          songId: this.currentSong?.url,
        };
      }
    } else {
      await this.changeCurrentSong(null);
    }
  }

  private async changeCurrentSong(song: QueueEntry | null) {
    this.currentSong = song;
    this.session?.sendFrameNoResponse({
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
          } as BackendSong)
        : null,
    });
    this.transmitPlaybackControlUpdate();
    if (song === null) {
      this.isPlaying = false;
      this.playbackState = {
        playing: false,
      };
    }
  }

  private async worker() {
    try {
      if (this.isPaused) return;
      if (!this.isPlaying && this.queue.length > 0) {
        await this.tryPlayNextSong();
        return;
      } else if (this.playbackState.playing) {
        return;
      } else if (!this.playbackState.playing && !this.isPlaying) {
        return;
      } else if (
        (this.playbackState.playerState?.duration ?? 10) -
          (this.playbackState.playerState?.currentTime ?? 0) <
        1
      ) {
        await this.changeCurrentSong(null);
        await this.tryPlayNextSong();
      }
    } catch (e) {
    } finally {
    }
  }

  private async initWorker() {
    this.controllerInterval = setInterval(this.worker.bind(this), 1000);
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
        // TODO: Apply stored queue.
      }
    } catch (e) {
      console.error("Failed to restore queue", e);
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
    this.isPaused = true;
    this.transmitPlaybackControlUpdate();
  }

  public play() {
    this.isPaused = false;
    this.transmitPlaybackControlUpdate();
  }

  async tryAppendSongNoVerify(
    data: ytdl.videoInfo,
    user: SRUser,
    front: boolean = false,
  ): Promise<SRAddResult> {
    const title = data.videoDetails.title;
    const length = parseInt(data.videoDetails.lengthSeconds);

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
    }

    return { message: "SR_ADD_OK", error: false, params: {} };
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
      (this.playbackState.playerState?.currentTime ?? 0);
    if (tmp > 0) durationUntilSong += tmp;

    return { when: convertToHumanForm(durationUntilSong), index: index + 1 };
  }

  public async tryAddSongByUser(
    audioSource: string,
    user: SRUser,
  ): Promise<SRAddResult> {
    if (this.userTrap[user.id]) {
      return { message: "SR_USER_TRAP_HAUS", error: true, params: {} };
    }
    this.userTrap[user.id] = true;
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

          return this.tryAppendSongNoVerify(songInfo, user, false);
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
    } catch (e) {
      console.error(e);
      return { message: "SR_USER_TRAP_HAUS2", error: true, params: {} };
    } finally {
      this.userTrap[user.id] = false;
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
    if (this.currentSong && this.session) {
      this.changeCurrentSong(null).then(
        this.transmitPlaybackControlUpdate.bind(this),
      );
    } else {
      throw new Error("Can't skip song, no song is playing.");
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(v: number): void {
    this.volume = v;
    this.transmitPlaybackControlUpdate();
  }

  private transmitPlaybackControlUpdate() {
    this.session?.sendFrameNoResponse({
      type: WSNetworkFrameType.SR_V1_PLAYBACK_CONTROL_UPDATE,
      params: {
        isPaused: this.isPaused,
        volume: this.volume,
        pointsChange: this.currentSongDiff,
      },
    } as SR_V1_PLAYBACK_CONTROL_UPDATE);
  }

  public async handleVote(from: SRUser, amount: number): Promise<number> {
    const to = this.currentSong?.user;
    if (!to) throw new Error("SR_ERROR_NO_SONG");

    if (from.id === to.id) throw new Error("SR_ERROR_VOTE_SELF");

    if (this.currentSongVotes.includes(from.id)) {
      throw new Error("SR_ERROR_VOTE_MULTIPLE");
    }
    this.currentSongVotes.push(from.id);

    await this.mongo.updateRanking(to.id, this.id, amount);

    this.currentSongDiff += amount;

    this.transmitPlaybackControlUpdate();

    return this.currentSongDiff;
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
