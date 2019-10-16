// @flow

import keys, { type KeyType } from "./keys.js";
import { lib } from "../hterm_all.js";

const __forwardWordRegex = /^\W*\w+/;
const __backwardWordRegex = /\w+\W*$/;

class History {
  _prompt: Prompt;
  _cursor: number = -1;
  _lastValue: string = "";
  _lastPrompt: string = "";
  _call: ?any = null;

  constructor(prompt: Prompt) {
    this._prompt = prompt;
    this._lastValue = prompt._value;
    this._lastPrompt = prompt._prompt;
  }

  search() {}

  _cancelCall() {
    if (this._call) {
      this._call.cancel();
    }
    this._call = null;
  }

  prev() {
    this._cancelCall();
    this._call = window.term_apiRequest("history.search", {
      pattern: this._lastValue,
      before: 1,
      after: 0,
      cursor: this._cursor
    });

    this._call.then(response => {
      if (!response) {
        return;
      }

      let line = response.lines[0];
      if (!line) {
        this._prompt._term.ringBell();
        return;
      }
      this._cursor = line.num;
      this._prompt._value = line.val;
      this._prompt._cursor = lib.wc.strWidth(line.val);
      this._prompt._render();
    });
  }

  next() {
    this._cancelCall();
    if (this._cursor == -1) {
      this._prompt._term.ringBell();
      this._prompt._history = null;
      return;
    }
    this._call = window.term_apiRequest("history.search", {
      pattern: this._lastValue,
      before: 0,
      after: 2,
      cursor: this._cursor
    });

    this._call.then(response => {
      if (!response) {
        return;
      }

      let line = response.lines[1];
      if (!line) {
        this._prompt._value = this._lastValue;
        this._prompt._cursor = lib.wc.strWidth(this._lastValue);
        this._prompt._term.ringBell();
        this._prompt._history = null;
        return;
      }
      this._cursor = line.num;
      this._prompt._value = line.val;
      this._prompt._cursor = lib.wc.strWidth(line.val);
      this._prompt._render();
    });
  }

  reset() {
    this._cancelCall();
  }
}

export default class Prompt {
  _prompt: string = "";
  _shell: boolean = false;
  _secure: boolean = false;
  _term: any;
  _cursor: number = 0;
  _row: number = 0;
  _value: string = "";
  _history: ?History = null;
  _startCol = 0;
  _startRow = 0;

  constructor(term: any) {
    this._term = term;
  }

  _valueStartCol() {
    return this._startCol + lib.wc.strWidth(this._prompt);
  }

  _onKey = (key: KeyType) => {
    let term = this._term;
    switch (key.fullName) {
      case "tab":
        return;
      case "M-f":
      case "M-right":
        this._forwardWord();
        break;
      case "M-b":
      case "M-left":
        this._backWord();
        break;
      case "C-w":
        this._deleteBackWord();
        break;
      case "M-d":
        this._deleteForwardWord();
        break;
      case "M-u":
        this._uppercaseForwardWord();
        break;
      case "home":
      case "C-a":
        this._cursor = 0;
        break;
      case "end":
      case "C-e":
        this._cursor = lib.wc.strWidth(this._value);
        break;
      case "C-k":
        this._value = lib.wc.substring(this._value, 0, this._cursor);
        this._cursor = lib.wc.strWidth(this._value);
        this._resetHistory();
        break;
      case "C-u":
        this._value = lib.wc.substr(this._value, this._cursor);
        this._cursor = 0;
        break;
      case "C-l":
        if (this._cursor == 0 && this._value === "") {
          term.ringBell();
        } else {
          this._cursor = 0;
          this._value = "";
          this._resetHistory();
        }
        break;
      case "C-r":
        if (this._shell) {
          this._getHistory.search();
        } else {
          term.ringBell();
        }
        break;
      case "C-c":
        this._cursor = 0;
        this._value = "";
        break;
      case "backspace":
        if (this._cursor == 0) {
          term.ringBell();
        } else {
          let left = lib.wc.substring(this._value, 0, this._cursor - 1);
          let right = lib.wc.substr(this._value, this._cursor);
          this._value = [left, right].join("");
          this._cursor = lib.wc.strWidth(left);
          this._resetHistory();
        }
        break;
      case "C-d":
        {
          let left = lib.wc.substring(this._value, 0, this._cursor);
          let right = lib.wc.substr(this._value, this._cursor + 1);
          this._value = [left, right].join("");
        }
        break;
      case "C-b":
      case "left":
        this._moveLeft();
        break;
      case "C-f":
      case "right":
        this._moveRight();
        break;
      case "C-p":
      case "up":
        return this._moveUp();
      case "C-n":
      case "down":
        return this._moveDown();
      case "escape":
        break;
      case "return":
      case "enter":
        this._cursor = lib.wc.strWidth(this._value);
        this._render();
        this._term.interpret("\r\n");
        if (this._value && this._value.length > 0) {
          let op = "line";
          let data = { text: this._value };
          window.webkit.messageHandlers.interOp.postMessage({ op, data });
          //  this.reset();
        }
        return;
      default:
        if (key.ch) {
          let width = lib.wc.strWidth(key.ch);
          let left = lib.wc.substring(this._value, 0, this._cursor);
          let right = lib.wc.substr(this._value, this._cursor);
          term.accessibilityReader_.assertiveAnnounce(key.ch);
          this._value = [left, key.ch, right].join("");
          this._cursor += width;
          this._resetHistory();
        }
    }

    this._render();
  };

  _moveLeft() {
    if (this._cursor < 0) {
      this._cursor = 0;
      this._term.ringBell();
      return;
    }

    var w = 0;
    var left;
    var width;

    do {
      w += 1;
      left = lib.wc.substring(this._value, 0, this._cursor - w);
      width = lib.wc.strWidth(left);
    } while (width >= this._cursor && w < 5);
    this._cursor = width;
  }

  _moveRight() {
    let valueWidth = lib.wc.strWidth(this._value);
    if (this._cursor >= valueWidth) {
      this._cursor = valueWidth;
      this._term.ringBell();
      return;
    }
    var w = 0;
    var right, width;
    do {
      w += 1;
      right = lib.wc.substring(this._value, 0, this._cursor + w);
      width = lib.wc.strWidth(right);
    } while (width <= this._cursor && w < 5);
    this._cursor = width;
  }

  _moveUp() {
    let term = this._term;
    let screen = this._term.screen_;

    let pos = this._cursor + this._valueStartCol();
    let r = (pos / screen.columnCount_) | 0;
    if (r > 0) {
      this._cursor -= screen.columnCount_;
      if (this._cursor < 0) {
        this._cursor = 0;
      }
    } else if (this._shell) {
      return this._getHistory().prev();
    } else {
      term.ringBell();
    }
    this._render();
  }

  _moveDown() {
    let term = this._term;
    let screen = this._term.screen_;

    let width = lib.wc.strWidth(this._value);
    let pos = this._cursor + this._valueStartCol();
    let r = (pos / screen.columnCount_) | 0;
    let lastR = (width / screen.columnCount_) | 0;
    if (r < lastR) {
      this._cursor += screen.columnCount_;
      if (this._cursor > width) {
        this._cursor = width;
      }
    } else if (this._shell) {
      return this._getHistory().next();
    } else {
      term.ringBell();
    }
    this._render();
  }

  _getHistory() {
    if (!this._history) {
      this._history = new History(this);
    }

    return this._history;
  }

  _resetHistory() {
    if (this._history) {
      this._history.reset();
      this._history = null;
    }
  }

  _forwardWord() {
    let right = lib.wc.substr(this._value, this._cursor);
    let match = __forwardWordRegex.exec(right);
    if (match) {
      this._cursor += lib.wc.strWidth(match[0]);
    }
  }

  _backWord() {
    let left = lib.wc.substring(this._value, 0, this._cursor);
    let match = __backwardWordRegex.exec(left);
    if (!match) {
      return;
    }
    this._cursor -= lib.wc.strWidth(match[0]);
    if (this._cursor < 0) {
      this._cursor = 0;
    }
  }

  _deleteBackWord() {
    if (this._cursor == 0) {
      this._term.ringBell();
    }

    var left = lib.wc.substring(this._value, 0, this._cursor);
    let right = lib.wc.substr(this._value, this._cursor);
    let match = __backwardWordRegex.exec(left);
    if (!match) {
      return;
    }

    let width = lib.wc.strWidth(match[0]);
    left = lib.wc.substring(this._value, 0, this._cursor - width);
    this._value = [left, right].join("");
    this._cursor = Math.max(0, this._cursor - width);
    this._resetHistory();
  }

  _deleteForwardWord() {
    let left = lib.wc.substring(this._value, 0, this._cursor);
    var right = lib.wc.substr(this._value, this._cursor);

    let match = __forwardWordRegex.exec(right);
    if (!match) {
      return;
    }
    let width = lib.wc.strWidth(match[0]);
    right = lib.wc.substr(right, width);
    this._value = [left, right].join("");
    this._resetHistory();
  }

  _uppercaseForwardWord() {
    let left = lib.wc.substring(this._value, 0, this._cursor);
    var right = lib.wc.substr(this._value, this._cursor);

    let match = __forwardWordRegex.exec(right);
    if (!match) {
      return;
    }
    let upperWord = match[0].toUpperCase();
    let width = lib.wc.strWidth(upperWord);
    right = lib.wc.substr(right, width);
    this._value = [left, upperWord, right].join("");
    this._cursor += width;
    this._resetHistory();
  }

  _render() {
    let term = this._term;
    let screenWidth = term.screen_.columnCount_;

    term.setCursorVisible(false);
    term.setCursorPosition(this._startRow, this._startCol);

    term.eraseBelow();

    let valueWidth = lib.wc.strWidth(this._value);
    if (this._secure) {
      valueWidth = 0;
    }

    let pos = valueWidth + this._valueStartCol();
    let r = (pos / screenWidth) | 0;
    let c = pos % screenWidth;

    let moreRows = this._startRow + r + 1 - term.screenSize.height;
    if (moreRows > 0) {
      term.appendRows_(moreRows);
      this._startRow -= moreRows;
      term.setCursorPosition(this._startRow, this._startCol);
    }

    term.print(this._prompt, false);
    if (!this._secure) {
      term.print(this._value, false);
    }

    pos = (this._secure ? 0 : this._cursor) + this._valueStartCol();
    r = (pos / screenWidth) | 0;
    c = pos % screenWidth;

    term.setCursorPosition(this._startRow + r, c);
    term.setCursorVisible(true);
  }

  processInput(str: string) {
    if (this._startCol < 0) {
      this._value = "";
      this._cursor = 0;
      this._startCol = this._term.getCursorColumn();
      this._startRow = this._term.getCursorRow();
    }
    keys(str, this._onKey);
  }

  processMouseClick(event: MouseEvent) {
    if (this._startCol < 0) {
      return false;
    }

    if (event.terminalRow == null || event.terminalColumn == null) {
      return false;
    }

    let dr = event.terminalRow - this._startRow;
    if (dr < 0) {
      this._cursor = 0;
      this._render();
      return;
    }

    let valueWidth = lib.wc.strWidth(this._value);
    let screenWidth = this._term.screen_.columnCount_;

    let pos = dr * screenWidth + event.terminalColumn - this._valueStartCol();
    this._cursor = Math.min(Math.max(pos, 0), valueWidth);
    // fix cursor if we clik on emoji
    let left = lib.wc.substring(this._value, 0, this._cursor);
    this._cursor = lib.wc.strWidth(left);
    this._render();
    return true;
  }

  promptB64(b64: string) {
    this.reset();
    this._term.setAutoCarriageReturn(true);

    let opts = JSON.parse(window.atob(b64));
    this._prompt = opts.prompt;
    this._secure = opts.secure;
    this._shell = opts.shell;
    this._value = "";
    this._cursor = 0;
    this._startCol = this._term.getCursorColumn();
    this._startRow = this._term.getCursorRow();
    this._render();
    this._term.accessibilityReader_.announce(this._prompt);
  }

  reset() {
    if (this._startCol == -1) {
      return;
    }
    this._history = null;
    this._prompt = "";
    this._startCol = -1;
    this._secure = false;
    this._shell = false;
  }

  resize() {
    if (this._startCol < 0) {
      return;
    }

    this._render();
  }
}
