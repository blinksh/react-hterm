import keys, { KeyType } from './keys';

type OptionsType = {
  keyStrokeDelay: number,
  lingerDelay: number,
  fadeDuration: number,
  bezelColor: string,
  textColor: string,
  position:
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'top-left'
    | 'top-right',
};

const DEFAULT_OPTIONS: OptionsType = {
  keyStrokeDelay: 200, // Time before the line breaks
  lingerDelay: 1000, // Time before the text fades away
  fadeDuration: 1000,
  bezelColor: '#000',
  textColor: '#fff',
  position: 'top-right', // bottom-left, bottom-right, top-left, top-right
};

let _conversionCommon = {
  right: '→',
  left: '←',
  up: '↑',
  down: '↓',
  space: '␣',
  enter: '↩',
  return: '↩',
  linefeed: 'C-j',
  //shift: "⇧",
  shift: 'S-',
  ctrl: 'C-',
  tab: '⇥',
  escape: '⎋',
  pagedown: '⇟',
  pageup: '⇞',
  home: '↖',
  end: '↘',
  delete: '⌦',
  backspace: '⌫',
  meta: 'M-',
};

class KeystrokeVisualizer {
  initialized = false;
  container: HTMLElement | null = null;
  style: HTMLStyleElement | null = null;
  keyStrokeTimeout: number | undefined;
  options: OptionsType = DEFAULT_OPTIONS;
  currentChunk: HTMLElement | null = null;

  cleanUp() {
    function removeNode(node: HTMLElement | null) {
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
    removeNode(this.container);
    removeNode(this.style);
    clearTimeout(this.keyStrokeTimeout);
    this.currentChunk = null;
    this.container = this.style = null;
  }

  injectComponents() {
    // Add container
    this.container = document.createElement('ul');
    let node = document.querySelector('x-screen');
    if (node) {
      node.appendChild(this.container);
    }
    this.container.className = 'keystrokes';

    const positions = {
      'bottom-left': 'bottom: 0;',
      'bottom-right': 'bottom: 0; direction: rtl;',
      'top-left': 'top: 0;',
      'top-right': 'top: 0; direction: rtl;',
    };

    if (!positions[this.options.position]) {
      console.warn(
        `Invalid position '${
          this.options.position
        }', using default 'bottom-left'. Valid positions: `,
        Object.keys(positions),
      );
      this.options.position = 'bottom-left';
    }

    // Add classes
    this.style = document.createElement('style');
    this.style.innerHTML = `
      ul.keystrokes {
        padding: 0 10px;
        position: fixed;
        left: 0;
        right: 0;
        ${positions[this.options.position]}
      }

      ul.keystrokes li {
        direction: ltr;
        background-color: ${this.options.bezelColor};
        opacity: 0.9;
        color: ${this.options.textColor};
        padding: 5px 10px;
        margin-bottom: 5px;
        border-radius: 15px;
        opacity: 1;
        display: table;
        -webkit-transition: opacity ${this.options.fadeDuration}ms linear;
        transition: opacity ${this.options.fadeDuration}ms linear;
      }`;
    document.body.appendChild(this.style);
  }

  processInput(str: string) {
    keys(str, this._onKey);
  }

  _onKey = (key: KeyType) => {
    if (!this.container) {
      return;
    }
    if (!this.currentChunk) {
      this.currentChunk = document.createElement('li');
      if (this.options.position.indexOf('top') === 0) {
        this.container.insertBefore(
          this.currentChunk,
          this.container.childNodes[0],
        );
      } else {
        this.container.appendChild(this.currentChunk);
      }
    }

    var modifier = '';

    if (key.ctrl) {
      modifier += _conversionCommon['ctrl'];
    }
    if (key.meta) {
      modifier += _conversionCommon['meta'];
    }
    if (key.shift) {
      modifier += _conversionCommon['shift'];
    }
    let name = (key.name || '').replace(/^[CMS]-/, '');
    this.currentChunk.textContent +=
    // @ts-ignore
      modifier + (_conversionCommon[name] || name || key.ch);

    var options = this.options;

    clearTimeout(this.keyStrokeTimeout);
    this.keyStrokeTimeout = setTimeout(() => {
      (function(previousChunk) {
        setTimeout(() => {
    // @ts-ignore
          previousChunk.style.opacity = 0;
          setTimeout(() => {
    // @ts-ignore
            previousChunk.parentNode.removeChild(previousChunk);
          }, options.fadeDuration);
        }, options.lingerDelay);
      })(this.currentChunk);

      this.currentChunk = null;
    }, options.keyStrokeDelay);
  };

  enable(options: {}) {
    this.cleanUp();
    this.options = Object.assign({}, DEFAULT_OPTIONS, options || this.options);
    this.injectComponents();
  }

  disable() {
    this.cleanUp();
  }
}

export default new KeystrokeVisualizer();
