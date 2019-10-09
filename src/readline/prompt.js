// @flow

import keys, { type KeyType } from "./keys.js";
import { lib } from "../hterm_all.js";

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
    term.setAutoCarriageReturn(true);
  }

  _setCursorColWithOverflow(col: number) {
    let screen = this._term.screen_;
    let width = screen.columnCount_;
    let r = (col / width) | 0;
    let c = col % width;

    screen.setCursorPosition(this._startRow + r, c);
    console.log("setCursorPosition", this._startRow, this._startCol, r, c);
  }

  _onKey = (key: KeyType) => {
    console.log(key);

    let term = this._term;
    let col = term.getCursorColumn();
    switch (key.fullName) {
      case "tab":
        return;
      case "M-f":
      case "M-right":
        this._forwardWord(col);
        break;
      case "M-b":
      case "M-left":
        this._backWord(col);
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
        term.eraseToRight();
        break;
      case "C-u":
        let count = col - this._startCol;
        if (count > 0) {
          term.screen_.deleteChars(count);
          this._setCursorColWithOverflow(this._startCol);
        } else {
          term.ringBell();
        }
        break;
      case "C-l":
        term.setCursorColumn(this._startCol);
        term.eraseToRight();
        break;
      case "backspace":
        if (this._cursor == 0) {
          term.ringBell();
        } else {
          //let width = lib.wc.strWidth(key.ch);
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
          //this._cursor = lib.wc.strWidth(left);
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
        term.formFeed();
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

  _forwardWord(col: number) {
    let term = this._term;
    let right = lib.wc.substr(this._value, this._cursor);
    let match = /^\W*\w+/.exec(right);
    if (match) {
      this._cursor += lib.wc.strWidth(match[0]);
    }
  }

  _backWord(col: number) {
    let term = this._term;
    let left = lib.wc.substring(this._value, 0, this._cursor);
    let match = /\w+\W*$/.exec(left);
    if (match) {
      this._cursor -= lib.wc.strWidth(match[0]);
      if (this._cursor < 0) {
        this._cursor = 0;
      }
    }
  }

  _lineText(): string {
    this._value;
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
