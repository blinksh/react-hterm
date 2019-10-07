// @flow

import keys, { type KeyType } from "./keys.js";

export default class Prompt {
  _prompt: string;
  _term: any;
  _cursorCol: number = 0;
  _value: string = "";

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
      case "C-a":
        term.setCursorColumn(0);
        break;
      case "C-e":
        term.setCursorColumn(0);
        break;
      case "C-k":
        term.eraseToRight();
        break;
      case "C-u":
        term.eraseToLeft();
        break;
      case "C-l":
        term.eraseLine();
        break;
      case "backspace":
        if (col > 0) {
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
        if (col > 0) {
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
        let text = this._lineText();
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
    keys(str, this._onKey);
  }
}
