export type RAttributesType = {
  isDefault: boolean,

  wcNode: boolean,
  asciiNode: boolean,

  fci: number,
  bci: number,
  uci: number,

  fcs?: string,
  bcs?: string,
  ucs?: string,

  bold?: boolean,
  italic?: boolean,
  blink?: boolean,
  strikethrough?: boolean,
  underline?: string,
};

export type RNodeType = {
  key: number, // uniq in the row
  txt: string,
  wcw: number,
  v: number,
  attrs: RAttributesType,
};

export type RImageType = {
  textAlign: string,
  padRows: number,
  objectFit: string,
  src: string,
  title: string,
  alt: string,
  style?: any,
};

export type RRowType = {
  key: number, // uniq in the row
  n: number, // Row number
  nodes: RNodeType[],
  v: number,
  o: boolean, // Line overflow
  img?: RImageType,
};
