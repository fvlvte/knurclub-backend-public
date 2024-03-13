export enum FeatureFlag {
  FF_NEW_PLAYER = "FF_NEW_PLAYER",
}
const newPlayerEnabledIds = ["1024010545", "268563714"];

export const isFeatureEnabled = (
  flag: FeatureFlag,
  streamerId: string,
): boolean => {
  return false;
  if (
    flag === FeatureFlag.FF_NEW_PLAYER &&
    newPlayerEnabledIds.includes(streamerId)
  ) {
    return true;
  }
  return false;
};
