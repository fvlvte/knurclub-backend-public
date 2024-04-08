export enum FeatureFlag {
  FF_NEW_PLAYER = "FF_NEW_PLAYER",
}
const newPlayerEnabledIds = [
  "1024010545",
  process.env.NODE_END !== "production" ? "268563714" : undefined,
];

export const isFeatureEnabled = (
  flag: FeatureFlag,
  streamerId: string,
): boolean => {
  return (
    flag === FeatureFlag.FF_NEW_PLAYER &&
    newPlayerEnabledIds.includes(streamerId)
  );
};
