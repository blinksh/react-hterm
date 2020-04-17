function __nsEncodeCGSize(width: number, height: number): string {
  return `{${width}, ${height}}`;
}

export default class WKScroller {
  _x = -1;
  _y = -1;
  _viewWidth = 0;
  _viewHeight = 0;
  _contentWidth = 0;
  _contentHeight = 0;
  _callback: any = null;
  _t: any

  constructor(callback: any, t: any) {
    this._callback = callback;
    this._t = t
  }

  _postMessage(message: any) {
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
    contentHeight: number | null,
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
      op: 'resize',
      viewSize: __nsEncodeCGSize(this._viewWidth, this._viewHeight),
      contentSize: __nsEncodeCGSize(this._contentWidth, this._contentHeight),
      isPrimary: this._t.screen_ === this._t.primaryScreen_,
      characterSize: __nsEncodeCGSize(this._t.scrollPort_.characterSize.width, this._t.scrollPort_.characterSize.height)
    });
  }

  reportScroll(x: number, y: number, z: number | undefined) {
    this._x = x;
    this._y = y;
    if (this._callback) {
      this._callback(x, y, z);
    }
  }
  scrollTo(x: number, y: number, animated: boolean, force = false) {
    if (this._x === x && this._y === y && !force) {
      return;
    }
    this._x = x;
    this._y = y;
    var isPrimary = this._t.screen_ === this._t.primaryScreen_
    this._postMessage({ op: 'scrollTo', x, y, animated, isPrimary });
  }
}
