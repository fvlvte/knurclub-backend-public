import { QueueEntry, SRAddResult, SRUser } from "./SRRewritten";
import { type videoInfo } from "@distube/ytdl-core";
import { ConfigContainer } from "../managers/ConfigManager";
import { MongoDBClient } from "../clients/MongoDBClient";

type SRCheckParam = {
  source?: string;
  user?: SRUser;
  queue?: QueueEntry[];
  config?: ConfigContainer;
  songInfo?: videoInfo;
};

type SRCheck = (param: SRCheckParam) => Promise<SRAddResult | null>;

const srCheck_title: SRCheck = ({ source }) => {
  if (!source || source.length < 3) {
    return Promise.resolve({
      message: "SR_ADD_UNKNOWN_ERROR",
      error: false,
      params: {},
    });
  }
  return Promise.resolve(null);
};

const srCheck_queueLimit: SRCheck = async ({ config, queue }) => {
  const queueLimitConfig = Math.round(config?.data.songRequest.queueMax ?? 0);
  if (!queue || queue.length >= queueLimitConfig) {
    return Promise.resolve({
      message: "SR_QUEUE_LIMIT",
      error: true,
      params: { limit: queueLimitConfig },
    });
  }
  return Promise.resolve(null);
};

const srCheck_limitPerUser: SRCheck = async ({ config, queue, user }) => {
  if (!queue || !user || !config) return Promise.resolve(null);

  let songsInQueuePerUser = 0;
  for (const item of queue) {
    if (item.user.username.toLowerCase() === user.id) {
      songsInQueuePerUser++;
    }
  }
  const userLimit = Math.round(
    user.isSub
      ? config?.data.songRequest.queueLimit.paid
      : config?.data.songRequest.queueLimit.all,
  );

  if (songsInQueuePerUser >= userLimit) {
    return Promise.resolve({
      message: "SR_QUEUE_SONG_LIMIT",
      error: true,
      params: { limit: userLimit },
    });
  }

  return Promise.resolve(null);
};

const srCheck_noDuplicates: SRCheck = async ({ queue, songInfo }) => {
  if (!queue || !songInfo) return Promise.resolve(null);

  if (queue.find((si) => si.url === songInfo.videoDetails.video_url)) {
    return {
      message: "SR_SONG_IN_QUEUE",
      error: true,
      params: {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
      },
    };
  }

  return Promise.resolve(null);
};

const srCheck_viewCount: SRCheck = async ({ songInfo, config, user }) => {
  if (!songInfo || !config || !user) return Promise.resolve(null);
  const viewLimit = Math.round(
    user.isSub
      ? config.data.songRequest.viewLimit.paid
      : config.data.songRequest.viewLimit.all,
  );

  if (parseInt(songInfo.videoDetails.viewCount) < viewLimit) {
    return {
      message: "SR_VIEW_LIMIT",
      error: true,
      params: { min: viewLimit },
    };
  }

  return Promise.resolve(null);
};

const srCheck_length: SRCheck = async ({ songInfo, config, user }) => {
  if (!songInfo || !config || !user) return Promise.resolve(null);

  const lengthLimit = Math.round(
    user.isSub
      ? config.data.songRequest.lengthLimit.paid
      : config.data.songRequest.lengthLimit.all,
  );

  if (parseInt(songInfo.videoDetails.lengthSeconds) > lengthLimit) {
    return {
      message: "SR_LENGTH_LIMIT",
      error: true,
      params: {
        max: lengthLimit,
      },
    };
  }

  return Promise.resolve(null);
};

const srCheck_reputation: SRCheck = async ({ user, config }) => {
  if (!user || !config) return Promise.resolve(null);
  const repLimit = Math.round(config.data.songRequest.badVoteLimit);

  if (
    (await MongoDBClient.getDefaultInstance().getRankingPoints(
      user.username,
    )) <= repLimit
  ) {
    return Promise.resolve({
      message: "SR_NEGATIVE_REPUTATION_LIMIT",
      error: true,
      params: { limit: repLimit },
    });
  }

  return Promise.resolve(null);
};

export const SRChecks: SRCheck[] = [
  srCheck_title,
  srCheck_queueLimit,
  srCheck_limitPerUser,
  srCheck_noDuplicates,
  srCheck_viewCount,
  srCheck_length,
  srCheck_reputation,
];
