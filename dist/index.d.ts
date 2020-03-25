import Keyboard from "./kb/Keyboard";
import { hterm, lib } from "./hterm_all";
import KeystrokeVisualizer from "./readline/visualizer";
import "./RScreen/hterm_vs.patched";
import "./RScreen/ScrollPort";
import "./RScreen/Screen";
import "./RScreen/Terminal";
declare global {
    interface Window {
        _onKB: (cmd: string, arg: string) => any;
        _kb: Keyboard;
        hterm: typeof hterm;
        lib: typeof lib;
        KeystrokeVisualizer: typeof KeystrokeVisualizer;
        term_apiRequest: (name: string, params: {}) => Promise<{}>;
        webkit: {
            messageHandlers: {
                wkScroller: any;
                interOp: any;
            };
        };
    }
}
