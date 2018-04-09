// @flow

import type { RRowType, RNodeType, RAttributesType } from './model';
import { touch, genKey, nodeSubstr, rowWidth, rowText } from './utils';
import {
  createNode,
  createDefaultNode,
  setNodeText,
  setNodeAttributedText,
  nodeMatchesAttrs,
  createAttributedNode,
} from './TextAttributes';

import { hterm, lib } from '../hterm_all.js';

function __insertNode(
  node: RNodeType,
  offset: number,
  separator: RNodeType,
): RNodeType[] {
  var afterNode: RNodeType = {
    key: genKey(),
    txt: node.txt,
    wcw: node.wcw,
    attrs: node.attrs,
    v: 0,
  };

  node.v++;

  var txt = node.txt;
  setNodeText(node, nodeSubstr(node, 0, offset));
  setNodeText(afterNode, lib.wc.substr(txt, offset));

  var nodes = [];

  if (node.txt) {
    nodes.push(node);
  }

  if (afterNode.txt) {
    if (node.attrs.wcNode && afterNode.txt === txt) {
      nodes.push(createNode(' ', 1));
      nodes.push(separator);
    } else {
      nodes.push(separator);
      nodes.push(afterNode);
    }
  } else {
    nodes.push(separator);
  }

  return nodes;
}

hterm.Screen.prototype.invalidateCursorPosition = function() {
  this.cursorPosition.move(0, 0);
  this.cursorRowIdx_ = 0;
  this.cursorNodeIdx_ = 0;
  this.cursorOffset_ = 0;
};

hterm.Screen.prototype.clearCursorRow = function() {
  this.cursorOffset_ = 0;
  this.cursorPosition.column = 0;
  this.cursorPosition.overflow = false;

  var text;
  if (this.textAttributes.isDefault()) {
    text = '';
  } else {
    text = lib.f.getWhitespace(this.columnCount_);
  }

  // We shouldn't honor inverse colors when clearing an area, to match
  // xterm's back color erase behavior.
  var inverse = this.textAttributes.inverse;
  this.textAttributes.inverse = false;
  this.textAttributes.syncColors();

  var node = createAttributedNode(
    this.textAttributes.attrs(),
    text,
    text.length,
  );
  var row = this.rowsArray[this.cursorRowIdx_];
  row.nodes = [node];
  row.o = false;
  touch(row);
  this.cursorNodeIdx_ = 0;

  this.textAttributes.inverse = inverse;
  this.textAttributes.syncColors();
};

hterm.Screen.prototype.commitLineOverflow = function() {
  var row = this.rowsArray[this.cursorRowIdx_];
  row.o = true;
  touch(row);
};

hterm.Screen.prototype.setCursorPosition = function(
  row: number,
  column: number,
) {
  if (!this.rowsArray.length) {
    console.warn('Attempt to set cursor position on empty screen.');
    return;
  }

  if (row >= this.rowsArray.length) {
    console.error('Row out of bounds: ' + row);
    row = this.rowsArray.length - 1;
  }

  if (row < 0) {
    console.error('Row out of bounds: ' + row);
    row = 0;
  }

  if (column >= this.columnCount_) {
    console.error('Column out of bounds: ' + column);
    column = this.columnCount_ - 1;
  } else if (column < 0) {
    console.error('Column out of bounds: ' + column);
    column = 0;
  }

  this.cursorPosition.overflow = false;

  var rowNode = this.rowsArray[row];
  var nodeIdx = 0;
  var node = rowNode.nodes[0];

  if (!node) {
    node = createNode('', 0);
    rowNode.nodes = [node];
    touch(rowNode);
  }

  var currentColumn = 0;

  if (row === this.cursorRowIdx_) {
    if (column >= this.cursorPosition.column - this.cursorOffset_) {
      nodeIdx = this.cursorNodeIdx_;
      node = rowNode.nodes[nodeIdx];
      currentColumn = this.cursorPosition.column - this.cursorOffset_;
    }
  } else {
    this.cursorRowIdx_ = row;
  }

  this.cursorPosition.move(row, column);

  if (column === 0) {
    this.cursorNodeIdx_ = 0;
    this.cursorOffset_ = 0;
    return;
  }

  while (node) {
    var offset = column - currentColumn;
    if (!rowNode.nodes[nodeIdx + 1] || node.wcw > offset) {
      this.cursorNodeIdx_ = nodeIdx;
      this.cursorOffset_ = offset;
      return;
    }

    currentColumn += node.wcw;
    node = rowNode.nodes[++nodeIdx];
  }
};

hterm.Screen.prototype.syncSelectionCaret = function(selection: any) {
  selection.collapse(null);
  // TODO:
  //try {
  //selection.collapse(this.cursorNode_, this.cursorOffset_);
  //} catch (firefoxIgnoredException) {
  //// FF can throw an exception if the range is off, rather than just not
  //// performing the collapse.
  //}
};

hterm.Screen.prototype.cursorRow = function(): RRowType {
  return this.rowsArray[this.cursorRowIdx_];
};

hterm.Screen.prototype.maybeClipCurrentRow = function() {
  var cursorRow = this.cursorRow();
  var width = rowWidth(cursorRow);

  if (width <= this.columnCount_) {
    // Current row does not need clipping, but may need clamping.
    if (this.cursorPosition.column >= this.columnCount_) {
      this.setCursorPosition(this.cursorPosition.row, this.columnCount_ - 1);
      this.cursorPosition.overflow = true;
    }

    return;
  }

  // Save off the current column so we can maybe restore it later.
  var currentColumn = this.cursorPosition.column;

  // Move the cursor to the final column.
  this.setCursorPosition(this.cursorPosition.row, this.columnCount_ - 1);

  // Remove any text that partially overflows.
  var cursorNode = this.rowsArray[this.cursorRowIdx_].nodes[
    this.cursorNodeIdx_
  ];
  width = cursorNode.wcw;

  if (this.cursorOffset_ < width - 1) {
    setNodeText(cursorNode, nodeSubstr(cursorNode, 0, this.cursorOffset_ + 1));
  }

  // Remove all nodes after the cursor.
  cursorRow.nodes.splice(this.cursorNodeIdx_ + 1);

  if (currentColumn < this.columnCount_) {
    // If the cursor was within the screen before we started then restore its
    // position.
    this.setCursorPosition(this.cursorPosition.row, currentColumn);
  } else {
    // Otherwise leave it at the the last column in the overflow state.
    this.cursorPosition.overflow = true;
  }
};

function __flattenNodes(row: RRowType, startNodeIdx: number) {
  var len = row.nodes.length;
  var spliceCount = 0;
  var startNode = row.nodes[startNodeIdx];
  var text = startNode.txt;
  var wcw = startNode.wcw;
  var attrs = startNode.attrs;
  var idx = startNodeIdx + 1;
  var node = row.nodes[idx];

  while (node && nodeMatchesAttrs(node, attrs)) {
    text += node.txt;
    wcw += node.wcw;
    if (!node.attrs.asciiNode) {
      attrs = node.attrs;
    }
    spliceCount++;
    idx++;
    node = row.nodes[idx];
  }

  if (spliceCount > 0) {
    setNodeAttributedText(attrs, startNode, text, wcw);
    row.nodes.splice(startNodeIdx + 1, spliceCount);
    touch(row);
  }
}

hterm.Screen.prototype.overwriteNode = function(
  str: string,
  wcwidth: number,
  attrs: RAttributesType,
): number {
  var cursorRow = this.rowsArray[this.cursorRowIdx_];
  var cursorNode = cursorRow.nodes[this.cursorNodeIdx_];

  let wcwidthLeft = wcwidth;
  var cursorNodeText = cursorNode.txt;

  cursorRow.o = false;

  // No matter what, before this function exits the cursor column will have
  // moved this much.
  this.cursorPosition.column += wcwidth;

  // Local cache of the cursor offset.
  var offset = this.cursorOffset_;

  // Reverse offset is the offset measured from the end of the string.
  // Zero implies that the cursor is at the end of the cursor node.
  var reverseOffset = cursorNode.wcw - offset;

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
        cursorNode.attrs.uc ||
        cursorNode.attrs.bc ||
        cursorNode.attrs.fc ||
        cursorNode.attrs.wcNode ||
        !cursorNode.attrs.asciiNode
      )
    ) {
      // Second best case, the current node is able to hold the whitespace.
      setNodeText(cursorNode, (cursorNodeText += ws));
    } else {
      // Worst case, we have to create a new node to hold the whitespace.
      var wsNode = createDefaultNode(ws, ws.length);
      this.cursorNodeIdx_++;
      cursorRow.nodes.splice(this.cursorNodeIdx_, 0, wsNode);
      cursorNode = wsNode;
      this.cursorOffset_ = offset = -reverseOffset;
      cursorNodeText = ws;
    }

    // We now know for sure that we're at the last character of the cursor node.
    reverseOffset = 0;
  }

  if (nodeMatchesAttrs(cursorNode, attrs)) {
    // The new text can be placed directly in the cursor node.
    if (reverseOffset === 0) {
      setNodeAttributedText(attrs, cursorNode, cursorNodeText + str);
      // No nodes after cursorNode, so nothing to delete
      if (!cursorRow.nodes[this.cursorNodeIdx_ + 1]) {
        wcwidthLeft = 0;
      }
    } else if (offset === 0) {
      const wcdiff = wcwidth - cursorNode.wcw;
      if (wcdiff >= 0) {
        setNodeAttributedText(attrs, cursorNode, str, wcwidth);
        if (cursorRow.nodes[this.cursorNodeIdx_ + 1]) {
          wcwidthLeft = wcdiff;
        } else {
          wcwidthLeft = 0;
        }
      } else {
        setNodeAttributedText(
          attrs,
          cursorNode,
          str + nodeSubstr(cursorNode, wcwidth),
        );
        wcwidthLeft = 0;
      }
    } else {
      const wcdiff = wcwidth + offset - cursorNode.wcw;
      if (wcdiff >= 0) {
        setNodeAttributedText(
          attrs,
          cursorNode,
          nodeSubstr(cursorNode, 0, offset) + str,
        );
        wcwidthLeft = wcdiff;
      } else {
        var s =
          nodeSubstr(cursorNode, 0, offset) +
          str +
          nodeSubstr(cursorNode, offset + wcwidth);

        setNodeAttributedText(attrs, cursorNode, s);
        wcwidthLeft = 0;
      }
    }

    this.cursorOffset_ += wcwidth;
    return wcwidthLeft;
  }

  // The cursor node is the wrong style for the new text.  If we're at the
  // beginning or end of the cursor node, then the adjacent node is also a
  // potential candidate.

  if (offset === 0) {
    // At the beginning of the cursor node, the check the previous sibling.
    var previousSibling = cursorRow.nodes[this.cursorNodeIdx_ - 1];
    if (previousSibling && nodeMatchesAttrs(previousSibling, attrs)) {
      setNodeAttributedText(attrs, previousSibling, previousSibling.txt + str);

      const wcdiff = wcwidth - cursorNode.wcw;
      if (wcdiff >= 0) {
        cursorRow.nodes.splice(this.cursorNodeIdx_, 1);
        wcwidthLeft = wcdiff;
      } else if (!cursorNode.attrs.wcNode) {
        setNodeText(cursorNode, nodeSubstr(cursorNode, wcwidth));
        wcwidthLeft = 0;
      }

      this.cursorNodeIdx_ = this.cursorNodeIdx_ - 1;
      this.cursorOffset_ = previousSibling.wcw;
      return wcwidthLeft;
    }

    var newNode = createAttributedNode(attrs, str, wcwidth);
    //cursorNode = newNode;
    this.cursorOffset_ = wcwidth;
    const wcdiff = wcwidth - cursorNode.wcw;
    if (wcdiff >= 0) {
      cursorRow.nodes.splice(this.cursorNodeIdx_, 1, newNode);
      wcwidthLeft = wcdiff;
    } else {
      cursorRow.nodes.splice(this.cursorNodeIdx_, 0, newNode);
      setNodeText(cursorNode, nodeSubstr(cursorNode, wcwidth));
      wcwidthLeft = 0;
    }
    return wcwidthLeft;
  }

  if (reverseOffset === 0) {
    // At the end of the cursor node, the check the next sibling.
    var nextSibling = cursorRow.nodes[this.cursorNodeIdx_ + 1];
    if (nextSibling && nodeMatchesAttrs(nextSibling, attrs)) {
      const wcdiff = wcwidth - nextSibling.wcw;

      if (wcdiff >= 0) {
        setNodeAttributedText(attrs, nextSibling, str, wcwidth);
        wcwidthLeft = wcdiff;
      } else {
        setNodeAttributedText(
          attrs,
          nextSibling,
          str + nodeSubstr(nextSibling, wcwidth),
        );
        wcwidthLeft = 0;
      }
      this.cursorNodeIdx_++;
      this.cursorOffset_ = wcwidth; //lib.wc.strWidth(str);
      return wcwidthLeft;
    }

    newNode = createAttributedNode(attrs, str, wcwidth);
    cursorRow.nodes.splice(this.cursorNodeIdx_ + 1, 0, newNode);
    this.cursorNodeIdx_++;

    if (!nextSibling) {
      wcwidthLeft = 0;
    }
    // We specifically need to include any missing whitespace here, since it's
    // going in a new node.
    this.cursorOffset_ = newNode.wcw;
    return wcwidthLeft;
  }

  const wcdiff = offset + wcwidth - cursorNode.wcw;

  if (wcdiff >= 0) {
    setNodeText(cursorNode, nodeSubstr(cursorNode, 0, offset));
    var newNode = createAttributedNode(attrs, str, wcwidth);
    this.cursorNodeIdx_++;
    cursorRow.nodes.splice(this.cursorNodeIdx_, 0, newNode);
    this.cursorOffset_ = wcwidth;
    wcwidthLeft = wcdiff;
    return wcwidthLeft;
  }

  // Worst case, we're somewhere in the middle of the cursor node.  We'll
  // have to split it into two nodes and insert our new container in between.
  var newNode = createAttributedNode(attrs, str, wcwidth);
  var nodes = __insertNode(cursorNode, offset, newNode);
  var nodesCount = nodes.length;
  if (nodesCount === 1) {
    cursorRow.nodes.splice(this.cursorNodeIdx_, 1, nodes[0]);
  } else if (nodesCount === 2) {
    cursorRow.nodes.splice(this.cursorNodeIdx_, 1, nodes[0], nodes[1]);
  } else if (nodesCount === 3) {
    cursorRow.nodes.splice(
      this.cursorNodeIdx_,
      1,
      nodes[0],
      nodes[1],
      nodes[2],
    );
    this.cursorNodeIdx_++;
  }
  this.cursorNodeIdx_++;
  this.cursorOffset_ = 0;
  return wcwidthLeft;
};

hterm.Screen.prototype.insertString = function(str: string, wcwidth: number) {
  var cursorRow = this.rowsArray[this.cursorRowIdx_];
  var cursorNode = cursorRow.nodes[this.cursorNodeIdx_];

  var cursorNodeText = cursorNode.txt;
  const attrs = this.textAttributes.attrs();

  cursorRow.o = false;

  // No matter what, before this function exits the cursor column will have
  // moved this much.
  this.cursorPosition.column += wcwidth;

  // Local cache of the cursor offset.
  var offset = this.cursorOffset_;

  // Reverse offset is the offset measured from the end of the string.
  // Zero implies that the cursor is at the end of the cursor node.
  var reverseOffset = cursorNode.wcw - offset;

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
        cursorNode.attrs.uc ||
        cursorNode.attrs.bc ||
        cursorNode.attrs.fc ||
        cursorNode.attrs.wcNode ||
        !cursorNode.attrs.asciiNode
      )
    ) {
      // Second best case, the current node is able to hold the whitespace.
      setNodeText(cursorNode, (cursorNodeText += ws));
    } else {
      // Worst case, we have to create a new node to hold the whitespace.
      var wsNode = createDefaultNode(ws, ws.length);
      this.cursorNodeIdx_++;
      cursorRow.nodes.splice(this.cursorNodeIdx_, 0, wsNode);
      cursorNode = wsNode;
      this.cursorOffset_ = offset = -reverseOffset;
      cursorNodeText = ws;
    }

    // We now know for sure that we're at the last character of the cursor node.
    reverseOffset = 0;
  }

  if (nodeMatchesAttrs(cursorNode, attrs)) {
    // The new text can be placed directly in the cursor node.
    if (reverseOffset === 0) {
      setNodeAttributedText(attrs, cursorNode, cursorNodeText + str);
    } else if (offset === 0) {
      setNodeAttributedText(attrs, cursorNode, str + cursorNodeText);
    } else {
      var s =
        nodeSubstr(cursorNode, 0, offset) +
        str +
        nodeSubstr(cursorNode, offset);

      setNodeAttributedText(attrs, cursorNode, s);
    }

    this.cursorOffset_ += wcwidth;
    return;
  }

  // The cursor node is the wrong style for the new text.  If we're at the
  // beginning or end of the cursor node, then the adjacent node is also a
  // potential candidate.

  if (offset === 0) {
    // At the beginning of the cursor node, the check the previous sibling.
    var previousSibling = cursorRow.nodes[this.cursorNodeIdx_ - 1];
    if (previousSibling && nodeMatchesAttrs(previousSibling, attrs)) {
      setNodeAttributedText(attrs, previousSibling, previousSibling.txt + str);
      this.cursorNodeIdx_ = this.cursorNodeIdx_ - 1;
      this.cursorOffset_ = previousSibling.wcw;
      return;
    }

    var newNode = createAttributedNode(attrs, str, wcwidth);
    cursorRow.nodes.splice(this.cursorNodeIdx_, 0, newNode);
    this.cursorOffset_ = wcwidth;
    return;
  }

  if (reverseOffset === 0) {
    // At the end of the cursor node, the check the next sibling.
    var nextSibling = cursorRow.nodes[this.cursorNodeIdx_ + 1];
    if (nextSibling && nodeMatchesAttrs(nextSibling, attrs)) {
      setNodeAttributedText(attrs, nextSibling, str + nextSibling.txt);
      this.cursorNodeIdx_++;
      this.cursorOffset_ = wcwidth; //lib.wc.strWidth(str);
      return;
    }

    newNode = createAttributedNode(attrs, str, wcwidth);
    cursorRow.nodes.splice(this.cursorNodeIdx_ + 1, 0, newNode);
    this.cursorNodeIdx_++;
    // We specifically need to include any missing whitespace here, since it's
    // going in a new node.
    this.cursorOffset_ = newNode.wcw;
    return;
  }

  // Worst case, we're somewhere in the middle of the cursor node.  We'll
  // have to split it into two nodes and insert our new container in between.
  var newNode = createAttributedNode(attrs, str, wcwidth);
  var nodes = __insertNode(cursorNode, offset, newNode);
  var nodesCount = nodes.length;
  if (nodesCount === 1) {
    cursorRow.nodes.splice(this.cursorNodeIdx_, 1, nodes[0]);
  } else if (nodesCount === 2) {
    cursorRow.nodes.splice(this.cursorNodeIdx_, 1, nodes[0], nodes[1]);
  } else if (nodesCount === 3) {
    cursorRow.nodes.splice(
      this.cursorNodeIdx_,
      1,
      nodes[0],
      nodes[1],
      nodes[2],
    );
    this.cursorNodeIdx_++;
  }
  this.cursorNodeIdx_++;
  this.cursorOffset_ = 0;
};

hterm.Screen.prototype.overwriteString = function(
  str: string,
  wcwidth: number,
) {
  var maxLength = this.columnCount_ - this.cursorPosition.column;
  if (!maxLength) return [str];

  var cursorRowNode = this.rowsArray[this.cursorRowIdx_];
  var cursorNode = cursorRowNode.nodes[this.cursorNodeIdx_];

  var attrs = this.textAttributes.attrs();

  if (
    nodeMatchesAttrs(cursorNode, attrs) &&
    cursorNode.txt.substr(this.cursorOffset_) === str
  ) {
    // This overwrite would be a no-op, just move the cursor and return.
    this.cursorOffset_ += wcwidth;
    this.cursorPosition.column += wcwidth;
    return;
  }

  var wcwidthLeft = this.overwriteNode(str, wcwidth, attrs);
  if (wcwidthLeft > 0) {
    this.deleteChars(wcwidthLeft);
  }
  __flattenNodes(cursorRowNode, this.cursorNodeIdx_);
  touch(cursorRowNode);
};

hterm.Screen.prototype.deleteChars = function(count: number): number {
  var cursorRowNode = this.rowsArray[this.cursorRowIdx_];
  var spliceIdx = this.cursorNodeIdx_;
  var spliceDeleteCount = 0;
  var offset = this.cursorOffset_;

  var len = cursorRowNode.nodes.length;
  var rv = count;

  for (var nodeIdx = this.cursorNodeIdx_; nodeIdx < len; nodeIdx++) {
    if (count < 0) {
      console.error(`Deleting ${rv} chars went negative: ${count}`);
      break;
    }

    if (count === 0) {
      break;
    }

    var node = cursorRowNode.nodes[nodeIdx];

    var startWidth = node.wcw;

    if (offset > 0) {
      if (startWidth - offset === count) {
        setNodeText(node, nodeSubstr(node, 0, offset));
        return rv;
      }

      if (startWidth - offset > count) {
        setNodeText(
          node,
          nodeSubstr(node, 0, offset) + nodeSubstr(node, offset + count),
        );
        return rv;
      }

      setNodeText(node, nodeSubstr(node, 0, offset));
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
    setNodeText(node, nodeSubstr(node, count));
    // we didn't delete anything. replace with one char width
    if (node.attrs.wcNode && startWidth === node.wcw) {
      var spaceNode = createNode(' ', 1);
      count -= 1;
      cursorRowNode.nodes.splice(nodeIdx, 1, spaceNode);
    }
    break;
  }

  if (spliceDeleteCount === 0) {
    return rv;
  }

  cursorRowNode.nodes.splice(spliceIdx, spliceDeleteCount);

  if (spliceIdx > this.cursorNodeIdx_) {
    return rv;
  }

  // We deleted cursor.

  len = cursorRowNode.nodes.length;
  if (len === 0) {
    cursorRowNode.nodes = [createNode('', 0)];
    this.cursorNodeIdx_ = 0;
    this.cursorOffset_ = 0;
    return rv;
  }

  if (len <= this.cursorNodeIdx_) {
    this.cursorNodeIdx_ = len - 1;
    this.cursorOffset_ = cursorRowNode.nodes[len - 1].wcw;
    return rv;
  }

  this.cursorOffset_ = 0;

  return rv;
};

hterm.Screen.prototype.popRow = function() {
  return this.rowsArray.pop();
};

/**
 * Remove rows from the bottom of the screen and return them as an array.
 *
 * @param {integer} count The number of rows to remove.
 * @return {Array.<HTMLElement>} The selected rows.
 */
hterm.Screen.prototype.popRows = function(count) {
  return this.rowsArray.splice(this.rowsArray.length - count, count);
};

/**
 * Insert a row at the bottom of the screen.
 *
 * @param {HTMLElement} row The row to insert.
 */
hterm.Screen.prototype.pushRow = function(row) {
  this.rowsArray[this.rowsArray.length] = row;
};

hterm.Screen.prototype.setRow = function(row, index) {
  this.rowsArray[index] = row;
};

/**
 * Insert rows at the bottom of the screen.
 *
 * @param {Array.<HTMLElement>} rows The rows to insert.
 */
hterm.Screen.prototype.pushRows = function(rows) {
  for (var i = 0, k = this.rowsArray.length, len = rows.length; i < len; i++) {
    this.rowsArray[i + k] = rows[i];
  }
};

hterm.Screen.prototype.getLineStartRow_ = function(row: RRowType): RRowType {
  var rowIdx = this.rowsArray.indexOf(row);
  if (rowIdx <= 0) {
    return row;
  }

  while (this.rowsArray[rowIdx - 1] && this.rowsArray[rowIdx - 1].o) {
    row = this.rowsArray[rowIdx - 1];
    rowIdx--;
  }
  return row;
};

hterm.Screen.prototype.getLineText_ = function(row: RRowType): string {
  var result = '';
  var rowIdx = this.rowsArray.indexOf(row);
  if (rowIdx < 0) {
    return rowText(row);
  }
  while (row) {
    result += rowText(row);
    if (row.o) {
      row = this.rowsArray[rowIdx];
      rowIdx++;
    } else {
      break;
    }
  }
  return result;
};

hterm.Screen.prototype.getPositionWithOverflow_ = function(
  row: any,
  node: any,
  offset: any,
) {
  return 0;
};

hterm.Screen.prototype.getPositionWithinRow_ = function(
  row: any,
  node: any,
  offset: any,
) {
  return 0;
};
hterm.Screen.prototype.getNodeAndOffsetWithOverflow_ = function(
  row: any,
  position: any,
) {
  return -1;
};
hterm.Screen.prototype.getNodeAndOffsetWithinRow_ = function(
  row: any,
  position: any,
) {
  return null;
};
hterm.Screen.prototype.setRange_ = function(
  row: any,
  start: any,
  end: any,
  range: any,
) {};
hterm.Screen.prototype.expandSelection = function(selection: any) {};
