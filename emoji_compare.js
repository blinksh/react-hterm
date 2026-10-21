// Prints strWidth / substr / splitWidecharString for a set of emoji cases,
// evaluated over a built bundle in jsdom. With a Blink patches file, it prints
// the results again with that file's grapheme override layered on top.
//
//   node emoji_compare.js <hterm_all.min.js> [hterm_all.patches.js]
//
// e.g. git -C ~/dev/blink show mitchmalone/fix/emoji-row-fit:Resources/hterm_all.patches.js > /tmp/p.js
//      node emoji_compare.js ~/dev/blink/Resources/hterm_all.min.js /tmp/p.js
const fs = require('fs');
const { JSDOM } = require('jsdom');

const [bundlePath, patchPath] = process.argv.slice(2);
if (!bundlePath) {
  console.error('usage: node emoji_compare.js <hterm_all.min.js> [hterm_all.patches.js]');
  process.exit(1);
}

const CASES = [
  ['heart+VS16', '❤️'], ['keycap 1', '1️⃣'], ['a heart+VS16 b', 'a❤️b'],
  ['bare U+23FA', '⏺'], ['U+23FA+VS15', '⏺︎'], ['grinning', '\u{1F600}'],
  ['cook ZWJ', '\u{1F9D1}‍\u{1F373}'], ['family ZWJ', '\u{1F468}‍\u{1F469}‍\u{1F467}'],
  ['thumbs+skin', '\u{1F44D}\u{1F3FB}'], ['flag ES', '\u{1F1EA}\u{1F1F8}'], ['lone RI', '\u{1F1EA}'],
  ['rainbow flag', '\u{1F3F3}️‍\u{1F308}'], ['scotland', '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}'],
  ['e+acute', 'éx'], ['CJK', 'あい'], ['ab cook cd', 'ab\u{1F9D1}‍\u{1F373}cd'],
  ['heart+VS16 cook', '❤️ \u{1F9D1}‍\u{1F373}'],
  ['U+1F5A5 bare', '\u{1F5A5}'], ['U+1F5A5+VS15', '\u{1F5A5}︎'], ['U+1F5A5+VS16', '\u{1F5A5}️'],
  // One grapheme of two wide jamo; must keep the same width next to an emoji.
  ['Hangul L+V+T', '한'], ['old Hangul L+L+V', 'ᄀ가'],
  ['old Hangul L+L+V heart+VS16', 'ᄀ가❤️'],
  ['jamo L + syllable', 'ᄀ가'], ['jamo L + syllable heart+VS16', 'ᄀ가❤️'],
];

function snap(w) {
  const o = {};
  for (const [n, s] of CASES) {
    o[n] = `w=${w.lib.wc.strWidth(s)} sub(0,2)=${JSON.stringify(w.lib.wc.substr(s, 0, 2))} sub(2)=${JSON.stringify(w.lib.wc.substr(s, 2))} | ` +
      w.hterm.TextAttributes.splitWidecharString(s)
        .map(x => `${JSON.stringify(x.str)}${x.wcNode ? '[wc]' : ''}:${x.wcStrWidth}`).join(' ');
  }
  return o;
}

const w = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', pretendToBeVisual: true }).window;
w.eval(fs.readFileSync(bundlePath, 'utf8'));
const ours = snap(w);

let patched = null;
if (patchPath) {
  // Only the width overrides; the print() wrappers need a laid-out terminal.
  const src = fs.readFileSync(patchPath, 'utf8');
  const start = src.indexOf('var _BLINK_JOINERS');
  const end = src.indexOf('hterm.Terminal.prototype.print_original');
  if (start === -1 || end === -1) {
    console.error('no grapheme override found in ' + patchPath);
    process.exit(1);
  }
  w.eval(src.slice(start, end));
  patched = snap(w);
}

for (const [n] of CASES) {
  console.log(`## ${n}\n  ours   : ${ours[n]}` + (patched ? `\n  patched: ${patched[n]}` : ''));
}
