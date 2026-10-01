# 2026-10-01 — marketing: the budget that was named and never built

`FINDINGS.md`'s 26 September entry is the best thing this lane has written. It
measured the site's worst failure, diagnosed it in one quotable sentence, and
named the three guards that would have caught it. The first of the three was a
copy budget, and the entry says the branch added it.

It did not. Nothing in this route group has ever bounded a band, a page or the
site, and for five days the one guard most likely to be left to a later run was
recorded in the ledger as **already there**.

This branch builds it.

![the front door, full page at 1280 — 6,154px, the thing a budget is about](2026-10-01-marketing-the-budget-never-built-front-door.png)

---

## What shipped

| file | what changed |
| --- | --- |
| `_lib/budget.test.ts` | **new** — five ceilings and a floor, over every band, cell, page and the site, in both deployments |
| `_lib/measure.ts` | `wordsIn` and `runsIn` moved here from `balance.test.ts`, so one page has one word count |
| `_lib/balance.test.ts` | reads the two from `measure.ts`; its own rule and its numbers untouched |
| `FINDINGS.md` | two entries — the false claim, and the scroll-length gap this does **not** close |

No primitive added, nothing under `src/` opened, no component written, no copy
changed, nothing outside `app/(marketing)/` and `reports/`.

**No page on this site looks any different.** That is the point of it: the
deliverable is an invariant, not a fix, and the three pages are photographed
here because a budget is only arguable next to the thing being budgeted.

---

## The claim that was wrong

> **A budget.** There was no assertion anywhere about how much copy a page or a
> site may carry. Every other property this site claims has one. *This branch
> adds a word ceiling per band to the mechanism page*, which is the smallest
> version of it.

Above the sentence there was nothing. `voice.test.ts` caps a sentence at 30
words; `pages.test.ts` caps a cliff-note band's answer at 60 words and a card
body at 280 characters. `git log -S` finds the claimed ceiling in no commit this
repository holds.

Four marketing runs have read that entry since. None had a reason to check the
clause — **a finding that says a thing is done is the one kind of claim a ledger
is not expected to be wrong about**, and `pnpm findings:check` validates the
file's shape rather than its claims. Thirty seconds of
`grep -rn "toBeLessThanOrEqual"` would have settled it on any of the four.

Filed as its own entry, because the mechanism is not this lane's: a report says
what a run did, and a finding says what is true, written at the moment of most
optimism by the run that just fixed something. **Say what a branch did, never
what it will have done.**

---

## The measurement that made it checkable

The first draft was one ceiling per band. The distribution refuses it, and this
is the whole of why the unit is shaped the way it is:

| band | words | laid out as |
| --- | --- | --- |
| `/what-you-run` — *What this page counts* | **101** | read straight down |
| `/how-it-works` — *End to end* | 123 | a rail of 5 rungs |
| `/` — *Using it* | 154 | a row of 4 |
| `/` — *What this is for* | 159 | a mosaic of 4 |
| `/` — *See it happen* | 217 | a rail of 5 |
| `/` — *Questions* | **247** | 5 questions |

Across three pages and both deployments, **a band a reader reads straight down
never exceeds 101 words, while a band laid out as cells reaches 247.** That is
not drift, it is geometry: four cards carry four bodies of about sixty words and
a reader meets one at a time. One ceiling over both would have to be loose
enough for the row, which makes it meaningless for the paragraph.

So the budget is layered, and every number is a measurement plus one stated
judgment — the headroom:

| | widest today | ceiling | at |
| --- | --- | --- | --- |
| a band read straight down | 101 | **120** | 84% |
| one cell of a run | 94 | **110** | 85% |
| a band of cells | 247 | **300** | 82% |
| a page | 1,360 (the front door) | **1,500** | 91% |
| the site | 2,498 | **3,300** | 76% |
| the site, at least | 2,498 | **1,500** floor | — |

**The site's ceiling is the one number the maintainer set himself.** 3,300 is
25% of the 13,208 words measured on 26 September — the strict end of *"60–75%
too much of it"*. The site is at 76%, so there is a fourth page of headroom, and
that is deliberate: the per-page and per-band ceilings are the ones meant to
bind on an ordinary edit, and this one says a fourth page is a decision rather
than an afternoon.

### The two clauses that matter more than the numbers

**A budget with no floor is passed by deleting the site.** Every ceiling above
goes green on an empty page. So the site is held from below at the same number
as a page's ceiling, which is a rule rather than a coincidence: *no one page may
say more than the whole site must say.*

**A ceiling nothing is near is not a ceiling.** The cheapest way to turn a
budget green is to raise it, and a raised number sits in the file looking
exactly like a rule. So each of the five is also held from below — something on
this site must be within three fifths of it. Raising one now requires the copy
to justify it, and copy falling far under one reports the ceiling as stale
instead of passing quietly.

### What it is not

Three entries in `FINDINGS.md` are about a check derived from the thing it
checks. A ceiling set near today's measurement is the **opposite** shape: a
literal that does not move when the page moves, which is what makes it a budget.
The measurement chose the number once, in a comment, in front of a reviewer who
can overrule it. The assertion reads a constant.

---

## Falsified, eight ways

Every clause was broken on purpose and watched go red. The repository's own rule
is *name a defect the check would not survive*; these are the defects it does.

| what was done | what went red |
| --- | --- |
| added a plausible 38-word clarification to `/what-you-run` | `139 > 120` — named the page and the band |
| lengthened one FAQ answer | `[135, 34, 30, 43, 94]` — `135 > 110`, and the band at `341 > 300` |
| lengthened it further | the page, at `1510 > 1500` |
| 900 words of filler into one band | the site, over 3,300 |
| raised a ceiling from 120 to 1200 | *"widest is 101 against a ceiling of 1200 — either the ceiling is too high to mean anything, or the copy it was set for is gone"* |
| removed `HOME` from `SITE_ROUTES` | **three** clauses — the floor at `1125 < 1500`, the binding clause, and the route count |

The 38-word clarification is the one worth dwelling on. It was written to be
exactly the kind of sentence a reviewer waves through on a diff — true, useful,
about something real — and it is the failure the 26 September entry describes:
*every individual step is correct.*

### A claim this branch got wrong, and the better fact underneath it

The first draft justified the 110-word cell ceiling as sitting above *"an FAQ
answer's existing 60-word cap in `pages.test.ts`"*. **There is no such cap.**
Found by lengthening an FAQ answer by 38 words and watching all 119 tests in
`pages.test.ts` stay green: the 60/30 rule is scoped to `SHORT_ANSWERS`, the
cliff-note bands of `/how-it-works`, and **nothing on this site had ever bounded
an FAQ answer at all.**

The correction makes the unit stronger rather than weaker, and the method is the
lesson this lane has now learned twice in three days: the first draft was a
*reading* of a neighbouring test presented as a measurement, and it took one run
to disagree with it. The docstring now says which copy that cap governs and
records that it was wrong.

---

## Checked against the open pull request before the numbers were set

`#464` moves the *See it happen* band from the front door to `/how-it-works`. A
ceiling that turned my own open PR red would be worse than no ceiling, so both
branches were measured rather than reasoned about:

| | `main` | after `#464` |
| --- | --- | --- |
| `/` | 1,360 | 1,143 |
| `/how-it-works` | 638 | 856 |
| `/what-you-run` | 500 | 500 |
| **the site** | **2,498** | **2,499** |

Every ceiling and the floor hold on both, and the binding clause holds on both —
which is why three fifths rather than something tighter.

**The one-word difference in the total is the useful fact.** A band moved
between two pages and the site's copy was conserved almost exactly, so a
*per-page* budget alone would not have seen `#464` at all, and a *site* budget
alone would not have seen which page carries the weight. Both, or neither says
much.

---

## What this does not bound, said here rather than discovered later

**Scroll length.** The budget is words, which is the right unit for the
instruction it answers — the complaint was that there was too much to *read*.
Measured on a production build at 1280:

| page | words | height | screens at 900 | words a screen |
| --- | --- | --- | --- | --- |
| `/` | 1,360 | **6,154px** | 6.84 | 199 |
| `/how-it-works` | 638 | 3,740px | 4.16 | 153 |
| `/what-you-run` | 500 | 2,783px | 3.09 | 162 |

At page scale the two track within about 1.3×. **Per band they do not**: the
hero spends 0.89 of a screen on 67 words and the rail under it spends 1.12 on
222, so one word buys two and a half times the height in one band as in the
other. A page could pass every ceiling here and still be nine screens long by
being built out of heroes.

Filed with the three honest options and a recommendation, because a height is
only knowable from a browser and `pnpm verify` has none — making it a decision
about what a merge gate for four surfaces may depend on, rather than an
afternoon.

---

## Tests

`pnpm install && pnpm verify` — status written to a file by the gate as its own
command and read separately, on a `dist` and a `.next` deleted first.

| | |
| --- | --- |
| `pnpm verify` | **exit 0** |
| framework | 169 files, **3,362 tests** |
| application | 346 files, **6,006 tests** |
| marketing suite | 38 files, **1,005 tests** |
| `pnpm shoot` | `scrollWidth 1280 / innerWidth 1280`, `390 / 390` — no overflow |

**Fifteen tests added, none weakened, none skipped.** `balance.test.ts` was
rewired onto `measure.ts` and passes with the same 6 tests it had before; its
threshold, its exemption list and its reasoning are untouched.

No decision record. Nothing here touches the tree schema, the delta model or an
`Accepted` record — it adds no primitive, sets no prop, and renders nothing.
