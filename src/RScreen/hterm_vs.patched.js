// @flow

// Copyright (c) 2012 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { hterm, lib } from '../hterm_all.js';

/**
 * Skip over the string until the next String Terminator (ST, 'ESC \') or
 * Bell (BEL, '\x07').
 *
 * The string is accumulated in parseState.args[0].  Make sure to reset the
 * arguments (with parseState.resetArguments) before starting the parse.
 *
 * You can detect that parsing in complete by checking that the parse
 * function has changed back to the default parse function.
 *
 * @return {boolean} If true, parsing is ongoing or complete.  If false, we've
 *     exceeded the max string sequence.
 */
var _codeRegex = /[\x1b\x07]/;
hterm.VT.prototype.parseUntilStringTerminator_ = function(parseState) {
  var buf = parseState.peekRemainingBuf();
  var args = parseState.args;
  // Since we might modify parse state buffer locally, if we want to advance
  // the parse state buffer later on, we need to know how many chars we added.
  let bufInserted = 0;

  if (!args.length) {
    args[0] = '';
    args[1] = new Date();
  } else {
    // If our saved buffer ends with an escape, it's because we were hoping
    // it's an ST split across two buffers.  Move it from our saved buffer
    // to the start of our current buffer for processing anew.
    if (args[0].slice(-1) == '\x1b') {
      args[0] = args[0].slice(0, -1);
      buf = '\x1b' + buf;
      bufInserted = 1;
    }
  }

  const nextTerminator = buf.search(_codeRegex);
  const terminator = buf.charAt(nextTerminator);
  let foundTerminator;

  // If the next escape we see is not a start of a ST, fall through.  This will
  // either be invalid (embedded escape), or we'll queue it up (wait for \\).
  if (terminator == '\x1b' && buf.charAt(nextTerminator + 1) !== '\\') {
    foundTerminator = false;
  } else {
    foundTerminator = nextTerminator !== -1;
  }

  if (!foundTerminator) {
    // No terminator here, have to wait for the next string.

    args[0] += buf;

    var abortReason;

    // Special case: If our buffering happens to split the ST (\e\\), we have to
    // buffer the content temporarily.  So don't reject a trailing escape here,
    // instead we let it timeout or be rejected in the next pass.
    if (terminator == '\x1b' && nextTerminator != buf.length - 1)
      abortReason = 'embedded escape: ' + nextTerminator;

    if (new Date() - args[1] > this.oscTimeLimit_)
      abortReason = 'timeout expired: ' + (new Date() - args[1]);

    if (abortReason) {
      if (this.warnUnimplemented)
        console.log(
          'parseUntilStringTerminator_: aborting: ' + abortReason,
          args[0],
        );
      parseState.reset(args[0]);
      return false;
    }

    parseState.advance(buf.length - bufInserted);
    return true;
  }

  args[0] += buf.substr(0, nextTerminator);

  parseState.resetParseFunction();
  parseState.advance(
    nextTerminator + (terminator == '\x1b' ? 2 : 1) - bufInserted,
  );

  return true;
};

/**
 * Dispatch to the function that handles a given CC1, ESC, or CSI or VT52 code.
 */
hterm.VT.prototype.dispatch = function(type, code, parseState) {
  var handler = _VTMaps.get(type).get(code);
  if (!handler) {
    if (this.warnUnimplemented)
      console.warn('Unknown ' + type + ' code: ' + JSON.stringify(code));
    return;
  }

  if (handler === hterm.VT.ignore) {
    if (this.warnUnimplemented)
      console.warn('Ignored ' + type + ' code: ' + JSON.stringify(code));
    return;
  }

  if (parseState.subargs && !handler.supportsSubargs) {
    if (this.warnUnimplemented)
      console.warn(
        'Ignored ' + type + ' code w/subargs: ' + JSON.stringify(code),
      );
    return;
  }

  if (type === 'CC1' && code > '\x7f' && !this.enable8BitControl) {
    // It's kind of a hack to put this here, but...
    //
    // If we're dispatching a 'CC1' code, and it's got the eighth bit set,
    // but we're not supposed to handle 8-bit codes?  Just ignore it.
    //
    // This prevents an errant (DCS, '\x90'), (OSC, '\x9d'), (PM, '\x9e') or
    // (APC, '\x9f') from locking up the terminal waiting for its expected
    // (ST, '\x9c') or (BEL, '\x07').
    console.warn(
      'Ignoring 8-bit control code: 0x' + code.charCodeAt(0).toString(16),
    );
    return;
  }

  if (!handler._binded) {
    handler._binded = handler.bind(this);
  }
  handler._binded(parseState, code);
};

hterm.VT.ParseState.prototype.peekRemainingBuf = function() {
  return this.buf.substring(this.pos);
};

hterm.VT.ParseState.prototype.peekChar = function() {
  return this.buf.charAt(this.pos);
};

/**
 * Return the next single character in the buffer and advance the parse
 * position one byte.
 *
 * @return {string} The next character in the buffer.
 */
hterm.VT.ParseState.prototype.consumeChar = function() {
  return this.buf.charAt(this.pos++);
};

function __print(self: hterm.VT, str: string) {
  if (!self.codingSystemUtf8_ && self[self.GL].GL) {
    str = self[self.GL].GL(str);
  }

  self.terminal.print(str);
}

hterm.VT.prototype.parseUnknown_ = function(parseState) {
  // Search for the next contiguous block of plain text.
  var buf = parseState.peekRemainingBuf();
  var nextControl = buf.search(this.cc1Pattern_);

  if (nextControl === 0) {
    // We've stumbled right into a control character.
    this.dispatch('CC1', buf.charAt(0), parseState);
    parseState.advance(1);
    return;
  }

  if (nextControl === -1) {
    // There are no control characters in this string.
    __print(this, buf);
    parseState.reset();
    return;
  }

  __print(this, buf.substr(0, nextControl));
  this.dispatch('CC1', buf.charAt(nextControl), parseState);
  parseState.advance(nextControl + 1);
};

var _VTMaps: Map<string, Map<string, Function>> = new Map();

['CC1', 'ESC', 'CSI', 'OSC', 'VT52'].forEach(type => {
  var map: Map<string, Function> = new Map();
  var obj = hterm.VT[type];
  Object.keys(obj).map(k => {
    map.set(k, obj[k]);
  });
  _VTMaps.set(type, map);
});
