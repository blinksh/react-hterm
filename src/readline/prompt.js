// @flow

class Prompt {
  _prompt: string;
  _term: any;
  _value: string;

  constructor(prompt: string, term: any) {
    this._prompt = prompt;
    this._term = term;
    this._value = "";
  }
}
