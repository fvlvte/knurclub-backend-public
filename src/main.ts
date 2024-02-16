import { Logger } from "./util/Logger";
import { readFileSync } from "fs";
import { SecretsGuard } from "./util/SecretsGuard";
import { ExternalServer } from "./ExternalServer";
import { DiscordClient } from "./clients/DiscordClient";

function setUpSecretsAndGuard(): boolean {
  try {
    const localData = JSON.parse(
      readFileSync(
        process.env.SECRETS_PATH ?? "/Users/fvlvte/Work/SECURE_VARS.json",
        "utf-8",
      ),
    );
    for (const entryKey in localData) {
      process.env[entryKey] = localData[entryKey];
      SecretsGuard.getInstance().putSecret(localData[entryKey]);
    }

    const ANTI_LEAK = function (_stream: NodeJS.WriteStream) {
      function escapeRegExp(str: string) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }

      const originalWrite = _stream.write;

      const secrets = SecretsGuard.getInstance().getSecrets();
      _stream.write = (buffer: string) => {
        for (let i = 0; i < secrets.length; i++) {
          const protectedVar = secrets[i];
          buffer = buffer
            .replace(new RegExp(escapeRegExp(protectedVar), "gi"), "[SECRET]")
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

    return true;
  } catch (e) {
    if (e instanceof Error) {
      Logger.getInstance().crit("Failed to initialize secrets.", {
        message: e.message,
        name: e.name,
      });
    }

    return false;
  }
}

async function initializeServer() {
  const server = new ExternalServer();
  const port = process.env.EXTERNAL_SERVER_PORT
    ? parseInt(process.env.EXTERNAL_SERVER_PORT)
    : 21377;
  Logger.getInstance().info(
    `Initializing ${server.constructor.name} on port ${port}`,
  );

  if (!server.init(port)) {
    Logger.getInstance().crit(
      `Failed to initialize ${server.constructor.name}, process will now exit.`,
    );
    process.exit();
  }

  Logger.getInstance().info(
    `Initialized ${server.constructor.name} on port ${port}.`,
  );
}

async function main() {
  Logger.getInstance().info("KNUROBOT/BOARBOT is starting");

  Logger.getInstance().info("Setting up secrets and secret's guard.");
  if (!setUpSecretsAndGuard()) {
    process.exit();
  }

  if (process.env.NODE_ENV !== "production") {
    const discordClient = new DiscordClient();
    discordClient.init().catch(console.error);
  }

  Logger.getInstance().info("Secrets and secret's guard was set up.");

  await initializeServer();
}

main()
  .then(() => Logger.getInstance().info("Initial set up complete."))
  .catch((e) => {
    if (e instanceof Error) {
      Logger.getInstance().crit(
        "Initial set up failed, the process will now exit.",
        { error: { message: e.message, name: e.name } },
      );
      process.exit();
    }
  });
