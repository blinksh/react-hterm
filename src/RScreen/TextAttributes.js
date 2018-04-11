// @flow
import type { RNodeType, RAttributesType } from './model';
import { hterm, lib } from '../hterm_all.js';
import { genKey, touch } from './utils';
import { WC_PRECALCULATED_CLASSES } from './RNode'

var __cssStyleSheet = null;

hterm.TextAttributes.prototype.DEFAULT_COLOR = '';

function __defaultAttributes(): RAttributesType {
  return {
    isDefault: true,
    wcNode: false,
    asciiNode: true,
    fci: -1,
    bci: -1,
    uci: -1,
  };
}

const __defaultAttrs = Object.freeze(__defaultAttributes());

export function setNodeText(node: RNodeType, text: string, wcwidth?: number) {
  node.txt = text;
  if (wcwidth != null) {
    node.wcw = wcwidth;
  } else if (node.attrs.asciiNode) {
    node.wcw = text.length;
  } else {
    node.wcw = lib.wc.strWidth(text);
  }
  touch(node);
}

export function setNodeAttributedText(
  attrs: RAttributesType,
  node: RNodeType,
  text: string,
  wcwidth?: number,
) {
  node.txt = text;
  if (!attrs.asciiNode && node.attrs.asciiNode) {
    node.attrs = attrs;
  }
  if (wcwidth != null) {
    node.wcw = wcwidth;
  } else if (node.attrs.asciiNode) {
    node.wcw = text.length;
  } else {
    node.wcw = lib.wc.strWidth(text);
  }
  touch(node);
}

export function createDefaultNode(text: string, wcwidth: number): RNodeType {
  return {
    v: 0,
    txt: text,
    wcw: wcwidth,
    key: genKey(),
    attrs: __defaultAttrs,
  };
}

export function createNode(text: string, wcwidth: number): RNodeType {
  return {
    v: 0,
    txt: text,
    wcw: wcwidth,
    key: genKey(),
    attrs: __defaultAttributes(),
  };
}

export function createAttributedNode(
  attrs: RAttributesType,
  txt: string,
  wcw: number | void,
): RNodeType {
  if (wcw === undefined) {
    if (attrs.asciiNode) {
      wcw = txt.length;
    } else {
      wcw = lib.wc.strWidth(txt);
    }
  }

  return {
    v: 0,
    txt,
    wcw,
    key: genKey(),
    attrs,
  };
}

hterm.TextAttributes.prototype.resetColorPalette = function() {
  this.colorPalette = lib.colors.colorPalette.concat();

  if (!__cssStyleSheet) {
    var style = document.createElement('style');
    style.type = 'text/css';
    this.document_.getElementsByTagName('head')[0].appendChild(style);
    __cssStyleSheet = style;
  }
  __cssStyleSheet.innerHTML = __generateAttributesStyleSheet(this);
  this.syncColors();
};

function __getBrightIndex(i) {
  if (i < 8) {
    // If the color is from the lower half of the ANSI 16, add 8.
    return i + 8;
  }

  // If it's not from the 16 color palette, ignore bold requests.  This
  // matches the behavior of gnome-terminal.
  return i;
}

hterm.TextAttributes.prototype.attrs = function(): RAttributesType {
  if (this.isDefault()) {
    return __defaultAttrs;
  }
  var attrs = __defaultAttributes();

  attrs.isDefault = false;
  attrs.wcNode = this.wcNode;
  attrs.asciiNode = this.asciiNode;

  if (typeof this.foreground === 'number') {
    attrs.fci = this.foreground;
  } else if (this.foreground !== this.DEFAULT_COLOR) {
    attrs.fcs = this.foreground;
  }

  if (typeof this.background === 'number') {
    attrs.bci = this.background;
  } else if (this.background !== this.DEFAULT_COLOR) {
    attrs.bcs = this.background;
  }

  if (typeof this.underlineColor !== 'number') {
    attrs.uci = this.underlineColor;
  } else if (this.underlineColor !== this.DEFAULT_COLOR) {
    attrs.ucs = this.underlineColor;
  }

  if (this.enableBold && this.bold) {
    attrs.bold = true;
  }
  if (this.italic) {
    attrs.italic = true;
  }
  if (this.blink) {
    attrs.blink = true;
  }
  if (this.underline) {
    attrs.underline = this.underline;
  }
  if (this.strikethrough) {
    attrs.strikethrough = true;
  }

  return attrs;
};


hterm.TextAttributes.prototype.syncColors = function() {
  var foregroundSource = this.foregroundSource;
  var backgroundSource = this.backgroundSource;
  var defaultForeground = this.DEFAULT_COLOR;
  var defaultBackground = this.DEFAULT_COLOR;

  if (this.inverse) {
    foregroundSource = this.backgroundSource;
    backgroundSource = this.foregroundSource;
    // We can't inherit the container's color anymore.
    defaultForeground = this.defaultBackground;
    defaultBackground = this.defaultForeground;
  }

  if (this.enableBoldAsBright && this.bold) {
    if (Number.isInteger(foregroundSource)) {
      foregroundSource = __getBrightIndex(foregroundSource);
    }
  }

  if (foregroundSource === this.SRC_DEFAULT) {
    this.foreground = defaultForeground;
  } else {
    this.foreground = foregroundSource;
  }

  if (this.faint) {
    if (Number.isInteger(this.foreground)) {
      this.foreground = this.colorPalette[this.foreground];
    }
    var colorToMakeFaint =
      this.foreground === this.DEFAULT_COLOR
        ? this.defaultForeground
        : this.foreground;
    this.foreground = lib.colors.mix(colorToMakeFaint, 'rgb(0, 0, 0)', 0.3333);
  }

  if (backgroundSource === this.SRC_DEFAULT) {
    this.background = defaultBackground;
  } else {
    this.background = backgroundSource;
  }

  // Process invisible settings last to keep it simple.
  if (this.invisible) {
    this.foreground = this.background;
  }

  if (this.underlineSource === this.SRC_DEFAULT) {
    this.underlineColor = this.DEFAULT_COLOR;
  } else {
    this.underlineColor = this.underlineSource;
  }
};

function __generateAttributesStyleSheet(attrs: hterm.TextAttributes): string {
  var rows = [];
  for (var i = 0; i < 256; i++) {
    var color = attrs.colorPalette[i];
    rows.push('span.c' + i + ' { color: ' + color + ';}');
    rows.push('span.bc' + i + ' { background: ' + color + ';}');
    rows.push(
      'span.uc' + i + ' { -webkit-text-decoration-color: ' + color + ';}',
    );
  }
  rows.push('.u { -webkit-text-decoration: underline;}');
  rows.push('.s { -webkit-text-decoration: line-through;}');
  rows.push('.us { -webkit-text-decoration: underline line-through;}');

  rows.push('.u1 { -webkit-text-decoration-style: solid;}');
  rows.push('.u2 { -webkit-text-decoration-style: double;}');
  rows.push('.u3 { -webkit-text-decoration-style: wavy;}');
  rows.push('.u4 { -webkit-text-decoration-style: dotted;}');
  rows.push('.u5 { -webkit-text-decoration-style: dashed;}');

  rows.push('span.b { font-weight: bold;}');
  rows.push('span.i { font-style: italic;}');
  rows.push('span.wc { display: inline-block; overflow-x:hidden; }');
  for (i = 0; i < WC_PRECALCULATED_CLASSES; i++) {
    rows.push(
      'span.wc' +
        i +
        ' { width: calc(var(--hterm-charsize-width) * ' +
        i +
        ');}',
    );
  }
  return rows.join('\n');
}

export function nodeMatchesAttrs(node: RNodeType, attrs: RAttributesType) {
  if (attrs.isDefault) {
    return node.attrs.isDefault;
  }

  var a = node.attrs;

  return (
    !(a.wcNode || attrs.wcNode) &&
    a.fci === attrs.fci &&
    a.bci === attrs.bci &&
    a.uci === attrs.uci &&
    a.fcs === attrs.fcs &&
    a.bcs === attrs.bcs &&
    a.ucs === attrs.ucs &&
    a.bold === attrs.bold &&
    a.blink === attrs.blink &&
    a.italic === attrs.italic &&
    a.underline === attrs.underline &&
    a.strikethrough === attrs.strikethrough
  );
}

hterm.TextAttributes.prototype.isDefault = function(): boolean {
  // Reorder
  return (
    this.asciiNode &&
    !this.wcNode &&
    !this.underline &&
    !this.bold &&
    !this.italic &&
    this.foregroundSource == this.SRC_DEFAULT &&
    this.backgroundSource == this.SRC_DEFAULT &&
    !this.faint &&
    !this.blink &&
    !this.strikethrough &&
    !this.inverse &&
    !this.invisible &&
    this.tileData == null &&
    this.uri == null
  );
};

var _nonASCIIRegex = /[^\x00-\x7F]/;

hterm.TextAttributes.splitWidecharStringBack = function(str) {
  var rv = [];
  var base = 0,
    length = 0,
    wcStrWidth = 0,
    wcCharWidth;
  var asciiNode = true;
  var len = str.length;
  var i = 0;
  var idx = str.search(_nonASCIIRegex);
  if (idx > 1) {
    rv.push({
      str: str.substr(0, idx),
      wcNode: false,
      asciiNode: true,
      wcStrWidth: idx,
    });
    i = idx;
  } else if (idx === -1) {
    return [
      {
        str: str,
        wcNode: false,
        asciiNode: true,
        wcStrWidth: str.length,
      },
    ];
  }
  while (i < len) {
    var c = str.codePointAt(i);
    var increment;
    if (c < 128) {
      var substr = str.substr(i);
      idx = substr.search(_nonASCIIRegex);
      if (idx === -1) {
        rv.push({
          str: substr,
          wcNode: false,
          asciiNode: true,
          wcStrWidth: substr.length,
        });
        return rv;
      } else {
        increment = idx;
        wcStrWidth = 0;
        length = 0;
        rv.push({
          str: substr.substr(0, idx),
          wcNode: false,
          asciiNode: true,
          wcStrWidth: idx,
        });
      }
    } else {
      increment = c <= 0xffff ? 1 : 2;
      wcCharWidth = lib.wc.charWidth(c);
      if (wcCharWidth <= 1) {
        wcStrWidth += wcCharWidth;
        length += increment;
        asciiNode = false;
      } else {
        if (length) {
          rv.push({
            str: str.substr(base, length),
            wcNode: false,
            asciiNode: asciiNode,
            wcStrWidth: wcStrWidth,
          });
          asciiNode = true;
          wcStrWidth = 0;
        }
        rv.push({
          str: str.substr(i, increment),
          wcNode: true,
          asciiNode: false,
          wcStrWidth: 2,
        });
        base = i + increment;
        length = 0;
      }
    }
    i += increment;
  }

  if (length) {
    rv.push({
      str: str.substr(base, length),
      wcNode: false,
      asciiNode: asciiNode,
      wcStrWidth: wcStrWidth,
    });
  }

  return rv;
};

hterm.TextAttributes.splitWidecharString = function(str) {
  var rv = [];
  var base = 0,
    length = 0,
    wcStrWidth = 0,
    wcCharWidth;
  var asciiNode = true;
  var len = str.length;
  var i = 0;
  var idx = str.search(_nonASCIIRegex);
  if (idx > 1) {
    rv.push({
      str: str.substr(0, idx),
      wcNode: false,
      asciiNode: true,
      wcStrWidth: idx,
    });
    i = idx;
  } else if (idx === -1) {
    return [
      {
        str: str,
        wcNode: false,
        asciiNode: true,
        wcStrWidth: str.length,
      },
    ];
  }
  while (i < len) {
    var c = str.codePointAt(i);
    var increment;
    if (c < 128) {
      wcStrWidth += 1;
      length += 1;
      increment = 1;
    } else {
      increment = c <= 0xffff ? 1 : 2;
      wcCharWidth = lib.wc.charWidth(c);
      if (wcCharWidth <= 1) {
        wcStrWidth += wcCharWidth;
        length += increment;
        asciiNode = false;
      } else {
        if (length) {
          rv.push({
            str: str.substr(base, length),
            wcNode: false,
            asciiNode: asciiNode,
            wcStrWidth: wcStrWidth,
          });
          asciiNode = true;
          wcStrWidth = 0;
        }
        rv.push({
          str: str.substr(i, increment),
          wcNode: true,
          asciiNode: false,
          wcStrWidth: 2,
        });
        base = i + increment;
        length = 0;
      }
    }
    i += increment;
  }

  if (length) {
    rv.push({
      str: str.substr(base, length),
      wcNode: false,
      asciiNode: asciiNode,
      wcStrWidth: wcStrWidth,
    });
  }

  return rv;
};

lib.wc.substr = function(str, start, opt_width) {
  if (!_nonASCIIRegex.test(str)) {
    return str.substr(start, opt_width);
  }

  var startIndex = 0;
  var endIndex, width;

  // Fun edge case: Normally we associate zero width codepoints (like combining
  // characters) with the previous codepoint, so we skip any leading ones while
  // including trailing ones.  However, if there are zero width codepoints at
  // the start of the string, and the substring starts at 0, lets include them
  // in the result.  This also makes for a simple optimization for a common
  // request.
  if (start) {
    for (width = 0; startIndex < str.length; ) {
      const codePoint = str.codePointAt(startIndex);
      width += lib.wc.charWidth(codePoint);
      if (width > start) break;
      startIndex += codePoint <= 0xffff ? 1 : 2;
    }
  }

  if (opt_width != undefined) {
    for (endIndex = startIndex, width = 0; endIndex < str.length; ) {
      const codePoint = str.codePointAt(endIndex);
      width += lib.wc.charWidth(codePoint);
      if (width > opt_width) break;
      endIndex += codePoint <= 0xffff ? 1 : 2;
    }
    return str.substring(startIndex, endIndex);
  }

  return str.substr(startIndex);
};

lib.wc.strWidth = function(str) {
  if (!_nonASCIIRegex.test(str)) {
    return str.length;
  }

  var width,
    rv = 0;

  for (var i = 0, len = str.length; i < len; ) {
    var codePoint = str.codePointAt(i);
    width = lib.wc.charWidth(codePoint);
    if (width < 0) return -1;
    rv += width;
    i += codePoint <= 0xffff ? 1 : 2;
  }

  return rv;
};

let __charCache: Map<number, number> = new Map();

var __charWidth = lib.wc.charWidth;

lib.wc.charWidth = function(ucs: number): number {
  let res = __charCache.get(ucs);
  if (res === undefined) {
    res = __charWidth(ucs);
    if (__charCache.size > 200000) {
      __charCache = new Map();
    }
    __charCache.set(ucs, res);
  }

  return res;
};
