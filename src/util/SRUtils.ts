import { existsSync, mkdir, readFile, writeFile } from "node:fs";
import { createHash } from "node:crypto";
import { QuickCrypt } from "./QuickCrypt";
import ytdl from "@distube/ytdl-core";
import { default as axios } from "axios";
import { YoutubeSearchListResponse } from "../types/3rd/YTSearch";

export const promisedHddRead = (
  path: string,
  encoding: BufferEncoding,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    readFile(path, encoding, (err, data) => {
      if (err) reject(err);
      resolve(data);
    });
  });
};

export const promisedHddWrite = (
  path: string,
  data: string,
  encoding: BufferEncoding,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    writeFile(path, data, encoding, (err: unknown) => {
      if (err) reject(err);
      resolve();
    });
  });
};

export const promisedMkdir = (path: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    mkdir(path, { recursive: true }, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
};

export const hddCacheQuery = async (url: string): Promise<string | null> => {
  const hash = createHash("sha256").update(url).digest("hex");

  if (existsSync(`./cache/${hash}/content.bin`)) {
    const data = await promisedHddRead(`./cache/${hash}/content.txt`, "utf-8");
    await promisedHddWrite(
      `./cache/${hash}/lastHit.txt`,
      new Date().getTime().toString(),
      "utf-8",
    );

    return QuickCrypt.unwrap(data, url);
  }

  return null;
};

export const hddCacheWrite = async (
  url: string,
  data: string,
): Promise<void> => {
  const hash = createHash("sha256").update(url).digest("hex");

  await promisedMkdir(`./cache/${hash}`);

  await promisedHddWrite(
    `./cache/${hash}/content.txt`,
    QuickCrypt.wrap(data, url),
    "utf-8",
  );

  await promisedHddWrite(
    `./cache/${hash}/lastHit.txt`,
    new Date().getTime().toString(),
    "utf-8",
  );
};

export const ytDlBufferBase64New = (url: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const d = await hddCacheQuery(url);
    if (d) {
      resolve(d);
      return;
    }
    const stream = ytdl(url, { filter: "audio" });
    const buffers: Buffer[] = [];
    stream.on("data", function (buf: Buffer) {
      buffers.push(buf);
    });
    stream.on("end", function () {
      const data = Buffer.concat(buffers);
      const armoredData = `data:audio/mp3;base64,${data.toString("base64")}`;
      hddCacheWrite(url, armoredData).catch(console.error);
      resolve(armoredData);
    });
    stream.on("error", reject);
  });
};

export const findYtVideoByTitle = async (
  title: string,
): Promise<string | null> => {
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
