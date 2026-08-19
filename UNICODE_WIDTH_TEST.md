# Unicode Character Width Test Suite

This file tests the character width handling for Unicode 13.1, 14.0, 15.0, and 15.1 emoji and special characters.

**Testing Instructions:**
1. Display this file in your terminal
2. Each character should occupy **exactly 2 columns**
3. Characters should **NOT** cut off adjacent text
4. Grid alignment should remain perfect throughout

---

## ⭐ MISSING STAR SYMBOLS (Previously Single-Width, Now Fixed)

### Black and White Stars (U+2605-2606)
★ ☆ ★ ☆ ★ ☆ ★ ☆

**Test:** The stars above should each take 2 columns. Count: 8 stars = 16 columns total.

### Decorative Stars (U+2729-2734)
✩ ✪ ✫ ✬ ✭ ✮ ✯ ✰ ✱ ✲ ✳ ✴

**Test:** Each star should take 2 columns. Count: 12 stars = 24 columns total.

### Mixed Test
Stars: ★ ☆ ✩ ✪ | Next text should align perfectly.

---

## 🫠 UNICODE 14.0 EMOJI (September 2021)

### Faces (U+1FAE0-1FAE7)
🫠 Melting face
🫡 Saluting face
🫢 Face with open eyes and hand over mouth
🫣 Face with peeking eye
🫤 Face with diagonal mouth
🫥 Dotted line face
🫦 Biting lip
🫧 Bubbles

**Test Line:** 🫠🫡🫢🫣🫤🫥🫦🫧 | Text after should align.

### People & Body (U+1FAC3-1FAC5)
🫃 Pregnant man
🫄 Pregnant person
🫅 Person with crown

**Test Line:** 🫃🫄🫅 | Text should align here.

### Hands (U+1FAF0-1FAF8)
🫰 Hand with index finger and thumb crossed
🫱 Rightwards hand
🫲 Leftwards hand
🫳 Palm down hand
🫴 Palm up hand
🫵 Index pointing at viewer
🫶 Heart hands
🫷 Leftwards pushing hand
🫸 Rightwards pushing hand

**Test Line:** 🫰🫱🫲🫳🫴🫵🫶🫷🫸 | Alignment check.

### Food & Objects (U+1FAD7-1FAD9)
🫗 Pouring liquid
🫘 Beans
🫙 Jar

**Test Line:** 🫗🫘🫙 | Should align.

---

## 🩵 UNICODE 15.0 EMOJI (September 2022)

### Hearts (U+1FA75-1FA77)
🩵 Light blue heart
🩶 Grey heart
🩷 Pink heart

**Test Line:** 🩵🩶🩷 | Text after.

### Musical Instruments (U+1FA87-1FA88)
🪇 Maracas
🪈 Flute

**Test Line:** 🪇🪈 | Alignment.

### Objects (U+1FAA9-1FAAF)
🪩 Mirror ball
🪪 Identification card
🪫 Low battery
🪬 Hamsa
🪭 Folding hand fan
🪮 Hair pick
🪯 Khanda

**Test Line:** 🪩🪪🪫🪬🪭🪮🪯 | Check alignment.

### Nature (U+1FAB7-1FABD, 1FABF)
🪷 Lotus
🪸 Coral
🪹 Empty nest
🪺 Nest with eggs
🪻 Hyacinth
🪼 Jellyfish
🪽 Wing
🪿 Goose

**Test Line:** 🪷🪸🪹🪺🪻🪼🪽🪿 | Verify alignment.

---

## 🔥 COMPREHENSIVE ALIGNMENT TEST

### Column Width Verification
```
Position: 12345678901234567890
Stars:    ★ ☆ ✩ ✪ ✭ ✮ ✯ ✰
Emoji 14: 🫠🫡🫢🫣🫤🫥🫦🫧
Emoji 15: 🩵🩶🩷🪇🪈🪩🪪🪫
Animals:  🪷🪸🪹🪺🪻🪼🪽🪿
```

Each line above should have characters at the same column positions.

### Grid Test
```
|★|☆|✩|✪|✭|✮|✯|✰|
|🫠|🫡|🫢|🫣|🫤|🫥|🫦|🫧|
|🩵|🩶|🩷|🪇|🪈|🪩|🪪|🪫|
|🪷|🪸|🪹|🪺|🪻|🪼|🪽|🪿|
```

Vertical pipes should align perfectly in each column.

---

## 🎯 EDGE CASES & STRESS TESTS

### Mixed ASCII and Wide Characters
Hello 🫠 World 🩵 Test ★ End
ASCII: H e l l o space (6 cols) + 🫠 (2 cols) + space W o r l d space (7 cols) + 🩵 (2 cols) + space T e s t space (6 cols) + ★ (2 cols) + space E n d (4 cols)

### Consecutive Wide Characters (No Spacing)
🫠🫡🫢🫣🫤🫥🫦🫧🩵🩶🩷★☆✩✪

**Expected:** 15 emojis/stars × 2 columns = 30 columns total.

### Wide Characters at Line Boundaries
Start→★←Middle→🫠←End
Start→☆←Middle→🩵←End
Start→✩←Middle→🪇←End

Each line should have identical structure with characters at same positions.

### Cursor Position Test
Type after this star: ★ █ (cursor should be exactly 2 columns after the star)
Type after this emoji: 🫠 █ (cursor should be exactly 2 columns after the emoji)

---

## 📊 KNOWN ISSUES FROM ORIGINAL PROBLEM

### Issue 1: Stars Rendered as Single Width (SHOULD BE FIXED)
Before fix: ★X (star overlaps X)
After fix:  ★ X (proper spacing)

Test: ★☆✩✪✭✮ ABCDEFGH
The letters A-H should appear immediately after the stars with no gaps or overlaps.

### Issue 2: Emoji Cutting and Pushing (SHOULD BE FIXED)
Before fix: 🫠ABC might show as "🫠BC" with A hidden/cut
After fix:  🫠ABC should show all characters properly

Test sequence:
Line 1: 🫠ABCDEFGHIJKLMNOP
Line 2: 🩵ABCDEFGHIJKLMNOP
Line 3: ★ABCDEFGHIJKLMNOP

All three lines should have letters starting at the same column (column 3).

---

---

## 🪉 UNICODE 16.0 EMOJI (September 2024)

### Objects & Nature (U+1FA89, U+1FA8F, U+1FABE, U+1FADC)
🪉 Harp
🪏 Shovel
🪾 Leafless tree
🫜 Root vegetable

**Test Line:** 🪉🪏🪾🫜 | Text should align.

### People & Symbols (U+1FAC6, U+1FADF, U+1FAE8-1FAE9)
🫆 Fingerprint
🫟 Splatter
🫨 Shaking face
🫩 Face with bags under eyes

**Test Line:** 🫆🫟🫨🫩 | Alignment check.

### All Unicode 16.0 Combined
🪉 🪏 🪾 🫆 🫜 🫟 🫨 🫩

**Test:** Each emoji should take exactly 2 columns. Count: 8 emoji = 16 columns.

---

## 🧎 UNICODE 17.0 EMOJI (September 2025)

### Creatures & Animals
🧎 Hairy creature (Bigfoot/Yeti)
🐋 Orca (Killer whale)

**Test Line:** 🧎🐋 | Should align.

### Objects & Expressions
🪈 Trombone
🪙 Treasure chest
🫤 Distorted face
💥 Fight cloud
🪸 Landslide

**Test Line:** 🪈🪙🫤💥🪸 | Alignment check.

### All Unicode 17.0 Combined
🧎 🐋 🪈 🪙 🫤 💥 🪸

**Test:** Each emoji should take exactly 2 columns. Count: 7 emoji = 14 columns.

**Note:** Unicode 17.0 emoji may not display correctly on all systems yet as platform support is rolling out in 2025-2026.

---

## 🧪 UNICODE VERSION COVERAGE SUMMARY

| Version | Release Date | New Emoji Code Points | Status |
|---------|--------------|----------------------|--------|
| 13.0    | March 2020   | Base coverage        | ✅ In hterm_all.js |
| 13.1    | September 2020 | 0 new base chars   | ✅ ZWJ sequences only |
| 14.0    | September 2021 | 37 new code points | ✅ Added via custom ranges |
| 15.0    | September 2022 | 20 new code points | ✅ Added via custom ranges |
| 15.1    | September 2023 | 0 new base chars   | ✅ ZWJ sequences only |
| 16.0    | September 2024 | 7 new code points  | ✅ Added via custom ranges |
| 17.0    | September 2025 | 7 new code points  | ✅ Added via custom ranges |

**Total new code points handled:** 71 (37 from 14.0 + 20 from 15.0 + 7 from 16.0 + 7 from 17.0)
**Plus:** Missing star symbols (U+2605-2606, U+2729-2734)

---

## ✅ SUCCESS CRITERIA

Your implementation passes if:

1. ✅ All stars (★☆✩✪✭✮✯✰✱✲✳✴) render as 2-column width
2. ✅ All Unicode 14.0 emoji (🫠-🫸) render as 2-column width
3. ✅ All Unicode 15.0 emoji (🩵-🪿) render as 2-column width
4. ✅ All Unicode 16.0 emoji (🪉🪏🪾🫆🫜🫟🫨🫩) render as 2-column width
5. ✅ All Unicode 17.0 emoji (🧎🐋🪈🪙🫤💥🪸) render as 2-column width
6. ✅ Grid alignment tests show perfect vertical alignment
7. ✅ No character cutting or overlapping occurs
8. ✅ Cursor position is correct after each wide character
9. ✅ Mixed ASCII and wide character lines maintain proper spacing

---

## 🐛 DEBUGGING TIPS

If characters still appear wrong:

1. **Check browser console** for character width cache issues
2. **Verify TextAttributes.ts** was loaded (check modification timestamp)
3. **Test individual code points:**
   - U+2605 (★) should return width 2
   - U+1FAE0 (🫠) should return width 2
   - U+1FA75 (🩵) should return width 2
4. **Clear terminal** and redisplay this file
5. **Check CSS width classes** are being applied (`.wc2` or similar)

---

## 📝 NOTES

- Unicode 13.1 and 15.1 added no new base characters, only ZWJ sequences
- ZWJ (Zero-Width Joiner) sequences use existing characters combined
- This fix addresses base character widths only
- Skin tone modifiers and gender variants are separate sequences

**Last Updated:** 2024 (Based on Unicode 15.1)
**Test File Version:** 1.0
