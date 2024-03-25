import keys, { KeyType } from './keys';
import { lib } from '../hterm_all';

const __forwardWordRegex = /^\W*\w+/;
const __backwardWordRegex = /\w+\W*$/;

type LineType = {
  num: number,
  val: string,
  rel: number,
};

const __histryDisplayHeight = 8;

class History {
  _prompt: Prompt;
  _cursor: number = -1;
  _lastValue: string = '';
  _lastPrompt: [string] = [''];
  _call: any = null;
  _lines: Array<LineType> = [];
  _total: number = 0;
  _found: number = 0;
  _response: any = null;

  constructor(prompt: Prompt) {
    this._prompt = prompt;
    this._lastValue = prompt._value;
    this._lastPrompt = prompt._prompt;
  }

  enter() {
    let cursor = this._cursor;
    let line = this._lines.find(function(line) {
      return line.num == cursor;
    });
    if (line) {
      this._prompt._value = line.val;
      this._prompt._cursor = lib.wc.strWidth(line.val);
      this._prompt._render();
    }
  }

  search() {
    this._cancelCall();

    if (this._response && this._response.pattern == this._prompt._value) {
      return;
    }

    this._cursor = -1;
    this._call = window.term_apiRequest('history.search', {
      pattern: this._prompt._value,
      before: __histryDisplayHeight,
      after: 0,
      cursor: this._cursor,
    });

    // @ts-ignore
    this._call.then(response => {
      if (!response) {
        return;
      }

      this._response = response;

      this._lines = response.lines;
      this._total = response.total;
      this._found = response.found;

      let line = response.lines[response.lines.length - 1];
      if (line) {
        this._cursor = line.num;
      }
      this.render();
    });
  }

  _cancelCall() {
    if (this._call) {
      this._call.cancel();
    }
    this._call = null;
  }

  prev(searchMode: boolean) {
    this._cancelCall();
    if (searchMode) {
      let cursor = this._cursor;
      let idx = this._lines.findIndex(function(line) {
        return line.num == cursor;
      });
      if (idx > 0) {
        this._cursor = this._lines[idx - 1].num;
        this._prompt._render();
      } else {
        this._call = window.term_apiRequest('history.search', {
          pattern: this._prompt._value,
          before: 1,
          after: 0,
          cursor: this._cursor,
        });

        // @ts-ignore
        this._call.then(response => {
          if (!response) {
            return;
          }

          let line = response.lines[0];
          if (!line) {
            this._prompt._term.ringBell();
            return;
          }
          this._lines.splice(-1, 1);
          this._lines.splice(0, 0, line);
          this._cursor = line.num;
          this.render();
        });
      }
      return;
    }
    this._call = window.term_apiRequest('history.search', {
      pattern: this._lastValue,
      before: 1,
      after: 0,
      cursor: this._cursor,
    });

    // @ts-ignore
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

  next(searchMode: boolean) {
    if (searchMode) {
      let cursor = this._cursor;
      let idx = this._lines.findIndex(function(line) {
        return line.num == cursor;
      });
      if (idx < this._lines.length - 1 && idx != -1) {
        this._cursor = this._lines[idx + 1].num;
        this._prompt._render();
      } else {
        this._call = window.term_apiRequest('history.search', {
          pattern: this._prompt._value,
          before: 0,
          after: 2,
          cursor: this._cursor,
        });

        // @ts-ignore
        this._call.then(response => {
          if (!response) {
            return;
          }

          let line = response.lines[1];
          if (!line) {
            this._prompt._term.ringBell();
            return;
          }
          this._lines.splice(0, 1);
          this._lines.push(line);
          this._cursor = line.num;
          this.render();
        });
      }
      return;
    }
    this._cancelCall();
    if (this._cursor == -1) {
      this._prompt._term.ringBell();
      this._prompt._history = null;
      return;
    }
    this._call = window.term_apiRequest('history.search', {
      pattern: this._lastValue,
      before: 0,
      after: 2,
      cursor: this._cursor,
    });

    // @ts-ignore
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

  render() {
    let term = this._prompt._term;
    let screenWidth = term.screen_.columnCount_;

    term.setCursorVisible(false);
    term.setCursorPosition(this._prompt._startRow, this._prompt._startCol);

    term.eraseBelow();

    let valueWidth = lib.wc.strWidth(this._prompt._value);

    let searchPrompt = '📖 👀';
    if (valueWidth > 0) {
      searchPrompt = '📖 🔍';
      if (this._lines.length == 0) {
        searchPrompt += ' 🤷';
      }
    }
    searchPrompt =
      // @ts-ignore
      ('' + this._found).padStart(6, ' ') +
      ' of ' +
      this._total +
      ' ' +
      searchPrompt;
    let inputPrompt = '> ';
    term.print(searchPrompt, false);
    let pos = valueWidth + lib.wc.strWidth(inputPrompt);
    let r = (pos / screenWidth) | 0;
    let c = pos % screenWidth;
    let historyHeight = Math.min(__histryDisplayHeight, this._lines.length);
    let moreRows =
      historyHeight + this._prompt._startRow + r + 2 - term.screenSize.height;
    if (moreRows > 0) {
      term.appendRows_(moreRows);
      this._prompt._startRow -= moreRows;
      term.setCursorPosition(this._prompt._startRow, this._prompt._startCol);
    }
    for (var i = 0; i < historyHeight; i++) {
      var line = this._lines[i];
      term.setCursorPosition(this._prompt._startRow + i + 1, 0);
      term.print(
        (this._cursor == line.num ? '* ' : '  ') +
          // @ts-ignore
          (line.num + '').padStart(4, ' ') +
          ' ',
        false,
      );
      term.print(line.val, false);
    }
    term.setCursorPosition(this._prompt._startRow + historyHeight + 1, 0);
    term.print(inputPrompt, false);
    term.print(this._prompt._value, false);
    pos = this._prompt._cursor + lib.wc.strWidth(inputPrompt);
    r = (pos / screenWidth) | 0;
    c = pos % screenWidth;
    term.setCursorPosition(this._prompt._startRow + r + historyHeight + 1, c);
    term.setCursorVisible(true);
  }
}
class Complete {
  _prompt: Prompt;
  _cursor: number = -1;
  _lastValue: string = '';
  _call: any = null;
  _response: any = null;
  _n: number = 0;
  _lastCursor: number = -1;
  _checkValue: string | null = null;
  _checkCursor: number = -1;
  constructor(prompt: Prompt) {
    this._prompt = prompt;
    this._lastValue = prompt._value;
  }
  complete(dN: number) {
    this._cancelCall();
    let cursor = this._prompt._cursor;
    let value = this._prompt._value || '';
    if (!value.trim()) {
      this._prompt._value = '';
      this._prompt._cursor = lib.wc.strWidth(this._prompt._value);
      this._prompt._hint = '';
      this._prompt._render();
      this._prompt._term.interpret('\r\n');
      let op = 'line';
      let data = { text: 'help list-commands' };
      window.webkit.messageHandlers.interOp.postMessage({ op, data });
      return;
    }
    let realCursor = cursor;
    let realValue = value;
    let n = this._n;
    if (this._checkCursor == cursor && this._checkValue == value) {
      n += dN;
      cursor = this._lastCursor;
      value = this._lastValue;
    } else {
      n = 0;
      this._lastCursor = cursor;
      this._lastValue = value;
    }
    this._call = window.term_apiRequest('completion.for', {
      cursor: cursor,
      input: value,
      n: n,
    });
    // @ts-ignore
    this._call.then(response => {
      if (!response) {
        return;
      }
      // may be we are too late or we don't find anything
      if (
        realCursor != this._prompt._cursor ||
        realValue != this._prompt._value
      ) {
        return;
      }
      let candidate = response.result;
      if (candidate) {
        let left = value.substr(0, response.pos + response.len);
        left = value.substr(0, response.pos) + candidate;
        let leftWidth = lib.wc.strWidth(left);
        let right = value.substring(response.pos + response.len);
        this._prompt._value = [left, right].join('');
        this._prompt._cursor = leftWidth;
        this._checkCursor = this._prompt._cursor;
        this._checkValue = this._prompt._value;
        this._n = n;
      } else {
        this._checkCursor = -1;
        this._checkValue = null;
        this._n = 0;
      }
      let hint = this._response.hint;
      if (hint) {
        let prefix = value.substr(0, response.start);
        this._prompt._hintPos = lib.wc.strWidth(prefix);
        this._prompt._hint = response.hint;
      } else {
        this._prompt._hintPos = 0;
        this._prompt._hint = '';
      }
      this.hint();
    });
  }
  hint() {
    this._cancelCall();
    let value = this._prompt._value;
    let cursor = this._prompt._cursor;
    if (this._response && this._response.input == value) {
      return;
    }
    this._call = window.term_apiRequest('completion.for', {
      cursor: cursor,
      input: this._prompt._value,
      n: 0,
    });
    // @ts-ignore
    this._call.then(response => {
      if (!response) {
        return;
      }
      // may be we are too late or we don't find anything
      if (cursor != this._prompt._cursor || value != this._prompt._value) {
        return;
      }
      this._response = response;
      let hint = this._response.hint;
      if (hint) {
        let prefix = value.substr(0, response.start);
        this._prompt._hintPos = lib.wc.strWidth(prefix);
        this._prompt._hint = response.hint;
      } else {
        this._prompt._hintPos = 0;
        this._prompt._hint = '';
      }
      this._prompt._render();
    });
  }
  _cancelCall() {
    if (this._call) {
      this._call.cancel();
    }
    this._call = null;
  }
}
export default class Prompt {
  _prompt: [string] = [''];
  _promptLastLine = '';
  _shell: boolean = false;
  _secure: boolean = false;
  _term: any;
  _cursor: number = 0;
  _row: number = 0;
  _value: string = '';
  _history: History | null = null;
  _complete: Complete | null = null;
  _startCol = 0;
  _startRow = 0;
  _historySearchMode = false;
  _hint: string = '';
  _hintPos: number = 0;
  constructor(term: any) {
    this._term = term;
  }


  _promptRowsAndCols(valueWidth: number, screenWidth: number): [number, number] {
    // oneline shortcut
    if (this._prompt.length == 1 ) {
      let pos = valueWidth + this._valueStartCol();
      let r = (pos / screenWidth) | 0;
      let c = pos % screenWidth;
      if (c > 0) {
        r += 1;
      }
  
      return [r, c];
    }

    let lines = this._prompt;
    let len = lines.length;
    // first line with startCol
    let pos = this._startCol + lib.wc.strWidth(lines[0]);
    let r = (pos / screenWidth) | 0;
    if (pos % screenWidth > 0) {
      r += 1;
    }


    for (var i = 1; i < len - 1; i++) {
      let cols = lib.wc.strWidth(lines[i]);
      r += (cols / screenWidth) | 0;
      if (cols % screenWidth > 0) {
        r += 1;
      }
    }

    pos = valueWidth + lib.wc.strWidth(lines[len - 1]);
    r += (pos / screenWidth) | 0;

    let c = pos % screenWidth;
    if (c > 0) {
      r += 1;
    }

    return [r, c];
  }

  _valueStartCol() {
    return this._startCol + lib.wc.strWidth(this._promptLastLine);
  }

  _onKey = (key: KeyType) => {
    let term = this._term;
    switch (key.fullName) {
      case 'tab':
        this._completeIfNeeded();
        return;
      case 'S-tab':
        this._completeBackIfNeeded();
        return;
      case 'M-f':
      case 'M-right':
        this._forwardWord();
        break;
      case 'M-b':
      case 'M-left':
        this._backWord();
        break;
      case 'C-w':
        this._deleteBackWord();
        break;
      case 'M-d':
        this._deleteForwardWord();
        break;
      case 'M-u':
        this._uppercaseForwardWord();
        break;
      case 'home':
      case 'C-a':
        this._cursor = 0;
        break;
      case 'end':
      case 'C-e':
        this._cursor = lib.wc.strWidth(this._value);
        break;
      case 'C-u':
        // @ts-ignore
        this._value = lib.wc.substr(this._value, this._cursor);
        this._cursor = 0;
        break;
      case 'C-l':
        this._term.reset();
        this._resetHistory();
        this._startRow = 0;
	this._term.setAutoCarriageReturn(true);
        break;
      case 'C-r':
        if (this._shell) {
          this._historySearchMode = true;
          this._resetHistory();
        } else {
          term.ringBell();
        }
        break;
      case 'C-c':
        this._cursor = 0;
        this._value = '';
        break;
      case 'backspace':
        if (this._cursor == 0) {
          term.ringBell();
        } else {
          let left = lib.wc.substring(this._value, 0, this._cursor - 1);
          // @ts-ignore
          let right = lib.wc.substr(this._value, this._cursor);
          this._value = [left, right].join('');
          this._cursor = lib.wc.strWidth(left);
          this._resetHistory();
        }
        break;
      case 'C-d':
        {
          let left = lib.wc.substring(this._value, 0, this._cursor);
          // @ts-ignore
          let right = lib.wc.substr(this._value, this._cursor + 1);
          this._value = [left, right].join('');
        }
        break;
      case 'C-b':
      case 'left':
        this._moveLeft();
        break;
      case 'C-f':
      case 'right':
        this._moveRight();
        break;
      case 'C-k':
        if (!this._historySearchMode) {
          this._value = lib.wc.substring(this._value, 0, this._cursor);
          this._cursor = lib.wc.strWidth(this._value);
          this._resetHistory();
          break;
        }
      case 'C-p':
      case 'up':
        return this._moveUp();
      case 'C-n':
      case 'down':
        return this._moveDown();
      case 'escape':
        this._historySearchMode = false;
        break;
      case 'linefeed':
      case 'C-j':
        if (this._historySearchMode) {
          return this._moveDown();
        }
      case 'return':
      case 'enter':
        if (this._historySearchMode) {
          this._getHistory().enter();
          this._historySearchMode = false;
          this._resetHistory();
          this._render();
          return;
        }
        this._cursor = lib.wc.strWidth(this._value);
        this._hint = '';
        this._render();
        this._term.interpret('\r\n');
        let op = 'line';
        let data = { text: this._value || '' };
        window.webkit.messageHandlers.interOp.postMessage({ op, data });
        return;
      default:
        if (key.ch) {
          let width = lib.wc.strWidth(key.ch);
          let left = lib.wc.substring(this._value, 0, this._cursor);
          // @ts-ignore
          let right = lib.wc.substr(this._value, this._cursor);
          term.accessibilityReader_.assertiveAnnounce(key.ch);
          this._value = [left, key.ch, right].join('');
          this._cursor += width;
          this._resetHistory();
        }
    }
    this._searchIfNeeded();
    this._hintIfNeeded();
    this._render();
  };
  _searchIfNeeded() {
    if (this._shell && this._historySearchMode) {
      this._getHistory().search();
    }
  }

  _completeIfNeeded() {
    if (this._shell && !this._historySearchMode) {
      this._getComplete().complete(1);
    }
  }

  _completeBackIfNeeded() {
    if (this._shell && !this._historySearchMode) {
      this._getComplete().complete(-1);
    }
  }

  _hintIfNeeded() {
    if (this._shell && !this._historySearchMode) {
      this._getComplete().hint();
    } else {
      this._hint = '';
    }
  }

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
      this._hint = '';
      return this._getHistory().prev(this._historySearchMode);
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
      this._hint = '';
      return this._getHistory().next(this._historySearchMode);
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

  _getComplete() {
    if (!this._complete) {
      this._complete = new Complete(this);
    }
    return this._complete;
  }

  _resetHistory() {
    if (this._historySearchMode) {
      this._getHistory().search();
      return;
    }
    if (this._history) {
      this._history.reset();
      this._history = null;
    }
  }

  _forwardWord() {
    // @ts-ignore
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
    // @ts-ignore
    let right = lib.wc.substr(this._value, this._cursor);
    let match = __backwardWordRegex.exec(left);
    if (!match) {
      return;
    }
    let width = lib.wc.strWidth(match[0]);
    left = lib.wc.substring(this._value, 0, this._cursor - width);
    this._value = [left, right].join('');
    this._cursor = Math.max(0, this._cursor - width);
    this._resetHistory();
  }

  _deleteForwardWord() {
    let left = lib.wc.substring(this._value, 0, this._cursor);
    // @ts-ignore
    var right = lib.wc.substr(this._value, this._cursor);
    let match = __forwardWordRegex.exec(right);
    if (!match) {
      return;
    }
    let width = lib.wc.strWidth(match[0]);
    // @ts-ignore
    right = lib.wc.substr(right, width);
    this._value = [left, right].join('');
    this._resetHistory();
  }

  _uppercaseForwardWord() {
    let left = lib.wc.substring(this._value, 0, this._cursor);
    // @ts-ignore
    var right = lib.wc.substr(this._value, this._cursor);
    let match = __forwardWordRegex.exec(right);
    if (!match) {
      return;
    }
    let upperWord = match[0].toUpperCase();
    let width = lib.wc.strWidth(upperWord);
    // @ts-ignore
    right = lib.wc.substr(right, width);
    this._value = [left, upperWord, right].join('');
    this._cursor += width;
    this._resetHistory();
  }

  _render() {
    if (this._historySearchMode) {
      this._getHistory().render();
      return;
    }
    let term = this._term;
    let screenWidth = term.screen_.columnCount_;
    term.setCursorVisible(false);
    term.setCursorPosition(this._startRow, this._startCol);
    term.eraseBelow();
    let hintWidth = this._hintPos + lib.wc.strWidth(this._hint);
    let valueWidth = lib.wc.strWidth(this._value);
    valueWidth = Math.max(hintWidth, valueWidth);
    if (this._secure) {
      valueWidth = 0;
      hintWidth = 0;
    }
    //let pos = valueWidth + this._valueStartCol();
    let [r, c] = this._promptRowsAndCols(valueWidth, screenWidth);
    let moreRows = this._startRow + r - term.screenSize.height;
    if (moreRows > 0) {
      term.appendRows_(moreRows);
      this._startRow -= moreRows;
      term.setCursorPosition(this._startRow, this._startCol);
    }

    for (var i = 0; i < this._prompt.length - 1; i++) {
      let line = this._prompt[i];

      term.print(line, false);
      term.setCursorPosition(term.screen_.cursorPosition.row + 1, 0)
    }

    let lastPromptRow = term.screen_.cursorPosition.row;
    // If there is a prompt line, we print that. Otherwise we respect the cursor pos.
    if (this._promptLastLine != "") {
      term.setCursorPosition(lastPromptRow, 0);
      term.print(this._promptLastLine, false);
    }
    
    var cursor = term.saveCursor();
    if (!this._secure) {
      if (this._hint && this._shell) {
        
        let pos = this._hintPos + this._valueStartCol();
        let r = (pos / screenWidth) | 0;
        let c = pos % screenWidth;
        term.setCursorPosition(lastPromptRow, c);
        term.screen_.textAttributes.faint = true;
        term.screen_.textAttributes.foregroundSource = 3;
        term.screen_.textAttributes.syncColors();
        term.print(this._hint, false);
        term.restoreCursor(cursor);
        term.screen_.textAttributes.reset();
      }
      term.print(this._value, false);
    }
    
    let pos = (this._secure ? 0 : this._cursor) + this._valueStartCol()
    
    term.setCursorPosition(lastPromptRow + ((pos / screenWidth) | 0), pos % screenWidth);
    term.setCursorVisible(true);
  }

  processInput(str: string) {
    if (this._startCol < 0) {
      this._value = '';
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
    // @ts-ignore
    if (event.terminalRow == null || event.terminalColumn == null) {
      return false;
    }
    // @ts-ignore
    var tx = event.terminalColumn - 1;
    // @ts-ignore
    var ty = event.terminalRow - 1;
    var startRow = this._startRow;
    var lines = this._getHistory()._lines;
    if (this._historySearchMode) {
      startRow += lines.length + 1;
    }
    let dr = ty - startRow;
    if (dr < 0) {
      if (-dr <= lines.length) {
        let line = lines[lines.length + dr];
        this._getHistory()._cursor = line.num;
        this._getHistory().render();
        return;
      }
      this._cursor = 0;
      this._render();
      return;
    }
    let valueWidth = lib.wc.strWidth(this._value);
    let screenWidth = this._term.screen_.columnCount_;
    let pos =
      dr * screenWidth +
      tx -
      (this._historySearchMode ? 2 : this._valueStartCol());
    this._cursor = Math.min(Math.max(pos, 0), valueWidth); // fix cursor if we clik on emoji
    let left = lib.wc.substring(this._value, 0, this._cursor);
    this._cursor = lib.wc.strWidth(left);
    this._render();
    return true;
  }
  processMouseScroll(event: WheelEvent) {
    if (this._startCol < 0) {
      return false;
    }
    // @ts-ignore
    if (event.terminalRow == null || event.terminalColumn == null) {
      return false;
    }
    if (!this._historySearchMode) {
      return false;
    }
    if (event.deltaY > 0) {
      this._moveUp();
    } else {
      this._moveDown();
    }
    return true;
  }
  promptB64(b64: string) {
    this.reset();
    this._term.setAutoCarriageReturn(true);
    let opts = JSON.parse(window.atob(b64));
    this._prompt = (opts.prompt || '').split(/\n/);
    this._promptLastLine = this._prompt[this._prompt.length - 1];
    this._secure = opts.secure;
    this._shell = opts.shell;
    this._value = '';
    this._hint = '';
    this._hintPos = 0;
    this._cursor = 0;
    this._startCol = 0;// this._term.getCursorColumn();
    this._startRow = this._term.getCursorRow();
    this._render();
    this._term.accessibilityReader_.announce(this._prompt);
  }
  reset() {
    if (this._startCol == -1) {
      return;
    }
    this._history = null;
    this._complete = null;
    this._prompt = [''];
    this._promptLastLine = '';
    this._startCol = -1;
    this._secure = false;
    this._shell = false;
    this._hint = '';
    this._hintPos = 0;
    this._historySearchMode = false;
  }
  resize() {
    if (this._startCol < 0) {
      return;
    }
    this._render();
  }
}
