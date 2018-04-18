// @flow

import { lib, hterm } from '../hterm_all';
import type { RNodeType, RRowType } from './model';
import { rowText } from './utils';
require('./Screen');


test('splitWidecharString-ascii', () => {
  var text = 'abcdefghijklmn';

  var actual = hterm.TextAttributes.splitWidecharString(text);
  expect(actual.length).toEqual(1);
  expect(actual[0].str).toEqual(text);
  expect(actual[0].wcNode).toEqual(false);
});

test('splitWidecharString-wide', () => {
  var text = 'abcd\u3041\u3042def\u3043ghi';
  var actual = hterm.TextAttributes.splitWidecharString(text);
  expect(actual.length).toEqual(6)
  expect(actual[0].str).toEqual('abcd')
  expect(actual[0].wcNode).toEqual(false);
  expect(actual[1].str).toEqual('\u3041')
  expect(actual[1].wcNode).toEqual(true)
  expect(actual[1].asciiNode).toEqual(false)
  expect(actual[2].str).toEqual('\u3042')
  expect(actual[2].wcNode).toEqual(true)
  expect(actual[2].asciiNode).toEqual(false)
  expect(actual[3].str).toEqual('def')
  expect(actual[3].wcNode).toEqual(false)
  expect(actual[3].asciiNode).toEqual(true)
  expect(actual[4].str).toEqual('\u3043')
  expect(actual[4].wcNode).toEqual(true)
  expect(actual[4].asciiNode).toEqual(false)
  expect(actual[5].str).toEqual('ghi')
  expect(actual[5].wcNode).toEqual(false)
  expect(actual[5].asciiNode).toEqual(true)
});

test('splitWidecharString-surrogates', () => {
  var text = 'abc\uD834\uDD00\uD842\uDD9D';
  var actual = hterm.TextAttributes.splitWidecharString(text);
  expect(actual.length).toEqual(2)
  expect(actual[0].str).toEqual('abc\uD834\uDD00')
  expect(actual[0].wcNode).toEqual(false)
  expect(actual[0].asciiNode).toEqual(false)
  expect(actual[1].str).toEqual('\uD842\uDD9D')
  expect(actual[1].wcNode).toEqual(true)
  expect(actual[1].asciiNode).toEqual(false)
});

test('splitWidecharString-ccs', () => {
  var text = 'xA\u030Ax';
  var actual = hterm.TextAttributes.splitWidecharString(text);
  expect(actual.length).toEqual(1)
  expect(actual[0].str).toEqual(text)
});
