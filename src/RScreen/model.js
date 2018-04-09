// @flow

export type RAttributesType = {|
  isDefault: boolean,
  fc: string,
  bc: string,
  uc: string,
  className: string,
  wcNode: boolean,
  asciiNode: boolean,

  uri?: string,
  uriId?: any,
|};

export type RNodeType = {|
  key: number, // uniq in the row
  txt: string,
  wcw: number,
  v: number,
  attrs: RAttributesType,
|};

export type RImageType = {
  textAlign: string,
  padRows: number,
  objectFit: string,
  src: string,
  title: string,
  alt: string,
};

export type RRowType = {|
  key: number, // uniq in the row
  n: number, // Row number
  nodes: RNodeType[],
  v: number,
  o: boolean, // Line overflow
  img?: RImageType,
|};
