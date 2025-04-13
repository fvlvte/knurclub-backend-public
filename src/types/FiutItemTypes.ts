export enum FiutItemTypes {
  ITEM_TYPE_FIRST,

  KONDOM,
  PIERSCIEN,
  IGLA,
  KOLCZYK,
  PAS_CNOTY,

  ITEM_TYPE_LAST,
}

type FiutItem = {
  name: string;
};

export const FiutItemMapping: Record<number, FiutItem> = {
  [FiutItemTypes.IGLA]: {
    name: "igła",
  },
  [FiutItemTypes.KONDOM]: {
    name: "kondom",
  },
  [FiutItemTypes.PIERSCIEN]: {
    name: "pierścień",
  },
  [FiutItemTypes.KOLCZYK]: {
    name: "kolczyk",
  },
  [FiutItemTypes.PAS_CNOTY]: {
    name: "pas cnoty",
  },
};
