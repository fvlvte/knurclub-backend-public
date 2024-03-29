import ytdl from "@distube/ytdl-core";
import { default as axios } from "axios";
import { MongoDBClient } from "../clients/MongoDBClient";
import { ConfigManager } from "../managers/ConfigManager";
import { FeatureFlag, isFeatureEnabled } from "../util/FeatureFlag";
import { SRRewritten } from "./SRRewritten";

type TryAddSongResult = {
  message: string;
  error: boolean;
  param: Record<string, unknown>;
};

type SongInfo = {
  mediaBase64: string;
  title: string;
  requestedBy: string;
  userReputation?: number;
  coverImage: string;
  url: string;
  duration: number;
};

interface YoutubeSearchListResponse {
  kind: string;
  etag: string;
  nextPageToken: string;
  regionCode: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YoutubeSearchResult[];
}

interface YoutubeSearchResult {
  kind: string;
  etag: string;
  id: {
    kind: string;
    videoId: string;
  };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: {
        url: string;
        width: number;
        height: number;
      };
      medium: {
        url: string;
        width: number;
        height: number;
      };
      high: {
        url: string;
        width: number;
        height: number;
      };
    };
    channelTitle: string;
    liveBroadcastContent: string;
    publishTime: string;
  };
}

const ytDlBufferBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = ytdl(url, { filter: "audio" });
    const buffers: Buffer[] = [];
    stream.on("data", function (buf: Buffer) {
      buffers.push(buf);
    });
    stream.on("end", function () {
      const data = Buffer.concat(buffers);
      resolve(`data:audio/mp3;base64,${data.toString("base64")}`);
    });
    stream.on("error", reject);
  });
};

/*const ytDlBufferBase64 = (url: string): Promise<string> => {
  return new Promise(async (resolve) => {
    const s = await ytdl.getInfo(url);
    const f = s.formats
      .filter((a) => a.hasAudio && !a.hasVideo)
      .sort(
        (a, b) =>
          (b as unknown as Record<string, number>).audioBitrate -
          (a as unknown as Record<string, number>).audioBitrate,
      )[0];
    resolve(f.url);
  });
};*/

const findYtVideoByTitle = async (title: string): Promise<string | null> => {
  try {
    const response = await axios.get<YoutubeSearchListResponse>(
      `https://youtube.googleapis.com/youtube/v3/search?part=snippet&channelType=any&q=${encodeURIComponent(
        title,
      )}&key=${process.env.YT_API_KEY}`,
    );

    return (
      `https://www.youtube.com/watch?v=${response.data?.items[0]?.id.videoId}` ??
      null
    );
  } catch (e) {
    console.error(e);
    return null;
  }
};

export class Songrequest {
  private readonly BANNED_KEYWORDS = ["earrape"];

  private readonly queue: SongInfo[] = [];
  private readonly alertQueue: SongInfo[] = [];
  private readonly id: string;

  private currentPlayerMark = 0;

  private isPlaying = true;

  private volume = 0.2;

  private currentSong: SongInfo | null = null;
  private currentSongStartedAt: number | null = null;
  private currentSongVotes: string[] = [];

  private skipCounter: string[] = [];
  private skipFlag: boolean = false;
  private reputationRanking: { [username: string]: number } = {};
  private voteCounter: { [username: string]: number } = {};

  private constructor(id: string) {
    this.id = id;

    MongoDBClient.getDefaultInstance()
      .restoreQueue(id)
      .then((d) => {
        if (d) {
          this.queue.push(...JSON.parse(d));
        }
      })
      .catch(console.error);

    MongoDBClient.getDefaultInstance()
      .restoreRanking(id)
      .then((d) => {
        if (d) {
          this.reputationRanking = JSON.parse(d);
        }
      });
  }
  private static instances: { [id: string]: Songrequest } = {};

  public static getInstance(id?: string): Songrequest {
    if (isFeatureEnabled(FeatureFlag.FF_NEW_PLAYER, id as string)) {
      return SRRewritten.getInstance(id ?? "dupa") as unknown as Songrequest;
    }

    if (!this.instances[id || "default"]) {
      this.instances[id || "default"] = new Songrequest(id || "default");
    }
    return this.instances[id || "default"];
  }

  public handlePlaybackFeedback(time: number, songInfo: unknown) {
    if (!this.currentSong) this.currentSong = songInfo as SongInfo;
    this.currentPlayerMark = time;
  }

  public getSongStartTimestamp() {
    return this.currentSongStartedAt ?? 0;
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
    query: string,
    userMetadata: { subLevel: number; username: string },
    front: boolean = false,
  ) {
    const data = await ytdl.getInfo(query);

    const title = data.videoDetails.title;
    const length = parseInt(data.videoDetails.lengthSeconds);

    const base64Data = await ytDlBufferBase64(query);
    const songData = {
      title: title,
      coverImage: data.videoDetails.thumbnails[0].url,
      requestedBy: userMetadata.username,
      mediaBase64: base64Data,
      url: query,
      duration: length,
    };

    if (front) {
      this.queue.unshift(songData);
    } else {
      this.queue.push(songData);
    }

    return { message: "OK", error: false, param: [] };
  }

  public when(si: SongInfo) {
    const convertToHumanFormxD = (d: number) => {
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
        when: convertToHumanFormxD(1),
        index: index + 1,
      };
    }

    let durationUntilSong = 0;
    for (let i = 0; i < index; i++) {
      durationUntilSong += this.queue[i].duration;
    }

    const tmp = (this.currentSong?.duration ?? 0) - this.currentPlayerMark;
    if (tmp > 0) durationUntilSong += tmp;

    return { when: convertToHumanFormxD(durationUntilSong), index: index + 1 };
  }

  public getCurrentSongUserReputation(): number {
    if (!this.currentSong) return 0;
    return this.reputationRanking[this.currentSong?.requestedBy] ?? 0;
  }

  public async tryAddSong(
    query: string,
    userMetadata: { subLevel: number; isMod?: boolean; username: string },
    isSoundAlert: boolean = false,
  ): Promise<TryAddSongResult> {
    const config = await ConfigManager.getUserInstance(this.id).getConfig();

    const tier =
      typeof userMetadata.subLevel === "number" && userMetadata.subLevel > 0
        ? 1
        : 0;
    const isModerator = userMetadata.isMod;

    const skipChecks = isModerator
      ? config.data.songRequest.modSkipLimits
      : false;

    // Too short title.
    if (!skipChecks && query.length < 2)
      return { message: "SR_ADD_UNKNOWN_ERROR", error: false, param: {} };

    const queueLimitConfig = Math.round(config.data.songRequest.queueMax);
    if (!skipChecks && this.queue.length >= queueLimitConfig) {
      return {
        message: "SR_QUEUE_LIMIT",
        error: true,
        param: { limit: queueLimitConfig },
      };
    }

    let songsInQueuePerUser = 0;
    for (const item of this.queue) {
      if (
        item.requestedBy.toLowerCase() === userMetadata.username.toLowerCase()
      ) {
        songsInQueuePerUser++;
      }
    }

    const userLimit = Math.round(
      tier === 1
        ? config.data.songRequest.queueLimit.paid
        : config.data.songRequest.queueLimit.all,
    );

    if (!skipChecks && songsInQueuePerUser >= userLimit) {
      return {
        message: "SR_QUEUE_SONG_LIMIT",
        error: true,
        param: { limit: userLimit },
      };
    }

    if (query.includes("youtube.com") || query.includes("youtu.be")) {
      try {
        const data = await ytdl.getInfo(query);

        const views = parseInt(data.videoDetails.viewCount);
        const title = data.videoDetails.title;
        const length = parseInt(data.videoDetails.lengthSeconds);
        //const category = data.videoDetails.category;
        const titleProcessed = title.toLowerCase().replace(/[\w]+g/, "");

        if (this.queue.find((si) => si.title === title)) {
          return {
            message: "SR_SONG_IN_QUEUE",
            error: true,
            param: { title: title, url: data.videoDetails.video_url },
          };
        }

        /*if (
          !skipChecks &&
          !isSoundAlert &&
          this.BANNED_USERS.includes(userMetadata.username) // TODO: add to config
        ) {
          return { message: "SR_BANNED_USER", error: true, param: {} };
        }*/

        if (
          !skipChecks &&
          !isSoundAlert &&
          this.BANNED_KEYWORDS.includes(titleProcessed) // TODO: add to config
        ) {
          return { message: "SR_BANNED_KEYWORD", error: true, param: {} };
        }

        const viewLimit = Math.round(
          tier === 1
            ? config.data.songRequest.viewLimit.paid
            : config.data.songRequest.viewLimit.all,
        );

        if (!skipChecks && !isSoundAlert && views < viewLimit) {
          return {
            message: "SR_VIEW_LIMIT",
            error: true,
            param: { min: viewLimit },
          };
        }

        const lengthLimit = Math.round(
          tier === 1
            ? config.data.songRequest.lengthLimit.paid
            : config.data.songRequest.lengthLimit.all,
        );

        if (!skipChecks && !isSoundAlert && length > lengthLimit) {
          return {
            message: "SR_LENGTH_LIMIT",
            error: true,
            param: {
              max: lengthLimit,
            },
          };
        }

        const repLimit = config.data.songRequest.badVoteLimit;

        const userReputation =
          this.reputationRanking[userMetadata.username] ?? 0;

        if (!isSoundAlert && userReputation <= repLimit) {
          return {
            message: "SR_NEGATIVE_REPUTATION_LIMIT",
            error: true,
            param: { limit: repLimit },
          };
        }

        const songInfo = {
          title: title,
          coverImage: data.videoDetails.thumbnails[0].url,
          requestedBy: userMetadata.username,
          mediaBase64: "",
          url: data.videoDetails.video_url,
          duration: length,
        };

        if (!isSoundAlert) {
          this.queue.push(songInfo);
          await MongoDBClient.getDefaultInstance().storeQueue(
            this.id,
            JSON.stringify(this.queue),
          );
          return {
            message: "SR_ADD_OK",
            error: false,
            param: {
              title: title,
              ...this.when(songInfo),
              url: data.videoDetails.video_url,
            },
          };
        } else {
          this.alertQueue.push(songInfo);
          return {
            message: "SA_ADD_OK",
            error: false,
            param: {},
          };
        }
      } catch (e) {
        console.error(e);
        return { message: "SR_ADD_UNKNOWN_ERROR", error: false, param: {} };
      }
    } else {
      const d = await findYtVideoByTitle(query);
      if (d === null) {
        return { message: "SR_NOT_FOUND", error: true, param: {} };
      }
      return this.tryAddSong(d, userMetadata);
    }
  }

  public async voteSkip(username: string): Promise<number> {
    if (!this.skipCounter.includes(username)) {
      this.skipCounter.push(username);
    }

    const config = await ConfigManager.getUserInstance(this.id).getConfig();
    const requiredVotes = config.data.songRequest.requiredVotesToSkip;
    const skipCounter = requiredVotes - this.skipCounter.length;

    if (skipCounter < 1) {
      this.skipFlag = true;
    }

    return skipCounter >= 0 ? skipCounter : 0;
  }

  public skip(): void {
    this.skipFlag = true;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(v: number): void {
    this.volume = v;
  }

  public getAndUnsetSkipFlag(): boolean {
    if (this.skipFlag) {
      this.skipCounter = [];
      this.skipFlag = false;
      return true;
    }
    return this.skipFlag;
  }

  public handleVote(from: string, to: string, amount: number): number {
    if (from === to) throw new Error("SR_ERROR_VOTE_SELF");

    if (!this.voteCounter[from]) this.voteCounter[from] = 0;

    if (this.currentSongVotes.includes(from)) {
      throw new Error("SR_ERROR_VOTE_MULTIPLE");
    }
    this.currentSongVotes.push(from);

    this.voteCounter[from]++;
    if (!this.reputationRanking[to]) this.reputationRanking[to] = 0;

    this.reputationRanking[to] += amount;

    MongoDBClient.getDefaultInstance()
      .storeRanking(this.id, JSON.stringify(this.reputationRanking))
      .catch(console.error);

    return this.reputationRanking[to];
  }

  public async getNextSong(): Promise<SongInfo | null> {
    if (this.queue.length > 0) {
      const song = this.queue.splice(0, 1)[0];
      this.currentSongVotes = [];
      song.mediaBase64 = await ytDlBufferBase64(song.url);
      song.userReputation = this.reputationRanking[song.requestedBy] ?? 0;
      this.currentSong = song;
      this.currentSongStartedAt = new Date().getTime();
      this.skipCounter = [];
      MongoDBClient.getDefaultInstance()
        .storeQueue(this.id, JSON.stringify(this.queue))
        .catch(console.error);
      return song;
    }
    return null;
  }

  public wipeQueue() {
    this.queue.length = 0;
  }

  public async getNextAlert(): Promise<SongInfo | null> {
    if (this.alertQueue.length > 0) {
      this.alertQueue[0].mediaBase64 = await ytDlBufferBase64(
        this.alertQueue[0].url,
      );
      return this.alertQueue.splice(0, 1)[0];
    }
    return null;
  }

  public getQueue(): SongInfo[] {
    return [...this.queue];
  }

  public removeFromQueue(si: SongInfo) {
    const index = this.queue.indexOf(si);
    if (index >= 0) {
      this.queue.splice(index, 1);
    }
  }

  public getCurrentSong(): SongInfo | null {
    return this.currentSong;
  }
}
