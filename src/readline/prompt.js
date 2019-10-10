// @flow

import keys, { type KeyType } from "./keys.js";
import { lib } from "../hterm_all.js";

const __forwardWordRegex = /^\W*\w+/;
const __backwardWordRegex = /\w+\W*$/;

export default class Prompt {
  _prompt: string;
  _term: any;
  _cursor: number = 0;
  _row: number = 0;
  _value: string = "";
  _startCol = 0;
  _startRow = 0;

  constructor(prompt: string, term: any) {
    this._prompt = prompt;
    this._term = term;
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
        this._cursor -= 1;
        if (this._cursor < 0) {
          this._cursor = 0;
          term.ringBell();
        }
        break;
      case "C-f":
      case "right":
        if (lib.wc.strWidth(this._value) > this._cursor) {
          this._cursor += 1;
        } else {
          term.ringBell();
        }
        break;
      case "C-p":
      case "up":
        this._moveUp();
        break;
      case "C-n":
      case "down":
        this._moveDown();
        break;
      case "enter":
        this._cursor = lib.wc.strWidth(this._value);
        this._render();
        this._term.newLine();
        if (this._value && this._value.length > 0) {
          let op = "line";
          let data = { text: this._value };
          window.webkit.messageHandlers.interOp.postMessage({ op, data });
          this._startCol = -1;
        }
        return;
      default:
        if (key.ch) {
          let width = lib.wc.strWidth(key.ch);
          let left = lib.wc.substring(this._value, 0, this._cursor);
          let right = lib.wc.substr(this._value, this._cursor);
          this._value = [left, key.ch, right].join("");
          this._cursor += width;
        }
    }

    this._render();
  };

  _moveUp() {
    let term = this._term;
    let screen = this._term.screen_;

    let pos = this._cursor + this._startCol;
    let r = (pos / screen.columnCount_) | 0;
    if (r > 0) {
      this._cursor -= screen.columnCount_;
      if (this._cursor < 0) {
        this._cursor = 0;
      }
    } else {
      term.ringBell();
    }
  }

  _moveDown() {
    let term = this._term;
    let screen = this._term.screen_;

    let width = lib.wc.strWidth(this._value);
    let pos = this._cursor + this._startCol;
    let r = (pos / screen.columnCount_) | 0;
    let lastR = (width / screen.columnCount_) | 0;
    if (r < lastR) {
      this._cursor += screen.columnCount_;
      if (this._cursor > width) {
        this._cursor = width;
      }
    } else {
      term.ringBell();
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
    if (match) {
      this._cursor -= lib.wc.strWidth(match[0]);
      if (this._cursor < 0) {
        this._cursor = 0;
      }
    }
  }

  _deleteBackWord() {
    if (this._cursor == 0) {
      this._term.ringBell();
    }

    var left = lib.wc.substring(this._value, 0, this._cursor);
    let right = lib.wc.substr(this._value, this._cursor);
    let match = __backwardWordRegex.exec(left);
    if (match) {
      let width = lib.wc.strWidth(match[0]);
      left = lib.wc.substring(this._value, 0, this._cursor - width);
      this._value = [left, right].join("");
      this._cursor -= width;
      if (this._cursor < 0) {
        this._cursor = 0;
      }
    }
  }

  _deleteForwardWord() {
    let left = lib.wc.substring(this._value, 0, this._cursor);
    var right = lib.wc.substr(this._value, this._cursor);

    let match = __forwardWordRegex.exec(right);
    if (match) {
      let width = lib.wc.strWidth(match[0]);
      right = lib.wc.substr(right, width);
      this._value = [left, right].join("");
    }
  }

  _uppercaseForwardWord() {
    let left = lib.wc.substring(this._value, 0, this._cursor);
    var right = lib.wc.substr(this._value, this._cursor);

    let match = __forwardWordRegex.exec(right);
    if (match) {
      let upperWord = match[0].toUpperCase();
      let width = lib.wc.strWidth(upperWord);
      right = lib.wc.substr(right, width);
      this._value = [left, upperWord, right].join("");
      this._cursor += width;
    }
  }

  _render() {
    let term = this._term;
    let screen = this._term.screen_;
    term.setCursorVisible(false);
    term.setCursorPosition(this._startRow, this._startCol);

    term.eraseBelow();

    let pos = this._cursor + this._startCol;
    let r = (pos / screen.columnCount_) | 0;
    let c = pos % screen.columnCount_;

    let moreRows = this._startRow + r + 1 - term.screenSize.height;
    if (moreRows > 0) {
      term.appendRows_(moreRows);
      this._startRow -= moreRows;
      term.setCursorPosition(this._startRow, this._startCol);
    }

    term.print(this._value);

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

    let rm = event.terminalRow;
    let cm = event.terminalColumn;

    if (rm == null || cm == null) {
      return false;
    }

    let term = this._term;
    let screen = this._term.screen_;
    let screenWidth = screen.columnCount_;

    let c1 = this._startCol;
    let r1 = this._startRow;

    let valueWidth = lib.wc.strWidth(this._value);
    let end = valueWidth + this._startCol;
    let r2 = (end / screenWidth) | (0 + this._startRow);
    let c2 = end % screenWidth;

    if (rm < r1 || (rm == r1 && cm < c1)) {
      this._cursor = 0;
      this._render();
      return true;
    }

    /*
    if (rm > r2 || (rm == r2 && cm > c2)) {
      this._cursor = valueWidth;
      this._render();
      return true;
    }
    */

    let mw = (rm - this._startRow) * screenWidth + cm - this._startCol;
    this._cursor = mw;
    if (this._cursor < 0) {
      this._cursor = 0;
    } else if (this._cursor > valueWidth) {
      this._cursor = valueWidth;
    }
    this._render();
    return true;
  }

  reset() {
    this._startCol = -1;
  }

  resize() {
    if (this._startCol < 0) {
      return;
    }

    this._render();
  }
}
