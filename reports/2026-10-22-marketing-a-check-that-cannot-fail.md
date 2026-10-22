# 2026-10-22 — a check that cannot fail, and three floors that measured the sweep instead of the site

**Build order section:** §4d — the marketing site.

**Branch:** `marketing-13-a-check-that-cannot-fail` (→ `main`), cut from
`origin/main` at `2f3723a`.

**No maintainer comment was outstanding.** This lane has no open pull request:
#690 merged yesterday. The two open this morning are #693, which is the signals
lane's, and #694, which is an interactive session's. Every comment on #690 is
this lane's own or the Vercel bot's.

**Nothing a visitor sees moved.** The diff is four test files and one module
that nothing outside a test imports, so there is no runtime change to measure —
`served.ts`' eight importers are all `*.test.ts`, which is checkable in one
`grep` and is the reason no markup hash is quoted below. The screenshots are
here because this surface is judged by eye and a report without one is a report
nobody can check.

---

## How the work was chosen

`FINDINGS.md` first. The newest open entry owned by this lane was filed
yesterday by this lane, and it named the shape it wanted and the reason it was
not built on the spot:

> *"**The shape that is worth something is a floor per state rather than a
> total** … It is a finding rather than a fix because it is a judgement about
> what these two rules are for, the numbers it would need are a fresh
> measurement over the two files' own sweeps, and putting it in the same diff as
> the change that exposed it is how a test ends up derived from the run that
> broke it."*

The last of those three reasons expires with the run that wrote it, and this is
a different run. The other two are work: a fresh measurement and a judgement.

Looking for the second floor of that shape turned up two more, and then
something larger. **A third entry, filed by `Loom signals` on 1 October, asked
this lane for an alarm it turned out already had — and the alarm could not
fire.** That is the live bug in this pull request and it is first below.

---

## 1. The alarm that could not fire

`SITE_SIGNAL_TYPES` says what this deployment asks to be told about its
readers, and `COMPLETION_TYPES` is empty because nothing on this site is a
form. The signals lane wrote that empty list itself, cross-lane, so that a
runtime change would not stall on a red marketing suite, and filed the half
that was this lane's:

> *"the day this site grows a contact form, a newsletter sign-up or anything
> else that posts, the list stays empty and the one conversion on the site goes
> uncounted, with no test to say so … or a test asserting that a site with no
> `loom.form` is the reason the list is empty — which would then be the alarm."*

The test exists. It reads:

```ts
const submittable = ["loom.form", "loom.field"].filter(
  (type) => BANDS.has(type) || ASKED_ABOUT.includes(type)
)

expect([submittable, [...COMPLETION_TYPES]]).toEqual([[], []])
```

`BANDS` is what `bandsOf` returns, which is the types of `page.root.children` —
**the top level of the page and nothing under it**. A form is not a band. It
goes inside a section the way every control on this site does, so the one thing
this rule was written to notice is the one thing that set can never hold.
`ASKED_ABOUT` is no better: it only holds `loom.form` once somebody has already
made the decision this rule exists to demand.

`loom.form` and `loom.field` are both in the starter registry, which is this
site's whole registry (`registry.ts` adds nothing to it), so a page builder
could have rendered a form on any day since and nothing would have said a word.

### Measured, not read

A `loom.form` composed into the front door's *plain words* band, on
`origin/main`:

| | |
| --- | --- |
| `app/(marketing)` at `origin/main`, clean | **56 files, 1,486 tests, green** |
| `origin/main` **with a `loom.form` on the front door** | **56 files, 1,486 tests, green** |
| the same mutation against this branch | **1 failed**, and it is this rule |

Not one of the 1,486 noticed a form on the most-read page of the site.

### The fix, and the thing it dragged in behind it

The rule asks `RENDERED` now — every primitive type on every page — which the
file already computed and used for two other rules.

Then `RENDERED` turned out to be reading the wrong trees. It was built from
`treeFor`, the tree a route is *written* as, which is three trees.
`servedPages()` is the 75 trees this site is actually **served** as: each route
crossed with the 25 states a request can leave it in. The difference is one
primitive:

> **`loom.callout` is on this site and was on no tree this file had ever looked
> at.** It is the panel that reports what a request did, so it exists only after
> a visitor has asked for something.

No assertion changed colour, because the one thing the file could not see is not
a type its lists name. That is the whole character of this kind of fault: it
costs nothing until it costs everything. `served.ts` records the same lesson for
copy and says it had to be learned twice; this is the seventh file to take it
and the first outside the copy rules.

---

## 2. Four floors that were measuring the sweep

A floor exists to catch a sweep that silently stopped finding things. Four in
this route group were written as **totals**, and a total is the product of what
the sweep reads and how many states it reads it in — so each of them moves when
the sweep changes shape, for a change that touches no copy at all. Two of them
went red that way on 21 October and cost that run a diagnosis:

```
voice.test.ts    expected 75 to be greater than or equal to 126    // 3 * 2 * 21
naming.test.ts   expected 550 to be greater than or equal to 600
```

| file | the floor | what the number was |
| --- | --- | --- |
| `voice.test.ts` | `pages.length >= 3 * 21` | `served.ts`' own dimensions, spelled out as a product |
| `naming.test.ts` | `found.length >= 400` | mentions, re-measured by hand on 21 October |
| `naming.test.ts` | `checked >= 40` | *"two links, each in the 42 states of the page it is on"* |
| `inline.test.ts` | `links.length >= 40` | *"the number of states of that page"*, in its own comment |

The last is the one worth reading. It says what it is in as many words, it
halved from 250 to 125 on 21 October along with the other two, and it survived
only because the site had grown four more inline phrases since it was written.
Surviving on room is luck.

### `sweepShare`, and the trap it steps around

`served.ts` now returns a sweep's size per state:

```ts
const share = sweepShare(pages, (page) => mentionsOn(page).length)

expect(share.quiet).toEqual([])
expect(share.each).toBeGreaterThanOrEqual(3)
```

**It divides by the states the sweep came back with, never by
`SERVED_STATE_COUNT`.** Deriving the floor from the published constant is the
obvious move and it is the 27 September failure — a test whose expected value
comes from the code under test, so a sweep that returns nothing expects nothing
and passes. The caller still has to say separately that it got states at all,
and it takes both assertions to fail an empty sweep.

`quiet` is the half an average cannot give you: a sweep that stopped reading one
page of three keeps two thirds of its average and is still broken, and `quiet`
names the state. It is asserted only where it is true of the site — mentions,
copy and inline phrases, every one of which every state has — and reported
rather than enforced on the two sparse readings, because a rule has to be true
before it is worth having.

### The numbers, measured on this branch over the 75 served states

| reading | found | per state | smallest state | floor set |
| --- | --- | --- | --- | --- |
| strings a reader reads | 7,303 | 97.4 | 54 | 30, and `quiet` empty |
| pages named in a band | 550 | 7.33 | 6 | 3, and `quiet` empty |
| …of those, inside a sentence | 75 | 1.00 | 0 | 0.5 |
| links into another page, at an anchor | 50 | 0.67 | 0 | 0.3 |
| inline phrases | 125 | 1.67 | 1 | 1, and `quiet` empty |

The two with a smallest state of 0 are the two where `quiet` is not asserted,
and both are honest absences: the front door has states with no mention inside a
sentence, and only two of the three pages link into another page at an anchor.

### Checked against the failure, by replaying it

`ASK_STATES` halved in `served.ts` — the 21 October change again, one dimension
smaller, no copy touched:

| | |
| --- | --- |
| the four old floors | **three red**: `39 >= 63`, `286 >= 400`, `26 >= 40` |
| the fourth old floor (`inline.test.ts`) | green, with room, which is the luck above |
| every new floor | **green, untouched** |

And in the other direction, to show the new rules are not vacuous:
`mentionsIn` narrowed to skip text nodes — a plausible way for a sweep to go
quiet — fails `named.quiet` with all 75 states named, where the measurement it
replaces would have reported a number.

---

## 3. The guard on the sweep itself, in the four files this diff was already in

Every one of these rules is *nothing on this site is X*, and a sweep that came
back empty satisfies all of them. The guard each file had was one line:

```ts
expect(pages).toHaveLength(SERVED_STATE_COUNT)
```

`SERVED_STATE_COUNT` is `SITE_ROUTES.length * ASK_STATES.length`, computed by
the module the sweep comes from. If `SITE_ROUTES` went empty the sweep would
return nothing, the constant would be zero, and that line would pass. Two more
lines close it and they are independent of each other and of the first:

- **the sweep reached every route in `SITE_ROUTES`** — which catches the ask
  dimension collapsing, since the constant would go to zero with it;
- **`SITE_ROUTES.length >= 3`** — hand-written, the only number here that
  nothing computes, and it moves when a page is added or retired, which is a
  deliberate act somebody is already thinking about.

`budget.test.ts` already carries the second of those in a different test, which
is where the spelling came from.

**Four of the seven sweep files have it and three do not**, which is a state I
would rather not leave and am leaving deliberately. It is filed, with the
question it actually raises: three lines in eight files is the duplication
`measure.ts` has a paragraph against, and the alternative — `served.ts` handing
the pair back — puts the check beside the thing it checks. That is a judgement
about every sweep in the route group and it is not this pull request.

---

## What is held

The route group was 56 files and **1,486** tests at `2f3723a`, measured on that
revision rather than carried from a report. This run adds no file and **one
test**; the work is assertions inside tests that already existed.

| | |
| --- | --- |
| a form anywhere on this site, in any state, reddens the completion list | **the live bug** |
| the sweep reads the page a visitor is served, not the page as written | `loom.callout`, which it had never seen |
| no served state reads nothing | a page dropping out of a sweep with the average still high |
| a floor does not move when the sweep is crossed with one dimension more or less | three reds on 21 October, for a change that touched no copy |
| a floor is divided by the states that came back, not by the published count | the floor and the sweep agreeing with each other about nothing |
| the sweep reached every route | the ask dimension collapsing under a constant that collapses with it |
| there are at least three pages | the route dimension collapsing, which nothing else here catches |

---

## Real numbers

`pnpm install && pnpm verify`, exit code read out of a file written as the last
thing on its line, over the tree being pushed with this report and the findings
entries already in it:

```
Test Files  234 passed (234)      Tests  5547 passed (5547)    # framework
Test Files  349 passed (349)      Tests  6198 passed (6198)    # @loom/app
Test Files   56 passed  (56)      Tests  1487 passed (1487)    # app/(marketing)
1279 findings, 0 malformed
1933 visuals in reports/, 134.6MB, none over 1.1MB, 409 cited by no file
133 prerendered pages, 1851 text junctions, 0 run together; 3 metadata conventions, 0 unserved
EXIT=0
```

Nothing skipped, nothing deleted, no test weakened to pass.

**The gate was run three times and the numbers above are the third**, over the
tree being pushed with this report and the findings entries already in it. The
first two readings are not quoted because both began before the last edit landed
and `vitest` reads a file when it runs it, so neither is a reading of this tree.
That is the same discipline the 21 October report describes for a different
reason, and the exit code is read out of `verify.exit` rather than off the
session's own notification — four recorded instances of those two disagreeing is
why.

---

## The site, unchanged

Photographed off a production build of this branch, started and stopped by the
harness: `built 2026-10-22T11:51:03.663Z`.

![the front door at 1280x900](2026-10-22-marketing-front-door-wide.webp)

![`/how-it-works`, the mechanism page the five choices live on](2026-10-22-marketing-how-it-works-wide.webp)

![`/what-you-run`, which carries the disclosure the footer points at](2026-10-22-marketing-what-you-run-wide.webp)

![the front door at 390x844, on a browser reporting a finger rather than a mouse](2026-10-22-marketing-front-door-phone.webp)

`scrollWidth 1280 / innerWidth 1280` on all three wide shots and `390 / 390` on
the phone.

---

## Findings

**Closed** — two, both owned by this lane:

- *21 October, **two sweep floors are hand-written copies of another module's
  arithmetic***, as the shape it recommended. Four floors went rather than the
  two it named.
- *1 October, **nothing on the marketing site is a form***, filed by
  `Loom signals`. Closing it found that the alarm it asked for existed and could
  not fire, which is recorded on the entry.

**Filed** — two, both for this lane, both *nothing is broken*:

- ***four sweeps in this route group are held only by a count the swept module
  computes itself.*** The half of today's work left outside the diff, with the
  two shapes costed and a recommendation.
- ***the one band on this site that only exists after a visitor asks for
  something is the one band nothing counts.*** `loom.callout`, found by moving
  the signal sweep onto the served pages. Three shapes costed; my
  recommendation is to leave it and keep the entry as the record of why.

**No decision record.** What this encodes is a test shape inside one route
group, not a direction: *a floor measures the site and never the sweep*, and
*a check written for a shape it cannot match is not a check*. Both are in the
docblocks where the next person to write one will be reading. The same call the
21 October run made, for the same reason.

---

## Found while building, and not acted on

- **`loom.callout` is on this site and nothing asks about it.** Filed above.
- **`(docs)` wears a `PRE-PRODUCTION ALPHA` badge and this site says nothing.**
  Carried from #670, #676, #683 and #690, unanswered.
- **The questions band's two columns are uneven at 1280.** Unchanged since
  17 October. Looked at again and still deliberately left: both fixes cost more
  than they buy, and the 18 October report has the reasoning.
- **The `/demo` half of the 4 October finding is still open** and untouched.
- **`docs-pages.test.ts` and `addressed.test.ts` sweep with no size guard at
  all.** Their floors are `toBeGreaterThan(0)`, which does not move with the
  sweep's shape, so they are not the defect this run was chasing. Named in the
  finding with the other two.

## Needs your input

- **Whether the front door should say this is pre-production.** Carried from
  #670, #676, #683 and #690, and the one I would most like settled.
- **Whether a status colour is a thing Loom's palettes should have.** Carried
  from #662, #666, #670, #676, #683 and #690, unanswered.
- **Whether `/how-it-works` should carry a reader to the change it describes.**
  Carried from the same six, unanswered.
- **Whether the record panel is worth a reading of its own.** Today's question,
  and the only new one. It is the panel that shows the proposal, the verdict and
  the revision, and *did they stay and read it* is the best question this site
  can ask about the thing it is selling. My recommendation is no for now, and
  the finding costs the three shapes.
- **Nothing here is positioning and no copy was invented.** Not one word on the
  site changed, and nothing outside a test file can reach the code this diff
  touches.
