import { readFileSync } from "fs";
import { AuthToken } from "./AuthToken";
export const STRINGS_TO_PROTECT: string[] = [];

try {
  const localData = JSON.parse(
    readFileSync(
      process.env.SECRETS_PATH ?? "/Users/fvlvte/Work/SECURE_VARS.json",
      "utf-8",
    ),
  );
  for (const entryKey in localData) {
    process.env[entryKey] = localData[entryKey];
    STRINGS_TO_PROTECT.push(localData[entryKey]);
  }
  console.log("OK local envs overridden UwU OwO");

  function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  const ANTI_LEAK = function (_stream: NodeJS.WriteStream) {
    const originalWrite = _stream.write;

    _stream.write = (buffer: string) => {
      for (let i = 0; i < STRINGS_TO_PROTECT.length; i++) {
        const protectedVar = STRINGS_TO_PROTECT[i];
        buffer = buffer
          .replace(
            new RegExp(escapeRegExp(protectedVar), "gi"),
            "[HUJ NIE MA LEAKA XPP]",
          )
          .replace(
            /(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}/g,
            "[IP]",
          );
      }
      return originalWrite.apply(_stream, [buffer]);
    };
  };
  ANTI_LEAK(process.stdout);
  ANTI_LEAK(process.stderr);

  const token = new AuthToken<{ username: string; threadId: string }>(
    {
      username: "fvlvte",
      threadId: "1204906105025724527",
    },
    "fvlvte",
  );
  console.log(token.encrypt("hex"));
} catch (_e) {
  console.error(_e);
}
