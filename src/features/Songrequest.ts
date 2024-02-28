import ytdl from "@distube/ytdl-core";
import { default as axios } from "axios";
import { MongoDBClient } from "../clients/MongoDBClient";
import { ConfigManager } from "../managers/ConfigManager";
import { TwitchMessage } from "../types/TwitchTypes";

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
      resolve(data.toString("base64"));
    });
    stream.on("error", reject);
  });
};

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
  private readonly BANNED_USERS = ["shadoweeee"];

  /*private readonly ALLOWED_CATEGORIES = [
    "Gaming",
    "Music",
    "People & Blogs",
    "Entertainment",
    "Education",
  ];*/

  private readonly BANNED_KEYWORDS = ["earrape"];

  // SUB 0, 1, 2, 3
  private readonly SONGS_IN_QUEUE = [1, 3, 4, 5];
  private readonly VIEW_LIMIT = [21370, 21370 / 1.5, 21370 / 2, 2137];
  private readonly LENGTH_LIMIT = [5 * 60, 8 * 60, 10 * 60, 15 * 60];
  private readonly QUEUE_MAX = 25;

  private readonly VOTES_TO_SKIP = 10;

  private readonly queue: SongInfo[] = [];
  private readonly alertQueue: SongInfo[] = [];
  private readonly id: string;

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
    if (!this.instances[id || "default"]) {
      this.instances[id || "default"] = new Songrequest(id || "default");
    }
    return this.instances[id || "default"];
  }

  public getSongStartTimestamp() {
    return this.currentSongStartedAt ?? 0;
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
    const index = this.queue.indexOf(si);

    let durationUntilSong = 0;
    for (let i = 0; i < index; i++) {
      durationUntilSong += this.queue[i].duration;
    }

    const tmp =
      (this.currentSong?.duration ?? 0) -
      Math.floor(
        (new Date().getTime() -
          Songrequest.getInstance().getSongStartTimestamp()) /
          1000,
      );
    if (tmp > 0) durationUntilSong += tmp;

    const convertToHumanFormxD = (d: number) => {
      const minutePart = Math.floor(d / 60);
      const secondsPart = Math.floor(d % 60);
      const secondsPartString =
        secondsPart < 10 ? `0${secondsPart}` : `${secondsPart}`;
      return `${minutePart > 0 ? minutePart : ""}${
        minutePart > 0 ? "m" : ""
      }${secondsPartString}s`;
    };

    return { when: convertToHumanFormxD(durationUntilSong), index: index + 1 };
  }

  public async tryAddSong(
    query: string,
    userMetadata: { subLevel: number; isMod?: boolean; username: string },
    isSoundAlert: boolean = false,
    messageTrigger?: TwitchMessage,
  ): Promise<TryAddSongResult> {
    const config = await ConfigManager.getUserInstance(this.id).getConfig();

    if (this.queue.length >= config.data.songRequest.queueMax) {
      return {
        message: "SR_QUEUE_LIMIT",
        error: true,
        param: { limit: config.data.songRequest.queueMax },
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

    let userLimit = this.SONGS_IN_QUEUE[userMetadata.subLevel ?? 0];
    if (messageTrigger) {
      if (messageTrigger.tags.isModerator) {
        userLimit = 999;
      } else if (userMetadata.subLevel > 0) {
        userLimit = config.data.songRequest.queueLimit.paid;
      } else {
        userLimit = config.data.songRequest.queueLimit.all;
      }
    }

    if (songsInQueuePerUser + 1 > userLimit) {
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

        if (
          !isSoundAlert &&
          this.BANNED_USERS.includes(userMetadata.username)
        ) {
          return { message: "SR_BANNED_USER", error: true, param: {} };
        }

        if (!isSoundAlert && this.BANNED_KEYWORDS.includes(titleProcessed)) {
          return { message: "SR_BANNED_KEYWORD", error: true, param: {} };
        }

        /*if (!isSoundAlert && !this.ALLOWED_CATEGORIES.includes(category)) {
          return {
            message: "SR_NON_ALLOWED_CATEGORY",
            error: true,
            param: { category: category },
          };
        }*/

        if (!isSoundAlert && views < this.VIEW_LIMIT[userMetadata.subLevel]) {
          return {
            message: "SR_VIEW_LIMIT",
            error: true,
            param: { min: this.VIEW_LIMIT[userMetadata.subLevel] },
          };
        }

        if (
          !isSoundAlert &&
          length > this.LENGTH_LIMIT[userMetadata.subLevel]
        ) {
          return {
            message: "SR_LENGTH_LIMIT",
            error: true,
            param: { max: this.LENGTH_LIMIT[userMetadata.subLevel] },
          };
        }

        const userReputation =
          this.reputationRanking[userMetadata.username] ?? 0;

        if (
          !isSoundAlert &&
          userReputation <= -25 &&
          this.queue.find((si) => si.requestedBy === userMetadata.username) !==
            undefined
        ) {
          return {
            message: "SR_NEGATIVE_REPUTATION_LIMIT",
            error: true,
            param: {},
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

  public voteSkip(username: string): number {
    if (!this.skipCounter.includes(username)) {
      this.skipCounter.push(username);
    }

    const skipCounter = this.VOTES_TO_SKIP - this.skipCounter.length;

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
