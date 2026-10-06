# 2026-10-05 — did anybody have time to read it

**Build order section:** §5 — Loom Portal. The third reading off a join the
reader screen was already making, and the first one that can contradict the
other two.

**Branch:** `portal-52-did-anybody-have-time-to-read-it` (→ `main`), cut from
`main` at `8f37f3a`. Not stacked — the one open pull request is `Loom lessons`'
and touches none of these files.

---

## The value answer

> *What does this tell a developer that they could not get from the repo, the
> logs, or `git log`?*

**That the page their analytics calls read was not read.**

Every other reading on this screen is built on reach, and reach means one thing:
a row says this part was on somebody's screen. A reader who scrolled from top to
bottom at speed satisfies it everywhere, so a page in exactly that state reports
as read from top to bottom — every part green, nothing skipped, no drop-off
anywhere. That is the plausible-false-number failure this lane keeps finding in
new places: the figure is the right shape, it is on the screen, and nobody can
tell it is wrong.

`readingPaceOf` sets the time readers spent against the time the part's own words
take. An analytics product cannot do it: it measures a URL, and it has no idea a
page is a tree, let alone that **this part** of it says two hundred words. `git
log` holds the primitives and not the page. The store holds the page and no
record of what it did to anybody. The words and the dwell were both already in
the join — nothing was added to a payload, a browser, a column or a store.

And the sentence the two readings make together is the one no other tool can
say at all:

> *Two separate readings point at the same part of this page: the prose “This
> page is a stored tree, rendered thr…” is both where the most words went past
> unread and where the most people stop going. It is the strongest thing this
> page has to tell you.*

---

## What a person reads now

Third section of the reader card, under *which parts did people get to* and
*where do people stop reading*:

> ### Did people have time to read it?
>
> The two questions above are about whether a part was **on screen**. This one
> is about whether the people it was on screen for were there long enough to
> **read** it.
>
> Readers spent about 4 seconds on this page, and its words take about 7 seconds
> to read.
>
> **Two separate readings point at the same part of this page: the prose “This
> page is a stored tree, rendered thr…” `n_seed4` is both where the most words
> went past unread and where the most people stop going. It is the strongest
> thing this page has to tell you.**
>
> Readers had about the prose “This page is a stored tree, rendered thr…”
> `n_seed4` for 1 second, and its words take about 3 seconds.
>
> | | | |
> | --- | --- | --- |
> | `Too fast to have read it` | the prose “This page is a stored tree…” | 1 second each, for words that take 3 seconds |
> | `Too fast to have read it` | the prose “Nothing here was written as markup…” | 1 second each, for words that take 3 seconds |
>
> On one part of this page, readers stayed more than three times as long as the
> words account for. That is a question rather than an answer: it can mean the
> part is hard going, and it can equally mean it was on screen the whole time
> something inside it was being read.

---

## Visuals

**Photographs of the application, signed in, through a production build served
by `pnpm shoot --serve`.** A hundred visits were staged into a real
`memoryReaderTallyStore()` through the published `ReaderTallyStore.apply` and
`opened`, against the page the portal seeds, and read back through the same
`portalReaderTallies` the screen always calls. **The fiction is the readers**;
the page, the parts, the words, the names and every number on the screen are the
deployment's own. The staging module was deleted before committing and the shot
list is beside this report.

| | |
| --- | --- |
| [**the reader screen**](2026-10-05-portal-had-time-wide.png) | `1680×1000@2x`, full page, `scrollWidth 1680 / innerWidth 1680` |
| [**the same, on a phone**](2026-10-05-portal-had-time-phone.png) | `390×844@2x`, `scrollWidth 390 / innerWidth 390` |

---

## The high-schooler test, applied

> *Could a bright high schooler, who has never read a decision record, say what
> happened and what they should do next?*

**Screen: `/portal/readers`, the card's third section.** The words a person
meets are *did people have time to read it*, *readers spent about 4 seconds on
this page*, *too fast to have read it*, *1 second each, for words that take 3
seconds*, and *if one thing on this page is worth shortening, it is …*. None of
them needs anything explained first. What to do next is one clause of one
sentence and it names the part.

**What was renamed, and where the runtime's own words went.** Four standings and
three silences, all of them into `_lib/vocabulary.ts` beside the tables that were
already there — one place, so a state cannot be called two things on two screens.

| the runtime says | a person reads | where the runtime's word still is |
| --- | --- | --- |
| `skimmed` | **Too fast to have read it** | the disclosure, verbatim |
| `paced` | **There was time for it** | the disclosure **only** — see below |
| `lingered` | **Is this where people get stuck?** | the disclosure, verbatim |
| `unknown` | **Can’t say** | the disclosure, verbatim |
| `unreached` | **Nobody got to it** | the disclosure, verbatim |
| `unreadable` | **Some of its words can’t be counted** | the disclosure, verbatim |
| `wordless` | **It says nothing to read** | the disclosure, verbatim |

Nothing is removed. Every part of the page, its own words and its subtree's, the
time spent and the time needed, the ratio, the words passed, the costing rate,
the correction applied and the runtime's own name for every standing and silence
are in one disclosure at the foot of the section.

**`paced` has a plain label and is still never shown.** That is not an
oversight and it is the sharpest judgement in this branch — the reason is below.

---

## The decisions worth reading

### `paced` has a label and no reader will ever see it

Three things bias this comparison and all three bias it the same way. Dwell is
time on screen, and `READABLE_VISIBLE_FRACTION` means half an element showing is
enough — so a part accumulates time while its neighbour is being read, and a
band accumulates it for the whole time any of its children was up. A word count
is a floor wherever a type has not declared its copy. And a reach is a distinct
view count added across roll-up windows (0147), so it is generous by every visit
that straddled a boundary.

So **`skimmed` is the only standing that survives having every one of those
doubts resolved in the page's favour.** `paced` is what is left when nothing
could be shown, and *readers read this* is not a thing anybody acts on. A green
row per part would be a dashboard telling somebody their page is fine on the
strength of the three weakest numbers on the screen.

It keeps its plain label anyway, because it appears in the record and a reader
who opens the disclosure should meet a word rather than an identifier. The
rendered test asserts both halves: `There was time for it` is absent from the
surface and `paced` is present in the record.

### Lingering is the only label in the portal that ends in a question mark

Dwell is time on screen, so the tall thing at the foot of a page lingers by
construction, and so does a band for as long as its own children are being read.
*People stayed longest here* is engagement printed off a number that cannot
support it, and it is the one sentence this section could have shipped that
would have embarrassed the surface.

So the label is a question, the tone is grey rather than the theme's green, and
the sentence under it says **both** things the figure can mean in the same
breath — *it can mean the part is hard going, and it can equally mean it was on
screen the whole time something inside it was being read*. The test asserts the
surface matches neither `/engage/i` nor `/longest/i`.

### The agreement sentence is drawn on an identical node id or not at all

When the part the most words went past unread in **is** the part people stop
going at, two readings built on different arithmetic have arrived at the same
place. One is a time divided by a reader count; the other is a ratio of two
siblings' reach. Neither is derived from the other, so the agreement is
information rather than a restatement — and it is the only thing on this card
that earns the word *strongest*.

It is therefore drawn only on an identical identifier: never a parent, never a
sibling, never a near miss. A sentence that stretched to cover two different
parts would read as one finding and be two, which is the failure this whole
surface spends its sentences avoiding. The pair of tests is the case that agrees
and the case that does not.

And when it fires, the shortening advice is dropped: both sentences end by
naming one part as the thing to change, and drawing them together names it twice
in three lines.

### The correction is matched per page and per version, and that is the part that fails quietly

The pace reading divides a time by a reader count, and that count is inflated by
every visit that straddled a roll-up window. Without the correction the mean
time per reader is short — and short calls **more parts hurried than should be**,
which is the one direction a verdict built to be safe cannot afford to be wrong
in. So the screen now reads the door rows (0219) that nothing in this portal had
ever read.

The matching is on `treeId` **and** `revision`. `PageViewReading` publishes an
aggregate `inflation` across every row, and it is the obvious thing to reach for;
handing a busy page's inflation to a quiet one would be an invented number that
looks exactly like a measured one, and nothing would fail. The source test pins
the pairing, and the surface prints the figure it used — `0.050` on the
photograph — so it is checkable rather than asserted.

A failed read of those rows costs the correction and not the screen, which is
the same split the buffer read has been held to since this screen was built.

### One join, three readings — and the count is the assertion

Both other sections already came off one `pageReadingOf`, because joining twice
is two chances to hand one section a different window and produce a card whose
halves disagree about how many visits there were. The reading-order test now
asserts `pageReadingOf(` appears exactly once and that all three readings are
handed `joined` — the count rather than the names, because a fourth reading
taken off a second join would pass every other test on this screen.

### The section says what it is *not*, for the second time on this card

`WhereTheyStop` carries that paragraph because a photograph showed *every part
of this page came onto somebody's screen* sitting directly above *5 in 10 of the
people who got this far stopped here*. This section needed it worse: *every part
was seen* and *nobody stopped anywhere* can both be true of a page where nobody
had time to read a word of it, and a reader who takes the first two sections as
an answer to this one reads all three as a contradiction. No rewording of a
heading fixes that — the difference between being on screen and being read is
the thing that has to be said out loud, so it is one sentence in bold nouns,
directly under the heading.

### What is deliberately not said about the page as a whole

The headline states the page's two times and never its standing. The page's own
figure can be `paced` while two of its parts are `skimmed` — the page's words
include every part's, and the parts fewer people reached pull its mean around —
and printing *there was time for it* over two rows saying *too fast to have read
it* would be the contradiction this section exists to prevent, manufactured by
the section itself. The figures are both true, so both are shown; the verdict
over them is not sound at that altitude, so it is not drawn.

---

## Gate

`pnpm install && pnpm verify` — status written to a file as the last thing on
its own line and read in a separate command, per `docs/routines.md`.

**Green, exit 0**, on a deleted `dist` and `.next`.

| | `8f37f3a` + this branch |
| --- | --- |
| `@jam-overture/loom` | 183 files / 3,906 tests — unchanged by this branch, `src/` was not opened |
| `@loom/app` | **386 files / 6,957 tests** |
| findings ledger | **1,015** entries, 0 malformed |
| `prerender:check` | 124 pages, 1,539 text junctions, 0 run together |

**No test weakened, skipped or deleted.** `+38` tests in the files this branch
touches: 25 in `_lib/pacing.test.ts`, 13 in
`_components/had-time-to-read.test.tsx`, and 3 added to the reader screen's
reading-order suite. One existing assertion was widened rather than changed —
*joins the counters to the page once and takes both readings off it* is now
*…all three readings*, with the same `pageReadingOf(` count in it.

---

## Findings

Three appended, and the first closes this morning's filing from `Loom signals`.

1. **The pace reading is on the reader screen**, with each of its four cautions
   answered by a named piece of code and one of them by a test. Closed.
2. **One list in the portal is still capped at a reading measure** — a `<ul>` at
   `max-w-3xl` on the proposal screen, which is the second noun in the rule
   `screen.tsx` states. One line, on a screen this branch does not open, so it is
   recorded with its line number rather than taken.
3. **Every consumer of `readingPaceOf` will write the same four lines** to find
   its correction, and the matching is the part that fails quietly. Filed for
   `Loom signals` as a measurement rather than a request; two shapes that would
   close it, neither urgent.

## What this did not do

**It did not touch `/portal/trust`.** Calibration is still the entry in the brief
with the most value and the least readability, and it is the obvious next unit.

**It did not try to say anything across two versions.** `readingChangeOf` is
still blocked on a store that can answer for an older version — the 4 October
entry, unmoved — and this branch adds a third reading of one version rather than
pretending at a second.
