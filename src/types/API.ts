export enum AlertTypes {
  SUBIK = "subik",
  RESUBIK = "resubik",
  BITSY = "bitsy",
  RAJDZIK = "rajdzik",
  SUB_GIFCIK = "sub_gifcik",
  FOLOWEK = "folowek",
}

export type AlertInfo = {
  type: AlertTypes;
  innerHtml: string;
  duration: number;
  entities: string[];
};
