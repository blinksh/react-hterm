import { RRowType, RNodeType } from './model';
import { lib } from '../hterm_all';

let __nodeKey = 0;

export function touch(n: RRowType | RNodeType) {
  n.v = (n.v + 1) % 1000000;
}

export function genKey(): number {
  return __nodeKey++ % 1000000;
}

export function nodeSubstr(
  node: RNodeType,
  start: number,
  width: number | void,
): string {
  if (node.attrs.asciiNode) {
    // @ts-ignore
    return node.txt.substr(start, width);
  }
  return lib.wc.substr(node.txt, start, width);
}

export function rowWidth(row: RRowType): number {
  let result = 0;

  const nodes = row.nodes;
  const len = nodes.length;

  for (var i = 0; i < len; i++) {
    result += nodes[i].wcw;
  }

  return result;
}

export function rowText(row: RRowType): string {
  let result = '';

  for (var i = 0, len = row.nodes.length; i < len; i++) {
    result += row.nodes[i].txt;
  }

  return result;
}
