# The name a shot list asks for

**Date:** 2026-10-12
**Section:** §1 (process)
**Branch:** `shots-name-what-is-stored`

## What this fixes, and that I caused it

[0264](../decisions/0264-a-report-s-visual-is-stored-at-the-size-the-page-was-laid-out-at.md)
re-encoded every visual in `reports/` and rewrote every citation that pointed at
an old filename. **It rewrote too much.** A shot list's `out` field is not a
citation — it names a file to *create* — and 13 of the 41 lists under `reports/`
now say `.webp` where they said `.png`.

The harness appends `.png` to anything not already ending in it, so re-running
one of those lists would have written `the-record.webp.png`. Nothing broke
today, because nobody re-ran one; it would have broken for whoever did.

## What was done

`withExtension` now normalises any image extension to `.png` rather than only
recognising `.png`, and `nameOf` strips any of them.

This is the fix rather than reverting the 13 lists, because **the lists are
right**. Since 0264 the artifact that ends up in `reports/` *is* a `.webp`, so a
list asking for one is asking for the correct end state. Chromium cannot write
WebP, so the capture is PNG and `pnpm reports:shrink` produces the name the list
asked for. The two halves now agree instead of one of them being wrong.

## Tests

Two added, and **both were confirmed to fail without the fix** rather than
assumed to:

```
→ expected 'the-record.webp.png' to be 'the-record.png'
→ expected 'shot.webp.png' not to contain '.webp.png'
```

`tools/screenshot/` is 71 tests, all passing. `pnpm verify` green — numbers in
the pull request.

## The general lesson, which is worth more than the fix

A rewrite driven by "this filename changed" cannot tell a **reference to a file**
from a **request for a file**. The citation rewrite in `reports:shrink` is scoped
to names it actually converted, which correctly spared the illustrative
`path.png` and `shot.png` in the harness documentation — and that scoping is
exactly what made it *confidently* wrong here, because these names were real
files that really were converted. The distinction it needed was one of intent,
which no filename carries.

It is left as it is rather than taught to skip `.shots.json`: a JSON file can
legitimately cite an image, the next harness may not use that suffix, and a
narrower rewrite that is wrong in the other direction leaves a report pointing at
a file that no longer exists. The harness tolerating both extensions fixes the
whole class, including the next format change.

## Open questions

None.
