import { RNodeType, RAttributesType } from './model';
export declare function setNodeText(node: RNodeType, text: string, wcwidth?: number): void;
export declare function setNodeAttributedText(attrs: RAttributesType, node: RNodeType, text: string, wcwidth?: number): void;
export declare function createDefaultNode(text: string, wcwidth: number): RNodeType;
export declare function createNode(text: string, wcwidth: number): RNodeType;
export declare function createAttributedNode(attrs: RAttributesType, txt: string, wcw: number | void): RNodeType;
export declare function nodeMatchesAttrs(node: RNodeType, attrs: RAttributesType): boolean;
