// @flow

export type RAttributesType = {
  foreground: ?string,
  background: ?string,
  underlineColor: ?string,
  bold: boolean,
  faint: boolean,
  italic: boolean,
  blink: boolean,
  underline: boolean,
  strikethrough: boolean,
  inverse: boolean,
  invisible: boolean,
  wcNode: boolean,
  asciiNode: boolean,
  uri: ?string,
  uriId: any,
};

export type RNodeType = {
  key: string, // uniq in the row
  txt: string,
  wcwidth: number,
  v: number,
  +attrs: RAttributesType,
};

export type RRowType = {
  number: string,
  nodes: Array<RNodeType>,
  v: number,
  lineOverflow: boolean,
};
