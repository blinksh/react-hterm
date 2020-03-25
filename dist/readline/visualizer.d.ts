import { KeyType } from './keys';
declare type OptionsType = {
    keyStrokeDelay: number;
    lingerDelay: number;
    fadeDuration: number;
    bezelColor: string;
    textColor: string;
    position: 'top-right' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
};
declare class KeystrokeVisualizer {
    initialized: boolean;
    container: HTMLElement | null;
    style: HTMLStyleElement | null;
    keyStrokeTimeout: number | undefined;
    options: OptionsType;
    currentChunk: HTMLElement | null;
    cleanUp(): void;
    injectComponents(): void;
    processInput(str: string): void;
    _onKey: (key: KeyType) => void;
    enable(options: {}): void;
    disable(): void;
}
declare const _default: KeystrokeVisualizer;
export default _default;
