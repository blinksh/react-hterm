// Random writes, inserts and deletes on one row of a built bundle in jsdom,
// each compared with a cell-array model that follows xterm: a boundary inside a
// wide cell blanks the whole cell. Also checks that node widths add up to the
// width of their text.
//
//   node row_fuzz.js <hterm_all.min.js> [seed]
const fs = require('fs');
const { JSDOM } = require('jsdom');

const [bundlePath, seedArg] = process.argv.slice(2);
if (!bundlePath) {
  console.error('usage: node row_fuzz.js <hterm_all.min.js> [seed]');
  process.exit(1);
}

const w = new JSDOM('', { runScripts: 'outside-only' }).window;
w.eval(fs.readFileSync(bundlePath, 'utf8'));
const { hterm, lib } = w;

const COLS = 40;
const RUNS = 3000;
const STEPS = 12;
const PIECES = ['a', 'b', 'c', 'x', 'é', 'あ', 'い', '\u{1F600}', '\u{1F9D1}‍\u{1F373}', '❤️', '⏺', ' '];
const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

// Minimal Terminal for hterm.Terminal.prototype.print over a one-row Screen.
function makeTerminal() {
  const s = new hterm.Screen();
  s.setColumnCount(COLS);
  s.pushRow({ n: 0, key: 0, nodes: [], v: 0, o: false });
  s.setCursorPosition(0, 0);
  return {
    screen_: s,
    options_: { wraparound: false, insertMode: false },
    screenSize: { width: COLS },
    accessibilityReader_: { announce() {} },
    scrollPort_: { renderRef: { touchRow() {} } },
    scheduleSyncCursorPosition_() {},
    newLine() {},
  };
}

function render(t) {
  return t.screen_.rowsArray[0].nodes
    .map(n => n.txt + ' '.repeat(Math.max(0, n.wcw - lib.wc.strWidth(n.txt))))
    .join('').trimEnd();
}

// Model: cells[i] is {ch, w} for a cell head, {cont: true} for the right half
// of a wide cell, undefined for blank.
function blank(c, i) {
  if (c[i] && c[i].cont) { c[i - 1] = undefined; c[i] = undefined; }
  else if (c[i] && c[i].w === 2) { c[i] = undefined; c[i + 1] = undefined; }
}
function splitAt(c, i) {
  if (c[i] && c[i].cont) { c[i - 1] = undefined; c[i] = undefined; }
}
function refWrite(c, x, s) {
  let col = x;
  for (const { segment: g } of seg.segment(s)) {
    const gw = lib.wc.strWidth(g);
    if (!gw) continue;
    for (let k = 0; k < gw; k++) blank(c, col + k);
    c[col] = { ch: g, w: gw };
    if (gw === 2) c[col + 1] = { cont: true };
    col += gw;
  }
}
function refInsert(c, x, s) {
  splitAt(c, x);
  c.splice(x, 0, ...Array(lib.wc.strWidth(s)).fill(undefined));
  refWrite(c, x, s);
  c.length = Math.min(c.length, COLS);
}
function refDelete(c, x, n) {
  splitAt(c, x);
  splitAt(c, x + n);
  c.splice(x, n);
}
function refRender(c) {
  let s = '';
  for (let i = 0; i < c.length; i++) {
    const v = c[i];
    if (!v) s += ' ';
    else if (!v.cont) s += v.ch;
  }
  return s.trimEnd();
}

let seed = +seedArg || 7;
const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };

let fails = 0, ops = 0;
for (let run = 0; run < RUNS && fails < 5; run++) {
  const t = makeTerminal();
  const c = [];
  const log = [];
  for (let step = 0; step < STEPS; step++) {
    const x = rnd(16);
    let s = '';
    const n = 1 + rnd(4);
    for (let i = 0; i < n; i++) s += PIECES[rnd(PIECES.length)];

    const sa = t.screen_.textAttributes;
    if (rnd(4) === 0) {
      sa.foregroundSource = rnd(2) ? 3 : sa.SRC_DEFAULT;
      sa.foregroundColor = 3;
      sa.bold = !!rnd(2);
      sa.syncColors && sa.syncColors();
    } else {
      sa.reset && sa.reset();
    }

    const kind = rnd(10);
    t.screen_.setCursorPosition(0, x);
    if (kind < 6) {
      t.options_.insertMode = false;
      hterm.Terminal.prototype.print.call(t, s, false);
      refWrite(c, x, s);
      log.push(`write ${x} ${JSON.stringify(s)}`);
    } else if (kind < 8) {
      t.options_.insertMode = true;
      hterm.Terminal.prototype.print.call(t, s, false);
      refInsert(c, x, s);
      log.push(`insert ${x} ${JSON.stringify(s)}`);
    } else {
      const k = 1 + rnd(3);
      t.screen_.deleteChars(k);
      refDelete(c, x, k);
      log.push(`delete ${x} ${k}`);
    }
    ops++;

    const got = render(t), exp = refRender(c);
    const nodes = t.screen_.rowsArray[0].nodes;
    const wcw = nodes.reduce((a, n) => a + n.wcw, 0);
    const real = nodes.reduce((a, n) => a + lib.wc.strWidth(n.txt), 0);
    if (got !== exp || wcw !== real) {
      fails++;
      console.log('FAIL after', log.join(' | '));
      console.log('  got', JSON.stringify(got), 'exp', JSON.stringify(exp), 'wcw', wcw, 'real', real);
      break;
    }
  }
}
console.log(`${ops} ops, ${fails ? fails + ' failures' : 'ok'}`);
process.exit(fails ? 1 : 0);
