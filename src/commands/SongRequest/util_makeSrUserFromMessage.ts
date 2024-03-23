import { TwitchMessage } from "../../types/TwitchTypes";
import { SRUser } from "../../features/SRRewritten";

export function util_makeSrUserFromMessage(message: TwitchMessage): SRUser {
  const subLevel = typeof message.tags.badges.subscriber === "number" ? 1 : 0;

  return {
    id: message.tags.userId,
    username: message.username,
    isSub: subLevel > 0 ?? false,
    subLevel: subLevel,
    isModerator: message.tags.isModerator ?? false,
    isVIP: false,
  };
}
