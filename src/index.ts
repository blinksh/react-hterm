import Keyboard from "./kb/Keyboard";
import { hterm, lib } from "./hterm_all";
import KeystrokeVisualizer from "./readline/visualizer";

import "./RScreen/hterm_vs.patched"
import "./RScreen/ScrollPort"
import "./RScreen/Screen";
import "./RScreen/Terminal";

window.hterm = hterm;
window.lib = lib;
window.KeystrokeVisualizer = KeystrokeVisualizer;


function installKB(terminal: any, element: HTMLDivElement | null) {
  const keyboard = new Keyboard(terminal, element);
  if (!element) {
    document.body.append(keyboard.element);
  }
  keyboard.focus(true);
  window._onKB = keyboard.onKB;
  window._kb = keyboard;
//  keyboard.ready();
}

window.installKB = installKB;

declare global {
  interface Window {
    _onKB: (cmd: string, arg: string) => any;
    _kb: Keyboard;
    hterm: typeof hterm;
    lib: typeof lib;
    KeystrokeVisualizer: typeof KeystrokeVisualizer;
    term_apiRequest: (name: string, params: {}) => Promise<{}>;
    installKB: (terminal: any, element: HTMLDivElement | null) => void;
    webkit : {
      messageHandlers: {
        wkScroller: any
        interOp: any
      }
    };
  }
}
