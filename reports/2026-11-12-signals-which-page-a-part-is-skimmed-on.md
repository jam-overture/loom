# Signals 87 — which page a part is skimmed on, and 148 bytes left in the browser

**Routine:** `Loom signals` · **Date:** 12 November 2026 (evening run)
**Branch:** `signals-87-which-page-a-part-is-skimmed-on` · **Off `main` at `b9699606`**

## What I completed

**One unit: `PartPace` publishes the pages it pooled, as an order.** §86 landed
this morning and left one sentence half-said — `standings` lets a goal's screen
say *this part is paced across your pages and **skimmed on two of them*** and
nothing on the reading says which two. The rows were already computed and thrown
away: the loop reads each page's own pace, its own words and its own door, adds
them into the pooled sums and keeps nothing. So this cost an array and no
arithmetic, and it closes this lane's own finding of earlier today.

`PartPace` gains three fields and the module two type names:

| | |
| --- | --- |
| `ranked` | the counted pages by `shortMs`, most first, then the lower pace, then by tree and newest revision first |
| `unranked` | every other placement, by page, each carrying the silence saying why it has no figures |
| `worst` | the head of the order — the one page of this part to go and look at |
| `PacedPlace` | one page's row |
| `MeasuredPlace` | the same row narrowed, which is every row of `ranked` |

**The decision was the order, and it is [0390](../decisions/0390-a-parts-pages-are-a-second-order-ranked-on-the-reading-time-its-readers-did-not-have.md),
Accepted.** The finding of this morning named two candidate keys and said the
choice was the whole decision. I took the one it recommended, and the figure
that settles it is now a test rather than an opinion:

| | short of | pace |
| --- | --- | --- |
| a band 400 readers each had **1 s** of, where its words take 5 s | **1,600,000 ms** | 0.2 |
| the same band on a page **1 reader** hurried past in 0.1 s | **4,900 ms** | 0.02 |

Ranking on the rate publishes the second page as the one to go to. Ranking on
the reading time its readers did not have publishes the first, which is 0250's
and 0377's rule for every other order in this subsystem.

## Decisions I took that were not specified

1. **The tie-break is the pace, then the page.** `shortMs` is nought exactly
   where `pace` is at least 1, so the second key is only ever reached by pages
   whose readers had time enough, and it ranks the ones nearest to being short.
   The last key is the page itself so a refresh does not reorder two equal rows.
2. **A row's verdict is its page's own reading's**, carried off
   `PacedPart.standing` and never re-derived from the row's own `pace`. The two
   quotients agree mathematically and need not agree in their last float place,
   and `standings` counts the first — so a breakdown of *skimmed on two of them*
   that recomputed the verdict could name three pages or one. A screen reads
   `standing`; it does not compare `pace` to a threshold. Written on the field
   and in the record.
3. **A silent placement's time on screen stays out of the sums.** A part that
   says nothing can have been on screen for twenty seconds with no words to
   measure it against. The row carries that time and the pooled numerator
   refuses it, because adding it would put time in a numerator whose denominator
   had already refused it.
4. **`MeasuredPlace` as a type of its own**, so a screen drawing the order does
   not null-check four fields that an ordered row cannot be missing. It costs 10
   bytes of the names index.
5. **I corrected the plan's live browser-cost row**, which was 309 bytes stale.
   See *The thing I did not come here to find*.

## The term that must never be added, which the finding did not anticipate

**A row's `shortMs` is its own page's, and the pooled `PartPace.shortMs` lets a
page readers lingered on pay for a page they skimmed.** So the rows sum to *at
least* the figure above them, and are equal to it only where no page had time to
spare. The fixture that says it plainly: one page readers lingered on for a
million milliseconds beside one they skimmed in ten thousand publishes
`shortMs: 0` over rows summing to **40,000**. Both numbers are true.

It is published on the row that is **ranked by it**, which is the uncomfortable
part and the reason it is documented three times — on the field, in the record
and in the findings entry — and tested as not adding. It is the same shape #856
is open on, and the general form is worth one sentence: *a figure taken over
pooled sums and the same figure taken per page are two readings, and a maximum
of sums is not a sum of maxima.*

**One surprise in the building.** A part whose words are a floor and whose
readers stayed longer than the counted words take has **no publishable pooled
figure at all** — `readers`, `needMs`, `spentMs`, `shortMs` and `pace` are all
withheld — while every one of its rows has figures. The rows are kept, because
the breakdown is then the only thing on the reading saying which page to go and
fix the declaration on. The invariant is therefore *the rows add to those three
wherever those three are published*, which has a test of its own.

## The thing I did not come here to find: 148 bytes

The §86 entry I was building on said the broadcaster measures **7,543 bytes
minified and 3,350 gzipped**. I remeasured with the gate's own method before
writing it down again. It does not.

| | measured | ceiling | left |
| --- | --- | --- | --- |
| minified | **7,852** | 8,000 | **148** |
| gzipped | **3,458** | 3,600 | **142** |

**#870 merged at 08:59 on 12 November**, taught the broadcaster to carry a
reader's segment (0385) and spent **309 bytes minified and 108 gzipped**. §86
merged at **09:08** repeating the old figure: nine minutes, the same race as
#879's names-index correction and #877's. The ceiling held, so nothing was red
and nothing said so. 0385 records no byte figure at all.

**Nothing on this branch spends a byte** — `broadcast.ts` and its import graph
are untouched — so this is a correction and a warning rather than a bill. The
plan's *Browser cost* row now carries the measured figure, the date, the old
value and what spent the difference; §82, §83 and §85 each quoted 7,543
truthfully on their own day and are left as the dated accounts they are. The
finding has the rest, including the check that would stop this recurring and why
this lane is not writing it unasked (`tools/` is in no lane's row).

**148 bytes is about one paragraph of `broadcast.ts`.** A run that wants more
should price the raise and say so, not raise the ceiling in the diff that needs
it.

## Records added

- **[0390](../decisions/0390-a-parts-pages-are-a-second-order-ranked-on-the-reading-time-its-readers-did-not-have.md)
  — Accepted.** *A part's pages are a second order, ranked on the reading time
  its readers did not have.* Six clauses, seven alternatives recorded including
  the two orderings refused and the summed `shortMs` refused. 0390 was the next
  number free on `main` after re-reading `decisions/README.md`; 0383, 0384 and
  0386 are claimed on open branches and will be renumbered when they merge.

## Findings filed and closed

- **Closed:** *one part on nine pages has nine verdicts, and which page it is
  skimmed on is a second reading* (12 November, this lane's own). Both things it
  asked for are taken the way it recommended.
- **Filed, owned by `Loom portal`:** the *Goals* screen can now say which page,
  and draws neither the breakdown nor the count of verdicts. With the two things
  a screen must not do with these rows.
- **Filed, owned by this lane:** the broadcaster has 148 bytes of 8,000 left,
  and the plan's figure was 309 bytes stale within nine minutes of being
  written.

## Test numbers

`pnpm install && pnpm verify` — **EXIT=0**, nothing failed, nothing skipped,
nothing weakened.

| | |
| --- | --- |
| root suite | **6,992** tests, 286 files |
| app suite | **7,889** tests, 487 files |
| `src/signals/part-pace.test.ts` | **48** tests, up from 24 — **+24 all mine** |
| mutations tried | **15** |
| mutations killed | **15** |

**Two mutations survived the first pass and are the reason the count is honest.**
A row carrying the raw `reached` instead of the door-scaled readers survived
every test I had written, because the only fixture with a straddle in it did not
assert a row; so did a row's `spentMs` published as the page's whole dwell. Both
are killed now by one fixture whose two pages have the same fifty readers, one
of them straddled from a hundred. Two more were vacuous rather than surviving —
the audience assertion compared `null` to `null`, and the subtree-words
assertion stood on a part whose subtree was its own words — and both now stand
on fixtures where the two answers differ.

| mutation | killed by |
| --- | --- |
| order by `pace` instead of `shortMs` | *ranks the page four hundred readers skimmed above…* |
| drop the `shortMs` key | same |
| drop the pace tie-break | *breaks a tie on the lower pace* |
| drop the page tie-break | *falls back to tree and newest revision first* |
| row verdict re-derived ignoring the floor | *counts the same standings over the rows as the census* |
| raw `reached` on the row | *puts each page's readers on that page's own door scale* |
| `spentMs` as the page's whole dwell | same |
| `shortMs` unclamped below nought | *is short of more time over the rows…*, and the tie-break |
| `worst` as the tail of the order | *ranks the page four hundred readers skimmed…* |
| `whole` hard-coded false | *says of each page whether the part is the whole of it* |
| `floored` hard-coded false | same |
| `unscaled` hard-coded null | *carries the page's own silence where the door could not scale it* |
| the silent rows never pushed | five tests |
| `unranked` left unsorted | *orders the pages with no figures by tree…* |
| `audienceId` hard-coded null | *carries the audience the page's counters were of* |
| `wordsWithin` as the part's own words | *carries the words each placement puts on screen* |

## Bytes

**Nothing new runs in a browser.** `broadcast.ts` and its import graph are
untouched; `browser-weight.test.ts` passes, and the bundle measures **7,852
minified and 3,458 gzipped** — which is what `main` measures, and 309 more than
this plan said before this branch corrected it.

**The published names index**, measured with the gate's own encoder on `main`
and on this branch:

| | spent | cap | room |
| --- | --- | --- | --- |
| `main` at `b9699606` | 27,289 over 2,116 names | 40,000 | 12,711 |
| this branch | **27,309** over 2,118 names | 40,000 | **12,691** |

**Two names at 20 bytes** — `PacedPlace` and `MeasuredPlace`. The cap is no
longer the constraint it was this morning, and this unit was not shaped around
it; the three new fields on `PartPace` are not names and cost nothing.

## Open questions

Nothing blocking. Two things I would want answered eventually, neither of which
holds this branch:

1. **Should the plan's browser-cost row be a tested figure rather than a
   remembered one?** It went false twice in six days. A `tools/` check that
   reads the measured bundle and asserts the row quotes it would end it, and
   `tools/` is in no lane's row. My recommendation is yes, owned by whoever
   takes the `tools/` question the 9 November entry already filed.
2. **Does the *Goals* screen want the breakdown now or later?** It can say
   *skimmed on two of them, and the two are /pricing and /tour* from this
   reading with nothing to derive. `Loom portal`'s call; the finding has the
   three sentences it can draw and the two things it must not do.

## Working beside the other lanes

`git fetch` before branching, off `main` at `b9699606`, nothing stacked.

**No open branch touches `src/signals/part-pace.ts`.** #856 owns `acted.ts`,
#881 and #880 are this lane's documentation-only ledger entries from this
morning's runs, and #872, #869 and #867 are `Proposed` records from other lanes.
The only shared files this branch changes are the ledger (appended, never
reflowed), `decisions/README.md` and `reference.generated.json` (both
regenerated), and `docs/signals.md`, which is this lane's.

**No session was subscribed to any pull request and no check-in was armed.**
