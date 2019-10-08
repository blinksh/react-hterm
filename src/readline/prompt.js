// @flow

import keys, { type KeyType } from "./keys.js";
import { lib } from "../hterm_all.js";

export default class Prompt {
  _prompt: string;
  _term: any;
  _cursorCol: number = 0;
  _value: string = "";
  _startCol: -1;
  _startRow: 0;

  constructor(prompt: string, term: any) {
    this._prompt = prompt;
    this._term = term;
    term.setInsertMode(true);
    term.setAutoCarriageReturn(true);
  }

  _onKey = (key: KeyType) => {
    console.log(key);

    let term = this._term;
    let col = term.getCursorColumn();
    switch (key.fullName) {
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
        term.setCursorColumn(this._startCol);
        break;
      case "end":
      case "C-e":
        let width = lib.wc.strWidth(this._lineText());
        if (width > 0) {
          term.setCursorColumn(width);
        }
        break;
      case "C-k":
        term.eraseToRight();
        break;
      case "C-u":
        let count = col - this._startCol;
        if (count > 0) {
          term.screen_.deleteChars(count);
          term.setCursorColumn(this._startCol);
        } else {
          term.ringBell();
        }
        break;
      case "C-l":
        term.setCursorColumn(this._startCol);
        term.eraseToRight();
        break;
      case "backspace":
        if (col > this._startCol) {
          term.setCursorColumn(col - 1);
          term.deleteChars(1);
        } else {
          term.ringBell();
        }
        break;
      case "C-d":
        term.deleteChars(1);
        break;
      case "C-b":
      case "left":
        if (col > this._startCol) {
          term.cursorLeft();
        } else {
          term.ringBell();
        }
        break;
      case "C-f":
      case "right":
        term.cursorRight();
        break;
      case "enter":
        let text = lib.wc.substr(this._lineText(), this._startCol);
        term.formFeed();
        if (text && text.length > 0) {
          let op = "line";
          let data = { text };
          window.webkit.messageHandlers.interOp.postMessage({ op, data });
        }
        break;
      default:
        if (key.ch) {
          term.print(key.ch);
        }
    }
    // Sync cursor
    term.setCursorVisible(true);
  };

  _forwardWord(col: number) {
    let term = this._term;
    let text = this._lineText();
    let right = lib.wc.substr(text, col);
    let match = /^\W*\w+/.exec(right);
    if (match) {
      let pos = col + lib.wc.strWidth(match[0]);
      //if (pos < this._startCol) {
      //pos = this._startCol;
      //}
      term.setCursorColumn(pos);
    }
  }

  _backWord(col: number) {
    let term = this._term;
    let text = this._lineText();
    let left = lib.wc.substr(text, this._startCol, col - this._startCol);
    let match = /\w+\W*$/.exec(left);
    if (match) {
      let pos = col - lib.wc.strWidth(match[0]);
      if (pos < this._startCol) {
        pos = this._startCol;
      }
      term.setCursorColumn(pos);
    }
  }

  _lineText(): string {
    let term = this._term;
    let startRow = term.screen_.getLineStartRow_(term.screen_.cursorRow());
    return term.screen_.getLineText_(startRow);
  }

  render() {
    let term = this._term;
    term.setCursorColumn(0);
    term.print(this._prompt);
    term.print(this._value);
    term.setCursorColumn(this._cursorCol);
  }

  processInput(str: string) {
    if (this._startCol < 0) {
      this._startCol = this._term.getCursorColumn();
      this._startRow = this._term.getCursorRow();
    }
    keys(str, this._onKey);
  }

  resetStartCol() {
    this._startCol = -1;
  }
}
