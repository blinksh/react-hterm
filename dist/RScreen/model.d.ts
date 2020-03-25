export declare type RAttributesType = {
    isDefault: boolean;
    wcNode: boolean;
    asciiNode: boolean;
    fci: number;
    bci: number;
    uci: number;
    fcs?: string;
    bcs?: string;
    ucs?: string;
    bold?: boolean;
    italic?: boolean;
    blink?: boolean;
    strikethrough?: boolean;
    underline?: string;
};
export declare type RNodeType = {
    key: number;
    txt: string;
    wcw: number;
    v: number;
    attrs: RAttributesType;
};
export declare type RImageType = {
    textAlign: string;
    padRows: number;
    objectFit: string;
    src: string;
    title: string;
    alt: string;
    style?: any;
};
export declare type RRowType = {
    key: number;
    n: number;
    nodes: RNodeType[];
    v: number;
    o: boolean;
    img?: RImageType;
};
