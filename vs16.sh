#!/bin/sh
# VS16 width probe for react-hterm.
# Each block pairs the emoji case with a CJK control (あ). The control is a
# plain 2-column char, so anything the control gets right and the emoji gets
# wrong is VS16-specific.

R='\033[0m'
BG='\033[41m'   # red background = shows the cell box the terminal allotted

echo
echo "=== A. non-ASCII base + VS16 vs CJK control ==="
printf '....^....1....^....2....^....3....^....4\n'
printf '|\xe2\x9d\xa4\xef\xb8\x8f|\xe2\x9a\xa0\xef\xb8\x8f|\xe2\x9c\x94\xef\xb8\x8f|\xe2\x84\xb9\xef\xb8\x8f|\xe2\x9a\x99\xef\xb8\x8f| emoji+VS16\n'
printf '|\xe3\x81\x82|\xe3\x81\x82|\xe3\x81\x82|\xe3\x81\x82|\xe3\x81\x82| CJK control\n'

echo
echo "=== B. ASCII base + VS16 (keycaps) ==="
printf '....^....1....^....2....^....3....^....4\n'
printf '|\x31\xef\xb8\x8f\xe2\x83\xa3|\x32\xef\xb8\x8f\xe2\x83\xa3|\x23\xef\xb8\x8f\xe2\x83\xa3|\x2a\xef\xb8\x8f\xe2\x83\xa3| keycap: digit/#/* + FE0F + 20E3\n'
printf '|\x23\xef\xb8\x8f|\x31\xef\xb8\x8f|\x2a\xef\xb8\x8f|\x39\xef\xb8\x8f| ASCII + FE0F, no keycap mark\n'
printf '|\xe3\x81\x82|\xe3\x81\x82|\xe3\x81\x82|\xe3\x81\x82| CJK control\n'

echo
echo "=== C. VS16 + combining mark / ZWJ / degenerate ==="
printf '....^....1....^....2....^....3....^....4\n'
printf '|\xe2\x9d\xa4\xef\xb8\x8f\xcc\x81|\xe2\x9a\xa0\xef\xb8\x8f\xcc\x88| base+FE0F+U+0301 / U+0308\n'
printf '|\xf0\x9f\x8f\xb3\xef\xb8\x8f\xe2\x80\x8d\xf0\x9f\x8c\x88|\xf0\x9f\x91\xa8\xe2\x80\x8d\xe2\x9d\xa4\xef\xb8\x8f\xe2\x80\x8d\xf0\x9f\x91\xa8| ZWJ (each sub-emoji still counts 2)\n'
printf '|\xef\xb8\x8f|\xef\xb8\x8f\xef\xb8\x8f|\xe2\x9d\xa4\xef\xb8\x8e| lone FE0F, doubled FE0F, VS15 (text)\n'

echo
echo "=== D. box vs glyph: red = the cells the terminal allotted ==="
printf 'X'; printf "$BG"; printf '\xe2\x9d\xa4\xef\xb8\x8f'; printf "$R"; printf 'X  emoji+VS16 -- red must be exactly 2 cells\n'
printf 'X'; printf "$BG"; printf '\x31\xef\xb8\x8f\xe2\x83\xa3'; printf "$R"; printf 'X  keycap\n'
printf 'X'; printf "$BG"; printf '\xe3\x81\x82'; printf "$R"; printf 'X  CJK control\n'
echo '(if red is 2 cells wide but the glyph paints outside it, the count is'
echo ' right and the font glyph is too wide -- a rendering issue, not width)'

echo
echo "=== E. cluster straddling the right margin ==="
cols=$(tput cols 2>/dev/null || echo 80)
for u in '\xe2\x9d\xa4\xef\xb8\x8f' '\x31\xef\xb8\x8f\xe2\x83\xa3' '\xe3\x81\x82'; do
  i=1
  while [ "$i" -le 3 ]; do
    printf '%*s' "$((cols - i))" '' | tr ' ' '-'
    printf "$u"; printf 'XY\n'
    i=$((i + 1))
  done
done
echo '(emoji rows must behave exactly like the CJK rows at the bottom)'

echo
echo "=== F. cursor addressing over clusters ==="
printf '\xe2\x9d\xa4\xef\xb8\x8f\xe2\x9d\xa4\xef\xb8\x8f\xe2\x9d\xa4\xef\xb8\x8f\xe2\x9d\xa4\xef\xb8\x8f\xe2\x9d\xa4\xef\xb8\x8f\r\033[10CHERE\n'
printf '\x31\xef\xb8\x8f\xe2\x83\xa3\x31\xef\xb8\x8f\xe2\x83\xa3\x31\xef\xb8\x8f\xe2\x83\xa3\x31\xef\xb8\x8f\xe2\x83\xa3\x31\xef\xb8\x8f\xe2\x83\xa3\r\033[10CHERE\n'
printf '\xe3\x81\x82\xe3\x81\x82\xe3\x81\x82\xe3\x81\x82\xe3\x81\x82\r\033[10CHERE\n'
echo '(all three HERE must start at the same column, right after the glyphs)'
echo
