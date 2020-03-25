/**
 * keys.js - emit key presses
 * Copyright (c) 2010-2015, Joyent, Inc. and other contributors (MIT License)
 * https://github.com/chjj/blessed
 */
declare type KeyNameType = 'enter' | 'up' | 'down' | 'left' | 'right' | 'tab' | 'escape' | 'space' | 'home' | 'pageup' | 'pagedown' | 'delete' | 'insert' | 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'f6' | 'f7' | 'f8' | 'f9' | 'f10' | 'f11' | 'f12' | 'clear' | 'end';
export declare type KeyType = {
    sequence: string;
    name: KeyNameType | string | null;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
    fullName: string;
    code: string | null;
    ch: string | null;
};
declare type emitKeysCallback = (key: KeyType) => void;
export default function processKeys(s: string, callback: emitKeysCallback): void;
export {};
