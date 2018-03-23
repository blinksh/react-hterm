// @flow

export type RAttributesType = {|
  isDefault: boolean,
  fc: string | number,
  bc: string | number,
  uc: string | number,
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
  +attrs: RAttributesType,
|};

export type RRowType = {|
  key: number, // uniq in the row
  n: number, // Row number
  nodes: RNodeType[],
  v: number,
  o: boolean, // Line overflow
|};
