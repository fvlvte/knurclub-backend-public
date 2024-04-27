import { TwitchMessage } from "../../types/TwitchTypes";
import { SRUser } from "../../features/SRRewritten";

const SPELL_MODERATORZY = ["miinioo_"];

export function util_makeSrUserFromMessage(message: TwitchMessage): SRUser {
  const subLevel =
    typeof message.tags.badges.subscriber === "number" ||
    message.tags.badgeInfo.includes("founder")
      ? 1
      : 0;

  return {
    id: message.tags.userId,
    username: message.username,
    isSub: subLevel > 0 ?? false,
    subLevel: subLevel,
    isModerator: SPELL_MODERATORZY.includes(message.username)
      ? false
      : message.tags.isModerator ?? false,
    isVIP: false,
  };
}
