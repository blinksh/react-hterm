// @flow

import type { RRowType, RNodeType } from './model';
import { lib } from '../hterm_all.js';

var __nodeKey = 0;

export function touch(n: RRowType | RNodeType) {
  n.v = (n.v + 1) % 1000000;
}

export function genKey(): number {
  return __nodeKey++ % 1000000;
}

export function setNodeText(node: RNodeType, text: string) {
  node.txt = text;
  if (node.attrs.asciiNode) {
    node.wcw = text.length;
  } else {
    node.wcw = lib.wc.strWidth(text);
  }
  touch(node);
}

export function nodeSubstr(
  node: RNodeType,
  start: number,
  width: number | void,
) {
  if (node.attrs.asciiNode) {
    return node.txt.substr(start, width);
  }
  return lib.wc.substr(node.txt, start, width);
}

export function rowWidth(row: RRowType): number {
  var result = 0;

  const nodes = row.nodes;
  var len = nodes.length;

  for (var i = 0; i < len; i++) {
    result += nodes[i].wcw;
  }

  return result;
}

export function rowText(row: RRowType): string {
  let text = '';
  for (var i = 0, len = row.nodes.length; i < len; i++) {
    text += row.nodes[i].txt;
  }

  return text;
}
