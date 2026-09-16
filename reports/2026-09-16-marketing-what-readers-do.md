# 2026-09-16 — marketing: the half of the argument that had no page

Nine pages, and every one of them opens after somebody has already asked for
something. The rules that decide, who may ask, what gets written down, how it
comes back, what happens when it fails — all of it starts with a request, and
**nothing on the site said where a request might come from.**

`docs/signals.md`, approved by the maintainer on 13 September, opens with the
reason that matters:

> Loom exists so a page can change from how people actually use it. **A model
> that cannot hear what readers did cannot adapt well** — it can only restate the
> tree back at itself. Signals are the input half of the entire premise.

`/what-readers-do` is the tenth page and the marketing half of that plan's fifth
step. Its middle band is nine bars, and not one of the figures on them was typed.

![the page, 1280×900](2026-09-16-marketing-what-readers-do.png)

---

## What shipped

A page that says what Loom can learn about the people reading a page, what it
refuses to know about them, and what the numbers look like — by running the
arithmetic while the page is being built.

### The band the page exists for

Twelve visits to **this site's own front door** are written down in
`_lib/readers/visits.ts` as what each reader did: how far down they got, which
bands they lingered on, what they pressed, what they opened. Those go through
`rollUp` — the function the portal's screen reads and the only one in the
repository that turns signals into counters — and the band prints what comes
back, band by band, in the front door's own order.

| what a reader sees | where it comes from |
| --- | --- |
| a bar per band, labelled with the front door's own name for it | `bandsOf`, the same walk `/the-record`'s outline uses |
| *12 of 12*, *10 of 12*, *2 of 12* | `ReaderTally.reached` against `Rollup.views` |
| *157 seconds on screen in total, 5 used something in it* | `dwellMs`, `activations`, `opens` |
| *5 of 10* and *2 of 10*, in the largest type on the page | `Rollup.funnels` — two `FunnelPair`s this page names |

The bars come out as a funnel because the visits are written as *how far they
got*: **12 · 12 · 10 · 10 · 7 · 5 · 4 · 4 · 2.** Measured in Chromium, the fill
widths at 1280 are 1016 · 1016 · 847 · 847 · 593 · 423 · 339 · 339 · 169 px —
each one exactly its share of the track, because the bar is drawn from the
arithmetic rather than sized by hand.

**The visits are invented and the page says so where it prints them**, in the
same sentence as the claim: *"The visits are made up — this site counts nobody,
because counting is off unless you turn it on. The arithmetic is not."* It is
the move the front door's own band already makes with its five prepared requests
(0057): invented input, real machinery, and a sentence saying which half is
which.

### What is counted, and what it never knows

The four tiles are `READER_SIGNAL_KINDS` mapped through plain words — *they got
this far*, *they stayed a while*, *they used something in it*, *they opened
something* — so the band is four tiles because the vocabulary has four members
and not because four is typed anywhere. **A fifth kind stops the page being
built**, with a sentence naming it. `completed` is approved and coming; a page
whose whole subject is what Loom counts should not be able to go out silently
missing something Loom counts.

The refusals band is 0146 in the reader's words, and its first sentence is the
one that makes it worth a band: *"None of these is a setting you switch off.
There is nowhere in what gets recorded to put any of them, which is a different
and better promise."* No name, no account, nothing about the device, nothing
joining one page to another, no replay, nothing anybody typed.

### The band a competitor would leave out

**The numbers do not change your page. You do.** Deriving a request from a
signal is explicitly out of scope in the approved plan, and the honest version is
better copy than the claim it withholds: somebody reads the numbers and asks for
something, and that request is weighed by the same rules and written into the
same record as every other. A test asserts the page never says otherwise.

---

## The line this page does not cross

Two pieces of the plan are **not on `main`**: the address a browser delivers a
batch to (`framework-37-the-mouth`, #312) and the portal screen that reads the
counters (#310). So no band on this page promises a screen or an endpoint, and
the FAQ answers *where do the numbers end up* with what is true today — your own
application, your own store, no service of ours in the middle.

The other half of #312's finding — **this surface actually broadcasting** — is
owned by this lane and was deliberately not done. Its input does not exist on
`main`: a page wired to `/api/reader-signals` from here today would post every
batch into a 404. Confirmed by measurement while photographing the page:
`data-loom-node`, `data-loom-tree` and `data-loom-revision` appear on **no**
element of any page this route group serves, so `broadcastReaderSignals` would
answer `unaddressed` anyway. Filed, with what this lane will do the day #312
lands, so the next run does not re-derive it.

One copy claim was cut for the same reason. A first draft said the counting costs
a browser *under five kilobytes* — which is in 0136 and in a test's comment, and
is a number typed from a record rather than counted. The page says the stronger
and fully checked thing instead: it reaches no other code at all, and a test here
fails the day it reaches any.

---

## Found while building: the largest type on the front door was unreadable

An assertion written to be unfalsifiable — *the funnel figure the page prints
equals the one `rollUp` returns* — failed on a page where the figure was plainly
there in the screenshot.

`words.ts` is this lane's idea of *what a reader actually reads*: text nodes,
plus an allowlist of the props that hold sentences. Two props were missing.

| prop | where | what it holds |
| --- | --- | --- |
| `loom.meter.readout` | nine meters on the new page | *12 of 12* — the entire content of the band |
| `loom.stat.value` | the front door's *Built in the open* band | **96**, **100+**, **4** — the biggest characters on the site |

The second has been missing since the site was written. Nothing showed it up
because `facts.test.ts` checks those three figures against the registry and the
decisions directory, so **the numbers were right the whole time** — and invisible
to the register test, to the reserved-vocabulary test, and to every assertion of
the form *the page prints what was computed*. Correct and unreadable is the
combination nothing looks for.

Both are in `PROSE_PROPS` now. The trade is recorded beside them: `loom.option`'s
`value` is what a form submits rather than what a reader reads, and it is now
scanned too. Nothing on this site uses that primitive, and two figures-only
primitives staying invisible costs far more. `loom.meter`'s own `value` is a
number and is unaffected.

Filed for `Loom docs`, `Loom lessons` and `Loom demo`: if any of you scans your
own copy, the same two props are invisible there, with the same symptom —
everything green, and the most prominent figures on the page outside every check.

---

## Tests

`pnpm install && pnpm verify` — **green, exit 0. Nothing failed, nothing skipped,
no test weakened or deleted.**

| suite | `main` at `546b434` | this branch |
| --- | --- | --- |
| `@loom/runtime` | 150 files / 2,620 tests | **150 / 2,620** — `src/` was not opened |
| `@loom/app` | 251 files / 4,375 tests | **253 / 4,485** |
| marketing, within it | 31 files / 1,417 tests | **33 / 1,527** |

`findings:check` reads 639 entries, 0 malformed. `prerender:check` reports 102
pages and 828 junctions, 0 run together — unchanged, and correctly so: every
page of this route group reads `searchParams` for its palette, so none of them
has ever been in that count.

Baselines were measured by stashing this branch and running the suites on
`main`, not quoted from a report.

**110 tests are new across 2 new files.** Five existing test files changed and
every change is a pin that a tenth page moves: the exact off-bar list, asserted
in four places, and the announce map's route list.

### Mutations

Nine defects restored one at a time. **Eight were caught. The ninth was not, and
that is the useful half.**

| mutation | result |
| --- | --- |
| `readout` taken out of `PROSE_PROPS` — *the defect that was live* | **1 red**, the figure assertion |
| `loom.stat.value` taken out of `PROSE_PROPS` | **1 red** |
| a band scrolled past given no time on screen | **12 red**, including the runtime's own parser refusing `ms: 0` |
| the visits stop carrying a view key | **6 red** — both funnels, and the uncorrelated count |
| the page put on the bar | **5 red**, in four files |
| one signal kind loses its plain words | **36 red**, the page throwing while it is built |
| the new page left out of the announce map | **8 red**, the named one first |
| a funnel re-aimed at the wrong band | **passed — twice** |
| the second funnel re-aimed at the first's band | **passed** |

The last two are worth the space. Every assertion about a funnel read
`FUNNEL_QUESTIONS` to work out what to expect, so all of them moved with the
constant — including the one added specifically to catch it, *the denominator is
the bar for the band it names*, which stays true of whichever band that is. A
test that reads the same value the code reads cannot notice the value changing,
and deriving harder makes it worse rather than better.

Which question a page asks is **editorial rather than derivable**, so it is now
pinned exactly, the way the off-bar list is pinned: the two questions are written
out in the test, and re-aiming either is a red test and an argument rather than a
quiet change of subject. Both mutations are caught now — 1 red and 2 red.

---

## Both palettes, and a phone

`scrollWidth 1280 / innerWidth 1280` and `390 / 390`. The readings band is
1,177px at 1280 and 1,725px at 390; the funnel band 805px and 1,426px. Nine bars
stack on a phone without a table's problems, which is the reason the band is
`loom.meter` and not `loom.table` — the two standing findings about tables on
narrow viewports are exactly about a band of figures with a long label, and a
column of bars does not have them.

| | |
| --- | --- |
| ![editorial](2026-09-16-marketing-what-readers-do-editorial.png) | ![bold](2026-09-16-marketing-what-readers-do-bold.png) |

![390px](2026-09-16-marketing-what-readers-do-phone.png)

No colour is named anywhere in the diff; every value is a token. Nothing was
added to the library — the page is `loom.hero`, `loom.section`, `loom.meter`,
`loom.stat-grid`, `loom.stat`, `loom.callout`, `loom.feature-grid`, `loom.list`,
`loom.faq-list` and the three node constructors this lane already had.

**Two alignment defects were found by looking rather than by testing**, and both
are why the page was rebuilt and re-photographed twice: the refusals band and the
questions band were `width: "readable"`, which indents a band's heading against
every other band on the page. Every questions band on the site is `wide` with a
`readable` FAQ list inside it; this one now matches.

---

## The page's own cost, said plainly

It is `inMenu: false`, which makes **six of ten pages off the bar.** That is
recorded as the third measurement on the 12 September finding rather than argued
with: `loom.nav` cannot group, so the bar has no way to carry ten destinations
under three headings, and the footer's map is the only complete map of the site
there has ever been. Four of ten pages in the bar is not a navigation answer
anybody would choose; it is the one available, and the finding that would fix it
is `Loom primitives`'.

---

## Decisions and findings

**No record written.** The page is compositional: nothing added to the library,
nothing constrained outside this route group, no Accepted record touched, `src/`
not opened, no other route group touched. The one shared file this lane owns that
changed behaviour — `PROSE_PROPS` — is a widening of a check with the trade
recorded beside it, not a decision anybody has to live with.

**Three findings filed.** The two props nothing could read (closed here, filed
for the three surfaces that may have the same hole); six of ten off the bar; and
the broadcast half of #312's finding, with the reason it waits and what this lane
will do when #312 lands.

**One `bandsOf` change outside this unit's obvious scope.** A band now carries
`what` — the kind of band it is — because a reader signal names a band by its id
*and* its type, and going back to the page for the second is a second walk that
can disagree with the first. It is `(marketing)/_lib/outline.ts`, this lane's
file, additive, and no existing caller reads it.

## Open questions

- **The licence line** (#96, on every marketing PR since #134). Still the site's
  one placeholder and still the Phase 2 gate. Untouched.
- **Positioning, audience and pricing.** Untouched. Nothing on this page is a
  new claim about who the product is for: the one piece of recorded positioning
  it leans on is the one in `docs/rollout.md` — *the differentiator is not
  adaptation, it is the record* — and *we count the bands and never the people*
  is the same argument about readers rather than about changes.
- **Whether this page should be higher in the reading order.** It is seventh of
  ten, closing the *what you are left holding* group. The case for putting it
  first is real — it is the input half of the premise — and the case against is
  in `site.ts`: a reader who has not yet been told a change is weighed, recorded
  and reversible has no reason to care that the page can also count who reached
  which band. Worth a second opinion.

Nothing scheduled and nothing armed.
