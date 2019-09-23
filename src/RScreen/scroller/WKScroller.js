// @flow

function __nsEncodeCGSize(width, height) {
  return `{${width}, ${height}}`;
}

export default class WKScroller {
  _x = 0;
  _y = 0;
  _viewWidth = 0;
  _viewHeight = 0;
  _contentWidth = 0;
  _contentHeight = 0;

  constructor(callback) {
    this._callback = callback;
  }

  _postMessage(message) {
    let handler = window.webkit.messageHandlers.wkScroller;
    if (handler) {
      handler.postMessage(message);
    } else {
      console.log(message);
    }
  }

  setDimensions(
    viewWidth: number | null,
    viewHeight: number | null,
    contentWidth: number | null,
    contentHeight: number | null
  ) {
    let needToPost = false;

    if (viewWidth != null && this._viewWidth !== viewWidth) {
      this._viewWidth = viewWidth;
      needToPost = true;
    }

    if (viewHeight != null && this._viewHeight !== viewHeight) {
      this._viewHeight = viewHeight;
      needToPost = true;
    }
    if (contentWidth != null && this._contentWidth !== contentWidth) {
      this._contentWidth = contentWidth;
      needToPost = true;
    }

    if (contentHeight != null && this._contentHeight !== contentHeight) {
      this._contentHeight = contentHeight;
      needToPost = true;
    }

    if (!needToPost) {
      return;
    }

    this._postMessage({
      op: "resize",
      viewSize: __nsEncodeCGSize(this._viewWidth, this._viewHeight),
      contentSize: __nsEncodeCGSize(this._contentWidth, this._contentHeight)
    });
  }

  reportScroll(x: number, y: number, z: number | undefined) {
    if (this._callback) {
      this._callback(x, y, z);
    }
  }
  scrollTo(x, y, animated) {
    if (this._x === x && this._y === y) {
      return;
    }
    this._x = x;
    this._y = y;
    this._postMessage({ op: "scrollTo", x, y, animated });
  }
}
