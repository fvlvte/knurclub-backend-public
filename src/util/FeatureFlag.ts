export enum FeatureFlag {
  FF_NEW_PLAYER = "FF_NEW_PLAYER",
}

export const isFeatureEnabled = (
  flag: FeatureFlag,
  streamerId: string,
): boolean => {
  return flag === FeatureFlag.FF_NEW_PLAYER && streamerId.length > 0;
};
