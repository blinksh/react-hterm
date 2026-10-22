#!/bin/sh
# Writes, inserts and deletes that land on half of a wide cell, for react-hterm
# in Blink. Each row prints |setup|, moves the cursor into it and runs the
# operation; the expected result follows on the same line. As in xterm, a
# boundary inside a wide cell blanks the whole cell, so both sides must match
# and the closing | must line up. Section 4 prints whole clusters untouched,
# to check that each one copies back as the same bytes.
#
#   sh wide_cell_tables.sh          print the table
#   sh wide_cell_tables.sh paste    print each row alone, then read back a copy
#                                   of it (select from | to |) and compare

R='\033[0m'
RED='\033[41m'
A='\xe3\x81\x82'                                        # U+3042, CJK
I='\xe3\x81\x84'                                        # U+3044, CJK
H='\xed\x95\x9c'                                        # U+D55C, Hangul
E='\xf0\x9f\x98\x80'                                    # U+1F600
COOK='\xf0\x9f\xa7\x91\xe2\x80\x8d\xf0\x9f\x8d\xb3'     # ZWJ sequence
FAM='\xf0\x9f\x91\xa8\xe2\x80\x8d\xf0\x9f\x91\xa9\xe2\x80\x8d\xf0\x9f\x91\xa7'
FLAG='\xf0\x9f\x87\xaa\xf0\x9f\x87\xb8'                 # regional indicators
SKIN='\xf0\x9f\x91\x8d\xf0\x9f\x8f\xbb'                 # skin-tone modifier
HEART='\xe2\x9d\xa4\xef\xb8\x8f'                        # VS16
KEY='1\xef\xb8\x8f\xe2\x83\xa3'                         # keycap
RAIN='\xf0\x9f\x8f\xb3\xef\xb8\x8f\xe2\x80\x8d\xf0\x9f\x8c\x88'  # VS16 + ZWJ
SCOT='\xf0\x9f\x8f\xb4\xf3\xa0\x81\xa7\xf3\xa0\x81\xa2\xf3\xa0\x81\xb3\xf3\xa0\x81\xa3\xf3\xa0\x81\xb4\xf3\xa0\x81\xbf'
REC='\xe2\x8f\xba\xef\xb8\x8e'                          # U+23FA + VS15
PC='\xf0\x9f\x96\xa5'                                    # U+1F5A5, 1 column
OLDH='\xe1\x84\x80\xea\xb0\x80'                         # old Hangul L + LV

MODE=$1
FAILS=0

# t NAME SETUP COL OP ARG EXPECT [PLAIN]
#   COL is 0-based inside the setup; OP is w (write ARG), i (insert ARG) or
#   d (delete ARG cells) or n (nothing). PLAIN is the copied text when EXPECT carries SGR.
t() {
  printf '|'; printf "$2"; printf '|'
  printf '\033[%dG' $(($3 + 2))
  case $4 in
    w) printf "$5" ;;
    i) printf '\033[4h'; printf "$5"; printf '\033[4l' ;;
    d) printf '\033[%dP' "$5" ;;
    n) ;;
  esac
  if [ "$MODE" = paste ]; then
    printf '\033[24G%s\n' "$1"
    exp=$(printf "|${7:-$6}|")
    printf 'paste> '
    IFS= read -r got
    if [ "$got" = "$exp" ]; then
      echo ok
    else
      FAILS=$((FAILS + 1))
      echo FAIL
      printf '  exp '; printf '%s' "$exp" | od -An -tx1
      printf '  got '; printf '%s' "$got" | od -An -tx1
    fi
  else
    printf '\033[24G|'; printf "$6"; printf '|'
    printf '\033[40G%s\n' "$1"
  fi
}

# c NAME SAMPLE: print SAMPLE as is; it must copy back unchanged.
c() {
  t "$1" "$2" 0 n '' "$2"
}

echo ''
echo '=== 1. write at either half ==='
printf 'result\033[24Gexpected\033[40Gcase\n'
t 'CJK right half'      "${A}bc"       1 w x " xbc"
t 'CJK left half'       "${A}bc"       0 w x "x bc"
t 'Hangul right half'   "${H}bc"       1 w x " xbc"
t 'emoji right half'    "ab${E}cd"     3 w x "ab xcd"
t 'emoji left half'     "ab${E}cd"     2 w x "abx cd"
t 'ZWJ cook right'      "ab${COOK}cd"  3 w x "ab xcd"
t 'ZWJ cook left'       "ab${COOK}cd"  2 w x "abx cd"
t 'ZWJ family right'    "ab${FAM}cd"   3 w x "ab xcd"
t 'flag right half'     "ab${FLAG}cd"  3 w x "ab xcd"
t 'skin tone right'     "ab${SKIN}cd"  3 w x "ab xcd"
t 'heart+VS16 right'    "ab${HEART}cd" 3 w x "ab xcd"
t 'keycap right half'   "ab${KEY}cd"   3 w x "ab xcd"
t 'span over two CJK'   "a${A}${I}b"   2 w xy "a xy b"
t 'wide over half'      "a${A}b"       2 w "$I" "a ${I}"
t 'emoji over CJK half' "${A}${I}"     1 w "$E" " ${E} "
t 'next to ZWJ (kept)'  "ab${COOK}cd"  4 w x "ab${COOK}xd"
t 'coloured CJK right'  "${RED}${A}${R}bc" 1 w x "${RED} ${R}xbc" " xbc"
echo ''
echo '=== 2. insert (IRM) at either half ==='
t 'CJK right half'      "${A}bc"       1 i x " x bc"
t 'CJK left half'       "${A}bc"       0 i x "x${A}bc"
t 'emoji into CJK'      "${A}${I}"     1 i "$E" " ${E} ${I}"
t 'ZWJ cook right'      "ab${COOK}cd"  3 i x "ab x cd"
t 'flag left half'      "ab${FLAG}cd"  2 i x "abx${FLAG}cd"
echo ''
echo '=== 3. delete (DCH) at either half ==='
t 'CJK right half'      "${A}bc"       1 d 1 " bc"
t 'CJK left half, 1'    "${A}bc"       0 d 1 " bc"
t 'CJK left half, 2'    "${A}bc"       0 d 2 "bc"
t 'ZWJ cook right'      "ab${COOK}cd"  3 d 1 "ab cd"
t 'ZWJ family left, 2'  "ab${FAM}cd"   2 d 2 "abcd"
t 'skin tone left, 1'   "ab${SKIN}cd"  2 d 1 "ab cd"
t 'end inside CJK'      "ab${A}cd"     1 d 2 "a cd"
echo ''
echo '=== 4. whole clusters copy as one grapheme ==='
c 'cook ZWJ'            "$COOK"
c 'family ZWJ'          "$FAM"
c 'skin tone'           "$SKIN"
c 'flag ES'             "$FLAG"
c 'rainbow flag'        "$RAIN"
c 'scotland tags'       "$SCOT"
c 'heart+VS16'          "$HEART"
c 'keycap'              "$KEY"
c 'U+23FA+VS15'         "$REC"
c 'U+1F5A5 bare'        "$PC"
c 'U+1F5A5 + abc'       "${PC}abc"
c 'Hangul'              "$H"
c 'old Hangul L+LV'     "$OLDH"
c 'CJK'                 "${A}${I}"
c 'ab cook cd'          "ab${COOK}cd"
c 'heart cook'          "${HEART} ${COOK}"
echo ''
if [ "$MODE" = paste ]; then
  echo "$FAILS failures"
else
  echo '(the blank left by a split cell must copy as spaces, and whole clusters'
  echo ' as one grapheme: run with "paste" to check copy and paste row by row)'
fi
echo ''
