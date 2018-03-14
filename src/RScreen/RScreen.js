// @flow

import React, { Component } from 'react';
import type { RRowType, RNodeType, RAttributesType } from './model';
import RRow from './RRow';
import hterm from '../../libapps/hterm/dist/js/hterm_all.js';

type PropsType = {};

type StateType = {
  rows: RRowType[],
  columnCount: number,
};

var __nodeKey = 0;

function __findReactComponent(el) {
  for (const key in el) {
    if (key.startsWith('__reactInternalInstance$')) {
      const fiberNode = el[key];

      return fiberNode && fiberNode.return && fiberNode.return.stateNode;
    }
  }
  return null;
}

function __defaultAttributes(): RAttributesType {
  return {
    foreground: null,
    background: null,
    underlineColor: null,
    bold: false,
    faint: false,
    italic: false,
    blink: false,
    underline: false,
    strikethrough: false,
    inverse: false,
    invisible: false,
    wcNode: false,
    asciiNode: true,
    uri: null,
    uriId: null,
  };
}

function __touch(n: RRowType | RNodeType) {
  n.v = (n.v + 1) % 10000;
}

function __genNodeKey(): string {
  return (__nodeKey++ % 1000000).toString();
}

function __setNodeText(node: RNodeType, text) {
  node.txt = text;
  if (node.attrs.ascii) {
    node.wcwidth = text.length;
  } else {
    node.wcwidth = hterm.lib.wc.strWidth(text);
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
  if (node.attrs.ascii) {
    return node.txt.substr(start, width);
  }
  return hterm.lib.wc.substr(node.txt, start, width);
}

function __nodeSubstring(node: RNodeType, start: number, end: number) {
  if (node.attrs.ascii) {
    return node.txt.substring(start, end);
  }
  return hterm.lib.wc.substring(node.txt, start, end);
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
  for (var i = 0; i < row.nodes.length; i++) {
    rowText += row.nodes[i].txt;
  }

  return rowText;
}

hterm.TextAttributes.prototype.createNode = function(
  text: string,
  wcwidth: number | void,
): RNodeType {
  var attrs = __defaultAttributes();

  attrs.foreground = this.foreground;
  attrs.background = this.background;
  attrs.underlineColor = this.underlineColor;
  attrs.bold = this.bold;
  attrs.faint = this.faint;
  attrs.italic = this.italic;
  attrs.blink = this.blink;
  attrs.underline = this.underline;
  attrs.strikethrough = this.strikethrough;
  attrs.inverse = this.inverse;
  attrs.invisible = this.invisible;
  attrs.wcNode = this.wcNode;
  attrs.asciiNode = this.asciiNode;
  attrs.uri = this.uri;
  attrs.uriId = this.uriId;

  if (wcwidth === undefined) {
    if (this.asciiNode) {
      wcwidth = text.length;
    } else {
      wcwidth = hterm.lib.wc.strWidth(text);
    }
  }

  return {
    v: 0,
    txt: text,
    wcwidth,
    key: __genNodeKey(),
    attrs,
  };
};

hterm.TextAttributes.prototype.matchesNode = function(
  node: RNodeType,
): boolean {
  var attrs = node.attrs;

  // We don't want to put multiple characters in a wcNode or a tile.
  // See the comments in createContainer.
  // For attributes that default to false, we do not require that obj have them
  // declared, so always normalize them using !! (to turn undefined into false)
  // in the compares below.
  return (
    !(this.wcNode || attrs.wcNode) &&
    this.asciiNode === attrs.asciiNode &&
    !(this.tileData != null || attrs.tileData) &&
    this.uriId === attrs.uriId &&
    this.foreground === attrs.foreground &&
    this.background == attrs.background &&
    this.underlineColor == attrs.underlineColor &&
    (this.enableBold && this.bold) == this.bold &&
    this.blink == attrs.blink &&
    this.italic == attrs.italic &&
    this.underline == attrs.underline &&
    !!this.strikethrough == !!attrs.strikethrough
  );
};

export default class RScreen extends Component<PropsType, StateType> {
  _textAttributes: hterm.TextAttributes;
  _cursorState: hterm.Screen.CursorState;

  cursorPosition: hterm.RowCol;

  _cursorRowIdx: number;
  _cursorNodeIdx: number;
  _cursorOffset: number;

  wordBreakMatchLeft: ?RegExp;
  wordBreakMatchRight: ?RegExp;
  wordBreakMatchMiddle: ?RegExp;

  constructor(props: PropsType) {
    super();

    this._cursorRowIdx = 0;
    this._cursorNodeIdx = 0;
    this._cursorOffset = 0;

    this.wordBreakMatchLeft = null;
    this.wordBreakMatchRight = null;
    this.wordBreakMatchMiddle = null;

    this._textAttributes = new hterm.TextAttributes(window.document);
    this._cursorState = new hterm.Screen.CursorState(this);

    this.state = { rows: [], columnCount: 80 };
  }

  _renderRow = (r: RRowType) => <RRow key={r.number} row={r} />;

  render() {
    const rows = this.state.rows.map(this._renderRow);
    return <x-screen>{rows}</x-screen>;
  }

  getSize(): hterm.Size {
    return new hterm.Size(this.state.columnCount, this.state.rows.length);
  }

  getHeight(): number {
    return this.state.rows.length;
  }

  getWidth(): number {
    return this.state.columnCount;
  }

  setColumnCount(count: number) {
    this.setState({ columnCount: count });

    if (this.cursorPosition.column >= count) {
      this.setCursorPosition(this.cursorPosition.row, count - 1);
    }
  }

  shiftRow() {
    return this.shiftRows(1)[0];
  }

  shiftRows(count: number) {
    return this.state.rows.splice(0, count);
  }

  unshiftRow(row: RRowType) {
    this.state.rows.splice(0, 0, row);
  }

  unshiftRows(rows: RRowType[]) {
    this.state.rows.unshift.apply(this.state.rows, rows);
  }

  popRow() {
    return this.popRows(1)[0];
  }

  popRows(count: number) {
    return this.state.rows.splice(this.state.rows.length - count, count);
  }

  pushRow(row: RRowType) {
    this.state.rows.push(row);
  }

  pushRows(rows: RRowType[]) {
    this.state.rows.push.apply(this.state.rows, rows);
  }

  insertRows(index: number, rows: RRowType[]) {
    for (var i = 0, len = rows.length; i < len; i++) {
      this.state.rows.splice(index + i, 0, rows[i]);
    }
  }

  removeRow(index: number) {
    return this.state.rows.splice(index, 1)[0];
  }

  removeRows = function(index: number, count: number) {
    return this.state.rows.splice(index, count);
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
    if (this._textAttributes.isDefault()) {
      text = '';
    } else {
      text = hterm.lib.f.getWhitespace(this.state.columnCount);
    }

    // We shouldn't honor inverse colors when clearing an area, to match
    // xterm's back color erase behavior.
    var inverse = this._textAttributes.inverse;
    this._textAttributes.inverse = false;
    this._textAttributes.syncColors();

    var node = this._textAttributes.createNode(text, text.length);
    var row = this.state.rows[this._cursorRowIdx];
    row.nodes = [node];
    row.lineOverflow = false;
    __touch(row);
    this._cursorNodeIdx = 0;

    this._textAttributes.inverse = inverse;
    this._textAttributes.syncColors();
  }

  commitLineOverflow() {
    var row = this.state.rows[this._cursorRowIdx];
    row.lineOverflow = true;
    __touch(row);
  }

  setCursorPosition(row: number, column: number) {
    if (!this.state.rows.length) {
      console.warn('Attempt to set cursor position on empty screen.');
      return;
    }

    if (row >= this.state.rows.length) {
      console.error('Row out of bounds: ' + row);
      row = this.state.rows.length - 1;
    } else if (row < 0) {
      console.error('Row out of bounds: ' + row);
      row = 0;
    }

    if (column >= this.state.columnCount) {
      console.error('Column out of bounds: ' + column);
      column = this.state.columnCount - 1;
    } else if (column < 0) {
      console.error('Column out of bounds: ' + column);
      column = 0;
    }

    this.cursorPosition.overflow = false;

    var rowNode = this.state.rows[row];
    var node = rowNode.nodes[0];
    var nodeIdx = 0;

    if (!node) {
      node = __createRNode('', 0);
      rowNode.nodes = [node];
      __touch(rowNode);
    }

    var currentColumn = 0;

    if (row == this._cursorRowIdx) {
      if (column >= this.cursorPosition.column - this._cursorOffset) {
        nodeIdx = this._cursorNodeIdx;
        currentColumn = this.cursorPosition.column - this._cursorOffset;
      }
    } else {
      this._cursorRowIdx = row;
    }

    this.cursorPosition.move(row, column);

    while (node) {
      var offset = column - currentColumn;
      var width = node.wcwidth;
      if (!rowNode[nodeIdx + 1] || width > offset) {
        this._cursorNodeIdx = nodeIdx;
        this._cursorOffset = offset;
        return;
      }

      currentColumn += width;
      node = rowNode[nodeIdx++];
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
    afterNode.txt = hterm.lib.wc.substr(txt, offset);
    afterNode.wcwidth = hterm.lib.wc.strWidth(txt);

    var nodes = [];

    if (node.wcwidth) {
      nodes.push(node);
    }

    if (afterNode.wcwidth) {
      nodes.push(afterNode);
    }

    return nodes;
  }

  maybeClipCurrentRow() {
    var cursorRow = this.state.rows[this._cursorRowIdx];
    var width = __rowWidth(cursorRow);

    if (width <= this.state.columnCount) {
      // Current row does not need clipping, but may need clamping.
      if (this.cursorPosition.column >= this.state.columnCount) {
        this.setCursorPosition(
          this.cursorPosition.row,
          this.state.columnCount - 1,
        );
        this.cursorPosition.overflow = true;
      }

      return;
    }

    // Save off the current column so we can maybe restore it later.
    var currentColumn = this.cursorPosition.column;

    // Move the cursor to the final column.
    this.setCursorPosition(this.cursorPosition.row, this.state.columnCount - 1);

    // Remove any text that partially overflows.
    var cursorNode = this.state.rows[this._cursorRowIdx].nodes[
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

    if (currentColumn < this.state.columnCount) {
      // If the cursor was within the screen before we started then restore its
      // position.
      this.setCursorPosition(this.cursorPosition.row, currentColumn);
    } else {
      // Otherwise leave it at the the last column in the overflow state.
      this.cursorPosition.overflow = true;
    }
  }

  insertString(str: string, wcwidth: number) {
    var cursorRow = this.state.rows[this._cursorRowIdx];
    var cursorNode = cursorRow[this._cursorNodeIdx];

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
      var ws = hterm.lib.f.getWhitespace(-reverseOffset);

      // This whitespace should be completely unstyled.  Underline, background
      // color, and strikethrough would be visible on whitespace, so we can't use
      // one of those spans to hold the text.
      if (
        !(
          this._textAttributes.underline ||
          this._textAttributes.strikethrough ||
          this._textAttributes.background ||
          this._textAttributes.wcNode ||
          !this._textAttributes.asciiNode ||
          this._textAttributes.tileData != null
        )
      ) {
        // Best case scenario, we can just pretend the spaces were part of the
        // original string.
        str = ws + str;
      } else if (
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

    if (this._textAttributes.matchesNode(cursorNode)) {
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
      if (
        previousSibling &&
        this._textAttributes.matchesNode(previousSibling)
      ) {
        __setNodeText(previousSibling, previousSibling.txt + str);
        this._cursorNodeIdx = this._cursorNodeIdx - 1;
        this._cursorOffset = previousSibling.wcwidth;
        return;
      }

      var newNode = this._textAttributes.createNode(str, wcwidth);
      cursorRow.nodes.splice(this._cursorNodeIdx, 0, newNode);
      this._cursorOffset = wcwidth;
      return;
    }

    if (reverseOffset == 0) {
      // At the end of the cursor node, the check the next sibling.
      var nextSibling = cursorRow.nodes[this._cursorNodeIdx + 1];
      if (nextSibling && this._textAttributes.matchesNode(nextSibling)) {
        __setNodeText(nextSibling, str + nextSibling.txt);
        this._cursorNodeIdx++;
        this._cursorOffset = hterm.lib.wc.strWidth(str);
        return;
      }

      var newNode = this._textAttributes.createNode(str);
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
    var newNode = this._textAttributes.createContainer(str);
    this._cursorNodeIdx++;
    cursorRow.nodes.splice(this._cursorNodeIdx, 0, nodes[1], newNode);
    this._cursorOffset = wcwidth;
  }

  overwriteString(str: string, wcwidth: number) {
    var maxLength = this.state.columnCount - this.cursorPosition.column;
    if (!maxLength) return [str];

    var cursorRowNode = this.state.rows[this._cursorRowIdx];
    var cursorNode = cursorRowNode.nodes[this._cursorNodeIdx];

    if (
      this._textAttributes.matchesNode(cursorNode) &&
      cursorNode.txt.substr(this._cursorOffset) == str
    ) {
      // This overwrite would be a no-op, just move the cursor and return.
      this._cursorOffset += wcwidth;
      this.cursorPosition.column += wcwidth;
      return;
    }

    this.deleteChars(Math.min(wcwidth, maxLength));
    this.insertString(str, wcwidth);
    __touch(cursorRowNode);
  }

  deleteChars(count: number) {
    var cursorRowNode = this.state.rows[this._cursorRowIdx];

    var nodeIdx = this._cursorNodeIdx;
    var node = cursorRowNode.nodes[nodeIdx];
    var offset = this._cursorOffset;

    var currentCursorColumn = this.cursorPosition.column;
    count = Math.min(count, this.state.columnCount - currentCursorColumn);
    if (!count) return 0;

    var rv = count;
    var startLength, endLength;

    while (node && count) {
      // Sanity check so we don't loop forever, but we don't also go quietly.
      if (count < 0) {
        console.error(`Deleting ${rv} chars went negative: ${count}`);
        break;
      }

      startLength = node.wcwidth;
      __setNodeText(
        node,
        __nodeSubstr(node, 0, offset) + __nodeSubstr(node, offset + count),
      );
      endLength = node.wcwidth;

      // Deal with splitting wide characters.  There are two ways: we could delete
      // the first column or the second column.  In both cases, we delete the wide
      // character and replace one of the columns with a space (since the other
      // was deleted).  If there are more chars to delete, the next loop will pick
      // up the slack.
      if (
        node.attrs.wcNode &&
        offset < startLength &&
        ((endLength && startLength == endLength) || (!endLength && offset == 1))
      ) {
        // No characters were deleted when there should be.  We're probably trying
        // to delete one column width from a wide character node.  We remove the
        // wide character node here and replace it with a single space.
        var spaceNode = this._textAttributes.createNode(' ', 1);
        cursorRowNode.nodes.splice(
          offset ? nodeIdx + 1 : nodeIdx,
          0,
          spaceNode,
        );
        node.txt = '';
        node.wcwidth = 0;
        endLength = 0;
        count -= 1;
      } else count -= startLength - endLength;

      var nextNode = cursorRowNode.nodes[nodeIdx + 1];
      if (endLength == 0 && nodeIdx != this._cursorNodeIdx) {
        cursorRowNode.nodes.splice(nodeIdx, 1);
      }
      nodeIdx++;
      node = cursorRowNode.nodes[nodeIdx];
      node = nextNode;
      offset = 0;
    }

    // Remove this.cursorNode_ if it is an empty non-text node.

    var cursorNode = cursorRowNode.nodes[this._cursorNodeIdx];
    if (!cursorNode.txt) {
      cursorRowNode.nodes.splice(this._cursorNodeIdx, 1, __createRNode('', 0));
    }

    return rv;
  }
  _getLineStartRow(row: RRowType): RRowType {
    var rowIdx = this.state.rows.indexOf(row);
    if (rowIdx <= 0) {
      return row;
    }

    while (
      this.state.rows[rowIdx - 1] &&
      this.state.rows[rowIdx - 1].lineOverflow
    ) {
      row = this.state.rows[rowIdx - 1];
      rowIdx--;
    }
    return row;
  }

  _getLineText(row: RRowType): string {
    var rowText = '';
    var rowIdx = this.state.rows.indexOf(row);
    if (rowIdx < 0) {
      return __rowText(row);
    }
    while (row) {
      rowText += __rowText(row);
      if (row.lineOverflow) {
        row = this.state.rows[rowIdx];
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
    this._cursorState.save(vt);
  }

  restoreCursorAndState(vt: any) {
    this._cursorState.restore(vt);
  }
}
