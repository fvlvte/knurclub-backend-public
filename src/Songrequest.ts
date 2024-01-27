import ytdl from "ytdl-core";
import { readFileSync, writeFileSync } from "fs";
import { default as axios } from "axios";
const SR_QUEUE_FILE = "./cache/sr_queue.json";
const SR_RANK_FILE = "./cache/sr_rank.json";
const SR_VOTE_FILE = "./cache/sr_vote.json";
const SR_CURRENT_FILE = "./cache/sr_current.json";

type TryAddSongResult = {
  message: string;
  error: boolean;
  param: unknown[];
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

  private readonly ALLOWED_CATEGORIES = [
    "Gaming",
    "Music",
    "People & Blogs",
    "Entertainment",
    "Education",
  ];

  private readonly BANNED_KEYWORDS = ["earrape"];

  // SUB 0, 1, 2, 3
  private readonly VIEW_LIMIT = [21370, 21370 / 1.5, 21370 / 2, 2137];
  private readonly LENGTH_LIMIT = [5 * 60, 8 * 60, 10 * 60, 15 * 60];

  private readonly VOTES_TO_SKIP = 10;

  private readonly queue: SongInfo[] = [];
  private readonly alertQueue: SongInfo[] = [];

  private currentSong: SongInfo | null = null;
  private currentSongStartedAt: number | null = null;
  private currentSongVotes: string[] = [];

  private skipCounter: string[] = [];
  private skipFlag: boolean = false;
  private readonly reputationRanking: { [username: string]: number } = {};
  private voteCounter: { [username: string]: number } = {};

  private constructor() {
    try {
      const data = JSON.parse(readFileSync(SR_QUEUE_FILE, "utf-8"));
      this.queue.push(...data);
    } catch (_e) {}

    try {
      const data = JSON.parse(readFileSync(SR_RANK_FILE, "utf-8"));
      this.reputationRanking = { ...this.reputationRanking, ...data };
    } catch (_e) {}

    try {
      const data = JSON.parse(readFileSync(SR_RANK_FILE, "utf-8"));
      this.reputationRanking = { ...this.reputationRanking, ...data };
    } catch (_e) {}

    try {
      this.currentSong = JSON.parse(readFileSync(SR_CURRENT_FILE, "utf-8"));
    } catch (_e) {}

    process.on("SIGINT", () => {
      writeFileSync(SR_QUEUE_FILE, JSON.stringify(this.queue));
      writeFileSync(SR_RANK_FILE, JSON.stringify(this.reputationRanking));
      writeFileSync(SR_VOTE_FILE, JSON.stringify(this.voteCounter));
      writeFileSync(SR_CURRENT_FILE, JSON.stringify(this.currentSong));
      process.exit(0);
    });
  }
  private static instances: { [id: string]: Songrequest } = {};

  public static getInstance(id?: string): Songrequest {
    if (!this.instances[id || "default"]) {
      this.instances[id || "default"] = new Songrequest();
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

  public async tryAddSong(
    query: string,
    userMetadata: { subLevel: number; username: string },
    isSoundAlert: boolean = false,
  ): Promise<TryAddSongResult> {
    if (query.includes("youtube.com") || query.includes("youtu.be")) {
      try {
        const data = await ytdl.getInfo(query);

        const views = parseInt(data.videoDetails.viewCount);
        const title = data.videoDetails.title;
        const length = parseInt(data.videoDetails.lengthSeconds);
        const category = data.videoDetails.category;
        const titleProcessed = title.toLowerCase().replace(/[\w]+g/, "");

        if (
          !isSoundAlert &&
          this.BANNED_USERS.includes(userMetadata.username)
        ) {
          return { message: "BANNED_USER", error: true, param: [] };
        }

        if (!isSoundAlert && this.BANNED_KEYWORDS.includes(titleProcessed)) {
          return { message: "BANNED_KEYWORD", error: true, param: [] };
        }

        if (!isSoundAlert && !this.ALLOWED_CATEGORIES.includes(category)) {
          return {
            message: "NON_ALLOWED_CATEGORY",
            error: true,
            param: [category],
          };
        }

        if (!isSoundAlert && views < this.VIEW_LIMIT[userMetadata.subLevel]) {
          return { message: "VIEW_LIMIT", error: true, param: [] };
        }

        if (
          !isSoundAlert &&
          length > this.LENGTH_LIMIT[userMetadata.subLevel]
        ) {
          return {
            message: "LENGTH_LIMIT",
            error: true,
            param: [this.LENGTH_LIMIT[userMetadata.subLevel]],
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
            message: "NEGATIVE_REPUTATION_LIMIT",
            error: true,
            param: [],
          };
        }

        const base64Data = await ytDlBufferBase64(query);

        if (!isSoundAlert) {
          this.queue.push({
            title: title,
            coverImage: data.videoDetails.thumbnails[0].url,
            requestedBy: userMetadata.username,
            mediaBase64: base64Data,
            url: query,
            duration: length,
          });
        } else {
          this.alertQueue.push({
            title: title,
            coverImage: data.videoDetails.thumbnails[0].url,
            requestedBy: userMetadata.username,
            mediaBase64: base64Data,
            url: query,
            duration: length,
          });
        }

        return { message: "OK", error: false, param: [] };
      } catch (e) {
        console.log(e);
        return { message: "UNKNOWN_ERROR", error: false, param: [] };
      }
    } else {
      const d = await findYtVideoByTitle(query);
      console.log(d);
      if (d === null) {
        return { message: "NOT_FOUND", error: true, param: [] };
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

    if (this.voteCounter[from] >= 3) {
      throw new Error();
    }

    this.voteCounter[from]++;
    if (!this.reputationRanking[to]) this.reputationRanking[to] = 0;

    this.reputationRanking[to] += amount;

    return this.reputationRanking[to];
  }

  public getNextSong(peek?: boolean): SongInfo | null {
    if (this.queue.length > 0) {
      this.currentSongVotes = [];
      this.queue[0].userReputation =
        this.reputationRanking[this.queue[0].requestedBy] ?? 0;
      this.currentSong = this.queue[0];
      this.currentSongStartedAt = new Date().getTime();
      this.skipCounter = [];
      if (peek) return this.queue[0];
      return this.queue.splice(0, 1)[0];
    }
    return null;
  }

  public getNextAlert(): SongInfo | null {
    if (this.alertQueue.length > 0) {
      return this.alertQueue.splice(0, 1)[0];
    }
    return null;
  }

  public getQueue(): SongInfo[] {
    return this.queue;
  }

  public getCurrentSong(): SongInfo | null {
    return this.currentSong;
  }
}
