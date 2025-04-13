import { existsSync, mkdir, readFile, writeFile } from "node:fs";
import { createHash } from "node:crypto";
import { QuickCrypt } from "./QuickCrypt";
import { default as axios } from "axios";
import { YoutubeSearchListResponse } from "../types/3rd/YTSearch";
import { spawn } from "node:child_process";

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

const fetchYoutubeToBase64 = async (url: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const chunks: Buffer[] = [];
    const process = spawn("yt-dlp", ["-q", "-f", "bestaudio", "-o", "-", url]);
    process.stdout.on("data", (data) => {
      chunks.push(data);
    });

    process.stdout.on("end", () => {
      const data = Buffer.concat(chunks);
      const armoredData = `data:audio/mp3;base64,${data.toString("base64")}`;
      resolve(armoredData);
    });

    process.on("error", (err) => {
      reject(err);
    });
  });
};

export const ytDlBufferBase64New = (url: string): Promise<string> => {
  return fetchYoutubeToBase64(url);
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
