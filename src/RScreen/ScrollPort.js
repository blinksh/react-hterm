// @flow
import { hterm, lib } from '../hterm_all.js';

import React from 'react';
import ReactDOM from 'react-dom';
import RRowList from './RRowList';
import Scroller from './scroller/Scroller';

let __screenSize = { height: window.innerHeight, width: window.innerWidth };
let __pageYOffset = 0;

hterm.ScrollPort.Selection.prototype.sync = function() {
  var self = this;

  // The dom selection object has no way to tell which nodes come first in
  // the document, so we have to figure that out.
  //
  // This function is used when we detect that the "anchor" node is first.
  function anchorFirst() {
    self.startRow = anchorRow;
    self.startNode = selection.anchorNode;
    self.startOffset = selection.anchorOffset;
    self.endRow = focusRow;
    self.endNode = selection.focusNode;
    self.endOffset = selection.focusOffset;
  }

  // This function is used when we detect that the "focus" node is first.
  function focusFirst() {
    self.startRow = focusRow;
    self.startNode = selection.focusNode;
    self.startOffset = selection.focusOffset;
    self.endRow = anchorRow;
    self.endNode = selection.anchorNode;
    self.endOffset = selection.anchorOffset;
  }

  var selection = window.document.getSelection();

  this.startRow = null;
  this.endRow = null;
  this.isMultiline = null;
  this.isCollapsed = !selection || selection.isCollapsed;

  if (this.isCollapsed) return;

  var anchorRow = selection.anchorNode;
  while (anchorRow && !('rowIndex' in anchorRow)) {
    anchorRow = anchorRow.parentNode;
  }

  if (!anchorRow) {
    console.error(
      'Selection anchor is not rooted in a row node: ' +
        selection.anchorNode.nodeName,
    );
    return;
  }

  var focusRow = selection.focusNode;
  while (focusRow && !('rowIndex' in focusRow)) {
    focusRow = focusRow.parentNode;
  }

  if (!focusRow) {
    console.error(
      'Selection focus is not rooted in a row node: ' +
        selection.focusNode.nodeName,
    );
    return;
  }

  if (anchorRow.rowIndex < focusRow.rowIndex) {
    anchorFirst();
  } else if (anchorRow.rowIndex > focusRow.rowIndex) {
    focusFirst();
  } else if (selection.focusNode == selection.anchorNode) {
    if (selection.anchorOffset < selection.focusOffset) {
      anchorFirst();
    } else {
      focusFirst();
    }
  } else {
    // The selection starts and ends in the same row, but isn't contained all
    // in a single node.
    var firstNode = this.findFirstChild(anchorRow, [
      selection.anchorNode,
      selection.focusNode,
    ]);

    if (!firstNode) throw new Error('Unexpected error syncing selection.');

    if (firstNode == selection.anchorNode) {
      anchorFirst();
    } else {
      focusFirst();
    }
  }

  this.isMultiline = anchorRow.rowIndex != focusRow.rowIndex;
};

hterm.ScrollPort.prototype.decorate = function() {
  this.div_ = window.document.createElement('div');
  window.document.body.appendChild(this.div_);
  //this.iframe_ = window.document.body; //div.ownerDocument.createElement('iframe');
  //this.iframe_.style.cssText =
  //'border: 0;' + 'height: 100%;' + 'position: absolute;' + 'width: 100%';

  ////div.appendChild(this.iframe_);

  window.addEventListener('resize', this.onResize_.bind(this));

  var doc = window.document;
  this.document_ = doc;
  doc.body.style.cssText =
    'margin: 0px;' +
    'padding: 0px;' +
    'height: 100%;' +
    'width: 100%;' +
    'overflow: hidden;' +
    'cursor: var(--hterm-mouse-cursor-style);' +
    '-webkit-user-select: none;' +
    '-moz-user-select: none;';

  var style = doc.createElement('style');
  style.textContent =
    'x-row {' +
    '  display: block;' +
    '  height: var(--hterm-charsize-height);' +
    '  line-height: var(--hterm-charsize-height);' +
    '  isolation: isolate;' +
    '}';
  doc.head.appendChild(style);

  this.userCssLink_ = doc.createElement('link');
  this.userCssLink_.setAttribute('rel', 'stylesheet');

  this.userCssText_ = doc.createElement('style');
  doc.head.appendChild(this.userCssText_);

  // TODO(rginda): Sorry, this 'screen_' isn't the same thing as hterm.Screen
  // from screen.js.  I need to pick a better name for one of them to avoid
  // the collision.
  // We make this field editable even though we don't actually allow anything
  // to be edited here so that Chrome will do the right thing with virtual
  // keyboards and IMEs.  But make sure we turn off all the input helper logic
  // that doesn't make sense here, and might inadvertently mung or save input.
  // Some of these attributes are standard while others are browser specific,
  // but should be safely ignored by other browsers.
  this.screen_ = doc.createElement('x-screen');
  this.screen_.setAttribute('tabindex', '-1');
  this.screen_.style.cssText =
    'caret-color: transparent;' +
    'display: block;' +
    'font-family: monospace;' +
    'font-size: 15px;' +
    'overflow: hidden;' +
    'white-space: pre;' +
    'width: 100%;' +
    'margin: 0px;' +
    'padding: 0px;' +
    'height: 100%;' +
    'width: 100%;' +
    'touch-atcion: manipulation;' +
    'cursor: var(--hterm-mouse-cursor-style);' +
    'outline: none !important';

  doc.body.appendChild(this.screen_);

  //window.addEventListener('scroll', this.onScroll_.bind(this));
  //window.addEventListener('wheel', this.onScrollWheel_.bind(this));
  this.screen_.addEventListener('touchstart', this.on_touchstart_.bind(this));
  this.screen_.addEventListener('touchmove', this.on_touchmove_.bind(this));
  this.screen_.addEventListener('touchend', this.on_touchend_.bind(this));
  this.screen_.addEventListener('touchcancel', this.on_touchcancel_.bind(this));

  this.screen_.addEventListener('copy', this.onCopy_.bind(this));
  this.screen_.addEventListener('paste', this.onPaste_.bind(this));
  this.screen_.addEventListener('drop', this.onDragAndDrop_.bind(this));

  doc.body.addEventListener('keydown', this.onBodyKeyDown_.bind(this));

  // This is the main container for the fixed rows.
  this.rowNodes_ = doc.createElement('div');
  this.rowNodes_.id = 'hterm:row-nodes';
  this.rowNodes_.style.cssText =
    'display: block;' +
    'position: absolute;' +
    'top: 0;' +
    'left: 0;' +
    'right: 0;' +
    'bottom: 0;' +
    'background-color: inherit;' +
    'overflow: hidden;' +
    '-webkit-user-select: text;' +
    '-moz-user-select: text;';
  this.screen_.appendChild(this.rowNodes_);

  // Two nodes to hold offscreen text during the copy event.
  this.topSelectBag_ = doc.createElement('x-select-bag');
  this.topSelectBag_.style.cssText =
    'display: block;' +
    'overflow: hidden;' +
    'height: var(--hterm-charsize-height);' +
    'white-space: pre;';

  this.bottomSelectBag_ = this.topSelectBag_.cloneNode();

  // Nodes above the top fold and below the bottom fold are hidden.  They are
  // only used to hold rows that are part of the selection but are currently
  // scrolled off the top or bottom of the visible range.
  this.topFold_ = doc.createElement('x-fold');
  this.topFold_.id = 'hterm:top-fold-for-row-selection';
  this.topFold_.style.cssText = 'display: block;';
  this.rowNodes_.appendChild(this.topFold_);
  this._renderDom = doc.createElement('div');
  this._renderDom.id = 'hterm:renderer';
  this.rowNodes_.appendChild(this._renderDom);

  this.renderRef = ReactDOM.render(
    React.createElement(RRowList),
    this._renderDom,
  );

  this.bottomFold_ = this.topFold_.cloneNode();
  this.bottomFold_.id = 'hterm:bottom-fold-for-row-selection';
  this.rowNodes_.appendChild(this.bottomFold_);

  // This hidden div accounts for the vertical space that would be consumed by
  // all the rows in the buffer if they were visible.  It's what causes the
  // scrollbar to appear on the 'x-screen', and it moves within the screen when
  // the scrollbar is moved.
  //
  // It is set 'visibility: hidden' to keep the browser from trying to include
  // it in the selection when a user 'drag selects' upwards (drag the mouse to
  // select and scroll at the same time).  Without this, the selection gets
  // out of whack.
  //this.scrollArea_ = doc.createElement('div');
  //this.scrollArea_.id = 'hterm:scrollarea';
  //this.scrollArea_.style.cssText = 'width:0;height:0;';
  //this.screen_.appendChild(this.scrollArea_);
  var self = this;
  __screenSize = hterm.getClientSize(this.screen_);
  this.scroller_ = new Scroller(
    function render(left, top, zoom) {
      if (__pageYOffset === top) {
        return;
      }
      __pageYOffset = top || 0;
      self.onScroll_();
    },
    { scrollingX: false },
  );

  this.scroller_.setDimensions(
    __screenSize.width,
    __screenSize.height,
    __screenSize.width,
    __screenSize.height,
  );

  // This svg element is used to detect when the browser is zoomed.  It must be
  // placed in the outermost document for currentScale to be correct.
  // TODO(rginda): This means that hterm nested in an iframe will not correctly
  // detect browser zoom level.  We should come up with a better solution.
  // Note: This must be http:// else Chrome cannot create the element correctly.
  var xmlns = 'http://www.w3.org/2000/svg';
  this.svg_ = window.document.createElementNS(xmlns, 'svg');
  this.svg_.id = 'hterm:zoom-detector';
  this.svg_.setAttribute('xmlns', xmlns);
  this.svg_.setAttribute('version', '1.1');
  this.svg_.style.cssText =
    'position: absolute;' + 'top: 0;' + 'left: 0;' + 'visibility: hidden';

  // We send focus to this element just before a paste happens, so we can
  // capture the pasted text and forward it on to someone who cares.
  this.pasteTarget_ = doc.createElement('textarea');
  this.pasteTarget_.id = 'hterm:ctrl-v-paste-target';
  this.pasteTarget_.setAttribute('tabindex', '-1');
  this.pasteTarget_.style.cssText =
    'position: absolute;' +
    'height: 1px;' +
    'width: 1px;' +
    'left: 0px; ' +
    'bottom: 0px;' +
    'opacity: 0';
  this.pasteTarget_.contentEditable = true;

  this.screen_.appendChild(this.pasteTarget_);
  this.pasteTarget_.addEventListener(
    'textInput',
    this.handlePasteTargetTextInput_.bind(this),
  );

  this.resize();
};

hterm.ScrollPort.prototype.on_touchstart_ = function(e) {
  this.scroller_.doTouchStart(e.touches, e.timeStamp);
};

hterm.ScrollPort.prototype.on_touchmove_ = function(e) {
  this.scroller_.doTouchMove(e.touches, e.timeStamp, e.scale);
  if (this.scroller_.__isDragging) {
    e.preventDefault();
  }
};

hterm.ScrollPort.prototype.on_touchend_ = function(e) {
  this.scroller_.doTouchEnd(e.timeStamp);
};

hterm.ScrollPort.prototype.on_touchcancel_ = function(e) {
  this.scroller_.doTouchEnd(e.timeStamp);
};

hterm.ScrollPort.prototype.focus = function() {
  //this.iframe_.focus();
  //this.screen_.focus();
};

hterm.ScrollPort.prototype.getScreenSize = function() {
  return __screenSize;
};

hterm.ScrollPort.prototype.resetCache = function() {};

hterm.ScrollPort.prototype.setRowProvider = function(rowProvider) {
  this.resetCache();
  this.rowProvider_ = rowProvider;
  this.scheduleRedraw();
};

hterm.ScrollPort.prototype.invalidate = function() {
  var topRowIndex = this.getTopRowIndex();
  var bottomRowIndex = this.getBottomRowIndex(topRowIndex);

  this.drawVisibleRows_(topRowIndex, bottomRowIndex);
};

hterm.ScrollPort.prototype.scheduleInvalidate = function() {
  if (this.timeouts_.invalidate) {
    return;
  }

  var self = this;
  this.timeouts_.invalidate = setTimeout(function() {
    self.timeouts_.invalidate = 0;
    self.invalidate();
  }, 0);
};

var __nodesPositionStyle = 'absolute';
var __currentTransform = '';

hterm.ScrollPort.prototype.syncRowNodesDimensions_ = function() {
  var screenSize = this.getScreenSize();

  this.lastScreenWidth_ = screenSize.width;
  this.lastScreenHeight_ = screenSize.height;

  // We don't want to show a partial row because it would be distracting
  // in a terminal, so we floor any fractional row count.
  this.visibleRowCount = lib.f.smartFloorDivide(
    screenSize.height,
    this.characterSize.height,
  );

  // Then compute the height of our integral number of rows.
  var visibleRowsHeight = this.visibleRowCount * this.characterSize.height;

  // Then the difference between the screen height and total row height needs to
  // be made up for as top margin.  We need to record this value so it
  // can be used later to determine the topRowIndex.
  this.visibleRowTopMargin = 0;
  this.visibleRowBottomMargin = screenSize.height - visibleRowsHeight;

  var transform = '';
  if (__pageYOffset < 0) {
    transform = 'translate3d(0, ' + -__pageYOffset + 'px, 0)';
  }

  if (transform !== __currentTransform) {
    __currentTransform = transform;
    this.rowNodes_.style.transform = transform;

    if (this.rowProvider_.cursorOverlayNode_) {
      this.rowProvider_.cursorOverlayNode_.style.transform = transform;
    }
  }

  //if (__pageYOffset <= 0) {
  //if (__nodesPositionStyle === 'absolute') {
  //return;
  //}
  //__nodesPositionStyle = 'absolute';
  //this.rowNodes_.style.position = 'absolute';
  //if (this.rowProvider_ && this.rowProvider_.cursorNode_) {
  //this.rowProvider_.cursorNode_.style.position = 'absolute';
  //}
  //} else {
  //if (__nodesPositionStyle === 'fixed') {
  //return;
  //}
  //__nodesPositionStyle = 'fixed';
  //this.rowNodes_.style.position = 'fixed';
  //if (this.rowProvider_ && this.rowProvider_.cursorNode_) {
  //this.rowProvider_.cursorNode_.style.position = 'fixed';
  //}
  //}
};

var __prevHeight = 0;
hterm.ScrollPort.prototype.syncScrollHeight = function() {
  // Resize the scroll area to appear as though it contains every row.
  this.lastRowCount_ = this.rowProvider_.getRowCount();
  var height =
    this.characterSize.height * this.lastRowCount_ +
    this.visibleRowTopMargin +
    this.visibleRowBottomMargin;

  if (__prevHeight === height) {
    return;
  }

  __prevHeight = height;

  this.scroller_.setDimensions(null, null, null, __prevHeight);
};

hterm.ScrollPort.prototype.scheduleRedraw = function() {
  if (this.timeouts_.redraw) {
    return;
  }

  var self = this;
  this.timeouts_.redraw = requestAnimationFrame(function() {
    self.timeouts_.redraw = 0;
    self.redraw_();
  });
};

hterm.ScrollPort.prototype.redraw_ = function() {
  //this.resetSelectBags_();
  //this.selection.sync();

  this.syncScrollHeight();

  var topRowIndex = this.getTopRowIndex();
  var bottomRowIndex = this.getBottomRowIndex(topRowIndex);

  //this.drawTopFold_(topRowIndex);
  //this.drawBottomFold_(bottomRowIndex);
  this.drawVisibleRows_(topRowIndex, bottomRowIndex);

  this.syncRowNodesDimensions_();

  this.isScrolledEnd =
    this.getTopRowIndex() + this.visibleRowCount >= this.lastRowCount_;
};

hterm.ScrollPort.prototype.drawVisibleRows_ = function(
  topRowIndex,
  bottomRowIndex,
) {
  var self = this;

  // Shorthand for things we're going to use a lot.
  var selectionStartRow = this.selection.startRow;
  var selectionEndRow = this.selection.endRow;
  var bottomFold = this.bottomFold_;

  // The node we're examining during the current iteration.
  var node = this.topFold_.nextSibling;

  var targetDrawCount = Math.min(
    this.visibleRowCount,
    this.rowProvider_.getRowCount(),
  );

  var rows = [];

  for (var drawCount = 0; drawCount < targetDrawCount; drawCount++) {
    var rowIndex = topRowIndex + drawCount;
    var newNode = this.fetchRowNode_(rowIndex);
    if (newNode) {
      rows.push(newNode);
    }
  }

  this.renderRef.setRows(rows);
};

hterm.ScrollPort.prototype.fetchRowNode_ = function(rowIndex) {
  return this.rowProvider_.getRowNode(rowIndex);
};

hterm.ScrollPort.prototype.getScrollMax_ = function(e) {
  return (
    __prevHeight +
    this.visibleRowTopMargin +
    this.visibleRowBottomMargin -
    __screenSize.height
  );
};

hterm.ScrollPort.prototype.scrollRowToTop = function(rowIndex) {
  this.syncScrollHeight();

  this.isScrolledEnd = rowIndex + this.visibleRowCount >= this.lastRowCount_;

  var scrollTop =
    rowIndex * this.characterSize.height + this.visibleRowTopMargin;

  var scrollMax = this.getScrollMax_();
  if (scrollTop > scrollMax) scrollTop = scrollMax;

  if (__pageYOffset === scrollTop) return;

  this.scroller_.scrollTo(0, scrollTop);
  this.scheduleRedraw();
};

hterm.ScrollPort.prototype.scrollRowToBottom = function(rowIndex) {
  this.syncScrollHeight();

  this.isScrolledEnd = rowIndex + this.visibleRowCount >= this.lastRowCount_;

  var scrollTop =
    rowIndex * this.characterSize.height +
    this.visibleRowTopMargin +
    this.visibleRowBottomMargin;
  scrollTop -= this.visibleRowCount * this.characterSize.height;

  if (scrollTop < 0) scrollTop = 0;

  if (__pageYOffset === scrollTop) {
    return;
  }

  this.scroller_.scrollTo(0, scrollTop);
};

hterm.ScrollPort.prototype.scrollToBottom = function() {
  this.syncScrollHeight();
  this.scroller_.scrollTo(0, __prevHeight - __screenSize.height, false);
};

hterm.ScrollPort.prototype.getTopRowIndex = function() {
  var idx = Math.round(__pageYOffset / this.characterSize.height);
  if (idx < 0) {
    return 0;
  }
  return idx;
};

hterm.ScrollPort.prototype.onScroll_ = function(e) {
  var screenSize = this.getScreenSize();
  if (
    screenSize.width != this.lastScreenWidth_ ||
    screenSize.height != this.lastScreenHeight_
  ) {
    // This event may also fire during a resize (but before the resize event!).
    // This happens when the browser moves the scrollbar as part of the resize.
    // In these cases, we want to ignore the scroll event and let onResize
    // handle things.  If we don't, then we end up scrolling to the wrong
    // position after a resize.
    this.resize();
    return;
  }

  this.redraw_();
  this.publish('scroll', { scrollPort: this });
};

hterm.ScrollPort.prototype.onScrollWheel = function(e) {};

hterm.ScrollPort.prototype.onResize_ = function(e) {
  __screenSize = hterm.getClientSize(this.screen_);
  this.scroller_.setDimensions(__screenSize.width, __screenSize.height);
  //__pageYOffset = this.scroller_.getValues().top;
  // Re-measure, since onResize also happens for browser zoom changes.
  this.syncCharacterSize();
};

hterm.ScrollPort.prototype.onCopy_ = function(e) {
  this.onCopy(e);

  if (e.defaultPrevented) {
    return;
  }

  this.resetSelectBags_();
  this.selection.sync();

  if (
    !this.selection.startRow ||
    this.selection.endRow.rowIndex - this.selection.startRow.rowIndex < 2
  ) {
    return;
  }

  var topRowIndex = this.getTopRowIndex();
  var bottomRowIndex = this.getBottomRowIndex(topRowIndex);

  if (this.selection.startRow.rowIndex < topRowIndex) {
    // Start of selection is above the top fold.
    var endBackfillIndex;

    if (this.selection.endRow.rowIndex < topRowIndex) {
      // Entire selection is above the top fold.
      endBackfillIndex = this.selection.endRow.rowIndex;
    } else {
      // Selection extends below the top fold.
      endBackfillIndex = this.topFold_.nextSibling.rowIndex;
    }

    this.topSelectBag_.textContent = this.rowProvider_.getRowsText(
      this.selection.startRow.rowIndex + 1,
      endBackfillIndex,
    );
    this.rowNodes_.insertBefore(
      this.topSelectBag_,
      this.selection.startRow.nextSibling,
    );
    this.syncRowNodesDimensions_();
  }

  if (this.selection.endRow.rowIndex > bottomRowIndex) {
    // Selection ends below the bottom fold.
    var startBackfillIndex;

    if (this.selection.startRow.rowIndex > bottomRowIndex) {
      // Entire selection is below the bottom fold.
      startBackfillIndex = this.selection.startRow.rowIndex + 1;
    } else {
      // Selection starts above the bottom fold.
      startBackfillIndex = this.bottomFold_.previousSibling.rowIndex + 1;
    }

    this.bottomSelectBag_.textContent = this.rowProvider_.getRowsText(
      startBackfillIndex,
      this.selection.endRow.rowIndex,
    );
    this.rowNodes_.insertBefore(this.bottomSelectBag_, this.selection.endRow);
  }
};

hterm.ScrollPort.prototype.measureCharacterSize = function(opt_weight) {
  // Number of lines used to average the height of a single character.
  var numberOfLines = 100;
  // Number of chars per line used to average the width of a single character.
  var lineLength = 100;

  if (!this.ruler_) {
    this.ruler_ = this.document_.createElement('div');
    this.ruler_.id = 'hterm:ruler-character-size';
    this.ruler_.style.cssText =
      'position: absolute;' +
      'top: 0;' +
      'left: 0;' +
      'visibility: hidden;' +
      'height: auto !important;' +
      'width: auto !important;';

    // We need to put the text in a span to make the size calculation
    // work properly in Firefox
    this.rulerSpan_ = this.document_.createElement('span');
    this.rulerSpan_.id = 'hterm:ruler-span-workaround';
    this.rulerSpan_.innerHTML = ('X'.repeat(lineLength) + '\r').repeat(
      numberOfLines,
    );
    this.ruler_.appendChild(this.rulerSpan_);

    this.rulerBaseline_ = this.document_.createElement('span');
    this.rulerSpan_.id = 'hterm:ruler-baseline';
    // We want to collapse it on the baseline
    this.rulerBaseline_.style.fontSize = '0px';
    this.rulerBaseline_.textContent = 'X';
  }

  this.rulerSpan_.style.fontWeight = opt_weight || '';

  this.rowNodes_.appendChild(this.ruler_);
  var rulerSize = hterm.getClientSize(this.rulerSpan_);

  var size = new hterm.Size(
    rulerSize.width / lineLength,
    rulerSize.height / numberOfLines,
  );

  this.ruler_.insertBefore(this.rulerBaseline_, this.ruler_.childNodes[0]);
  size.baseline = this.rulerBaseline_.offsetTop;
  this.ruler_.removeChild(this.rulerBaseline_);

  this.rowNodes_.removeChild(this.ruler_);

  this.div_.ownerDocument.body.appendChild(this.svg_);
  size.zoomFactor = this.svg_.currentScale;
  this.div_.ownerDocument.body.removeChild(this.svg_);

  return size;
};
