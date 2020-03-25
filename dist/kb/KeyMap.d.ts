declare const CANCEL: unique symbol;
declare const DEFAULT: unique symbol;
declare const PASS: unique symbol;
declare const STRIP: unique symbol;
export declare type KeyInfoType = {
    key: string;
    code: string;
    keyCode: number;
    src?: string;
};
export declare type KeyDownType = KeyInfoType & {
    alt: boolean;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
};
declare type KeyActionFunc = (e: KeyDownType, def: KeyDefType) => KeyActionType;
export declare type KeyActionType = KeyActionFunc | typeof CANCEL | typeof DEFAULT | typeof PASS | typeof STRIP | string;
export declare const KBActions: {
    CANCEL: symbol;
    DEFAULT: symbol;
    PASS: symbol;
    STRIP: symbol;
};
declare type OpType = 'out' | 'selection' | 'ime' | 'mods' | 'ready' | 'command' | 'capture' | 'voice' | 'guard-ime-on' | 'guard-ime-off' | 'zoom-in' | 'zoom-out' | 'zoom-reset';
export declare function op(op: OpType, args: {}): void;
export declare const ESC = "\u001B";
export declare const CSI = "\u001B[";
export declare const DEL = "";
declare type KeyDefType = {
    keyCode: number;
    keyCap: string;
    normal: KeyActionType;
    ctrl: KeyActionType;
    alt: KeyActionType;
    meta: KeyActionType;
};
export interface IKeyboard {
    hasSelection: boolean;
}
export default class KeyMap {
    _defs: {
        [index: number]: KeyDefType | undefined;
    };
    _reverseDefs: {
        [index: string]: KeyDefType | undefined;
    };
    _keyboard: IKeyboard;
    constructor(keyboard: IKeyboard);
    getKeyDef(keyCode: number): KeyDefType;
    addKeyDef(keyCode: number, def: KeyDefType): void;
    reset(): void;
    keyCode(ch: string): number;
    key(keyCode: number): string;
    _onCtrlNum: KeyActionFunc;
    _onAltNum: KeyActionFunc;
    _onSel: KeyActionFunc;
}
export {};
