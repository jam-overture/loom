# 2026-10-23 — a sweep says what it reached, and two of the six guards written to say so were green on a site with no pages

**Build order section:** §4d — the marketing site.

**Branch:** `marketing-14-a-sweep-says-what-it-reached` (→ `main`), cut from
`origin/main` at `2cfd93d`.

**No maintainer comment was outstanding.** This lane has no open pull request;
#695 merged yesterday. The two open this morning are #697, which is the signals
lane's, and #694, which is an interactive session's. Nothing on #695 is anybody
but this lane and the Vercel bot.

**Nothing a visitor sees moved, and this time it is a hash and not a `grep`.**
Seven test files and three modules. `sweepCover` and `PAGES_AT_LEAST` are read
by nothing but `*.test.ts`, which is one `grep` — but **`SITE_PATHS` is read by
`requested.ts`, which is a runtime module** reached from `pageTreeFor`, so that
argument does not cover the whole diff. Measured instead: every one of the
**75 served trees, hashed** with `requested.ts` at `HEAD` and with the change,
is byte-identical.

```
75 states  fd8c64ca2a7372b9f79d6f7e6b859f222b1566038c6099023d145ee04b12dde4   HEAD
75 states  fd8c64ca2a7372b9f79d6f7e6b859f222b1566038c6099023d145ee04b12dde4   this branch
```

That is §4 below and it is the one part of this diff that could have moved the
site. The screenshots are here because this surface is judged by eye and a
report without one is a report nobody can check.

---

## How the work was chosen

`FINDINGS.md` first. The newest open entry owned by this lane was filed
yesterday by this lane, and it said in as many words that it wanted to be its
own pull request:

> *"**Recommendation: 2**, and not in the same pull request as the floors. It is
> a judgement about seven files, today's diff already crosses four, and a change
> to every sweep in the route group is its own reviewable thing."*

That is this pull request. Shape 2 is `sweepCover` in `served.ts`, asserted by
its callers.

**Then the entry turned out to be wrong in two places**, and the second is the
more interesting defect. Both are recorded at the foot of the entry rather than
edited out of it, because the entry is the evidence for what was believed.

---

## 1. *The check cannot fail* was not true, and what is true is worse

The entry's claim was that the one-line guard is vacuous:

```ts
expect(pages).toHaveLength(SERVED_STATE_COUNT)
```

`SERVED_STATE_COUNT` is `SITE_ROUTES.length * ASK_STATES.length`, so an empty
`SITE_ROUTES` makes the sweep return nothing, the constant zero, and the line
pass. That much is right. What the entry did not do is run it.

**Measured, with `SITE_ROUTES` emptied, on `origin/main`:**

| | |
| --- | --- |
| the seven files that sweep `servedPages` | **7 of 7 red** |

So *the check cannot fail* is not true of any file, and if the entry had been
taken at its word the diff would have been written against a defect that is not
there. The defect is one level in, and it is per assertion rather than per file:

| | |
| --- | --- |
| tests **named** for holding the sweep that were **green** | **2 of the 6 that existed** — `budget.test.ts`, `routes.test.ts` |
| rules of the form *nothing on this site is X* that were **green** | **6** |
| `docs-pages.test.ts`, which had no guard at all, on a sweep that lost **a third of the site** | **29 of 29 green** |

The two green guards are exactly the two that had no hand-written floor; the
four that went red are the four given one on 22 October, which is the previous
run's work doing its job.

**The six rules that passed over a site with no pages:**

| file | rule |
| --- | --- |
| `budget.test.ts` | `no request turns a page into a longer page than the site may have` |
| `budget.test.ts` | `no request adds more to a page than the page was allowed to publish` |
| `budget.test.ts` | `no band becomes a page once the request has been answered in it` |
| `budget.test.ts` | `no cell and no plain band grows past its authored ceiling` |
| `routes.test.ts` | `sends nobody to an address this application does not serve` |
| `docs-pages.test.ts` | `lands on a page this site has written down` |

The fifth is the whole point of the file it is in.

### Why seven red files is still a defect

Because of **where** they went red and **what they said**. They went red on
`voice.test.ts`' two assertions about the maintainer's own lines, on
`naming.test.ts`' `PAGE_NAMES` list, on `budget.test.ts`' *published*-tree sweep
in a different `describe`, on `docs-pages.test.ts`' deep-link floor, and on
`routes.test.ts`' `DESTINATIONS_AT_LEAST` — a floor on the destinations the
sweep found rather than on the pages it read.

**Not one of those failures says the sweep came back with nothing.** They say
this site has stopped carrying the maintainer's line and stopped linking into
its own documentation, which sends the next run reading copy and bands for a
cause that is one constant in `site.ts`. `docs-pages.test.ts`' own docblock
already has the argument, written for a different instance of it:

> *"What it buys is the **reason**. Those eight failures all read as though the
> documentation lane had rewritten four pages, which sends the next run to read
> somebody else's route group when the thing that moved is this file."*

### And `addressed.test.ts` is not one of these files

The entry named four files and one of them does not sweep `servedPages` at all.
`grep` for the import returns seven test files and `addressed.test.ts` is not
among them; it was named off the same reading of its `toBeGreaterThan(0)` floors
that put it in yesterday's closing list. The seven callers are `budget`,
`voice`, `naming`, `inline`, `routes`, `docs-pages` and `readers/asked`.

---

## 2. `sweepCover`, and the line that keeps it out of the trap

`served.ts` hands back what a sweep reached:

```ts
export const sweepCover = (pages: readonly ServedPage[]): SweepCover => ({
  states: pages.length,
  routes: [...new Set(pages.map((page) => page.route.path))].sort(),
})
```

**Both fields are counted off the array it was given, and it compares them
against nothing.** That is the whole of why putting this in `served.ts` is safe,
and the cost the entry worried about — *the check lives beside the thing it
checks* — is answered by it rather than accepted. The values a caller compares
them against come from three places, and only one of them is `served.ts`:

| | where it comes from |
| --- | --- |
| `SERVED_STATE_COUNT` | `served.ts` — the arithmetic, which is the half that can go to zero |
| `SITE_PATHS` | `site.ts`, the module that **declares** what this site is |
| `PAGES_AT_LEAST` | `site.ts`, hand-written, **the only number here nothing computes** |

`SITE_PATHS` and `PAGES_AT_LEAST` are new in `site.ts`. The first is the
projection four test files had each written inline, which is the duplication
`measure.ts` has a paragraph against; the second is the `3` the four of them
each spelled with its own comment.

Every caller now writes the same three lines:

```ts
const cover = sweepCover(pages)

expect(cover).toEqual({ states: SERVED_STATE_COUNT, routes: SITE_PATHS })
expect(cover.routes.length).toBeGreaterThanOrEqual(PAGES_AT_LEAST)
```

### Both assertions are load-bearing, and that was measured rather than argued

On a site with no pages, `SERVED_STATE_COUNT` is `0` and `SITE_PATHS` is `[]`,
so the `toEqual` **passes** and the floor is what fails:

```
AssertionError: expected 0 to be greater than or equal to 3
 ❯ app/(marketing)/_lib/routes.test.ts:123:33
```

And in the other direction, on a sweep that dropped one route, the `toEqual` is
what fails and it names what was read:

```
AssertionError: expected { states: 50, routes: [ '/', …(1) ] }
            to deeply equal { states: 75, routes: [ '/', …(2) ] }
```

Neither is redundant and neither is dead.

---

## 3. `docs-pages.test.ts` swept twice and was held by neither sweep

It called `servedPages()` in two places — once in a `describe`'s `beforeAll` and
once inside an `it` under the next one — so it built **150 pages a run to read
two things off 75**, and neither sweep was held to having reached the site. The
floors standing in for a guard (`linked.length`, the distinct count,
`front.length`) are floors on what the walk *found*, not on where it looked, so
a sweep over two pages of three cleared all three.

It has one file-level sweep now, with the coverage guard the other six carry.
The deep-link floor is kept beside it rather than replaced by it: the two fail
for different reasons — *the sweep never read the site* and *the site stopped
linking into the documentation* — and the reason is the thing a guard buys.

---

## 4. The third spelling, and the only line in this diff that runs

`requested.ts` already had one, module-private:

```ts
const SITE_PATHS: ReadonlySet<string> = new Set(SITE_ROUTES.map((route) => route.path))
```

Adding an exported `SITE_PATHS` to `site.ts` would have left **two different
things called `SITE_PATHS` in one route group**, one a sorted `readonly string[]`
and one a `ReadonlySet<string>`, which is worse than the duplication this pull
request is consolidating. So the local one is built from the shared list and
named for the question it answers:

```ts
const ON_THIS_SITE: ReadonlySet<string> = new Set(SITE_PATHS)
```

A `Set` of a sorted list has the membership of a `Set` of an unsorted one and
`.has` is the only thing that reads it, so this is identical by inspection — and
because it is the only line in the diff a visitor can reach, inspection was not
left to stand on its own. The two hashes at the top of this report are all 75
served trees on both sides, taken with a throwaway test that is not in this
diff.

`chrome.test.ts`' *carries the visitor's palette on its own links and not into
another surface* is the rule this constant serves, and the docblock already
named it. It is green.

---

## Checked against both failures, by replaying them

| | before | after |
| --- | --- | --- |
| `SITE_ROUTES` emptied — the seven guards | **2 green** (`budget`, `routes`), 1 absent (`docs-pages`) | **7 red**, each naming the sweep |
| `servedPages` dropping one route — `docs-pages.test.ts` | **29 of 29 green** | **1 red**, and it prints `states: 50` against `75` |
| the real tree | 1,487 green | **1,488 green** |

The seven failures after the fix are each the test named for the sweep, not a
copy assertion three files away:

```
FAIL  budget.test.ts      > looked at every state this site can be served in
FAIL  docs-pages.test.ts  > reached every page of this site, in every state it can be served in
FAIL  inline.test.ts      > sweeps every page of this site, in every state it can be served in
FAIL  naming.test.ts      > sweeps every page of this site, in every state it can be served in
FAIL  routes.test.ts      > sweeps every state the site can be served in
FAIL  voice.test.ts       > looked at every page of this site, in every state, and none came back quiet
FAIL  readers/asked.test.ts > read every page of this site, in every state it can be served in
```

---

## What is held

The route group was 56 files and **1,487** tests at `2cfd93d`, measured on that
revision rather than carried from a report. This run adds no file and **one
test** — `docs-pages.test.ts`' coverage guard, the one file that had none.

| | |
| --- | --- |
| a sweep that reached fewer pages than this site has reddens the test named for the sweep | **in all seven files**, where it was in four |
| a sweep that read the wrong pages names which ones it read | `states: 50` against `75`, rather than a copy failure elsewhere |
| the floor is hand-written and the comparison is against the module that declares the site | neither value comes from the arithmetic that collapses |
| `docs-pages.test.ts` reads the whole site | 29 of 29 green over two thirds of it |
| one sweep per file | 150 page builds a run became 75 in that file |
| one name for the site's paths | `requested.ts`' third spelling is gone, and the 75 served trees hash the same |

---

## Real numbers

`pnpm install && pnpm verify`, exit code read out of a file written as the last
thing on its line, over the tree being pushed with this report and the findings
entries already in it:

```
VERIFY_PLACEHOLDER
```

Nothing skipped, nothing deleted, no test weakened to pass.

---

## The site, unchanged

Photographed off a production build of this branch, started and stopped by the
harness.

![the front door at 1280x900](2026-10-23-marketing-front-door-wide.webp)

![`/how-it-works`, the mechanism page the five choices live on](2026-10-23-marketing-how-it-works-wide.webp)

![`/what-you-run`, which carries the disclosure the footer points at](2026-10-23-marketing-what-you-run-wide.webp)

![the front door at 390x844, on a browser reporting a finger rather than a mouse](2026-10-23-marketing-front-door-phone.webp)

`scrollWidth 1280 / innerWidth 1280` on all three wide shots and `390 / 390`
on the phone, read off the harness rather than off the picture. `built
2026-10-23T11:46:16.030Z`.

---

## Findings

**Closed** — one, this lane's own:

- *22 October, **four sweeps in this route group are held only by a count the
  swept module computes itself***, as the shape it recommended. Closed with two
  corrections appended to it rather than edited into it: `addressed.test.ts` is
  not one of these files, and the vacuity was two tests of six rather than four
  files of seven.

**Filed** — one, for this lane, *nothing is broken*:

- ***a sweep guard a caller has to remember is a guard one caller had already
  forgotten.*** `servedPages` refusing a thin sweep is the only shape no caller
  can forget, and `docs-pages.test.ts` at 29 of 29 green over two thirds of the
  site is the measured argument for it. Two things argue against it, both real,
  and the recommendation says what to delete if it is taken.

**No decision record.** What this encodes is a test shape inside one route
group, not a direction: *a guard compares a reading against something the swept
module does not compute*, and *the failure has to name the sweep or the next run
reads copy*. Both are in the docblocks where the next person to write one will
be reading. The same call the last two runs made, for the same reason.

---

## Found while building, and not acted on

- **`servedPages` refusing a thin sweep.** Filed above.
- **`(docs)` wears a `PRE-PRODUCTION ALPHA` badge and this site says nothing.**
  Carried from #670, #676, #683, #690 and #695, unanswered.
- **The questions band's two columns are uneven at 1280.** Unchanged since
  17 October and still deliberately left; the 18 October report has the
  reasoning.
- **`loom.callout` is on this site and nothing asks about it.** Filed
  yesterday, recommendation unchanged: leave it, with the entry as the record.
- **The `/demo` half of the 4 October finding is still open** and untouched.
- **Three runs in a row have moved nothing a visitor sees.** Worth saying out
  loud rather than leaving to be noticed. Every positioning question this
  surface has is unanswered, and the brief forbids inventing copy, so the work
  available without an answer is structural — which is what the last three runs
  found. See *Needs your input*.

## Needs your input

- **Whether the front door should say this is pre-production.** Carried from
  #670, #676, #683, #690 and #695, and still the one I would most like settled.
  It is one sentence and it is positioning, so it is yours.
- **Whether a status colour is a thing Loom's palettes should have.** Carried
  from #662, #666, #670, #676, #683, #690 and #695, unanswered.
- **Whether `/how-it-works` should carry a reader to the change it describes.**
  Carried from the same seven, unanswered.
- **Whether the record panel is worth a reading of its own.** Carried from #695.
  My recommendation is still no for now.
- **Nothing here is positioning and no copy was invented.** Not one word on the
  site changed, and nothing outside a test file can reach the code this diff
  touches.
