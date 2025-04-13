export type FiutPlayer = {
  userId: string;
  rozmiarFiut: number;

  equippedItem?: number;
  equippedItemExpiresAt?: number;

  lastItemGainedAt?: number;

  lastCombatAt?: number;
};
