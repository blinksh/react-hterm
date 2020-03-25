import { RRowType, RNodeType } from './model';
export declare function touch(n: RRowType | RNodeType): void;
export declare function genKey(): number;
export declare function nodeSubstr(node: RNodeType, start: number, width: number | void): string;
export declare function rowWidth(row: RRowType): number;
export declare function rowText(row: RRowType): string;
