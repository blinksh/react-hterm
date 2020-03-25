import KeyMap, { IKeyboard, KeyInfoType } from './KeyMap';
import Bindings, { BindingAction, KeyBinding } from './Bindings';
declare type KeyCode = {
    keyCode: number;
    key: string;
    code: string;
    id: string;
};
declare type KeyAction = '' | 'escape';
declare type KeyModifier = '' | 'Escape' | '8-bit' | 'Shift' | 'Control' | 'Meta' | 'Meta-Escape';
declare type KeyConfig = {
    code: KeyCode;
    up: KeyAction;
    down: KeyAction;
    mod: KeyModifier;
    ignoreAccents: boolean;
};
declare type KeyConfigPair = {
    left: KeyConfig;
    right: KeyConfig;
    bothAsLeft: boolean;
};
declare type KBConfig = {
    capsLock: KeyConfig;
    shift: KeyConfigPair;
    control: KeyConfigPair;
    option: KeyConfigPair;
    command: KeyConfigPair;
    fn: KeyBinding;
    cursor: KeyBinding;
    bindings: {
        [index: string]: BindingAction;
    };
    shortcuts: Array<{
        action: BindingAction;
        input: string;
        modifiers: number;
    }>;
};
export default class Keyboard implements IKeyboard {
    element: HTMLInputElement;
    _keyMap: KeyMap;
    _bindings: Bindings;
    _lang: string;
    _langWithDeletes: boolean;
    _isHKB: boolean;
    hasSelection: boolean;
    _lastKeyDownEvent: KeyboardEvent | null;
    _capsLockRemapped: boolean;
    _shiftRemapped: boolean;
    _removeAccents: boolean;
    _metaSendsEscape: boolean;
    _altSendsWhat: 'escape' | '8-bit';
    _ignoreAccents: {
        AltLeft: boolean;
        AltRight: boolean;
    };
    _modsMap: {
        [index: string]: KeyModifier;
    };
    _downMap: {
        [index: string]: KeyInfoType;
    };
    _upMap: {
        [index: string]: KeyInfoType;
    };
    _mods: {
        [index: string]: Set<String>;
    };
    _up: Set<string>;
    _down: Set<string>;
    constructor();
    _updateRemappingFlags(): void;
    _updateUIKitModsIfNeeded: (e: KeyboardEvent) => void;
    _mod(mod: KeyModifier): 'Alt' | 'Meta' | 'Control' | 'Shift' | null;
    _downKeysIds: () => string[];
    _onKeyDown: (e: KeyboardEvent) => void;
    _onBeforeInput: (e: InputEvent) => void;
    _onInput: (e: InputEvent) => void;
    _onKeyUp: (e: KeyboardEvent) => void;
    _handleKeyDown: (keyCode: number, e: KeyboardEvent | null) => void;
    _handleKeyDownKey: (keyInfo: KeyInfoType, e: KeyboardEvent | null) => void;
    focus(value: boolean): void;
    ready(): void;
    _onIME: (e: CompositionEvent) => void;
    _handleCapsLockDown(down: boolean): void;
    _handleLang(langAndKB: string): void;
    _output: (data: string | null) => void;
    _stateReset: (hasSelection: boolean) => void;
    _handleGuard(up: boolean, char: string): void;
    _configKey: (key: KeyConfig) => void;
    _reset(): void;
    _config: (cfg: KBConfig) => void;
    _keysFromShortcut(input: string, mods: number): Array<string>;
    _onToolbarMods: (val: number) => void;
    _execPress: (str: string, e: KeyboardEvent | null, skipBinding: boolean) => void;
    onKB: (cmd: string, arg: any) => void;
    _execBinding(action: BindingAction, e: KeyboardEvent | null): void;
}
export {};
