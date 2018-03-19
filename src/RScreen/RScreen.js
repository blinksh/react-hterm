// @flow

import type { RRowType, RNodeType, RAttributesType } from './model';

import { hterm, lib } from '../hterm_all.js';

var __nodeKey = 0;

const __defaultClassName = '';

function __defaultAttributes(): RAttributesType {
  return {
    fc: '',
    bc: '',
    uc: '',
    className: __defaultClassName,
    isDefault: true,
    wcNode: false,
    asciiNode: true,
  };
}

function __touch(n: RRowType | RNodeType) {
  n.v = (n.v + 1) % 1000000;
}

function __genNodeKey(): string {
  return (__nodeKey++ % 1000000).toString(32);
}

function __setNodeText(node: RNodeType, text) {
  node.txt = text;
  if (node.attrs.asciiNode) {
    node.wcwidth = text.length;
  } else {
    node.wcwidth = lib.wc.strWidth(text);
  }
  __touch(node);
}

function __createRNode(text: string, wcwidth: number): RNodeType {
  return {
    v: 0,
    txt: text,
    wcwidth,
    key: __genNodeKey(),
    attrs: __defaultAttributes(),
  };
}

function __nodeSubstr(node: RNodeType, start: number, width: number | void) {
  if (node.attrs.asciiNode) {
    return node.txt.substr(start, width);
  }
  return lib.wc.substr(node.txt, start, width);
}

function __nodeSubstring(node: RNodeType, start: number, end: number) {
  if (node.attrs.asciiNode) {
    return node.txt.substring(start, end);
  }
  return lib.wc.substring(node.txt, start, end);
}

function __rowWidth(row: RRowType): number {
  var result = 0;

  var nodes = row.nodes;
  var len = nodes.length;

  for (var i = 0; i < len; i++) {
    result += nodes[i].wcwidth;
  }

  return result;
}

function __rowText(row: RRowType): string {
  var rowText = '';
  for (var i = 0, len = row.nodes.length; i < len; i++) {
    rowText += row.nodes[i].txt;
  }

  return rowText;
}

hterm.Terminal.prototype.appendRows_ = function(count) {
  var cursorRow = this.screen_.rowsArray.length;
  var offset = this.scrollbackRows_.length + cursorRow;
  for (var i = 0; i < count; i++) {
    var row: RRowType = {
      number: offset + i,
      lineOverflow: false,
      v: 0,
      nodes: [__createRNode('', 0)],
    };
    this.screen_.pushRow(row);
  }

  var extraRows = this.screen_.rowsArray.length - this.screenSize.height;
  if (extraRows > 0) {
    var ary = this.screen_.shiftRows(extraRows);
    Array.prototype.push.apply(this.scrollbackRows_, ary);
    if (this.scrollPort_.isScrolledEnd) this.scheduleScrollDown_();
  }

  if (cursorRow >= this.screen_.rowsArray.length)
    cursorRow = this.screen_.rowsArray.length - 1;

  this.setAbsoluteCursorPosition(cursorRow, 0);
};

hterm.Terminal.prototype.eraseToRight = function(opt_count) {
  if (this.screen_.cursorPosition.overflow) return;

  var maxCount = this.screenSize.width - this.screen_.cursorPosition.column;
  var count = opt_count ? Math.min(opt_count, maxCount) : maxCount;

  if (
    this.screen_.textAttributes.background ===
    this.screen_.textAttributes.DEFAULT_COLOR
  ) {
    var cursorRow = this.screen_.rowsArray[this.screen_.cursorPosition.row];
    if (__rowWidth(cursorRow) <= this.screen_.cursorPosition.column + count) {
      this.screen_.deleteChars(count);
      this.clearCursorOverflow();
      __touch(cursorRow);
      this.scrollPort_.renderRef.touchRow(cursorRow);
      return;
    }
  }

  var cursor = this.saveCursor();
  this.screen_.overwriteString(lib.f.getWhitespace(count), count);
  this.restoreCursor(cursor);
  this.clearCursorOverflow();
};

hterm.Terminal.prototype.eraseAbove = function() {
  var cursor = this.saveCursor();

  this.eraseToLeft();

  for (var i = 0; i < cursor.row; i++) {
    this.setAbsoluteCursorPosition(i, 0);
    this.screen_.clearCursorRow();
    var cursorRow = this.screen_.cursorRow();
    if (cursorRow) {
      this.scrollPort_.renderRef.touchRow(cursorRow);
    }
  }

  this.restoreCursor(cursor);
  this.clearCursorOverflow();
};

hterm.Terminal.prototype.eraseLine = function() {
  var cursor = this.saveCursor();
  this.screen_.clearCursorRow();
  var cursorRow = this.screen_.cursorRow();
  if (cursorRow) {
    this.scrollPort_.renderRef.touchRow(cursorRow);
  }
  this.restoreCursor(cursor);
  this.clearCursorOverflow();
};

hterm.Terminal.prototype.clearHome = function(opt_screen) {
  var screen = opt_screen || this.screen_;
  var bottom = screen.getHeight();

  if (bottom == 0) {
    // Empty screen, nothing to do.
    return;
  }

  for (var i = 0; i < bottom; i++) {
    screen.setCursorPosition(i, 0);
    screen.clearCursorRow();
    var cursorRow = this.screen_.cursorRow();
    if (cursorRow) {
      this.scrollPort_.renderRef.touchRow(cursorRow);
    }
  }

  screen.setCursorPosition(0, 0);
};

hterm.Terminal.prototype.eraseBelow = function() {
  var cursor = this.saveCursor();

  this.eraseToRight();

  var bottom = this.screenSize.height - 1;
  for (var i = cursor.row + 1; i <= bottom; i++) {
    this.setAbsoluteCursorPosition(i, 0);
    this.screen_.clearCursorRow();
    var cursorRow = this.screen_.cursorRow();
    if (cursorRow) {
      this.scrollPort_.renderRef.touchRow(cursorRow);
    }
  }

  this.restoreCursor(cursor);
  this.clearCursorOverflow();
};

hterm.Terminal.prototype.print = function(str) {
  var startOffset = 0;

  var strWidth = lib.wc.strWidth(str);
  // Fun edge case: If the string only contains zero width codepoints (like
  // combining characters), we make sure to iterate at least once below.
  if (strWidth == 0 && str) strWidth = 1;

  while (startOffset < strWidth) {
    if (this.options_.wraparound && this.screen_.cursorPosition.overflow) {
      this.screen_.commitLineOverflow();
      this.newLine();
    }

    var count = strWidth - startOffset;
    var didOverflow = false;
    var substr;

    if (this.screen_.cursorPosition.column + count >= this.screenSize.width) {
      didOverflow = true;
      count = this.screenSize.width - this.screen_.cursorPosition.column;
    }

    if (didOverflow && !this.options_.wraparound) {
      // If the string overflowed the line but wraparound is off, then the
      // last printed character should be the last of the string.
      // TODO: This will add to our problems with multibyte UTF-16 characters.
      substr =
        lib.wc.substr(str, startOffset, count - 1) +
        lib.wc.substr(str, strWidth - 1);
      count = strWidth;
    } else {
      substr = lib.wc.substr(str, startOffset, count);
    }

    var tokens = hterm.TextAttributes.splitWidecharString(substr);
    for (var i = 0; i < tokens.length; i++) {
      this.screen_.textAttributes.wcNode = tokens[i].wcNode;
      this.screen_.textAttributes.asciiNode = tokens[i].asciiNode;

      if (this.options_.insertMode) {
        this.screen_.insertString(tokens[i].str, tokens[i].wcStrWidth);
      } else {
        this.screen_.overwriteString(tokens[i].str, tokens[i].wcStrWidth);
      }
      this.screen_.textAttributes.wcNode = false;
      this.screen_.textAttributes.asciiNode = true;
    }

    // Touch cursor row;
    var cursorRow = this.screen_.cursorRow();
    if (cursorRow) {
      this.scrollPort_.renderRef.touchRow(cursorRow);
    }

    this.screen_.maybeClipCurrentRow();
    startOffset += count;
  }

  this.scheduleSyncCursorPosition_();

  if (this.scrollOnOutput_)
    this.scrollPort_.scrollRowToBottom(this.getRowCount());
};

hterm.TextAttributes.prototype.resetColorPalette = function() {
  this.colorPalette = lib.colors.colorPalette.concat();

  if (!this._styleSheet) {
    var style = document.createElement('style');
    style.type = 'text/css';
    this.document_.getElementsByTagName('head')[0].appendChild(style);
    this._styleSheet = style;
  }
  this._styleSheet.innerHTML = __generateAttributesStyleSheet(this);
  this.syncColors();
};

hterm.TextAttributes.prototype.createNode = function(
  text: string,
  wcwidth: number | void,
): RNodeType {
  var attrs = __defaultAttributes();

  attrs.isDefault = this.isDefault();

  if (!attrs.isDefault) {
    attrs.wcNode = this.wcNode;
    attrs.asciiNode = this.asciiNode;

    if (this.uri) {
      attrs.uri = this.uri;
    }
    if (this.uriId) {
      attrs.uriId = this.uriId;
    }
  }

  if (wcwidth === undefined) {
    if (this.asciiNode) {
      wcwidth = text.length;
    } else {
      wcwidth = lib.wc.strWidth(text);
    }
  }

  attrs.className = this.className;

  return {
    v: 0,
    txt: text,
    wcwidth,
    key: __genNodeKey(),
    attrs,
  };
};

hterm.TextAttributes.prototype.reset = function() {
  this.foregroundSource = this.SRC_DEFAULT;
  this.backgroundSource = this.SRC_DEFAULT;
  this.underlineSource = this.SRC_DEFAULT;
  this.foreground = this.DEFAULT_COLOR;
  this.background = this.DEFAULT_COLOR;
  this.underlineColor = this.DEFAULT_COLOR;
  this.bold = false;
  this.faint = false;
  this.italic = false;
  this.blink = false;
  this.underline = false;
  this.strikethrough = false;
  this.inverse = false;
  this.invisible = false;
  this.wcNode = false;
  this.asciiNode = true;
  this.uri = null;
  this.uriId = null;
  this.className == __defaultClassName;
};

hterm.TextAttributes.prototype.syncColors = function() {
  function getBrightIndex(i) {
    if (i < 8) {
      // If the color is from the lower half of the ANSI 16, add 8.
      return i + 8;
    }

    // If it's not from the 16 color palette, ignore bold requests.  This
    // matches the behavior of gnome-terminal.
    return i;
  }

  var foregroundSource = this.foregroundSource;
  var backgroundSource = this.backgroundSource;
  var defaultForeground = this.DEFAULT_COLOR;
  var defaultBackground = this.DEFAULT_COLOR;

  if (this.inverse) {
    foregroundSource = this.backgroundSource;
    backgroundSource = this.foregroundSource;
    // We can't inherit the container's color anymore.
    defaultForeground = this.defaultBackground;
    defaultBackground = this.defaultForeground;
  }

  if (this.enableBoldAsBright && this.bold) {
    if (Number.isInteger(foregroundSource)) {
      foregroundSource = getBrightIndex(foregroundSource);
    }
  }

  if (foregroundSource === this.SRC_DEFAULT) {
    this.foreground = defaultForeground;
  } else {
    this.foreground = foregroundSource;
  }

  if (this.faint) {
    if (Number.isInteger(this.foreground)) {
      this.foreground = this.colorPalette[this.foreground];
    }
    var colorToMakeFaint =
      this.foreground == this.DEFAULT_COLOR
        ? this.defaultForeground
        : this.foreground;
    this.foreground = lib.colors.mix(colorToMakeFaint, 'rgb(0, 0, 0)', 0.3333);
  }

  if (backgroundSource === this.SRC_DEFAULT) {
    this.background = defaultBackground;
  } else {
    this.background = backgroundSource;
  }

  // Process invisible settings last to keep it simple.
  if (this.invisible) {
    this.foreground = this.background;
  }

  if (this.underlineSource === this.SRC_DEFAULT) {
    this.underlineColor = this.DEFAULT_COLOR;
  } else {
    this.underlineColor = this.underlineSource;
  }

  this.className = __generateClassName(this);
};

var __c = []; // foreground color
var __fc = []; // faint foreground color
var __bc = []; // background color
var __uc = []; // underline color
var __b = 'b'; // bold
var __bl = 'bl'; // blink
var __s = 's'; // blink
var __u = {
  solid: 'u1',
  double: 'u2',
  wavy: 'u3',
  dotted: 'u4',
  dashed: 'u5',
}; // underline
var __i = 'i'; // italic
var __invisible = 'invbl'; // invisible
var __wc = 'wc'; // widechar

for (var i = 0; i < 256; i++) {
  var index = i.toString(16);

  __c[i] = 'c' + index;
  __fc[i] = 'fc' + index;
  __bc[i] = 'bc' + index;
  __uc[i] = 'uc' + index;
}

function __generateAttributesStyleSheet(attrs: hterm.TextAttributes): string {
  var rows = [];
  for (var i = 0; i < 256; i++) {
    var index = i.toString(16);
    var color = attrs.colorPalette[i];
    rows.push('.c' + index + ' { color: ' + color + ';}');
    rows.push('.fc' + index + ' { color: ' + color + ';}');
    rows.push('.bc' + index + ' { background: ' + color + ';}');
    rows.push('.uc' + index + ' { text-decoration-color: ' + color + ';}');
  }
  rows.push('.u { text-decoration: underline;}');
  //solid: 'u1',
  //double: 'u2',
  //wavy: 'u3',
  //dotted: 'u4',
  //dashed: 'u5',
  rows.push('.b { font-weight: bold;}');
  rows.push('.i { font-style: italic;}');
  for (var i = 0; i < 500; i++) {
    rows.push(
      '.wc' +
        i +
        ' { display: inline-block; overflow-x:hidden; width: calc(var(--hterm-charsize-width) * ' +
        i +
        ');}',
    );
  }
  return rows.join('\n');
}

var __classNameMemory = new Map();

function __generateClassName(attrs: hterm.TextAttributes): string {
  var result = [];

  if (attrs.foreground < 256 && attrs.foreground != '') {
    result.push(__c[attrs.foreground]);
  }
  if (attrs.background < 256 && attrs.background != '') {
    result.push(__bc[attrs.background]);
  }
  if (attrs.underlineColor < 256 && attrs.underlineColor != '') {
    result.push(__uc[attrs.underlineColor]);
  }

  if (attrs.enableBold && attrs.bold) {
    result.push(__b);
  }
  if (attrs.italic) {
    result.push(__i);
  }
  if (attrs.blink) {
    result.push(__bl);
  }
  if (attrs.underline) {
    result.push(__u[attrs.underline]);
  }
  if (attrs.strikethrough) {
    result.push(__s);
  }
  if (attrs.invisible) {
    result.push(__invisible);
  }

  if (result.length) {
    var name = result.join(' ');
    var cached = __classNameMemory.get(name);
    if (cached) {
      return cached;
    }
    if (__classNameMemory.size < 1000) {
      __classNameMemory.set(name, name);
    }
    return name;
  }
  return __defaultClassName;
}

hterm.TextAttributes.prototype.matchesNode = function(
  node: RNodeType,
): boolean {
  var attrs = node.attrs;

  if (attrs.isDefault) {
    return this.isDefault();
  }

  // We don't want to put multiple characters in a wcNode or a tile.
  // See the comments in createNode.
  // For attributes that default to false, we do not require that obj have them
  // declared, so always normalize them using !! (to turn undefined into false)
  // in the compares below.
  return (
    !(this.wcNode || attrs.wcNode) &&
    !(this.tileData != null || attrs.tileData) &&
    this.uriId === attrs.uriId &&
    this.className === attrs.className
  );
};

export default class RScreen {
  rowsArray: RRowType[];
  _columnCount: number;
  textAttributes: hterm.TextAttributes;
  _cursorState: hterm.Screen.CursorState;

  cursorPosition: hterm.RowCol;

  _cursorRowIdx: number;
  _cursorNodeIdx: number;
  _cursorOffset: number;

  wordBreakMatchLeft: ?RegExp;
  wordBreakMatchRight: ?RegExp;
  wordBreakMatchMiddle: ?RegExp;

  constructor(columnCount: number = 80) {
    this._columnCount = columnCount;
    this._cursorRowIdx = 0;
    this._cursorNodeIdx = 0;
    this._cursorOffset = 0;

    this.wordBreakMatchLeft = null;
    this.wordBreakMatchRight = null;
    this.wordBreakMatchMiddle = null;

    this.textAttributes = new hterm.TextAttributes(window.document);
    this._cursorState = new hterm.Screen.CursorState(this);
    this.cursorPosition = new hterm.RowCol(0, 0);

    this.rowsArray = [];
  }

  getSize(): hterm.Size {
    return new hterm.Size(this._columnCount, this.rowsArray.length);
  }

  getHeight(): number {
    return this.rowsArray.length;
  }

  getWidth(): number {
    return this._columnCount;
  }

  setColumnCount(count: number) {
    this._columnCount = count;

    if (this.cursorPosition.column >= count) {
      this.setCursorPosition(this.cursorPosition.row, count - 1);
    }
  }

  shiftRow() {
    return this.shiftRows(1)[0];
  }

  shiftRows(count: number) {
    return this.rowsArray.splice(0, count);
  }

  unshiftRow(row: RRowType) {
    this.rowsArray.splice(0, 0, row);
  }

  unshiftRows(rows: RRowType[]) {
    this.rowsArray.unshift.apply(this.rowsArray, rows);
  }

  popRow() {
    return this.popRows(1)[0];
  }

  popRows(count: number) {
    return this.rowsArray.splice(this.rowsArray.length - count, count);
  }

  pushRow(row: RRowType) {
    this.rowsArray.push(row);
  }

  pushRows(rows: RRowType[]) {
    this.rowsArray.push.apply(this.rowsArray, rows);
  }

  insertRows(index: number, rows: RRowType[]) {
    for (var i = 0, len = rows.length; i < len; i++) {
      this.rowsArray.splice(index + i, 0, rows[i]);
    }
  }

  removeRow(index: number) {
    return this.rowsArray.splice(index, 1)[0];
  }

  removeRows = function(index: number, count: number) {
    return this.rowsArray.splice(index, count);
  };

  invalidateCursorPosition() {
    this.cursorPosition.move(0, 0);
    this._cursorRowIdx = 0;
    this._cursorNodeIdx = 0;
    this._cursorOffset = 0;
  }

  clearCursorRow() {
    this._cursorOffset = 0;
    this.cursorPosition.column = 0;
    this.cursorPosition.overflow = false;

    var text;
    if (this.textAttributes.isDefault()) {
      text = '';
    } else {
      text = lib.f.getWhitespace(this._columnCount);
    }

    // We shouldn't honor inverse colors when clearing an area, to match
    // xterm's back color erase behavior.
    var inverse = this.textAttributes.inverse;
    this.textAttributes.inverse = false;
    this.textAttributes.syncColors();

    var node = this.textAttributes.createNode(text, text.length);
    var row = this.rowsArray[this._cursorRowIdx];
    row.nodes = [node];
    row.lineOverflow = false;
    __touch(row);
    this._cursorNodeIdx = 0;

    this.textAttributes.inverse = inverse;
    this.textAttributes.syncColors();
  }

  commitLineOverflow() {
    var row = this.rowsArray[this._cursorRowIdx];
    row.lineOverflow = true;
    __touch(row);
  }

  setCursorPosition(row: number, column: number) {
    if (!this.rowsArray.length) {
      console.warn('Attempt to set cursor position on empty screen.');
      return;
    }

    if (row >= this.rowsArray.length) {
      console.error('Row out of bounds: ' + row);
      row = this.rowsArray.length - 1;
    } else if (row < 0) {
      console.error('Row out of bounds: ' + row);
      row = 0;
    }

    if (column >= this._columnCount) {
      console.error('Column out of bounds: ' + column);
      column = this._columnCount - 1;
    } else if (column < 0) {
      console.error('Column out of bounds: ' + column);
      column = 0;
    }

    this.cursorPosition.overflow = false;

    var rowNode = this.rowsArray[row];
    var node = rowNode.nodes[0];
    var nodeIdx = 0;

    if (!node) {
      node = __createRNode('', 0);
      rowNode.nodes = [node];
      __touch(rowNode);
    }

    var currentColumn = 0;

    if (row === this._cursorRowIdx) {
      if (column >= this.cursorPosition.column - this._cursorOffset) {
        nodeIdx = this._cursorNodeIdx;
        node = rowNode.nodes[nodeIdx];
        currentColumn = this.cursorPosition.column - this._cursorOffset;
      }
    } else {
      this._cursorRowIdx = row;
    }

    this.cursorPosition.move(row, column);

    while (node) {
      var offset = column - currentColumn;
      if (!rowNode.nodes[nodeIdx + 1] || node.wcwidth > offset) {
        this._cursorNodeIdx = nodeIdx;
        this._cursorOffset = offset;
        return;
      }

      currentColumn += node.wcwidth;
      node = rowNode.nodes[++nodeIdx];
    }
  }

  syncSelectionCaret(selection: any) {
    // TODO:
    //try {
    //selection.collapse(this.cursorNode_, this.cursorOffset_);
    //} catch (firefoxIgnoredException) {
    //// FF can throw an exception if the range is off, rather than just not
    //// performing the collapse.
    //}
  }

  _splitNode(node: RNodeType, offset: number): RNodeType[] {
    var afterNode: RNodeType = {
      key: __genNodeKey(),
      txt: node.txt,
      wcwidth: node.wcwidth,
      attrs: node.attrs,
      v: 0,
    };

    node.v++;

    var txt = node.txt;
    node.txt = __nodeSubstr(node, 0, offset);
    node.wcwidth = offset;
    afterNode.txt = lib.wc.substr(txt, offset);
    afterNode.wcwidth = lib.wc.strWidth(txt);

    var nodes = [];

    if (node.wcwidth) {
      nodes.push(node);
    }

    if (afterNode.wcwidth) {
      nodes.push(afterNode);
    }

    return nodes;
  }

  cursorRow(): RRowType {
    return this.rowsArray[this._cursorRowIdx];
  }

  maybeClipCurrentRow() {
    var cursorRow = this.cursorRow();
    var width = __rowWidth(cursorRow);

    if (width <= this._columnCount) {
      // Current row does not need clipping, but may need clamping.
      if (this.cursorPosition.column >= this._columnCount) {
        this.setCursorPosition(this.cursorPosition.row, this._columnCount - 1);
        this.cursorPosition.overflow = true;
      }

      return;
    }

    // Save off the current column so we can maybe restore it later.
    var currentColumn = this.cursorPosition.column;

    // Move the cursor to the final column.
    this.setCursorPosition(this.cursorPosition.row, this._columnCount - 1);

    // Remove any text that partially overflows.
    var cursorNode = this.rowsArray[this._cursorRowIdx].nodes[
      this._cursorNodeIdx
    ];
    width = cursorNode.wcwidth;

    if (this._cursorOffset < width - 1) {
      __setNodeText(
        cursorNode,
        __nodeSubstr(cursorNode, 0, this._cursorOffset),
      );
    }

    // Remove all nodes after the cursor.
    cursorRow.nodes.splice(this._cursorNodeIdx + 1);

    if (currentColumn < this._columnCount) {
      // If the cursor was within the screen before we started then restore its
      // position.
      this.setCursorPosition(this.cursorPosition.row, currentColumn);
    } else {
      // Otherwise leave it at the the last column in the overflow state.
      this.cursorPosition.overflow = true;
    }
  }

  insertString(str: string, wcwidth: number) {
    var cursorRow = this.rowsArray[this._cursorRowIdx];
    var cursorNode = cursorRow.nodes[this._cursorNodeIdx];

    var cursorNodeText = cursorNode.txt;

    cursorRow.lineOverflow = false;

    // No matter what, before this function exits the cursor column will have
    // moved this much.
    this.cursorPosition.column += wcwidth;

    // Local cache of the cursor offset.
    var offset = this._cursorOffset;

    // Reverse offset is the offset measured from the end of the string.
    // Zero implies that the cursor is at the end of the cursor node.
    var reverseOffset = cursorNode.wcwidth - offset;

    if (reverseOffset < 0) {
      // A negative reverse offset means the cursor is positioned past the end
      // of the characters on this line.  We'll need to insert the missing
      // whitespace.
      var ws = lib.f.getWhitespace(-reverseOffset);

      // This whitespace should be completely unstyled.  Underline, background
      // color, and strikethrough would be visible on whitespace, so we can't use
      // one of those spans to hold the text.
      if (
        !(
          this.textAttributes.underline ||
          this.textAttributes.strikethrough ||
          this.textAttributes.background ||
          this.textAttributes.wcNode ||
          !this.textAttributes.asciiNode ||
          this.textAttributes.tileData != null
        )
      ) {
        // Best case scenario, we can just pretend the spaces were part of the
        // original string.
        str = ws + str;
      } else if (
        cursorNode.attrs.isDefault ||
        !(
          cursorNode.attrs.underline ||
          cursorNode.attrs.strikethrough ||
          cursorNode.attrs.background ||
          cursorNode.attrs.wcNode ||
          !cursorNode.attrs.asciiNode ||
          cursorNode.attrs.tileData != null
        )
      ) {
        // Second best case, the current node is able to hold the whitespace.
        __setNodeText(cursorNode, (cursorNodeText += ws));
      } else {
        // Worst case, we have to create a new node to hold the whitespace.
        var wsNode = __createRNode(ws, ws.length);
        cursorRow.nodes.splice(this._cursorNodeIdx, 0, wsNode);
        cursorNode = wsNode;
        this._cursorOffset = offset = -reverseOffset;
        cursorNodeText = ws;
      }

      // We now know for sure that we're at the last character of the cursor node.
      reverseOffset = 0;
    }

    if (this.textAttributes.matchesNode(cursorNode)) {
      // The new text can be placed directly in the cursor node.
      if (reverseOffset == 0) {
        __setNodeText(cursorNode, cursorNodeText + str);
      } else if (offset == 0) {
        __setNodeText(cursorNode, str + cursorNodeText);
      } else {
        var s =
          __nodeSubstr(cursorNode, 0, offset) +
          str +
          __nodeSubstr(cursorNode, offset);

        __setNodeText(cursorNode, s);
      }

      this._cursorOffset += wcwidth;
      return;
    }

    // The cursor node is the wrong style for the new text.  If we're at the
    // beginning or end of the cursor node, then the adjacent node is also a
    // potential candidate.

    if (offset == 0) {
      // At the beginning of the cursor node, the check the previous sibling.
      var previousSibling = cursorRow.nodes[this._cursorNodeIdx - 1];
      if (previousSibling && this.textAttributes.matchesNode(previousSibling)) {
        __setNodeText(previousSibling, previousSibling.txt + str);
        this._cursorNodeIdx = this._cursorNodeIdx - 1;
        this._cursorOffset = previousSibling.wcwidth;
        return;
      }

      var newNode = this.textAttributes.createNode(str, wcwidth);
      cursorRow.nodes.splice(this._cursorNodeIdx, 0, newNode);
      this._cursorOffset = wcwidth;
      return;
    }

    if (reverseOffset == 0) {
      // At the end of the cursor node, the check the next sibling.
      var nextSibling = cursorRow.nodes[this._cursorNodeIdx + 1];
      if (nextSibling && this.textAttributes.matchesNode(nextSibling)) {
        __setNodeText(nextSibling, str + nextSibling.txt);
        this._cursorNodeIdx++;
        this._cursorOffset = lib.wc.strWidth(str);
        return;
      }

      var newNode = this.textAttributes.createNode(str, wcwidth);
      cursorRow.nodes.splice(this._cursorNodeIdx + 1, 0, newNode);
      this._cursorNodeIdx++;
      // We specifically need to include any missing whitespace here, since it's
      // going in a new node.
      this._cursorOffset = newNode.wcwidth;
      return;
    }

    // Worst case, we're somewhere in the middle of the cursor node.  We'll
    // have to split it into two nodes and insert our new container in between.
    var nodes = this._splitNode(cursorNode, offset);
    var newNode = this.textAttributes.createNode(str);
    this._cursorNodeIdx++;
    cursorRow.nodes.splice(this._cursorNodeIdx, 0, newNode, nodes[1]);
    this._cursorNodeIdx++;
    this._cursorOffset = 0;
  }

  overwriteString(str: string, wcwidth: number) {
    var maxLength = this._columnCount - this.cursorPosition.column;
    if (!maxLength) return [str];

    var cursorRowNode = this.rowsArray[this._cursorRowIdx];
    var cursorNode = cursorRowNode.nodes[this._cursorNodeIdx];

    if (
      this.textAttributes.matchesNode(cursorNode) &&
      cursorNode.txt.substr(this._cursorOffset) === str
    ) {
      // This overwrite would be a no-op, just move the cursor and return.
      this._cursorOffset += wcwidth;
      this.cursorPosition.column += wcwidth;
      return;
    }

    this.insertString(str, wcwidth);
    this.deleteChars(wcwidth);
    __touch(cursorRowNode);
  }

  deleteChars(count: number) {
    var cursorRowNode = this.rowsArray[this._cursorRowIdx];
    var spliceIdx = this._cursorNodeIdx;
    var spliceDeleteCount = 0;
    var offset = this._cursorOffset;
    var len = cursorRowNode.nodes.length;
    var rv = count;

    for (var nodeIdx = this._cursorNodeIdx; nodeIdx < len; nodeIdx++) {
      if (count < 0) {
        console.error(`Deleting ${rv} chars went negative: ${count}`);
        break;
      }

      var node = cursorRowNode.nodes[nodeIdx];

      var startWidth = node.wcwidth;

      if (offset > 0) {
        if (startWidth - offset === count) {
          __setNodeText(node, __nodeSubstr(node, 0, offset));
          return rv;
        }

        if (startWidth - offset > count) {
          __setNodeText(
            node,
            __nodeSubstr(node, 0, offset) + __nodeSubstr(node, offset + count),
          );
          return rv;
        }

        __setNodeText(node, __nodeSubstr(node, 0, offset));
        var isLastNode = !cursorRowNode.nodes[nodeIdx + 1];
        if (isLastNode) {
          return rv;
        }

        count -= startWidth - offset;
        offset = 0;
        spliceIdx++;
        continue;
      }

      // offset === 0

      // Just remove node
      if (startWidth <= count) {
        spliceDeleteCount++;
        count -= startWidth;
        continue;
      }

      // last modification
      __setNodeText(node, __nodeSubstr(node, count));
      break;
    }

    if (spliceDeleteCount === 0) {
      return rv;
    }

    cursorRowNode.nodes.splice(spliceIdx, spliceDeleteCount);

    if (spliceIdx > this._cursorNodeIdx) {
      return rv;
    }

    // We deleted cursor.

    len = cursorRowNode.nodes.length;
    if (len === 0) {
      cursorRowNode.nodes = [__createRNode('', 0)];
      this._cursorNodeIdx = 0;
      this._cursorOffset = 0;
      return rv;
    }

    if (len >= this._cursorNodeIdx) {
      this._cursorNodeIdx = len - 1;
      this._cursorOffset = cursorRowNode.nodes[len - 1].wcwidth;
      return rv;
    }

    this._cursorOffset = 0;

    return rv;
  }

  _getLineStartRow(row: RRowType): RRowType {
    var rowIdx = this.rowsArray.indexOf(row);
    if (rowIdx <= 0) {
      return row;
    }

    while (
      this.rowsArray[rowIdx - 1] &&
      this.rowsArray[rowIdx - 1].lineOverflow
    ) {
      row = this.rowsArray[rowIdx - 1];
      rowIdx--;
    }
    return row;
  }

  _getLineText(row: RRowType): string {
    var rowText = '';
    var rowIdx = this.rowsArray.indexOf(row);
    if (rowIdx < 0) {
      return __rowText(row);
    }
    while (row) {
      rowText += __rowText(row);
      if (row.lineOverflow) {
        row = this.rowsArray[rowIdx];
        rowIdx++;
      } else {
        break;
      }
    }
    return rowText;
  }

  getXRowAncestor_ = function(node: any) {
    while (node) {
      if (node.nodeName === 'X-ROW') break;
      node = node.parentNode;
    }
    return node;
  };

  getPositionWithOverflow_(row: any, node: any, offset: any) {
    return 0;
  }
  getPositionWithinRow_(row: any, node: any, offset: any) {
    return 0;
  }
  getNodeAndOffsetWithOverflow_ = function(row: any, position: any) {
    return -1;
  };
  getNodeAndOffsetWithinRow_ = function(row: any, position: any) {
    return null;
  };
  setRange_(row: any, start: any, end: any, range: any) {}
  expandSelection(selection: any) {}

  saveCursorAndState(vt: any) {
    //    this._cursorState.save(vt);
  }

  restoreCursorAndState(vt: any) {
    //this._cursorState.restore(vt);
  }
}

RScreen.CursorState = hterm.Screen.CursorState;

hterm.Screen = RScreen;
