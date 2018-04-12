// @flow

// Copyright (c) 2012 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { hterm } from '../hterm_all.js';
import ReactDOM from 'react-dom';

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

  handler.call(this, parseState, code);
  //if (!handler._binded) {
  //handler._binded = handler.bind(this);
  //}
  //handler._binded(parseState, code);
};

hterm.VT.ParseState.prototype.peekRemainingBuf = function() {
  return this.buf.substr(this.pos);
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

/**
 * Interpret a string of characters, displaying the results on the associated
 * terminal object.
 *
 * The buffer will be decoded according to the 'receive-encoding' preference.
 */
var __buffQueue = [];
var __currentParseState = null;
var __busy: boolean | AnimationFrameID = false;
var __vt;

function __interpret() {
  var vt = __vt;

  while (true) {
    if (__currentParseState === null) {
      var buf = __buffQueue.shift();
      if (buf == null) {
        break;
      }
      vt.parseState_.resetBuf(buf);
      __currentParseState = vt.parseState_;
    }

    while (!__currentParseState.isComplete()) {
      var func = vt.parseState_.func;
      var pos = vt.parseState_.pos;
      var buf = vt.parseState_.buf;

      vt.parseState_.func.call(vt, vt.parseState_);

      if (
        vt.parseState_.func == func &&
        vt.parseState_.pos == pos &&
        vt.parseState_.buf == buf
      ) {
        __busy = false;
        __currentParseState = null;
        throw 'Parser did not alter the state!';
      }
    }
    __currentParseState = null;
  }
  window.t.syncCursorPosition_();
  __busy = false;
}

hterm.VT.prototype.interpret = function(buf) {
  __vt = this;
  __buffQueue.push(this.decode(buf));
  if (__busy) {
    return;
  }

  __busy = true;
  ReactDOM.unstable_deferredUpdates(__interpret);
};

function __finishParsing(parseState) {
  // Resetting the arguments isn't strictly necessary, but it makes debugging
  // less confusing (otherwise args will stick around until the next sequence
  // that needs arguments).
  parseState.resetArguments();
  // We need to clear subargs since we explicitly set it.
  parseState.subargs = null;
  parseState.resetParseFunction();
}

hterm.VT.prototype.parseCSI_ = function(parseState) {
  var ch = parseState.peekChar();
  var args = parseState.args;

  if (ch >= '@' && ch <= '~') {
    // This is the final character.
    this.dispatch(
      'CSI',
      this.leadingModifier_ + this.trailingModifier_ + ch,
      parseState,
    );
    __finishParsing(parseState);
  } else if (ch === ';') {
    // Parameter delimiter.
    if (this.trailingModifier_) {
      // Parameter delimiter after the trailing modifier.  That's a paddlin'.
      __finishParsing(parseState);
    } else {
      if (!args.length) {
        // They omitted the first param, we need to supply it.
        args.push('');
      }

      args.push('');
    }
  } else if ((ch >= '0' && ch <= '9') || ch === ':') {
    // Next byte in the current parameter.

    if (this.trailingModifier_) {
      // Numeric parameter after the trailing modifier.  That's a paddlin'.
      __finishParsing(parseState);
    } else {
      if (args.length) {
        args[args.length - 1] += ch;
      } else {
        args[0] = ch;
      }

      // Possible sub-parameters.
      if (ch === ':') {
        parseState.argSetSubargs(args.length - 1);
      }
    }
  } else if (ch >= ' ' && ch <= '?') {
    // Modifier character.
    if (args.length) {
      this.trailingModifier_ += ch;
    } else {
      this.leadingModifier_ += ch;
    }
  } else if (this.cc1Pattern_.test(ch)) {
    // Control character.
    this.dispatch('CC1', ch, parseState);
  } else {
    // Unexpected character in sequence, bail out.
    __finishParsing(parseState);
  }

  parseState.advance(1);
};

var _VTMaps: Map<string, Map<string, Function>> = new Map();

function __parseESC(parseState) {
  var ch = parseState.consumeChar();

  if (ch == '\x1b') {
    return;
  }

  this.dispatch('ESC', ch, parseState);

  if (parseState.func == __parseESC) {
    parseState.resetParseFunction();
  }
}

hterm.VT.ParseState.prototype.resetArguments = function() {
  this.args = [];
  //this.args.length = 0;
  //if (typeof opt_arg_zero != 'undefined') this.args[0] = opt_arg_zero;
};

hterm.VT.ParseState.prototype.parseInt = function(argstr, defaultValue) {
  const ret = argstr >> 0;
  if (ret === 0) {
    return defaultValue === undefined ? ret : defaultValue;
  }

  return ret;
};

function __parseIndexColor(
  args: number[],
  i: number,
  attrs: hterm.TextAttributes,
): { skipCount: number, color?: number } {
  // Color palette index.
  // If we're short on args, assume this sequence is corrupted, so don't
  // eat anything more.
  if (args.length - i + 1 < 2) {
    return { skipCount: 0 };
  }

  // Support 38:5:P (ISO 8613-6) and 38;5;P (xterm/legacy).
  // We also ignore extra args with 38:5:P:[...], but more for laziness.
  const color = args[i + 2] >> 0;
  if (color < attrs.colorPalette.length) {
    return {
      skipCount: 2,
      color,
    };
  }
  return {
    skipCount: 2,
  };
}

hterm.VT.prototype.parseSgrExtendedColors = function(parseState, i, attrs) {
  let ary;
  let usedSubargs;

  if (parseState.argHasSubargs(i)) {
    // The ISO 8613-6 compliant form.
    // e.g. 38:[color choice]:[arg1]:[arg2]:...
    ary = parseState.args[i].split(':');
    ary.shift(); // Remove "38".
    usedSubargs = true;
  } else if (parseState.argHasSubargs(i + 1)) {
    // The xterm form which isn't ISO 8613-6 compliant.  Not many emulators
    // support this, and others actively do not want to.  We'll ignore it so
    // at least the rest of the stream works correctly.  e.g. 38;2:R:G:B
    // We return 0 here so we only skip the "38" ... we can't be confident the
    // next arg is actually supposed to be part of it vs a typo where the next
    // arg is legit.
    return { skipCount: 0 };
  } else {
    // The xterm form which isn't ISO 8613-6 compliant, but many emulators
    // support, and many applications rely on.
    // e.g. 38;2;R;G;B
    // try to avoid slice
    if (parseState.args[i + 1] >> 0 === 5) {
      return __parseIndexColor(parseState.args, i, attrs);
    }
    ary = parseState.args.slice(i + 1);
    usedSubargs = false;
  }

  // Figure out which form to parse.
  switch (ary[0] >> 0) {
    default: // Unknown.
    case 0: // Implementation defined.  We ignore it.
      return { skipCount: 0 };

    case 1: {
      // Transparent color.
      // Require ISO 8613-6 form.
      if (!usedSubargs) return { skipCount: 0 };

      return {
        color: 'rgba(0, 0, 0, 0)',
        skipCount: 0,
      };
    }

    case 2: {
      // RGB color.
      // Skip over the color space identifier, if it exists.
      let start;
      if (usedSubargs) {
        // The ISO 8613-6 compliant form:
        //   38:2:<color space id>:R:G:B[:...]
        // The xterm form isn't ISO 8613-6 compliant.
        //   38:2:R:G:B
        // Since the ISO 8613-6 form requires at least 5 arguments,
        // we can still support the xterm form unambiguously.
        if (ary.length == 4) start = 1;
        else start = 2;
      } else {
        // The legacy xterm form: 38;2;R;G;B
        start = 1;
      }

      // We need at least 3 args for RGB.  If we don't have them, assume this
      // sequence is corrupted, so don't eat anything more.
      // We ignore more than 3 args on purpose since ISO 8613-6 defines some,
      // and we don't care about them.
      if (ary.length < start + 3) return { skipCount: 0 };

      const r = ary[start + 0] >> 0;
      const g = ary[start + 1] >> 0;
      const b = ary[start + 2] >> 0;
      return {
        color: `rgb(${r}, ${g}, ${b})`,
        skipCount: usedSubargs ? 0 : 4,
      };
    }

    case 3: {
      // CMY color.
      // No need to support xterm/legacy forms as xterm doesn't support CMY.
      if (!usedSubargs) return { skipCount: 0 };

      // We need at least 4 args for CMY.  If we don't have them, assume
      // this sequence is corrupted.  We ignore the color space identifier,
      // tolerance, etc...
      if (ary.length < 4) return { skipCount: 0 };

      // TODO: See CMYK below.
      const c = ary[1] >> 0;
      const m = ary[2] >> 0;
      const y = ary[3] >> 0;
      return { skipCount: 0 };
    }

    case 4: {
      // CMYK color.
      // No need to support xterm/legacy forms as xterm doesn't support CMYK.
      if (!usedSubargs) return { skipCount: 0 };

      // We need at least 5 args for CMYK.  If we don't have them, assume
      // this sequence is corrupted.  We ignore the color space identifier,
      // tolerance, etc...
      if (ary.length < 5) return { skipCount: 0 };

      // TODO: Implement this.
      // Might wait until CSS4 is adopted for device-cmyk():
      // https://www.w3.org/TR/css-color-4/#cmyk-colors
      // Or normalize it to RGB ourselves:
      // https://www.w3.org/TR/css-color-4/#cmyk-rgb
      const c = ary[1] >> 0;
      const m = ary[2] >> 0;
      const y = ary[3] >> 0;
      const k = ary[4] >> 0;
      return { skipCount: 0 };
    }

    case 5: {
      // Color palette index.
      // If we're short on args, assume this sequence is corrupted, so don't
      // eat anything more.
      if (ary.length < 2) return { skipCount: 0 };

      // Support 38:5:P (ISO 8613-6) and 38;5;P (xterm/legacy).
      // We also ignore extra args with 38:5:P:[...], but more for laziness.
      const ret = {
        skipCount: usedSubargs ? 0 : 2,
      };
      const color = ary[1] >> 0;
      if (color < attrs.colorPalette.length) ret.color = color;
      return ret;
    }
  }
};

hterm.VT.CC1['\x1b'] = function(parseState) {
  parseState.func = __parseESC;
};

['CC1', 'ESC', 'CSI', 'OSC', 'VT52'].forEach(type => {
  var map: Map<string, Function> = new Map();
  var obj = hterm.VT[type];
  Object.keys(obj).map(k => {
    map.set(k, obj[k]);
  });
  _VTMaps.set(type, map);
});
