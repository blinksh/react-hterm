// @flow

import RScreen from './RScreen';
import { lib } from '../hterm_all';
import type { RNodeType, RRowType } from './model';

let _screen = new RScreen();
beforeEach(() => {
  _screen = new RScreen();
  _screen.setColumnCount(80);
});

var nodeIdx = 0;
function node(text: string): RNodeType {
  return {
    v: 0,
    key: nodeIdx++,
    txt: text,
    wcw: text.length,
    attrs: {
      isDefault: true,
      wcNode: false,
      asciiNode: true,
      className: '',
      fc: '',
      bc: '',
      uc: '',
    },
  };
}

function wcNode(text: string): RNodeType {
  return {
    v: 0,
    key: nodeIdx++,
    txt: text,
    wcw: lib.wc.strWidth(text),
    attrs: {
      isDefault: true,
      wcNode: true,
      asciiNode: false,
      className: '',
      fc: '',
      bc: '',
      uc: '',
    },
  };
}

function _createRowWithPlainText(text: string, num: number): RRowType {
  var row: RRowType = {
    n: num,
    nodes: [],
    v: 0,
    o: false,
  };

  return row;
}

test('push-pop', () => {
  // Push one at a time.
  var ary = [];
  for (var i = 0; i < 10; i++) {
    ary[i] = _createRowWithPlainText(i.toString(), i + 1);
    _screen.pushRow(ary[i]);
  }

  expect(_screen.getHeight()).toEqual(ary.length);

  // Pop one at a time.
  for (var i = ary.length - 1; i >= 0; i--) {
    expect(_screen.popRow()).toEqual(ary[i]);
  }

  // Bulk push.
  _screen.pushRows(ary);
  expect(_screen.rowsArray.length).toEqual(ary.length);

  // Bulk pop.
  var popary = _screen.popRows(ary.length);

  expect(popary.length).toEqual(ary.length);

  for (var i = ary.length - 1; i >= 0; i--) {
    expect(popary[i]).toEqual(ary[i]);
  }

  // Reset, then partial bulk pop.
  _screen.pushRows(ary);
  expect(_screen.rowsArray.length).toEqual(ary.length);

  var popary = _screen.popRows(5);
  for (var i = 0; i < 5; i++) {
    expect(popary[i]).toEqual(ary[i + 5]);
  }
});

test('unshift-shift', () => {
  // Unshift one at a time.
  var ary = [];
  for (var i = 0; i < 10; i++) {
    ary[i] = _createRowWithPlainText(i.toString(), i + 1);
    _screen.unshiftRow(ary[i]);
  }

  expect(_screen.rowsArray.length).toEqual(ary.length);

  // Shift one at a time.
  for (var i = ary.length - 1; i >= 0; i--) {
    expect(_screen.shiftRow()).toEqual(ary[i]);
  }

  // Bulk unshift.
  _screen.unshiftRows(ary);
  expect(_screen.rowsArray.length).toEqual(ary.length);

  // Bulk shift.
  var shiftary = _screen.shiftRows(ary.length);

  expect(shiftary.length).toEqual(ary.length);

  for (var i = ary.length - 1; i >= 0; i--) {
    expect(shiftary[i]).toEqual(ary[i]);
  }

  // Reset, then partial bulk shift.
  _screen.unshiftRows(ary);
  expect(_screen.rowsArray.length).toEqual(ary.length);

  var shiftary = _screen.shiftRows(5);
  for (var i = 0; i < 5; i++) {
    expect(shiftary[i]).toEqual(ary[i]);
  }
});

test('cursor-movement', () => {
  var ary = [];

  for (var i = 0; i < 3; i++) {
    ary[i] = _createRowWithPlainText(i.toString(), i + 1);
    _screen.pushRow(ary[i]);
  }

  _screen.setCursorPosition(0, 0);
  expect(_screen._cursorRowIdx).toEqual(0);
  expect(_screen._cursorNodeIdx).toEqual(0);
  expect(_screen._cursorOffset).toEqual(0);

  _screen.setCursorPosition(1, 0);
  expect(_screen._cursorRowIdx).toEqual(1);
  expect(_screen._cursorNodeIdx).toEqual(0);
  expect(_screen._cursorOffset).toEqual(0);

  _screen.setCursorPosition(1, 10);
  expect(_screen._cursorRowIdx).toEqual(1);
  expect(_screen._cursorNodeIdx).toEqual(0);
  expect(_screen._cursorOffset).toEqual(10);

  _screen.setCursorPosition(1, 5);
  expect(_screen._cursorRowIdx).toEqual(1);
  expect(_screen._cursorNodeIdx).toEqual(0);
  expect(_screen._cursorOffset).toEqual(5);

  _screen.setCursorPosition(1, 10);
  expect(_screen._cursorRowIdx).toEqual(1);
  expect(_screen._cursorNodeIdx).toEqual(0);
  expect(_screen._cursorOffset).toEqual(10);

  ary[2].nodes = [node('01'), node('23'), node('45'), node('67'), node('89')];

  _screen.setCursorPosition(2, 0);
  expect(_screen._cursorRowIdx).toEqual(2);
  expect(_screen._cursorNodeIdx).toEqual(0);
  expect(_screen._cursorOffset).toEqual(0);

  _screen.setCursorPosition(2, 2);
  expect(_screen._cursorRowIdx).toEqual(2);
  expect(_screen._cursorNodeIdx).toEqual(1);
  expect(_screen._cursorOffset).toEqual(0);

  _screen.setCursorPosition(2, 3);
  expect(_screen._cursorRowIdx).toEqual(2);
  expect(_screen._cursorNodeIdx).toEqual(1);
  expect(_screen._cursorOffset).toEqual(1);

  _screen.setCursorPosition(2, 4);
  expect(_screen._cursorRowIdx).toEqual(2);
  expect(_screen._cursorNodeIdx).toEqual(2);
  expect(_screen._cursorOffset).toEqual(0);

  _screen.setCursorPosition(2, 5);
  expect(_screen._cursorRowIdx).toEqual(2);
  expect(_screen._cursorNodeIdx).toEqual(2);
  expect(_screen._cursorOffset).toEqual(1);

  _screen.setCursorPosition(2, 6);
  expect(_screen._cursorRowIdx).toEqual(2);
  expect(_screen._cursorNodeIdx).toEqual(3);
  expect(_screen._cursorOffset).toEqual(0);

  _screen.setCursorPosition(2, 7);
  expect(_screen._cursorRowIdx).toEqual(2);
  expect(_screen._cursorNodeIdx).toEqual(3);
  expect(_screen._cursorOffset).toEqual(1);

  _screen.setCursorPosition(2, 8);
  expect(_screen._cursorRowIdx).toEqual(2);
  expect(_screen._cursorNodeIdx).toEqual(4);
  expect(_screen._cursorOffset).toEqual(0);

  _screen.setCursorPosition(2, 9);
  expect(_screen._cursorRowIdx).toEqual(2);
  expect(_screen._cursorNodeIdx).toEqual(4);
  expect(_screen._cursorOffset).toEqual(1);

  _screen.setCursorPosition(2, 18);
  expect(_screen._cursorRowIdx).toEqual(2);
  expect(_screen._cursorNodeIdx).toEqual(4);
  expect(_screen._cursorOffset).toEqual(10);
});

test('delete-chars', () => {
  var row = _createRowWithPlainText('', 0);
  row.nodes = [node('hello'), node(' '), node('world')];
  _screen.pushRow(row);

  _screen.setCursorPosition(0, 3);
  _screen.deleteChars(5);

  expect(row.nodes[0].txt).toEqual('hel');
  expect(row.nodes[1].txt).toEqual('rld');
  expect(row.nodes.length).toEqual(2);

  var wcRow = _createRowWithPlainText('', 1);
  wcRow.nodes = [
    wcNode('\u4E2D'),
    wcNode('\u6587'),
    wcNode('\u5B57'),
    wcNode('\u4E32'),
  ];
  _screen.pushRow(wcRow);

  _screen.setCursorPosition(1, 2);

  expect(_screen._cursorNodeIdx).toEqual(1);
  expect(_screen._cursorOffset).toEqual(0);

  _screen.deleteChars(2);

  expect(_screen._cursorNodeIdx).toEqual(1);
  expect(_screen._cursorOffset).toEqual(0);

  expect(wcRow.nodes[0].txt).toEqual('\u4E2D');
  expect(wcRow.nodes[1].txt).toEqual('\u5B57');
  expect(wcRow.nodes[2].txt).toEqual('\u4E32');
  expect(_screen._cursorNodeIdx).toEqual(1);
  expect(_screen._cursorOffset).toEqual(0);
  expect(wcRow.nodes.length).toEqual(3);

  _screen.setCursorPosition(1, 0);
  expect(_screen._cursorNodeIdx).toEqual(0);
  expect(_screen._cursorOffset).toEqual(0);
  _screen.deleteChars(6);
  expect(wcRow.nodes.length).toEqual(1);
  expect(wcRow.nodes[0].txt).toEqual('');
});

test('wide-to-narrow-char-start', () => {
  var row = _createRowWithPlainText('', 1);
  _screen.pushRow(row);

  _screen.setCursorPosition(0, 0);
  var str = 'abcdef';
  _screen.overwriteString(str, lib.wc.strWidth(str));
  expect(row.nodes[0].txt).toEqual('abcdef');

  _screen.setCursorPosition(0, 2);
  _screen.textAttributes.wcNode = true;
  _screen.textAttributes.asciiNode = false;
  str = '\u{30c0}';
  _screen.overwriteString(str, lib.wc.strWidth(str));
  _screen.textAttributes.wcNode = false;
  _screen.textAttributes.asciiNode = true;

  expect(row.nodes[0].txt).toEqual('ab');
  expect(row.nodes[1].txt).toEqual(str);
  expect(row.nodes[2].txt).toEqual('ef');
  expect(row.nodes.length).toEqual(3);

  _screen.setCursorPosition(0, 2);

  _screen.overwriteString('x', 1);
  expect(row.nodes[0].txt).toEqual('abx');
  expect(row.nodes[1].txt).toEqual(' ');
  expect(row.nodes[2].txt).toEqual('ef');
  expect(row.nodes.length).toEqual(3);
});

test('wide-to-narrow-char-end', () => {
  var row = _createRowWithPlainText('', 1);
  _screen.pushRow(row);

  _screen.setCursorPosition(0, 0);
  var str = 'abcdef';
  _screen.overwriteString(str, lib.wc.strWidth(str));
  expect(row.nodes[0].txt).toEqual('abcdef');

  _screen.setCursorPosition(0, 2);
  _screen.textAttributes.wcNode = true;
  _screen.textAttributes.asciiNode = false;
  str = '\u{30c0}';
  _screen.overwriteString('\u{30c0}', lib.wc.strWidth(str));
  _screen.textAttributes.wcNode = false;
  _screen.textAttributes.asciiNode = true;

  expect(row.nodes[0].txt).toEqual('ab');
  expect(row.nodes[1].txt).toEqual(str);
  expect(row.nodes[2].txt).toEqual('ef');
  expect(row.nodes.length).toEqual(3);

  _screen.setCursorPosition(0, 3);
  expect(_screen._cursorNodeIdx).toEqual(1);
  expect(_screen._cursorOffset).toEqual(1);

  _screen.insertString('x', 1);

  expect(row.nodes[0].txt).toEqual('ab');
  expect(row.nodes[1].txt).toEqual(' ');
  expect(row.nodes[2].txt).toEqual('x');
  expect(row.nodes[3].txt).toEqual('ef');
  expect(row.nodes.length).toEqual(4);
});

test('insert', () => {
  var ary = [
    _createRowWithPlainText('', 0),
    _createRowWithPlainText('', 1),
    _createRowWithPlainText('', 2),
  ];

  ary[1].nodes = [node('hello'), node(' '), node('world')];

  _screen.pushRows(ary);

  // Basic insert
  _screen.setCursorPosition(0, 0);
  _screen.insertString('XXXXX', 5);
  expect(ary[0].nodes[0].txt).toEqual('XXXXX');

  _screen.clearCursorRow();
  _screen.setCursorPosition(0, 3);
  expect(ary[0].nodes[0].txt).toEqual('');
  expect(ary[0].nodes.length).toEqual(1);

  _screen.insertString('XXXXX', 5);
  expect(ary[0].nodes[0].txt).toEqual('   XXXXX');
  expect(ary[0].nodes.length).toEqual(1);

  // Fetch enough whitespace to ensure that the row is full.
  var ws = lib.f.getWhitespace(_screen.getWidth());
  // Check text clipping and cursor clamping.
  _screen.clearCursorRow();
  _screen.insertString('XXXX', 4);
  _screen.setCursorPosition(0, 2);
  _screen.insertString(ws, ws.length);
  _screen.maybeClipCurrentRow();
  expect(ary[0].nodes[0].txt).toEqual('XX' + ws.substr(2));
  expect(ary[0].nodes.length).toEqual(1);
  expect(_screen.cursorPosition.column).toEqual(79);

  // Insert into a more complicated row.
  _screen.setCursorPosition(1, 3);
  _screen.insertString('XXXXX', 5);
  expect(ary[1].nodes.length).toEqual(3);
  expect(ary[1].nodes[0].txt).toEqual('helXXXXXlo');
  expect(ary[1].nodes[1].txt).toEqual(' ');
  expect(ary[1].nodes[2].txt).toEqual('world');

  // Test inserting widechar string.
  var wideCharString = '\u4E2D\u6587\u5B57\u4E32';
  _screen.setCursorPosition(2, 0);
  _screen.textAttributes.wcNode = true;
  _screen.textAttributes.asciiNode = false;
  for (var i = 0; i < wideCharString.length; i++) {
    var s = wideCharString.charAt(i);
    _screen.insertString(s, lib.wc.strWidth(s));
  }
  _screen.textAttributes.wcNode = false;
  _screen.textAttributes.asciiNode = true;

  expect(ary[2].nodes[0].txt).toEqual('\u4E2D');
  expect(ary[2].nodes[0].attrs.wcNode).toEqual(true);
  expect(ary[2].nodes[1].txt).toEqual('\u6587');
  expect(ary[2].nodes[1].attrs.wcNode).toEqual(true);
  expect(ary[2].nodes[2].txt).toEqual('\u5B57');
  expect(ary[2].nodes[2].attrs.wcNode).toEqual(true);
  expect(ary[2].nodes[3].txt).toEqual('\u4E32');
  expect(ary[2].nodes[3].attrs.wcNode).toEqual(true);
  expect(ary[2].nodes[4].txt).toEqual('');
  expect(ary[2].nodes.length).toEqual(5);

  _screen.clearCursorRow();
  _screen.setCursorPosition(2, 3);
  _screen.textAttributes.wcNode = true;
  _screen.textAttributes.asciiNode = false;
  for (var i = 0; i < wideCharString.length; i++) {
    var s = wideCharString.charAt(i);
    _screen.insertString(s, lib.wc.strWidth(s));
  }
  _screen.textAttributes.wcNode = false;
  _screen.textAttributes.asciiNode = true;

  expect(ary[2].nodes[0].txt).toEqual('   ');
  expect(ary[2].nodes[0].attrs.asciiNode).toEqual(true);
  expect(ary[2].nodes[1].txt).toEqual('\u4E2D');
  expect(ary[2].nodes[1].attrs.wcNode).toEqual(true);
  expect(ary[2].nodes[2].txt).toEqual('\u6587');
  expect(ary[2].nodes[2].attrs.wcNode).toEqual(true);
  expect(ary[2].nodes[3].txt).toEqual('\u5B57');
  expect(ary[2].nodes[3].attrs.wcNode).toEqual(true);
  expect(ary[2].nodes[4].txt).toEqual('\u4E32');
  expect(ary[2].nodes[4].attrs.wcNode).toEqual(true);
  expect(ary[2].nodes.length).toEqual(5);

  _screen.setCursorPosition(2, 7);
  _screen.insertString('XXXXX', 5);

  expect(ary[2].nodes[0].txt).toEqual('   ');
  expect(ary[2].nodes[0].attrs.asciiNode).toEqual(true);
  expect(ary[2].nodes[1].txt).toEqual('\u4E2D');
  expect(ary[2].nodes[1].attrs.wcNode).toEqual(true);
  expect(ary[2].nodes[2].txt).toEqual('\u6587');
  expect(ary[2].nodes[2].attrs.wcNode).toEqual(true);

  expect(ary[2].nodes[3].txt).toEqual('XXXXX');
  expect(ary[2].nodes[3].attrs.wcNode).toEqual(false);

  expect(ary[2].nodes[4].txt).toEqual('\u5B57');
  expect(ary[2].nodes[4].attrs.wcNode).toEqual(true);
  expect(ary[2].nodes[5].txt).toEqual('\u4E32');
  expect(ary[2].nodes[5].attrs.wcNode).toEqual(true);
  expect(ary[2].nodes.length).toEqual(6);

  _screen.clearCursorRow();
  _screen.insertString('XXXXX', 5);
  _screen.setCursorPosition(2, 3);
  _screen.textAttributes.wcNode = true;
  _screen.textAttributes.asciiNode = false;
  for (var i = 0; i < wideCharString.length; i++) {
    var s = wideCharString.charAt(i);
    _screen.insertString(s, lib.wc.strWidth(s));
  }
  _screen.textAttributes.wcNode = false;
  _screen.textAttributes.asciiNode = true;

  expect(ary[2].nodes[0].txt).toEqual('XXX');
  expect(ary[2].nodes[0].attrs.asciiNode).toEqual(true);
  expect(ary[2].nodes[1].txt).toEqual('\u4E2D');
  expect(ary[2].nodes[1].attrs.wcNode).toEqual(true);
  expect(ary[2].nodes[2].txt).toEqual('\u6587');
  expect(ary[2].nodes[2].attrs.wcNode).toEqual(true);
  expect(ary[2].nodes[3].txt).toEqual('\u5B57');
  expect(ary[2].nodes[3].attrs.wcNode).toEqual(true);
  expect(ary[2].nodes[4].txt).toEqual('\u4E32');
  expect(ary[2].nodes[4].attrs.wcNode).toEqual(true);
  expect(ary[2].nodes[5].txt).toEqual('XX');
  expect(ary[2].nodes[5].attrs.asciiNode).toEqual(true);
  expect(ary[2].nodes.length).toEqual(6);
});
