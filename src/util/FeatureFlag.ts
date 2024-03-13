export enum FeatureFlag {
  FF_NEW_PLAYER = "FF_NEW_PLAYER",
}
const newPlayerEnabledIds = ["1024010545"];

export const isFeatureEnabled = (
  flag: FeatureFlag,
  streamerId: string,
): boolean => {
  if (
    flag === FeatureFlag.FF_NEW_PLAYER &&
    newPlayerEnabledIds.includes(streamerId)
  ) {
    return true;
  }
  return false;
};
