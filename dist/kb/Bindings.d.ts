export declare type BindingAction = {
    type: 'hex';
    value: string;
} | {
    type: 'press';
    key: {
        keyCode: number;
        key: string;
        code: string;
        id: string;
    };
    mods: number;
} | {
    type: 'command';
    value: string;
} | {
    type: 'none';
};
export declare type KeyBinding = {
    keys: Array<string>;
    shiftLoc: number;
    controlLoc: number;
    optionLoc: number;
    commandLoc: number;
    action: BindingAction;
};
export default class Bindings {
    _map: {
        [index: string]: BindingAction;
    };
    reset(): void;
    match(keyIds: Array<string>): BindingAction | null;
    expandFn: (binding: KeyBinding) => void;
    expandCursor: (binding: KeyBinding) => void;
    expandBinding: (binding: KeyBinding) => void;
}
