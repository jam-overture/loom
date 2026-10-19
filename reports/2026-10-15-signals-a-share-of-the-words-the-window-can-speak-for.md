# Reader signals — a share of the words the window can speak for

**Routine:** `Loom signals` · **Date:** 2026-10-15 (evening run) · **Branch:**
`signals-33-a-share-of-the-words-the-window-can-speak-for` · **Section:** §33 of
[`docs/signals.md`](../docs/signals.md)

## What I completed

The open finding this lane filed this morning — **the half of 0282 that was
left** — taken as one unit over all four places the quotient is read:
[0287](../decisions/0287-a-share-of-a-pages-words-is-a-share-of-the-words-the-window-can-speak-for-and-spoken-for-is-one-predicate.md).

0282 took every signed figure over a page's words over the passages the window
can speak for, and said in its own consequences what it had not touched:
`CopyReading.share` is `read ÷ words`, so **a page where nothing reports reach
publishes a share of nought beside an `unseen` list that is empty.** *None of
this page's words were reached*, and under it no word it can name, because
`unseen` is `skipped` only (0235 §5) and nothing on that page is skipped.

The number was never false — nought is exactly what a standing of `read`
asserts of those words, and the standings are published in the same object —
which is what makes it the worst shape a published figure can take: incoherent
read quickly, defensible read carefully.

It is the **twenty-third** thing taken out of what this subsystem already knows
rather than collected, and the second of them that is a published figure
corrected rather than a new one added. **Nothing was added to a payload, a
browser, a column, a store or the vocabulary of kinds.**

### The case that is bigger than the one it was filed for

The finding was written about the broken-sender state: rows naming every part
and not one reporting reach. While building it I checked the other way into
`unknown`, and it is far more common.

**A window that held no page views makes every part `unknown`** (`parts.ts`),
so `wordsByStanding.read` is nought over a whole page of words. Every
unmeasured window in this subsystem has been publishing `share: 0` since 0235 —
beside a `typical` of `null` and a silence that explains the mean and says
nothing about the share. On a card that reads *none of this page was reached*
for a page nobody opened.

The suite had that case pinned the old way; the assertion it carried was
`expect(reading.share).toBe(0)`.

### What changed

- **`CopyReading.spoken` and `RoleCopy.spoken`** — the words in parts whose
  standing is not `unknown`, published as the denominator rather than left to a
  surface to subtract. `share` is `read ÷ spoken`, `null` where that is nought.
- **`words` is untouched and the census stays whole.** `spoken` plus
  `wordsByStanding.unknown` is `words`, asserted.
- **No fifteenth silence vocabulary.** `share` is absent in exactly three
  states and all three are already `CopySilence` members — `wordless`,
  `unmeasured`, `unspoken` — while `floored` and `inconsistent` leave it
  standing, which is 0235's own rule that a share survives a floor and says so.
  `silence` is now documented as the reason either figure is absent, and the
  equivalence is pinned by a test that walks `COPY_SILENCES` and builds a
  reading in each state.
- **`spokenFor(standing)` is published from `parts.ts`**, which closes the
  second open finding of the day. `movementOf` reads it, so
  `copy-change.ts`'s `spokenForOnBothSides` — now exported — is the same rule
  twice rather than two that agree; `library-word-reach-change.ts` imports it
  instead of spelling it inline, and `library-reach-change.ts`'s two-sided test
  over parts reads the base one.

## Decisions I took that were not specified

**Four, and the first is the one to disagree with if you are going to.**

**1. 0287 is `Accepted` and nothing is superseded.** 0235 §2 says in so many
words that `share` is *the share of the page's words*, and this changes that,
so the governance question is real. I read §2's **decision** as *two shares,
because the words somebody read and the words a reader reads are two
sentences*, and the denominator as its description — which is exactly the
reading 0282 took of the same clause this morning when it moved `typical`'s
universe without superseding anything. **If you read the enumeration as the
decision, 0287 is the record to refuse**; the reversal is one argument in
`copy.ts` and two fields. This is in the record, in §33 and in the pull request
comment, because it is the one thing here that is a judgement rather than
arithmetic.

**2. `share` keeps its name.** The finding said the honest version *may want a
different name*. I kept it: the claim the field makes — the share of words at
least one reader reached — did not move, only the universe did, so a rename
would have cost every consumer a migration to say the same thing. The cost of
keeping it is that a published figure changed value under a stable name, and
the remedy I chose for that is the finding filed for `Loom portal` rather than
silence.

**3. The predicate lives in `parts.ts`, not in `copy-change.ts` where the
finding proposed it.** By the time three modules and the page-scale share all
wanted it, the natural home was beside `PartStanding` itself. `copy-change.ts`
keeps the two-sided one, derived from the base.

**4. `anchors` is deliberately not folded in.** `change.ts` and `progress.ts`
ask `part.standing !== "unknown"` under a different name, because what 0221
needs is *can this part anchor a stop*. The answer coincides today. Sharing a
predicate because two rules agree is the mistake this record is fixing in one
place, and I was not going to make it in another in the same change.

## Records added

- **0287** — *A share of a page's words is a share of the words the window can
  speak for, and `spoken for` is one predicate.* `Accepted`. Index regenerated;
  0277 and 0278 are still held by #633 and were skipped, as this week's records
  have been.

## Findings closed and filed

**Closed, both filed by this lane earlier today:**

- *a page where nothing reports reach publishes a share of nought beside an
  empty list of the words nobody saw* — this unit.
- *whether a passage can be spoken for is now written twice, in two modules
  that merged on the same day* — the predicate is published once, and the
  agreement test that entry asked for is in `copy-change.test.ts`.

**Filed:**

- For `Loom portal` — a published figure whose denominator moved under a name
  that did not, with what a card must not draw: `share` and `unseen` without
  `spoken` beside them.
- For `Loom docs` — **the API reference truncates a long signature mid-comment,
  and a citation past the cut is never lifted.** `readerFacingSignature` strips
  decision numbers out of the comments in a published declaration, and the test
  beside it holds every signature to carrying none. Both are right. But the
  signature is truncated to about 6,000 characters *before* that runs, and the
  cut lands inside a comment, leaving a `/**` with no `*/` — so
  `COMMENT_IN_CODE` never matches it and the tail is published raw. Adding a
  paragraph to the **last field** of `CopyReading` was enough to meet it. The
  gate caught it, which is the good news; the diagnosis cost an hour, because
  the failure is positional and the stripper works perfectly on the same
  comment by hand. Fixed here by dropping the two numbers from that comment,
  which does nothing about the hole.
- For `Loom docs` — `pnpm verify` was **green on `main`** this evening and the
  records-index render test passed at 13,365 ms for the file, so this
  afternoon's red did not reproduce. That entry's arithmetic is untouched by a
  green run; what this adds is that the gate is **load-dependent**, which is
  the worst shape for a failure every routine here reads as its own branch's
  doing.

## Open questions

**One, and it is question 1 above:** whether 0235 §2's enumeration is the
decision or its description. Everything else in this change is arithmetic.

Nothing was blocked, nothing was left out, and nothing in this change goes near
the parked per-reader identity work — if anything it moves away from it, since
the one thing added to the wire remains the opening marker of §7.

## Test numbers

| | |
| --- | --- |
| `pnpm verify` on `main` before branching | **green**, exit 0 |
| `pnpm verify` on this branch | **green**, exit 0 (fourth run; see below) |
| `src/signals/` on this branch | **1,081 passed**, 39 files, 186 s |
| `src/signals/copy.test.ts` | 37 passed (was 31) |
| `src/signals/parts.test.ts` | 26 passed (was 24) |
| `src/signals/copy-change.test.ts` | 39 passed (was 38) |

**Three red runs before the green one, all of them mine and none of them a
weakened test.** The first was `src/documentation.test.ts` — *never makes a
decision-record number part of a published sentence* — on `0235's own rule`,
which makes the number part of the grammar where `(0235)` is a footnote the
site can lift; rewritten. The second was the generated API reference being out
of date, since this adds two exports: `pnpm --filter @loom/app docs:api`,
committed. The third is the truncation hole filed above.

**Two existing assertions changed value and both are the point of the change**,
rather than tests weakened to fit: `share` on a window with no views, `0` →
`null`; and a heading role row with four words read and six nothing can be said
about, `0.4` → `1`. Nothing was skipped, nothing was given a longer budget, and
no test was deleted.

**Double-counting**, which is this lane's standing rule: there is no new
counter here and nothing is added across windows. The one thing that could have
double-counted is a word, and the test *leaves the census whole, so the words
outside the share are still counted* asserts `spoken + unknown === words` —
a word is in the denominator or outside the question, never both.

## What runs in a browser

**Nothing, measured both sides.** `broadcast.ts` bundled with esbuild,
minified, ESM:

| | |
| --- | --- |
| before | **6,477 bytes** minified, 2,935 gzipped |
| after | **6,477 bytes** minified, 2,935 gzipped |

`cmp` reports the two bundles **byte-identical**. `browser-weight.test.ts`
passes: the broadcaster still reaches no package.
