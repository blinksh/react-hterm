import { RNodeType, RAttributesType } from './model';
import { hterm, lib } from '../hterm_all';
import { genKey, touch } from './utils';
import { WC_PRECALCULATED_CLASSES } from './RNode';

var __cssStyleSheet: HTMLStyleElement | null = null;

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
    // TODO: RECHECK
    // @ts-ignore
    wcw,
    key: genKey(),
    attrs,
  };
}

hterm.TextAttributes.prototype.resetColorPalette = function() {
  this.colorPalette = lib.colors.colorPalette.concat();
  this.refreshCSSPalette();
  this.syncColors();
};

hterm.TextAttributes.prototype.refreshCSSPalette = function() {
  if (!__cssStyleSheet) {
    var style = document.createElement('style');
    style.type = 'text/css';
    this.document_.getElementsByTagName('head')[0].appendChild(style);
    __cssStyleSheet = style;
  }

  if (this._debounce) {
    clearTimeout(this._debounce);
    this._debounce = null;
  }

  var self = this;
  this._debounce = setTimeout(function() {
    if (__cssStyleSheet) {
      __cssStyleSheet.innerHTML = __generateAttributesStyleSheet(self);
    }
    self._debounce = null;
  }, 10);
};

function __getBrightIndex(i: number): number {
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
  var attrs: RAttributesType = {
    isDefault: false,
    wcNode: this.wcNode,
    asciiNode: this.asciiNode,
    fci: -1,
    bci: -1,
    uci: -1,
  };

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

  if (typeof this.underlineColor === 'number') {
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
  rows.push('span.wc { display: inline-block; display: -webkit-inline-box; overflow-x:hidden; }');
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
    this.foregroundSource == this.SRC_DEFAULT &&
    this.backgroundSource == this.SRC_DEFAULT &&
    !this.underline &&
    !this.bold &&
    !this.italic &&
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

hterm.TextAttributes.splitWidecharString = function(str: string) {
  var rv = [],
    base = 0,
    length = 0,
    wcStrWidth = 0,
    wcCharWidth = 0,
    asciiNode = true,
    len = str.length;

  var i = str.search(_nonASCIIRegex);
  if (i < 0) {
    return [
      {
        str,
        wcNode: false,
        asciiNode,
        wcStrWidth: len,
      },
    ];
  }

  length = wcStrWidth = i;

  while (i < len) {
    var increment;
    var c = str.codePointAt(i);
    // @ts-ignore
    if (c < 128) {
      var substr = str.substr(i);
      var idx = substr.search(_nonASCIIRegex);
      if (idx === -1) {
        if (length) {
          rv.push({
            str: str.substr(base),
            wcNode: false,
            asciiNode,
            wcStrWidth: wcStrWidth + (len - i),
          });
        } else {
          rv.push({
            str: substr,
            wcNode: false,
            asciiNode: true,
            wcStrWidth: substr.length,
          });
        }
        return rv;
      } else {
        wcStrWidth += idx;
        length += idx;
        increment = idx;
      }
    } else {
      // @ts-ignore
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
            asciiNode,
            wcStrWidth,
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
      asciiNode,
      wcStrWidth,
    });
  }

  return rv;
};

lib.wc.substr = function(
  str: string,
  start: number,
  opt_width?: number,
): string {
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
      // @ts-ignore
      startIndex += codePoint <= 0xffff ? 1 : 2;
    }
  }

  if (opt_width != undefined) {
    for (endIndex = startIndex, width = 0; endIndex < str.length; ) {
      const codePoint = str.codePointAt(endIndex);
      width += lib.wc.charWidth(codePoint);
      if (width > opt_width) {
        break;
      }
      // @ts-ignore
      endIndex += codePoint <= 0xffff ? 1 : 2;
    }
    return str.substring(startIndex, endIndex);
  }

  return str.substr(startIndex);
};

lib.wc.strWidth = function(str: string): number {
  var width,
    len = str.length,
    rv = 0;

  var idx = str.search(_nonASCIIRegex);
  if (idx < 0) {
    return len;
  }

  var i = idx;
  rv = idx;

  while (i < len) {
    var codePoint = str.codePointAt(i);
    width = lib.wc.charWidth(codePoint);
    if (width < 0) return -1;
    rv += width;
    // @ts-ignore
    i += codePoint <= 0xffff ? 1 : 2;
  }

  return rv;
};

// Import widechar_width library for Unicode 17.0 support
// @ts-ignore
import { widechar_wcwidth } from './widechar_width.js';

let __charCache: Map<number, number> = new Map();

const __charWidth = lib.wc.charWidth;

/**
 * Use widechar_width library (Unicode 17.0) to supplement hterm_all.js (Unicode 13.0).
 * This provides complete and maintained Unicode character width coverage.
 */

lib.wc.charWidth = function(ucs: number): number {
  let res = __charCache.get(ucs);
  if (res === undefined) {
    // Try widechar_width library first (Unicode 17.0)
    const wcwidth = widechar_wcwidth(ucs);

    if (wcwidth === 2) {
      // Double-width character
      res = 2;
    } else if (wcwidth === -2) {
      // Combining character (zero-width)
      res = 0;
    } else if (wcwidth === 1) {
      // Single-width character
      res = 1;
    } else if (wcwidth < 0) {
      // Special values: nonprint, ambiguous, private, unassigned, etc.
      // Fall back to hterm_all.js logic for these
      res = __charWidth(ucs);
    } else {
      // Default case
      res = wcwidth;
    }

    if (__charCache.size > 20000) {
      __charCache = new Map();
    }
    // @ts-ignore
    __charCache.set(ucs, res);
  }

  // @ts-ignore
  return res;
};

// Legacy custom ranges - DEPRECATED, replaced by widechar_width library
// Kept here for reference only, not used in code
/*
const CUSTOM_WIDE_RANGES_DEPRECATED: [number, number][] = [
  // ============================================================================
  // SYMBOLS & DINGBATS (0x2600-0x27BF)
  // ============================================================================
  [0x2600, 0x2604],  // ☀ ☁ ☂ ☃ ☄ Sun, cloud, umbrella, snowman, comet
  [0x2607, 0x2612],  // Weather and astrological symbols
  [0x2616, 0x2647],  // Religious symbols, chess pieces
  [0x2654, 0x267e],  // Chess, playing cards
  [0x2680, 0x2692],  // Die faces, symbols
  [0x2694, 0x26a0],  // Swords and symbols
  [0x26a2, 0x26a9],  // Symbols
  [0x26ac, 0x26bc],  // Symbols
  [0x26bf, 0x26c3],  // Symbols
  [0x26c6, 0x26cd],  // Symbols
  [0x26cf, 0x26d3],  // Pick, helmet, chains
  [0x26d5, 0x26e9],  // No entry, Shinto shrine
  [0x26eb, 0x26f1],  // Castle, fountain
  [0x26f4, 0x26f4],  // Ferry
  [0x26f6, 0x26f9],  // Sailboat, sports
  [0x26fb, 0x26fc],  // Symbols
  [0x26fe, 0x2704],  // Symbols
  [0x2706, 0x2709],  // Symbols
  [0x270c, 0x2727],  // Victory hand, sparkles
  [0x2729, 0x274b],  // ✩ ✪ ✫ ✬ ✭ ✮ ✯ ✰ Stars and dingbats
  [0x274d, 0x274d],  // Shadowed white circle
  [0x274f, 0x2752],  // Symbols
  [0x2756, 0x2756],  // Symbol
  [0x2758, 0x2794],  // Symbols and arrows
  [0x2798, 0x27af],  // Arrows
  [0x27b1, 0x27be],  // Dingbats

  // ============================================================================
  // EMOJI RANGES (0x1F000-0x1FFFF)
  // ============================================================================
  [0x1F000, 0x1F003],  // Mahjong tiles
  [0x1F005, 0x1F0CE],  // Mahjong and playing cards
  [0x1F0D0, 0x1F18D],  // Playing cards
  [0x1F18F, 0x1F190],  // Squared symbols
  [0x1F19B, 0x1F1FF],  // Regional indicators
  [0x1F201, 0x1F20F],  // Squared symbols
  [0x1F21A, 0x1F21F],  // Squared CJK
  [0x1F22F, 0x1F23A],  // Squared CJK
  [0x1F23C, 0x1F23F],  // Squared symbols
  [0x1F249, 0x1F24F],  // Squared symbols
  [0x1F252, 0x1F25F],  // Squared symbols
  [0x1F266, 0x1F2FF],  // Transport signs
  [0x1F321, 0x1F32C],  // Thermometer, wind face
  [0x1F336, 0x1F336],  // 🌶 Hot pepper
  [0x1F37D, 0x1F37D],  // Fork and knife with plate
  [0x1F394, 0x1F39F],  // Heart decoration, admission tickets
  [0x1F3CB, 0x1F3CE],  // Weight lifter, racing car
  [0x1F3D4, 0x1F3DF],  // Snow capped mountain, stadium
  [0x1F3F1, 0x1F3F3],  // White pennant, waving white flag
  [0x1F3F5, 0x1F3F7],  // Rosette, construction sign
  [0x1F3F9, 0x1F43F],  // Bow and arrow, chipmunk
  [0x1F441, 0x1F441],  // 👁 Eye
  [0x1F4FD, 0x1F4FE],  // Film projector, portable stereo
  [0x1F53E, 0x1F54A],  // Six-pointed star
  [0x1F54F, 0x1F54F],  // Prayer beads
  [0x1F568, 0x1F579],  // Speaker, joystick
  [0x1F57B, 0x1F594],  // Left hand telephone, victory hand
  [0x1F597, 0x1F5A3],  // Symbols
  [0x1F5A5, 0x1F5FA],  // Desktop computer, world map
  [0x1F650, 0x1F67F],  // Symbols
  [0x1F6C6, 0x1F6CB],  // Triangle with rounded corners
  [0x1F6CD, 0x1F6CF],  // Shopping bags
  [0x1F6D3, 0x1F6D4],  // Stupa
  [0x1F6D8, 0x1F6EA],  // Tools
  [0x1F6ED, 0x1F6F3],  // Satellite
  [0x1F6FD, 0x1F7DF],  // Toilet, geometric shapes
  [0x1F7EC, 0x1F7FF],  // Shapes
  [0x1F80C, 0x1F80F],  // Arrows
  [0x1F848, 0x1F84F],  // Signstick
  [0x1F85A, 0x1F85F],  // Clothing
  [0x1F888, 0x1F88F],  // Regional
  [0x1F8AE, 0x1F8FF],  // Regional
  [0x1F90D, 0x1F90F],  // White heart
  [0x1F910, 0x1F918],  // Zipper mouth face, sign of horns
  [0x1F919, 0x1F93B],  // Call me hand, modern pentathlon
  [0x1F93C, 0x1F93C],  // Wrestlers
  [0x1F946, 0x1F946],  // Rifle
  [0x1F979, 0x1F979],  // Face with symbols on mouth
  [0x1F9CC, 0x1F9CC],  // Troll
  [0x1FA00, 0x1FA6F],  // Chess symbols
  [0x1FA7B, 0x1FA7F],  // Symbols
  [0x1FA8A, 0x1FA8E],  // Symbols
  [0x1FA90, 0x1FA90],  // Symbols

  // ============================================================================
  // UNICODE 14.0 (September 2021)
  // ============================================================================
  [0x1FAC3, 0x1FAC5],  // 🫃 🫄 🫅 Pregnant man, pregnant person, person with crown
  [0x1FAD7, 0x1FAD9],  // 🫗 🫘 🫙 Pouring liquid, beans, jar
  [0x1FAE0, 0x1FAE7],  // 🫠 🫡 🫢 🫣 🫤 🫥 🫦 🫧 Face emoji
  [0x1FAF0, 0x1FAF8],  // 🫰 🫱 🫲 🫳 🫴 🫵 🫶 🫷 🫸 Hand gestures

  // ============================================================================
  // UNICODE 15.0 (September 2022)
  // ============================================================================
  [0x1FA75, 0x1FA77],  // 🩵 🩶 🩷 Colored hearts
  [0x1FA87, 0x1FA88],  // 🪇 🪈 Maracas, flute
  [0x1FAA9, 0x1FAAD],  // 🪩 🪪 🪫 🪬 🪭 Mirror ball, ID card, battery, hamsa, fan
  [0x1FAAE, 0x1FAAF],  // 🪮 🪯 Hair pick, khanda
  [0x1FAB7, 0x1FABA],  // 🪷 🪸 🪹 🪺 Lotus, coral, nests
  [0x1FABB, 0x1FABD],  // 🪻 🪼 🪽 Hyacinth, jellyfish, wing
  [0x1FABF, 0x1FABF],  // 🪿 Goose

  // ============================================================================
  // UNICODE 16.0 (September 2024)
  // ============================================================================
  [0x1FA89, 0x1FA89],  // 🪉 Harp
  [0x1FA8F, 0x1FA8F],  // 🪏 Shovel
  [0x1FABE, 0x1FABE],  // 🪾 Leafless tree
  [0x1FAC6, 0x1FAC6],  // 🫆 Fingerprint
  [0x1FADC, 0x1FADC],  // 🫜 Root vegetable
  [0x1FADF, 0x1FADF],  // 🫟 Splatter
  [0x1FAE8, 0x1FAE9],  // 🫨 🫩 Shaking face, face with bags under eyes

  // ============================================================================
  // UNICODE 17.0 (September 2025)
  // ============================================================================
  [0x1F9CE, 0x1F9CE],  // 🧎 Hairy creature
  [0x1FA88, 0x1FA88],  // 🪈 Trombone
  [0x1F40B, 0x1F40B],  // 🐋 Orca
  [0x1FA99, 0x1FA99],  // 🪙 Treasure chest
  [0x1FAE4, 0x1FAE4],  // 🫤 Distorted face
  [0x1F4A5, 0x1F4A5],  // 💥 Fight cloud
  [0x1FAB8, 0x1FAB8],  // 🪸 Landslide
];
*/
