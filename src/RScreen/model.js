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
  +key: string, // uniq in the row
  txt: string,
  wcwidth: number,
  v: number,
  +attrs: RAttributesType,
|};

export type RRowType = {|
  number: string,
  nodes: Array<RNodeType>,
  v: number,
  lineOverflow: boolean,
|};
