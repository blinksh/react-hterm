// @flow

import type { RRowType } from './model';

import { hterm, lib } from '../hterm_all.js';
import { touch, rowWidth, genKey } from './utils';
import { createNode, createDefaultNode } from './TextAttributes';

hterm.Terminal.prototype.decorate = function(div) {
  this.div_ = div;

  this.scrollPort_.decorate(div);
  this.scrollPort_.setUserCssUrl(this.prefs_.get('user-css'));
  this.scrollPort_.setUserCssText(this.prefs_.get('user-css-text'));

  this.div_.focus = this.focus.bind(this);

  this.setFontSize(this.prefs_.get('font-size'));
  this.syncFontFamily();

  this.setScrollbarVisible(this.prefs_.get('scrollbar-visible'));
  this.setScrollWheelMoveMultipler(
    this.prefs_.get('scroll-wheel-move-multiplier'),
  );

  this.document_ = this.scrollPort_.getDocument();

  this.document_.body.oncontextmenu = function() {
    return false;
  };

  var onMouse = this.onMouse_.bind(this);
  var screenNode = this.scrollPort_.getScreenNode();
  screenNode.addEventListener('mousedown', onMouse);
  screenNode.addEventListener('mouseup', onMouse);
  screenNode.addEventListener('mousemove', onMouse);
  this.scrollPort_.onScrollWheel = onMouse;

  screenNode.addEventListener('focus', this.onFocusChange_.bind(this, true));
  // Listen for mousedown events on the screenNode as in FF the focus
  // events don't bubble.
  screenNode.addEventListener(
    'mousedown',
    function() {
      setTimeout(this.onFocusChange_.bind(this, true));
    }.bind(this),
  );

  screenNode.addEventListener('blur', this.onFocusChange_.bind(this, false));

  var style = this.document_.createElement('style');
  style.textContent =
    '.cursor-node[focus="false"] {' +
    '  box-sizing: border-box;' +
    '  background-color: transparent !important;' +
    '  border-width: 2px;' +
    '  border-style: solid;' +
    '  isolatation: isolate;' +
    '}' +
    '.wc-node {' +
    '  display: inline-block;' +
    '  text-align: center;' +
    '  width: calc(var(--hterm-charsize-width) * 2);' +
    '  line-height: var(--hterm-charsize-height);' +
    '}' +
    ':root {' +
    '  --hterm-charsize-width: ' +
    this.scrollPort_.characterSize.width +
    'px;' +
    '  --hterm-charsize-height: ' +
    this.scrollPort_.characterSize.height +
    'px;' +
    // Default position hides the cursor for when the window is initializing.
    '  --hterm-cursor-offset-col: -1;' +
    '  --hterm-cursor-offset-row: -1;' +
    '  --hterm-blink-node-duration: 0.7s;' +
    '  --hterm-mouse-cursor-text: text;' +
    '  --hterm-mouse-cursor-pointer: default;' +
    '  --hterm-mouse-cursor-style: var(--hterm-mouse-cursor-text);' +
    '}' +
    '.uri-node:hover {' +
    '  text-decoration: underline;' +
    '  cursor: pointer;' +
    '}' +
    '@keyframes blink {' +
    '  from { opacity: 1.0; }' +
    '  to { opacity: 0.0; }' +
    '}' +
    '.blink-node {' +
    '  animation-name: blink;' +
    '  animation-duration: var(--hterm-blink-node-duration);' +
    '  animation-iteration-count: infinite;' +
    '  animation-timing-function: ease-in-out;' +
    '  animation-direction: alternate;' +
    '}';
  this.document_.head.appendChild(style);

  this.cursorNode_ = this.document_.createElement('div');
  this.cursorNode_.id = 'hterm:terminal-cursor';
  this.cursorNode_.className = 'cursor-node';
  this.cursorNode_.style.cssText =
    'position: absolute;' +
    'left: calc(var(--hterm-charsize-width) * var(--hterm-cursor-offset-col));' +
    'top: calc(var(--hterm-charsize-height) * var(--hterm-cursor-offset-row));' +
    'display: block;' +
    'width: var(--hterm-charsize-width);' +
    'height: var(--hterm-charsize-height);' +
    '-webkit-transition: opacity, background-color 100ms linear;' +
    '-moz-transition: opacity, background-color 100ms linear;';

  this.setCursorColor();
  this.setCursorBlink(!!this.prefs_.get('cursor-blink'));
  this.restyleCursor_();

  this.document_.body.appendChild(this.cursorNode_);

  // When 'enableMouseDragScroll' is off we reposition this element directly
  // under the mouse cursor after a click.  This makes Chrome associate
  // subsequent mousemove events with the scroll-blocker.  Since the
  // scroll-blocker is a peer (not a child) of the scrollport, the mousemove
  // events do not cause the scrollport to scroll.
  //
  // It's a hack, but it's the cleanest way I could find.
  this.scrollBlockerNode_ = this.document_.createElement('div');
  this.scrollBlockerNode_.id = 'hterm:mouse-drag-scroll-blocker';
  this.scrollBlockerNode_.style.cssText =
    'position: absolute;' +
    'top: -99px;' +
    'display: block;' +
    'width: 10px;' +
    'height: 10px;';
  this.document_.body.appendChild(this.scrollBlockerNode_);

  this.scrollPort_.onScrollWheel = onMouse;
  ['mousedown', 'mouseup', 'mousemove', 'click', 'dblclick'].forEach(
    function(event) {
      this.scrollBlockerNode_.addEventListener(event, onMouse);
      this.cursorNode_.addEventListener(event, onMouse);
      this.document_.addEventListener(event, onMouse);
    }.bind(this),
  );

  this.cursorNode_.addEventListener(
    'mousedown',
    function() {
      setTimeout(this.focus.bind(this));
    }.bind(this),
  );

  this.setReverseVideo(false);

  this.scrollPort_.focus();
  this.scrollPort_.scheduleRedraw();
};

hterm.Terminal.prototype.scheduleSyncCursorPosition_ = function() {
  if (this.timeouts_.syncCursor) {
    return;
  }

  var self = this;
  this.timeouts_.syncCursor = setTimeout(function() {
    requestAnimationFrame(function() {
      self.syncCursorPosition_();
      self.timeouts_.syncCursor = 0;
    });
  }, 0);
};

hterm.Terminal.prototype.scheduleRedraw_ = function() {
  if (this.timeouts_.redraw) {
    return;
  }

  var self = this;
  this.timeouts_.redraw = setTimeout(function() {
    self.timeouts_.redraw = 0;
    self.scrollPort_.redraw_();
  }, 0);
};

hterm.Terminal.prototype.scheduleScrollDown_ = function() {
  if (this.timeouts_.scrollDown) {
    return;
  }

  var self = this;
  this.timeouts_.scrollDown = setTimeout(function() {
    self.timeouts_.scrollDown = 0;
    self.scrollPort_.scrollToBottom();
  }, 10);
};

hterm.Terminal.prototype.copySelectionToClipboard = function() {};

hterm.Terminal.prototype.renumberRows_ = function(start, end, opt_screen) {
  var screen = opt_screen || this.screen_;

  var offset = this.scrollbackRows_.length;
  var rows = screen.rowsArray;
  for (var i = start; i < end; i++) {
    var row = rows[i];
    row.n = offset + i;
    touch(row);
  }
};

hterm.Terminal.prototype.appendRows_ = function(count) {
  var needScrollSync = false;
  if (this.scrollbackRows_.length > 4000) {
    this.scrollbackRows_.splice(0, 2000);
    needScrollSync = true;
  }

  var cursorRow = this.screen_.rowsArray.length;
  var offset = this.scrollbackRows_.length + cursorRow;
  for (var i = 0; i < count; i++) {
    var row: RRowType = {
      key: genKey(),
      n: offset + i,
      o: false,
      v: 0,
      nodes: [createDefaultNode('', 0)],
    };
    this.screen_.pushRow(row);
  }

  var extraRows = this.screen_.rowsArray.length - this.screenSize.height;
  if (extraRows > 0) {
    var ary = this.screen_.shiftRows(extraRows);
    Array.prototype.push.apply(this.scrollbackRows_, ary);
    if (this.scrollPort_.isScrolledEnd) this.scheduleScrollDown_();
  }

  if (needScrollSync) {
    this.scrollPort_.syncScrollHeight();
    //if (this.scrollPort_.isScrolledEnd) {
    this.scheduleScrollDown_();
    //}
  }

  if (cursorRow >= this.screen_.rowsArray.length)
    cursorRow = this.screen_.rowsArray.length - 1;

  this.setAbsoluteCursorPosition(cursorRow, 0);
};

hterm.Terminal.prototype.moveRows_ = function(fromIndex, count, toIndex) {
  var ary = this.screen_.removeRows(fromIndex, count);
  this.screen_.insertRows(toIndex, ary);

  var start, end;
  if (fromIndex < toIndex) {
    start = fromIndex;
    end = toIndex + count;
  } else {
    start = toIndex;
    end = fromIndex + count;
  }

  this.renumberRows_(start, end);
  this.scrollPort_.scheduleInvalidate();
};

hterm.Terminal.prototype.eraseToRight = function(opt_count) {
  if (this.screen_.cursorPosition.overflow) {
    return;
  }

  var maxCount = this.screenSize.width - this.screen_.cursorPosition.column;
  var count = opt_count ? Math.min(opt_count, maxCount) : maxCount;

  if (
    this.screen_.textAttributes.background ===
    this.screen_.textAttributes.DEFAULT_COLOR
  ) {
    var cursorRow = this.screen_.rowsArray[this.screen_.cursorPosition.row];
    if (rowWidth(cursorRow) <= this.screen_.cursorPosition.column + count) {
      this.screen_.deleteChars(count);
      this.clearCursorOverflow();
      touch(cursorRow);
      this.scrollPort_.renderRef.touch();
      return;
    }
  }

  var cursor = this.saveCursor();
  this.screen_.overwriteString(lib.f.getWhitespace(count), count);
  this.scrollPort_.renderRef.touch();
  this.restoreCursor(cursor);
  this.clearCursorOverflow();
};

hterm.Terminal.prototype.eraseAbove = function() {
  var cursor = this.saveCursor();

  this.eraseToLeft();

  for (var i = 0; i < cursor.row; i++) {
    this.setAbsoluteCursorPosition(i, 0);
    this.screen_.clearCursorRow();
  }

  this.restoreCursor(cursor);
  this.clearCursorOverflow();
  this.scrollPort_.renderRef.touch();
};

hterm.Terminal.prototype.eraseLine = function() {
  var cursor = this.saveCursor();
  this.screen_.clearCursorRow();
  this.restoreCursor(cursor);
  this.clearCursorOverflow();
  this.scrollPort_.renderRef.touch();
};

hterm.Terminal.prototype.clearHome = function(opt_screen) {
  var screen = opt_screen || this.screen_;
  var bottom = screen.getHeight();

  if (bottom === 0) {
    // Empty screen, nothing to do.
    return;
  }

  for (var i = 0; i < bottom; i++) {
    screen.setCursorPosition(i, 0);
    screen.clearCursorRow();
  }

  screen.setCursorPosition(0, 0);
  this.scrollPort_.renderRef.touch();
};

hterm.Terminal.prototype.eraseBelow = function() {
  var cursor = this.saveCursor();

  this.eraseToRight();

  var bottom = this.screenSize.height - 1;
  for (var i = cursor.row + 1; i <= bottom; i++) {
    this.setAbsoluteCursorPosition(i, 0);
    this.screen_.clearCursorRow();
  }

  this.restoreCursor(cursor);
  this.clearCursorOverflow();
  this.scrollPort_.renderRef.touch();
};

hterm.Terminal.prototype.print = function(str) {
  var startOffset = 0;

  var strWidth = lib.wc.strWidth(str);
  // Fun edge case: If the string only contains zero width codepoints (like
  // combining characters), we make sure to iterate at least once below.
  if (strWidth === 0 && str) strWidth = 1;

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
    var len = tokens.length;
    for (var i = 0; i < len; i++) {
      var token = tokens[i];
      this.screen_.textAttributes.wcNode = token.wcNode;
      this.screen_.textAttributes.asciiNode = token.asciiNode;

      if (this.options_.insertMode) {
        this.screen_.insertString(token.str, token.wcStrWidth);
      } else {
        this.screen_.overwriteString(token.str, token.wcStrWidth);
      }
      this.screen_.textAttributes.wcNode = false;
      this.screen_.textAttributes.asciiNode = true;
    }

    this.screen_.maybeClipCurrentRow();
    startOffset += count;
  }

  this.scheduleSyncCursorPosition_();

  if (this.scrollOnOutput_) {
    this.scrollPort_.scrollRowToBottom(this.getRowCount());
  }

  this.scrollPort_.renderRef.touch();
};
