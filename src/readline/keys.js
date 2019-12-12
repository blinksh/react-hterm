// @flow

/**
 * keys.js - emit key presses
 * Copyright (c) 2010-2015, Joyent, Inc. and other contributors (MIT License)
 * https://github.com/chjj/blessed
 */

// Originally taken from the node.js tree:
//
// Copyright Joyent, Inc. and other Node contributors. All rights reserved.
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

/*
  Some patterns seen in terminal key escape codes, derived from combos seen
  at http://www.midnight-commander.org/browser/lib/tty/key.c

  ESC letter
  ESC [ letter
  ESC [ modifier letter
  ESC [ 1 ; modifier letter
  ESC [ num char
  ESC [ num ; modifier char
  ESC O letter
  ESC O modifier letter
  ESC O 1 ; modifier letter
  ESC N letter
  ESC [ [ num ; modifier char
  ESC [ [ 1 ; modifier letter
  ESC ESC [ num char
  ESC ESC O letter

  - char is usually ~ but $ and ^ also happen with rxvt
  - modifier is 1 +
                (shift     * 1) +
                (left_alt  * 2) +
                (ctrl      * 4) +
                (right_alt * 8)
  - two leading ESCs apparently mean the same as one leading ESC
*/

// Regexes used for ansi escape code splitting
var metaKeyCodeReAnywhere = /(?:\x1b)([`0-9\-=~!@#$%^&*\(\)_+\[\]\\{}|;':",.//<>?a-zA-Z])/;
var metaKeyCodeRe = new RegExp("^" + metaKeyCodeReAnywhere.source + "$");
var functionKeyCodeReAnywhere = new RegExp(
  "(?:\x1b+)(O|N|\\[|\\[\\[)(?:" +
    [
      "(\\d+)(?:;(\\d+))?([~^$])",
      "(?:M([@ #!a`])(.)(.))", // mouse
      "(?:1;)?(\\d+)?([a-zA-Z])"
    ].join("|") +
    ")"
);
var functionKeyCodeRe = new RegExp("^" + functionKeyCodeReAnywhere.source);
var escapeCodeReAnywhere = new RegExp(
  [
    functionKeyCodeReAnywhere.source,
    metaKeyCodeReAnywhere.source,
    /\x1b./.source
  ].join("|")
);

type KeyNameType =
  | "enter"
  | "up"
  | "down"
  | "left"
  | "right"
  | "tab"
  | "escape"
  | "space"
  | "home"
  | "pageup"
  | "pagedown"
  | "delete"
  | "insert"
  | "f1"
  | "f2"
  | "f3"
  | "f4"
  | "f5"
  | "f6"
  | "f7"
  | "f8"
  | "f9"
  | "f10"
  | "f11"
  | "f12"
  | "clear"
  | "end";

export type KeyType = {
  sequence: string,
  name: ?(KeyNameType | string),
  ctrl: boolean,
  meta: boolean,
  shift: boolean,
  fulName: string,
  code: ?string,
  ch: ?string
};
type emitKeysCallback = (key: KeyType) => void;

export default function processKeys(s: string, callback: emitKeysCallback) {
  if (_isMouse(s)) {
    // TODO: produce mouse events too
    return;
  }

  var buffer = [];
  var match;
  while ((match = escapeCodeReAnywhere.exec(s))) {
    buffer = buffer.concat(s.slice(0, match.index).split(""));
    buffer.push(match[0]);
    s = s.slice(match.index + match[0].length);
  }
  buffer = buffer.concat(s.split(""));

  buffer.forEach(function(s) {
    var key = ({
        sequence: s,
        name: null,
        ctrl: false,
        meta: false,
        shift: false,
        fullName: "",
        code: null,
        ch: null
      }: KeyType),
      parts;

    if (s === "\r") {
      // carriage return
      key.name = "return";
    } else if (s === "\n") {
      // enter, should have been called linefeed
      // key.name = "enter";
      // linefeed
      key.name = "linefeed";
    } else if (s === "\t") {
      // tab
      key.name = "tab";
    } else if (
      s === "\b" ||
      s === "\x7f" ||
      s === "\x1b\x7f" ||
      s === "\x1b\b"
    ) {
      // backspace or ctrl+h
      key.name = "backspace";
      key.meta = s.charAt(0) === "\x1b";
    } else if (s === "\x1b" || s === "\x1b\x1b") {
      // escape key
      key.name = "escape";
      key.meta = s.length === 2;
    } else if (s === " " || s === "\x1b ") {
      key.name = "space";
      key.meta = s.length === 2;
    } else if (s.length === 1 && s <= "\x1f") {
      // ctrl+letter
      key.name = String.fromCharCode(s.charCodeAt(0) + 64).toLowerCase();
      key.ctrl = true;
    } else if (s.length === 1 && s >= "a" && s <= "z") {
      // lowercase letter
      key.name = s;
    } else if (s.length === 1 && s >= "A" && s <= "Z") {
      // shift+letter
      key.name = s.toLowerCase();
      key.shift = true;
    } else if ((parts = metaKeyCodeRe.exec(s))) {
      // meta+character key
      key.name = parts[1].toLowerCase();
      key.meta = true;
      key.shift = /^[A-Z]$/.test(parts[1]);
    } else if ((parts = functionKeyCodeRe.exec(s))) {
      // ansi escape sequence

      // reassemble the key code leaving out leading \x1b's,
      // the modifier key bitflag and any meaningless "1;" sequence
      var code =
          (parts[1] || "") +
          (parts[2] || "") +
          (parts[4] || "") +
          (parts[9] || ""),
        modifier = (parts[3] || parts[8] || 1) - 1;

      // Parse the key modifier
      key.ctrl = !!(modifier & 4);
      key.meta = !!(modifier & 10);
      key.shift = !!(modifier & 1);
      key.code = code;

      // Parse the key itself
      switch (code) {
        /* xterm/gnome ESC O letter */
        case "OP":
          key.name = "f1";
          break;
        case "OQ":
          key.name = "f2";
          break;
        case "OR":
          key.name = "f3";
          break;
        case "OS":
          key.name = "f4";
          break;

        /* xterm/rxvt ESC [ number ~ */
        case "[11~":
          key.name = "f1";
          break;
        case "[12~":
          key.name = "f2";
          break;
        case "[13~":
          key.name = "f3";
          break;
        case "[14~":
          key.name = "f4";
          break;

        /* from Cygwin and used in libuv */
        case "[[A":
          key.name = "f1";
          break;
        case "[[B":
          key.name = "f2";
          break;
        case "[[C":
          key.name = "f3";
          break;
        case "[[D":
          key.name = "f4";
          break;
        case "[[E":
          key.name = "f5";
          break;

        /* common */
        case "[15~":
          key.name = "f5";
          break;
        case "[17~":
          key.name = "f6";
          break;
        case "[18~":
          key.name = "f7";
          break;
        case "[19~":
          key.name = "f8";
          break;
        case "[20~":
          key.name = "f9";
          break;
        case "[21~":
          key.name = "f10";
          break;
        case "[23~":
          key.name = "f11";
          break;
        case "[24~":
          key.name = "f12";
          break;

        /* xterm ESC [ letter */
        case "[A":
          key.name = "up";
          break;
        case "[B":
          key.name = "down";
          break;
        case "[C":
          key.name = "right";
          break;
        case "[D":
          key.name = "left";
          break;
        case "[E":
          key.name = "clear";
          break;
        case "[F":
          key.name = "end";
          break;
        case "[H":
          key.name = "home";
          break;

        /* xterm/gnome ESC O letter */
        case "OA":
          key.name = "up";
          break;
        case "OB":
          key.name = "down";
          break;
        case "OC":
          key.name = "right";
          break;
        case "OD":
          key.name = "left";
          break;
        case "OE":
          key.name = "clear";
          break;
        case "OF":
          key.name = "end";
          break;
        case "OH":
          key.name = "home";
          break;

        /* xterm/rxvt ESC [ number ~ */
        case "[1~":
          key.name = "home";
          break;
        case "[2~":
          key.name = "insert";
          break;
        case "[3~":
          key.name = "delete";
          break;
        case "[4~":
          key.name = "end";
          break;
        case "[5~":
          key.name = "pageup";
          break;
        case "[6~":
          key.name = "pagedown";
          break;

        /* putty */
        case "[[5~":
          key.name = "pageup";
          break;
        case "[[6~":
          key.name = "pagedown";
          break;

        /* rxvt */
        case "[7~":
          key.name = "home";
          break;
        case "[8~":
          key.name = "end";
          break;

        /* rxvt keys with modifiers */
        case "[a":
          key.name = "up";
          key.shift = true;
          break;
        case "[b":
          key.name = "down";
          key.shift = true;
          break;
        case "[c":
          key.name = "right";
          key.shift = true;
          break;
        case "[d":
          key.name = "left";
          key.shift = true;
          break;
        case "[e":
          key.name = "clear";
          key.shift = true;
          break;

        case "[2$":
          key.name = "insert";
          key.shift = true;
          break;
        case "[3$":
          key.name = "delete";
          key.shift = true;
          break;
        case "[5$":
          key.name = "pageup";
          key.shift = true;
          break;
        case "[6$":
          key.name = "pagedown";
          key.shift = true;
          break;
        case "[7$":
          key.name = "home";
          key.shift = true;
          break;
        case "[8$":
          key.name = "end";
          key.shift = true;
          break;

        case "Oa":
          key.name = "up";
          key.ctrl = true;
          break;
        case "Ob":
          key.name = "down";
          key.ctrl = true;
          break;
        case "Oc":
          key.name = "right";
          key.ctrl = true;
          break;
        case "Od":
          key.name = "left";
          key.ctrl = true;
          break;
        case "Oe":
          key.name = "clear";
          key.ctrl = true;
          break;

        case "[2^":
          key.name = "insert";
          key.ctrl = true;
          break;
        case "[3^":
          key.name = "delete";
          key.ctrl = true;
          break;
        case "[5^":
          key.name = "pageup";
          key.ctrl = true;
          break;
        case "[6^":
          key.name = "pagedown";
          key.ctrl = true;
          break;
        case "[7^":
          key.name = "home";
          key.ctrl = true;
          break;
        case "[8^":
          key.name = "end";
          key.ctrl = true;
          break;

        /* misc. */
        case "[Z":
          key.name = "tab";
          key.shift = true;
          break;
        default:
          key.name = null;
          break;
      }
    }

    if (s.length === 1) {
      key.ch = s;
    }

    let fullName = key.name || "";
    if (key.shift) {
      fullName = "S-" + fullName;
    }

    if (key.meta) {
      fullName = "M-" + fullName;
    }
    if (key.ctrl) {
      fullName = "C-" + fullName;
    }
    key.fullName = fullName;

    callback(key);
  });
}

function _isMouse(s) {
  return (
    /\x1b\[M/.test(s) ||
    /\x1b\[M([\x00\u0020-\uffff]{3})/.test(s) ||
    /\x1b\[(\d+;\d+;\d+)M/.test(s) ||
    /\x1b\[<(\d+;\d+;\d+)([mM])/.test(s) ||
    /\x1b\[<(\d+;\d+;\d+;\d+)&w/.test(s) ||
    /\x1b\[24([0135])~\[(\d+),(\d+)\]\r/.test(s) ||
    /\x1b\[(O|I)/.test(s)
  );
}
