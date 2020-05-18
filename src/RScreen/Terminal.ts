import { RRowType } from "./model";
import { hterm, lib } from "../hterm_all";
import { touch, rowWidth, rowText, genKey } from "./utils";
import { createDefaultNode } from "./TextAttributes";
import "./AccessibilityReader";
import Prompt from "../readline/prompt";

hterm.Terminal.prototype.decorate = function (div: HTMLElement) {
  this.div_ = document.body;

  this.accessibilityReader_ = new hterm.AccessibilityReader(this.div_);
  this.scrollPort_.decorate(div);
  this.scrollPort_.setUserCssUrl(this.prefs_.get("user-css"));
  this.scrollPort_.setUserCssText(this.prefs_.get("user-css-text"));
  this.scrollPort_.setAccessibilityReader(this.accessibilityReader_);

  this.div_.focus = this.focus.bind(this);

  this.setFontSize(this.prefs_.get("font-size"));
  this.syncFontFamily();

  this.setScrollbarVisible(this.prefs_.get("scrollbar-visible"));
  this.setScrollWheelMoveMultipler(
    this.prefs_.get("scroll-wheel-move-multiplier")
  );

  this.document_ = this.scrollPort_.getDocument();

  this.document_.body.oncontextmenu = function () {
    return false;
  };

  var onMouse = this.onMouse_.bind(this);
  var screenNode = this.scrollPort_.getScreenNode();
  screenNode.addEventListener("mousedown", onMouse);
  screenNode.addEventListener("mouseup", onMouse);
  screenNode.addEventListener("mousemove", onMouse);
  this.scrollPort_.onScrollWheel = onMouse;

  let onFocuseChange = this.onFocusChange_.bind(this, true);
  screenNode.addEventListener("focus", onFocuseChange);
  // Listen for mousedown events on the screenNode as in FF the focus
  // events don't bubble.
  screenNode.addEventListener(
    "mousedown",
    function () {
      setTimeout(onFocuseChange);
    }.bind(this)
  );

  screenNode.addEventListener("blur", this.onFocusChange_.bind(this, false));

  var style = this.document_.createElement("style");
  style.textContent =
    '.cursor-node[focus="false"] {' +
    "  box-sizing: border-box;" +
    "  background-color: transparent !important;" +
    "  border-width: 2px;" +
    "  border-style: solid;" +
    "}" +
    ".wc-node {" +
    "  display: inline-block;" +
    "  text-align: center;" +
    "  width: calc(var(--hterm-charsize-width) * 2);" +
    "  line-height: var(--hterm-charsize-height);" +
    "}" +
    ":root {" +
    "  --hterm-charsize-width: " +
    this.scrollPort_.characterSize.width +
    "px;" +
    "  --hterm-charsize-height: " +
    this.scrollPort_.characterSize.height +
    "px;" +
    // Default position hides the cursor for when the window is initializing.
    "  --hterm-cursor-offset-col: -1;" +
    "  --hterm-cursor-offset-row: -1;" +
    "  --hterm-blink-node-duration: 0.7s;" +
    "  --hterm-mouse-cursor-text: text;" +
    "  --hterm-mouse-cursor-pointer: default;" +
    "  --hterm-mouse-cursor-style: var(--hterm-mouse-cursor-text);" +
    "}" +
    ".uri-node:hover {" +
    "  text-decoration: underline;" +
    "  cursor: pointer;" +
    "}" +
    "@keyframes blink {" +
    "  from { opacity: 1.0; }" +
    "  to { opacity: 0.0; }" +
    "}" +
    ".blink-node {" +
    "  animation-name: blink;" +
    "  animation-duration: var(--hterm-blink-node-duration);" +
    "  animation-iteration-count: infinite;" +
    "  animation-timing-function: ease-in-out;" +
    "  animation-direction: alternate;" +
    "}";
  this.document_.head.appendChild(style);

  this.cursorOverlayNode_ = this.document_.createElement("div");
  this.cursorOverlayNode_.id = "hterm:terminal-overlay-cursor";
  this.cursorOverlayNode_.style.cssText =
    "position: absolute;" +
    "left: 0;" +
    "top: 0;" +
    "bottom: 0;" +
    "right: 0;" +
    "pointer-events: none;";

  this.document_.body.appendChild(this.cursorOverlayNode_);

  this.cursorNode_ = this.document_.createElement("div");
  this.cursorNode_.id = "hterm:terminal-cursor";
  this.cursorNode_.className = "cursor-node";
  this.cursorNode_.style.cssText =
    "position: absolute;" +
    //'left: calc(var(--hterm-charsize-width) * var(--hterm-cursor-offset-col));' +
    //'top: calc(var(--hterm-charsize-height) * var(--hterm-cursor-offset-row));' +
    "display: " +
    (this.options_.cursorVisible ? "" : "none") +
    ";" +
    "width: var(--hterm-charsize-width);" +
    "height: var(--hterm-charsize-height);" +
    "background-color: var(--hterm-cursor-color);" +
    "border-color: var(--hterm-cursor-color);" +
    "  isolatation: isolate;" +
    "  transform: translate3d(calc(var(--hterm-charsize-width) * var(--hterm-cursor-offset-col)), calc(var(--hterm-charsize-height) * var(--hterm-cursor-offset-row)), 0);" +
    "-webkit-transition: opacity, background-color 100ms linear;" +
    "-moz-transition: opacity, background-color 100ms linear;";

  this.setCursorColor();
  this.setCursorBlink(!!this.prefs_.get("cursor-blink"));
  this.restyleCursor_();

  this.cursorOverlayNode_.appendChild(this.cursorNode_);

  this.ime_ = this.document_.createElement("ime");
  this.cursorOverlayNode_.appendChild(this.ime_);

  // When 'enableMouseDragScroll' is off we reposition this element directly
  // under the mouse cursor after a click.  This makes Chrome associate
  // subsequent mousemove events with the scroll-blocker.  Since the
  // scroll-blocker is a peer (not a child) of the scrollport, the mousemove
  // events do not cause the scrollport to scroll.
  //
  // It's a hack, but it's the cleanest way I could find.
  this.scrollBlockerNode_ = this.document_.createElement("div");
  this.scrollBlockerNode_.id = "hterm:mouse-drag-scroll-blocker";
  this.scrollBlockerNode_.style.cssText =
    "position: absolute;" +
    "top: -99px;" +
    "display: block;" +
    "width: 10px;" +
    "height: 10px;";
  this.document_.body.appendChild(this.scrollBlockerNode_);

  this.scrollPort_.onScrollWheel = onMouse;
  ["mousedown", "mouseup", "mousemove", "click", "dblclick"].forEach(
    (event) => {
      this.scrollBlockerNode_.addEventListener(event, onMouse);
      this.cursorNode_.addEventListener(event, onMouse);
      this.document_.addEventListener(event, onMouse);
    }
  );

  this.cursorNode_.addEventListener("mousedown", () => {
    setTimeout(this.focus.bind(this));
  });

  this.setReverseVideo(false);

  this.scrollPort_.focus();
  this.scrollPort_.scheduleRedraw();
  this.prompt = new Prompt(this);
};

hterm.Terminal.prototype.syncCursorPosition_ = function () {
  var topRowIndex = this.scrollPort_.getTopRowIndex();
  var bottomRowIndex = this.scrollPort_.getBottomRowIndex(topRowIndex);
  var cursorRowIndex =
    this.scrollbackRows_.length + this.screen_.cursorPosition.row;

  let forceSyncSelection = false;
  if (this.accessibilityReader_.accessibilityEnabled) {
    // Report the new position of the cursor for accessibility purposes.
    const cursorColumnIndex = this.screen_.cursorPosition.column;
    var node = this.getRowNode(this.screen_.cursorPosition.row);
    const cursorLineText = rowText(node);
    // This will force the selection to be sync'd to the cursor position if the
    // user has pressed a key. Generally we would only sync the cursor position
    // when selection is collapsed so that if the user has selected something
    // we don't clear the selection by moving the selection. However when a
    // screen reader is used, it's intuitive for entering a key to move the
    // selection to the cursor.
    forceSyncSelection = this.accessibilityReader_.hasUserGesture;
    this.accessibilityReader_.afterCursorChange(
      cursorLineText,
      cursorRowIndex,
      cursorColumnIndex
    );
  }

  if (cursorRowIndex > bottomRowIndex) {
    // Cursor is scrolled off screen, move it outside of the visible area.
    //this.setCssCursorPos({ row: -1, col: this.screen_.cursorPosition.column });
    this.setCssCursorPos({ row: -1, col: -1 });
    return;
  }

  if (this.options_.cursorVisible && this.cursorNode_.style.display == "none") {
    // Re-display the terminal cursor if it was hidden by the mouse cursor.
    this.cursorNode_.style.display = "";
  }

  this.setCssCursorPos({
    row: cursorRowIndex - topRowIndex + this.scrollPort_.visibleRowTopMargin,
    col: this.screen_.cursorPosition.column,
  });

  // Update the caret for a11y purposes.
  var selection = this.document_.getSelection();
  if (selection && (selection.isCollapsed || forceSyncSelection))
    this.screen_.syncSelectionCaret(selection);
};

var __prevCursorPos = { row: -1, col: -1 };

hterm.Terminal.prototype.setCssCursorPos = function (pos: {
  row: number;
  col: number;
}) {
  if (__prevCursorPos.row === pos.row && __prevCursorPos.col === pos.col) {
    return;
  }

  if (__prevCursorPos.row === -1 && pos.row === -1) {
    return;
  }

  if (__prevCursorPos.row !== pos.row) {
    this.setCursorCssVar("cursor-offset-row", pos.row + "");
  }

  if (__prevCursorPos.col !== pos.col) {
    this.setCursorCssVar("cursor-offset-col", pos.col + "");
  }
  this.blinkCursorPos = pos;
  __prevCursorPos = pos;
};

hterm.Terminal.prototype.setCursorCssVar = function (
  name: any,
  value: any,
  // @ts-ignore
  opt_prefix = "--hterm-"
) {
  this.cursorOverlayNode_.style.setProperty(`${opt_prefix}${name}`, value);
};

hterm.Terminal.prototype.scheduleSyncCursorPosition_ = function () {
  if (this.timeouts_.syncCursor) {
    return;
  }

  var self = this;
  this.timeouts_.syncCursor = setTimeout(function () {
    requestAnimationFrame(function () {
      self.syncCursorPosition_();
      self.timeouts_.syncCursor = 0;
    });
  }, 0);
};

hterm.Terminal.prototype.scheduleRedraw_ = function () {
  if (this.timeouts_.redraw) {
    return;
  }

  var self = this;
  this.timeouts_.redraw = setTimeout(function () {
    self.timeouts_.redraw = 0;
    self.scrollPort_.redraw_();
  }, 0);
};

hterm.Terminal.prototype.scheduleScrollDown_ = function () {
  if (this.timeouts_.scrollDown) {
    return;
  }

  var self = this;
  this.timeouts_.scrollDown = setTimeout(function () {
    self.timeouts_.scrollDown = 0;
    self.scrollPort_.scrollToBottom();
  }, 20);
};

hterm.Terminal.prototype.renumberRows_ = function (
  start: number,
  end: number,
  opt_screen?: hterm.Screen
) {
  var screen = opt_screen || this.screen_;

  var offset = this.scrollbackRows_.length;
  var rows = screen.rowsArray;
  for (var i = start; i < end; i++) {
    var row = rows[i];
    row.n = offset + i;
    touch(row);
  }
};

hterm.Terminal.prototype.appendRows_ = function (count: number) {
  var needScrollSync = false;
  if (this.scrollbackRows_.length > 6000) {
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
      nodes: [createDefaultNode("", 0)],
    };
    this.screen_.setRow(row, cursorRow + i);
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

hterm.Terminal.prototype.moveRows_ = function (
  fromIndex: number,
  count: number,
  toIndex: number
) {
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

hterm.Terminal.prototype.eraseToLeft = function () {
  var cursor = this.saveCursor();
  this.setCursorColumn(0);
  const count = cursor.column + 1;
  this.screen_.overwriteString(lib.f.getWhitespace(count), count);
  this.scrollPort_.renderRef.touchRow(this.screen_.cursorRow());
  this.restoreCursor(cursor);
};

hterm.Terminal.prototype.eraseToRight = function (opt_count?: number) {
  if (this.screen_.cursorPosition.overflow) {
    return;
  }

  var maxCount = this.screenSize.width - this.screen_.cursorPosition.column;
  var count = opt_count ? Math.min(opt_count, maxCount) : maxCount;
  var cursorRow = this.screen_.rowsArray[this.screen_.cursorPosition.row];

  if (
    this.screen_.textAttributes.background ===
    this.screen_.textAttributes.DEFAULT_COLOR
  ) {
    if (rowWidth(cursorRow) <= this.screen_.cursorPosition.column + count) {
      this.screen_.deleteChars(count);
      this.clearCursorOverflow();
      this.scrollPort_.renderRef.touchRow(cursorRow);
      return;
    }
  }

  var cursor = this.saveCursor();
  this.screen_.overwriteString(lib.f.getWhitespace(count), count);
  this.scrollPort_.renderRef.touchRow(cursorRow);
  this.restoreCursor(cursor);
  this.clearCursorOverflow();
};

/**
 * Erase the entire display without changing the cursor position.
 *
 * The cursor position is unchanged.  This does not respect the scroll
 * region.
 *
 * @param {hterm.Screen} opt_screen Optional screen to operate on.  Defaults
 *     to the current screen.
 */
hterm.Terminal.prototype.clear = function (opt_screen: any) {
  var screen = opt_screen || this.screen_;
  var cursor = screen.cursorPosition.clone();
  this.clearHome(screen);
  screen.setCursorPosition(cursor.row, cursor.column);
};

hterm.Terminal.prototype.insertLines = function (count: number) {
  var cursorRow = this.screen_.cursorPosition.row;

  var bottom = this.getVTScrollBottom();
  count = Math.min(count, bottom - cursorRow);

  // The moveCount is the number of rows we need to relocate to make room for
  // the new row(s).  The count is the distance to move them.
  var moveCount = bottom - cursorRow - count + 1;
  if (moveCount) {
    this.moveRows_(cursorRow, moveCount, cursorRow + count);
  }

  for (var i = count - 1; i >= 0; i--) {
    this.setAbsoluteCursorPosition(cursorRow + i, 0);
    this.screen_.clearCursorRow();
    this.scrollPort_.renderRef.touchRow(this.screen_.cursorRow());
  }
};

hterm.Terminal.prototype.deleteLines = function (count: number) {
  var cursor = this.saveCursor();

  var top = cursor.row;
  var bottom = this.getVTScrollBottom();

  var maxCount = bottom - top + 1;
  count = Math.min(count, maxCount);

  var moveStart = bottom - count + 1;
  if (count != maxCount) this.moveRows_(top, count, moveStart);

  for (var i = 0; i < count; i++) {
    this.setAbsoluteCursorPosition(moveStart + i, 0);
    this.screen_.clearCursorRow();
    var cursorRow = this.screen_.cursorRow();
    this.scrollPort_.renderRef.touchRow(cursorRow);
  }

  this.restoreCursor(cursor);
  this.clearCursorOverflow();
};

hterm.Terminal.prototype.insertSpace = function (count: number) {
  var cursor = this.saveCursor();

  var ws = lib.f.getWhitespace(count || 1);
  this.screen_.insertString(ws, ws.length);
  this.screen_.maybeClipCurrentRow();
  var cursorRow = this.screen_.cursorRow();
  this.scrollPort_.renderRef.touchRow(cursorRow);

  this.restoreCursor(cursor);
  this.clearCursorOverflow();
};

hterm.Terminal.prototype.deleteChars = function (count: number) {
  var deleted = this.screen_.deleteChars(count);
  if (deleted && !this.screen_.textAttributes.isDefault()) {
    var cursor = this.saveCursor();
    this.setCursorColumn(this.screenSize.width - deleted);
    this.screen_.insertString(lib.f.getWhitespace(deleted), deleted);
    this.restoreCursor(cursor);
  }
  var cursorRow = this.screen_.cursorRow();
  this.scrollPort_.renderRef.touchRow(cursorRow);

  this.clearCursorOverflow();
};

hterm.Terminal.prototype.eraseAbove = function () {
  var cursor = this.saveCursor();

  this.eraseToLeft();

  for (var i = 0; i < cursor.row; i++) {
    this.setAbsoluteCursorPosition(i, 0);
    this.screen_.clearCursorRow();
    var cursorRow = this.screen_.cursorRow();
    touch(cursorRow);
    this.scrollPort_.renderRef.touchRow(cursorRow);
  }

  this.restoreCursor(cursor);
  this.clearCursorOverflow();
};

hterm.Terminal.prototype.eraseLine = function () {
  var cursor = this.saveCursor();
  this.screen_.clearCursorRow();
  this.restoreCursor(cursor);
  this.clearCursorOverflow();
  this.scrollPort_.renderRef.touchRow(this.screen_.cursorRow());
};

hterm.Terminal.prototype.fill = function (ch: string) {
  var cursor = this.saveCursor();

  this.setAbsoluteCursorPosition(0, 0);
  for (var row = 0; row < this.screenSize.height; row++) {
    for (var col = 0; col < this.screenSize.width; col++) {
      this.setAbsoluteCursorPosition(row, col);
      this.screen_.overwriteString(ch, 1);
    }
  }

  this.restoreCursor(cursor);
  this.scrollPort_.renderRef.touch();
};

hterm.Terminal.prototype.clearHome = function (opt_screen?: hterm.Screen) {
  var screen = opt_screen || this.screen_;
  var bottom = screen.getHeight();

  if (bottom === 0) {
    // Empty screen, nothing to do.
    return;
  }

  for (var i = 0; i < bottom; i++) {
    screen.setCursorPosition(i, 0);
    screen.clearCursorRow();
    var cursorRow = this.screen_.cursorRow();
    this.scrollPort_.renderRef.touchRow(cursorRow);
  }

  screen.setCursorPosition(0, 0);
};

hterm.Terminal.prototype.eraseBelow = function () {
  var cursor = this.saveCursor();

  this.eraseToRight();

  var bottom = this.screenSize.height - 1;
  for (var i = cursor.row + 1; i <= bottom; i++) {
    this.setAbsoluteCursorPosition(i, 0);
    this.screen_.clearCursorRow();
    var cursorRow = this.screen_.cursorRow();
    this.scrollPort_.renderRef.touchRow(cursorRow);
  }

  this.restoreCursor(cursor);
  this.clearCursorOverflow();
};

function debugPrint(screen: hterm.Screen, str: string) {
  var loc = [screen.cursorPosition.row, screen.cursorPosition.column];
  var attrs = screen.textAttributes;
  console.log(
    `print([${loc[0]}, ${loc[1]}], ${JSON.stringify(str)}, ${JSON.stringify(
      attrs
    )})`
  );
}

hterm.Terminal.prototype.getRowsText = function (start: number, end: number) {
  var ary = [];
  for (var i = start; i < end; i++) {
    var node = this.getRowNode(i);
    ary.push(rowText(node));
    if (i < end - 1 && !node.o) {
      ary.push("\n");
    }
  }

  return ary.join("");
};

// @ts-ignore
hterm.Terminal.prototype.print = function (str: string, announce = true) {
  this.scheduleSyncCursorPosition_();
  if (announce) {
    this.accessibilityReader_.announce(str);
  }
  var startOffset = 0;

  var strWidth = lib.wc.strWidth(str);
  // Fun edge case: If the string only contains zero width codepoints (like
  // combining characters), we make sure to iterate at least once below.
  if (strWidth === 0 && str) {
    strWidth = 1;
  }

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
        // @ts-ignore
        lib.wc.substr(str, strWidth - 1);
      count = strWidth;
    } else {
      substr = lib.wc.substr(str, startOffset, count);
    }

    var textAttributes = this.screen_.textAttributes;
    var tokens = hterm.TextAttributes.splitWidecharString(substr);
    var len = tokens.length;
    for (var i = 0; i < len; i++) {
      var token = tokens[i];
      textAttributes.wcNode = token.wcNode;
      textAttributes.asciiNode = token.asciiNode;

      if (this.options_.insertMode) {
        this.screen_.insertString(token.str, token.wcStrWidth);
      } else {
        //debugPrint(this.screen_, token);
        this.screen_.overwriteString(token.str, token.wcStrWidth);
      }
      textAttributes.wcNode = false;
      textAttributes.asciiNode = true;
    }

    this.screen_.maybeClipCurrentRow();
    startOffset += count;

    this.scrollPort_.renderRef.touchRow(this.screen_.cursorRow());
  }

  //this.scheduleSyncCursorPosition_();

  if (this.scrollOnOutput_) {
    this.scrollPort_.scrollRowToBottom(this.getRowCount());
  }
};

hterm.Terminal.prototype.interpret = function (str: string) {
  this.prompt.reset();
  this.vt.interpret(str);
  // this.scheduleSyncCursorPosition_();
};

hterm.Terminal.prototype.setFontSize = function (px: number) {
  if (px <= 0) px = this.prefs_.get("font-size");

  if (this.cursorOverlayNode_) {
    this.cursorOverlayNode_.style.fontSize = px + "px";
  }
  this.scrollPort_.setFontSize(px);
  this.setCssVar("charsize-width", this.scrollPort_.characterSize.width + "px");
  this.setCssVar(
    "charsize-height",
    this.scrollPort_.characterSize.height + "px"
  );
};

hterm.Terminal.prototype.syncFontFamily = function () {
  const fontFamily = this.prefs_.get("font-family");
  if (this.cursorOverlayNode_) {
    this.cursorOverlayNode_.style.fontFamily = fontFamily;
  }
  this.scrollPort_.setFontFamily(fontFamily, this.prefs_.get("font-smoothing"));
  this.syncBoldSafeState();
};

hterm.Terminal.prototype.setAlternateMode = function (state: any) {
  var cursor = this.saveCursor();
  this.screen_ = state ? this.alternateScreen_ : this.primaryScreen_;
  this.scrollbackRows_ = state
    ? this.alternateScrollbackRows_
    : this.primaryScrollbackRows_;
  this.scrollPort_.syncScrollHeight();

  if (
    this.screen_.rowsArray.length &&
    this.screen_.rowsArray[0].n != this.scrollbackRows_.length
  ) {
    // If the screen changed sizes while we were away, our rowIndexes may
    // be incorrect.
    var offset = this.scrollbackRows_.length;
    var ary = this.screen_.rowsArray;
    for (var i = 0; i < ary.length; i++) {
      var row = ary[i];
      row.n = offset + i;
      touch(row);
    }
  }

  this.realizeWidth_(this.screenSize.width);
  this.realizeHeight_(this.screenSize.height);
  this.scrollPort_.syncScrollHeight();
  this.scrollPort_.invalidate();

  this.restoreCursor(cursor);
  this.scrollPort_.resize(true);
};

hterm.Terminal.prototype.realizeHeight_ = function (rowCount: number) {
  if (rowCount <= 0)
    throw new Error("Attempt to realize bad height: " + rowCount);

  var deltaRows = rowCount - this.screen_.getHeight();

  this.screenSize.height = rowCount;

  var cursor = this.saveCursor();

  if (deltaRows < 0) {
    // Screen got smaller.
    deltaRows *= -1;
    while (deltaRows) {
      var lastRow =
        this.scrollbackRows_.length + this.screen_.rowsArray.length - 1;
      if (lastRow - this.scrollbackRows_.length == cursor.row) break;

      if (rowText(this.getRowNode(lastRow))) break;

      this.screen_.popRow();
      deltaRows--;
    }

    var ary = this.screen_.shiftRows(deltaRows);
    this.scrollbackRows_.push.apply(this.scrollbackRows_, ary);

    // We just removed rows from the top of the screen, we need to update
    // the cursor to match.
    cursor.row = Math.max(cursor.row - deltaRows, 0);
  } else if (deltaRows > 0) {
    // Screen got larger.

    if (deltaRows <= this.scrollbackRows_.length) {
      var scrollbackCount = Math.min(deltaRows, this.scrollbackRows_.length);
      var rows = this.scrollbackRows_.splice(
        this.scrollbackRows_.length - scrollbackCount,
        scrollbackCount
      );
      this.screen_.unshiftRows(rows);
      deltaRows -= scrollbackCount;
      cursor.row += scrollbackCount;
    }

    if (deltaRows) this.appendRows_(deltaRows);
  }

  this.setVTScrollRegion(null, null);
  this.restoreCursor(cursor);
};

hterm.Terminal.prototype.onMouse_Blink = function (e: MouseWheelEvent) {
  // @ts-ignore
  if (e.processedByTerminalHandler_) {
    // We register our event handlers on the document, as well as the cursor
    // and the scroll blocker.  Mouse events that occur on the cursor or
    // scroll blocker will also appear on the document, but we don't want to
    // process them twice.
    //
    // We can't just prevent bubbling because that has other side effects, so
    // we decorate the event object with this property instead.
    return;
  }

  // Consume navigation events.  Button 3 is usually "browser back" and
  // button 4 is "browser forward" which we don't want to happen.
  if (e.button > 2) {
    e.preventDefault();
    // We don't return so click events can be passed to the remote below.
  }

  var reportMouseEvents =
    !this.defeatMouseReports_ &&
    this.vt.mouseReport != this.vt.MOUSE_REPORT_DISABLED;

  // @ts-ignore
  e.processedByTerminalHandler_ = true;

  // Handle auto hiding of mouse cursor while typing.
  if (this.mouseHideWhileTyping_ && !this.mouseHideDelay_) {
    // Make sure the mouse cursor is visible.
    this.syncMouseStyle();
    // This debounce isn't perfect, but should work well enough for such a
    // simple implementation.  If the user moved the mouse, we enabled this
    // debounce, and then moved the mouse just before the timeout, we wouldn't
    // debounce that later movement.
    this.mouseHideDelay_ = setTimeout(
      () => (this.mouseHideDelay_ = null),
      1000
    );
  }

  // One based row/column stored on the mouse event.
  // @ts-ignore
  e.terminalRow =
    parseInt(
      // @ts-ignore
      (e.clientY - this.scrollPort_.visibleRowTopMargin) /
        this.scrollPort_.characterSize.height
    ) + 1;
  // @ts-ignore
  e.terminalColumn =
    // @ts-ignore
    parseInt(e.clientX / this.scrollPort_.characterSize.width) + 1;

  // @ts-ignore
  if (e.type == "mousedown" && e.terminalColumn > this.screenSize.width) {
    // Mousedown in the scrollbar area.
    return;
  }

  if (this.options_.cursorVisible && !reportMouseEvents) {
    // If the cursor is visible and we're not sending mouse events to the
    // host app, then we want to hide the terminal cursor when the mouse
    // cursor is over top.  This keeps the terminal cursor from interfering
    // with local text selection.
    // @ts-ignore
    if (
      // @ts-ignore
      e.terminalRow - 1 == this.screen_.cursorPosition.row &&
      // @ts-ignore
      e.terminalColumn - 1 == this.screen_.cursorPosition.column
    ) {
      this.cursorNode_.style.display = "none";
    } else if (this.cursorNode_.style.display == "none") {
      this.cursorNode_.style.display = "";
    }
  }

  if (e.type == "mousedown") {
    this.contextMenu.hide(e);

    if (e.altKey || !reportMouseEvents) {
      // If VT mouse reporting is disabled, or has been defeated with
      // alt-mousedown, then the mouse will act on the local selection.
      this.defeatMouseReports_ = true;
      this.setSelectionEnabled(true);
    } else {
      // Otherwise we defer ownership of the mouse to the VT.
      this.defeatMouseReports_ = false;
      this.document_.getSelection().collapseToEnd();
      this.setSelectionEnabled(false);
      e.preventDefault();
    }
  }

  if (!reportMouseEvents) {
    if (e.type == "dblclick") {
      this.screen_.expandSelection(this.document_.getSelection());
      if (this.copyOnSelect) this.copySelectionToClipboard(this.document_);
    }

    if (e.type == "click" && !e.shiftKey && (e.ctrlKey || e.metaKey)) {
      // Debounce this event with the dblclick event.  If you try to doubleclick
      // a URL to open it, Chrome will fire click then dblclick, but we won't
      // have expanded the selection text at the first click event.
      clearTimeout(this.timeouts_.openUrl);
      this.timeouts_.openUrl = setTimeout(
        this.openSelectedUrl_.bind(this),
        500
      );
      return;
    }

    if (e.type == "mousedown") {
      if (e.ctrlKey && e.button == 2 /* right button */) {
        e.preventDefault();
        this.contextMenu.show(e, this);
      } else if (
        e.button == this.mousePasteButton ||
        (this.mouseRightClickPaste && e.button == 2) /* right button */
      ) {
        if (!this.paste())
          console.warn("Could not paste manually due to web restrictions");
      }
    }

    if (
      e.type == "mouseup" &&
      e.button == 0 &&
      this.copyOnSelect &&
      !this.document_.getSelection().isCollapsed
    ) {
      this.copySelectionToClipboard(this.document_);
    }

    if (
      (e.type == "mousemove" || e.type == "mouseup") &&
      this.scrollBlockerNode_.engaged
    ) {
      // Disengage the scroll-blocker after one of these events.
      this.scrollBlockerNode_.engaged = false;
      this.scrollBlockerNode_.style.top = "-99px";
    }

    // Emulate arrow key presses via scroll wheel events.
    if (
      this.scrollWheelArrowKeys_ &&
      !e.shiftKey &&
      this.keyboard.applicationCursor &&
      !this.isPrimaryScreen()
    ) {
      if (e.type == "wheel") {
        const delta = this.scrollPort_.scrollWheelDelta(e);

        // Helper to turn a wheel event delta into a series of key presses.
        // @ts-ignore
        const deltaToArrows = (distance, charSize, arrowPos, arrowNeg) => {
          if (distance == 0) {
            return "";
          }

          // Convert the scroll distance into a number of rows/cols.
          const cells = lib.f.smartFloorDivide(Math.abs(distance), charSize);
          const data = "\x1bO" + (distance < 0 ? arrowNeg : arrowPos);
          return data.repeat(cells);
        };

        // The order between up/down and left/right doesn't really matter.
        this.io.sendString(
          // Up/down arrow keys.
          deltaToArrows(
            -delta.y,
            this.scrollPort_.characterSize.height,
            "A",
            "B"
          ) +
            // Left/right arrow keys.
            deltaToArrows(
              delta.x,
              this.scrollPort_.characterSize.width,
              "C",
              "D"
            )
        );

        e.preventDefault();
      }
    }
  } /* if (this.reportMouseEvents) */ else {
    if (!this.scrollBlockerNode_.engaged) {
      if (e.type == "mousedown") {
        // Move the scroll-blocker into place if we want to keep the scrollport
        // from scrolling.
        this.scrollBlockerNode_.engaged = true;
        this.scrollBlockerNode_.style.top = e.clientY - 5 + "px";
        this.scrollBlockerNode_.style.left = e.clientX - 5 + "px";
      } else if (e.type == "mousemove") {
        // Oh.  This means that drag-scroll was disabled AFTER the mouse down,
        // in which case it's too late to engage the scroll-blocker.
        this.document_.getSelection().collapseToEnd();
        e.preventDefault();
      }
    }

    this.onMouse(e);
  }

  if (e.type == "mouseup" && this.document_.getSelection().isCollapsed) {
    // Restore this on mouseup in case it was temporarily defeated with a
    // alt-mousedown.  Only do this when the selection is empty so that
    // we don't immediately kill the users selection.
    this.defeatMouseReports_ = false;
  }
};
