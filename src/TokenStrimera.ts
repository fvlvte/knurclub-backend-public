import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
} from "crypto";
import { readFile, writeFile } from "fs";
//import { default as Memcached } from "memcached";

//const mmc = new Memcached("localhost:11211");

export interface TokenData {
  payload: string;
  signature: string;
  expiresAt: number;
  id: string;
  username: string;
}

export interface TokenDataPayload {
  username: string;
  refresh_token: string;
}

export class TokenStrimera<T> {
  private static readonly algorithm: string = "aes-256-cbc";
  private static readonly iv: Buffer = Buffer.from("1234567812345678", "utf8");
  private static readonly key = "julkaSuperMod123julkaSuperMod123";
  private static readonly hmacKey = "kardymaLwojtylaPapiezPolakow";

  private static revocationList: string[] = [];

  private data: T;
  private username: string;

  constructor(data: T, username: string) {
    this.data = data;
    this.username = username;
  }

  private static sign(data: string): string {
    const hmac = createHmac("sha256", TokenStrimera.hmacKey);
    hmac.update(data);
    return hmac.digest("base64");
  }

  private static async makeCom(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      readFile(path, "utf-8", (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  private static async cmakeCom(path: string, data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      writeFile(path, data, "utf-8", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public static async loadRevokedTokensAndUsernames() {
    const fileContents = await TokenStrimera.makeCom("revokedTokens.json");
    const data = JSON.parse(fileContents);
    this.revocationList = data.revokedTokens;
  }

  public static async revokeToken(token: string) {
    this.revocationList.push(token);
    await TokenStrimera.cmakeCom(
      "revokedTokens.json",
      JSON.stringify(this.revocationList),
    );
  }

  public encrypt(): string {
    const jdata = JSON.stringify(this.data);
    const jwtData = {
      payload: jdata,
      signature: TokenStrimera.sign(jdata),
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
      id: createHash("sha256")
        .update(jdata + Date.now() + 1000 * 60 * 60 * 24 * 30)
        .digest("base64"),
    };
    const cipher = createCipheriv(
      TokenStrimera.algorithm,
      TokenStrimera.key,
      TokenStrimera.iv,
    );
    const encrypted = cipher.update(JSON.stringify(jwtData), "utf8", "base64");
    return encrypted + cipher.final("base64");
  }

  private static mmcPromisedGet(key: string): Promise<unknown> {
    return new Promise((resolve) => {
      /*mmc.get(key, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });*/
      resolve(key);
    });
  }

  public static async getPayloadFromToken<T>(token: string): Promise<T> {
    const decipher = createDecipheriv(
      TokenStrimera.algorithm,
      TokenStrimera.key,
      TokenStrimera.iv,
    );
    let decrypted = decipher.update(token, "base64", "utf8");
    decrypted += decipher.final("utf8");
    const jwtData: TokenData = JSON.parse(decrypted);

    if (jwtData.expiresAt < Date.now()) {
      throw new Error("Token expired");
    }

    if (jwtData.signature !== this.sign(jwtData.payload)) {
      throw new Error("Token signature invalid");
    }

    if (
      this.revocationList.includes(jwtData.id) ||
      this.revocationList.includes(jwtData.username)
    ) {
      throw new Error("Token revoked");
    }

    /*try {
      const data = TokenStrimera.mmcPromisedGet(jwtData.id);
      if (data !== null) {
        throw new Error("Token revoked");
      }
    } catch (e) {}*/

    return JSON.parse(jwtData.payload) as T;
  }
}
