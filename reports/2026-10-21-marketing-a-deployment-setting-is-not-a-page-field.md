# 2026-10-21 — a deployment setting is not a page field, and a courier is not a reader

**Build order section:** §4d — the marketing site.

**Branch:** `marketing-12-a-deployment-setting-is-not-a-page-field` (→ `main`),
cut from `origin/main` at `300f48f`.

**No maintainer comment was outstanding.** This lane has no open pull request:
#683 merged yesterday. The two pull requests open this morning are #687, which
is the signals lane's, and #689, which is an interactive session's. Every
comment on #683 is this lane's own or the Vercel bot's.

**A boolean about the deployment was handed to the header and the footer of
every page on this site and read by nobody**, and the test written to catch
exactly that shape could not see it. Both halves are closed here. Nothing a
visitor sees moved, and that is measured rather than claimed: the markup of all
three pages is byte-identical to `main`'s.

---

## How the work was chosen

`FINDINGS.md` first. The newest open entry owned by this lane was filed
**yesterday**, by this lane, and it cost its three shapes out and recommended
two of them together:

> *"**This is the recommendation**, and it is a pull request of its own rather
> than a paragraph inside one about the key."*

That is this pull request. The entry was explicit that shapes 1 and 2 go
together: shape 2 on its own *"would go red today with nothing to point at but
shape 1."*

**The third shape was to leave it, and it is the one that needed a decision
this lane does not get to make.** It is defensible only if the footer's
disclosure is coming back, and whether the front door says anything about what
it collects is positioning. The previous run asked. Nothing turns on the answer
in either direction — if the disclosure does come back, re-threading a field is
the same work in reverse, and the words it would carry are the maintainer's
either way. So this went ahead and that question stays open below.

---

## What was wrong

`ChromeContext` carried a `counting` boolean. Nothing in `chrome.ts` read it.
The trail was `renderSitePage` works the answer out → `PageContext` carries it →
`home.ts` says `counting: context.counting === true` into a `ChromeContext` →
nothing.

It had been that way since **12 October**, when the maintainer had the footer's
disclosure taken off the site whether it is counting or not.

**`pages/handed.test.ts` exists for this exact shape** — *a context field is a
promise that some page reads it* — and it passed. It looks for `.counting` in
the page builders, `chrome.ts` and `requested.ts`; `home.ts` line 1096 matched.
Its own docblock anticipated the opposite case and ruled on it:

> *"A field consumed only by being spread onward is not matched and is not
> meant to be: the spread hands it to something, and that something names it or
> nobody does."*

A **named hand-off** is neither a spread nor a read, and it slipped between
them. One reader was enough for the rule, the reader was a courier, and what it
handed the field to was the one file in the sweep that does not name it.

---

## What shipped

**The field is gone from the page context and from the chrome.** Whether readers
are counted is a `SiteRenderOptions.addressed` option and nothing else, which is
what the pages were already true of: it decides which attributes the markup
carries and not one word of what a page says.

- **`renderSitePage` takes it as a third argument** and asks the deployment only
  when it is not told. A caller that already knows the answer hands it over; the
  route pages do not, so they get `readersCountedHere()` exactly as before.
- **`chrome.ts` and `pages/home.ts`** lose the field and the hand-off. The
  docblock on each says why it may not come back as a context field, which is
  stronger than tidiness: a page of this site is a **stored row** (0259),
  seeding never overwrites, and a node built from a setting freezes at the
  moment the row was written.
- **The deployment is no longer a dimension of `servedPages()`.** `served.ts`
  crossed every state with it because *"the footer carries a sentence about it
  and `/what-you-run` carries a second one"* — and neither sentence has existed
  since 12 October. `counting.test.ts` has asserted the absence of both ever
  since.
- **`handed.test.ts` no longer counts a courier as a reader.**
  `field: thing.field` is struck out of a source before the sweep looks for
  `.field`, so *is it read* lands on whatever the field was handed to. Every
  recipient on this surface is already in the sweep.
- **`stored.test.ts` holds a rule in place of a comparison.** It compared two
  trees built with `counting: true` and `counting: false`; there is no second
  tree to build now, so what it holds instead is that no page builder and no
  part of the chrome can reach the setting at all.

### The sweep, measured on both trees

| | `main` | this branch |
| --- | --- | --- |
| states `servedPages()` builds | **150** | **75** |
| time to build them | 349, 382, 391, 426 ms | 219, 226, 254, 271 ms |

Four readings each, because one would be noise. `servedPages()` is awaited
**eight times across six test files**, so that is roughly a second of suite time
per run, and the mechanism page's share of the states ran the whole request
sequence twice each (`askRunFor` builds the page twice by design).

**The saving is not the point and the duplication is.** All 150 states had a
byte-identical twin in the other deployment, measured yesterday — the sweep was
reading every word on this site twice and could not have failed differently in
either half.

---

## Nothing a visitor sees moved

Not asserted — hashed, on both trees, from the same probe:

| page | `main` | this branch |
| --- | --- | --- |
| `/` | 103,730 bytes · `de698ecb8d…` | 103,730 bytes · `de698ecb8d…` |
| `/how-it-works` | 97,774 bytes · `51c92617c6…` | 97,774 bytes · `51c92617c6…` |
| `/what-you-run` | 74,493 bytes · `7068da7da1…` | 74,493 bytes · `7068da7da1…` |

Identical, all three. The geometry off the running build says the same thing
from the other side: the hero `h1` holds 170 in 166 and the footer starts
4,644px past the fold, both unchanged from yesterday.

![the front door, 1280x900, on a production build of this branch](2026-10-21-marketing-front-door-wide.webp)

No colour is named anywhere on this site, so the same page is the palette's
yellow on black under `bold`:

![the same page under `bold`](2026-10-21-marketing-front-door-bold.webp)

![and at 390x844, on a browser reporting a finger rather than a mouse](2026-10-21-marketing-front-door-phone.webp)

![`/what-you-run`, which carries the disclosure the footer points at](2026-10-21-marketing-what-you-run-wide.webp)

`scrollWidth 1280 / innerWidth 1280` wide and `390 / 390` on the phone.

---

## Checked against the bug, not merely observed passing

Four mutations, and the second is the one worth reading.

| what I put back | what went red |
| --- | --- |
| the bug itself: `counting` on the context, named into a `ChromeContext` nothing reads | `['counting']` unread, **both** sweep rules in `handed.test.ts` |
| the bug, **and the old predicate beside it** | *nothing in the sweep* — see below |
| a builder reaching for `process.env` instead of the context | *is built by nothing that can read what this deployment has switched on*, naming `pages/what-you-run.ts` |
| `renderSitePage` ignoring the answer it was given | *carries the tree's address, which is what a signal names* |

**The second mutation is the evidence that shape 2 was needed.** With the field
put back and `reads` restored to what it was yesterday, both sweep rules go
**green on the live bug** again, exactly as they did for nine days. The only
thing that fails is the new test of the predicate itself — which is the half
that names the weakness directly rather than waiting to meet it.

**The third says the new `stored.test.ts` rule is stronger than the one it
replaces, not merely different.** That mutation reads the setting and returns
the same node either way, so the two trees the old rule compared were still
equal and it would have passed. A builder reaching past the context to the
environment was invisible to it.

### What is held

The route group was 56 files and **1,475** tests at `300f48f`, measured on that
revision rather than carried from a report; this run adds no file and **4
tests**. Five are new in `handed.test.ts` and one goes, because `stored.test.ts`
trades three cases over three routes for two rules over the route group.

| | |
| --- | --- |
| a field handed along under its own name is not a read | **the live bug** |
| a read is still a read where something does something with it | the rule going red at a page doing nothing wrong |
| a read that arrives through another field (`context.record.ask`) counts | the same, in the one shape it was most likely to hit |
| a declaration is still not a read | this file's first lesson, kept |
| the strike-out matches hand-offs this surface actually writes | a rule being strict about nothing |
| nothing that builds a stored page can read the deployment's settings | the field coming back the other way |
| the sweep looked at every builder | a sweep over a list that came back empty |

---

## Real numbers

`pnpm install && pnpm verify`, exit code read out of a file written as the last
thing on its line:

```
Test Files  233 passed (233)      Tests  5489 passed (5489)    # framework
Test Files  347 passed (347)      Tests  6157 passed (6157)    # @loom/app
Test Files   56 passed  (56)      Tests  1479 passed (1479)    # app/(marketing)
1267 findings, 0 malformed
1923 visuals in reports/, 134.1MB, none over 1.1MB
133 prerendered pages, 1851 text junctions, 0 run together; 3 metadata conventions, 0 unserved
EXIT=0
```

Nothing skipped, nothing deleted, no test weakened to pass.

**The gate was run twice and the numbers above are the second**, over the tree
being pushed with this report and the findings entries already in it — which is
the only reading of a gate this repository trusts, and the reason is four
recorded instances of a session's own notification disagreeing with the file.
One line of the block above was then corrected: the first reading said *1919
visuals* because the four `.webp` beside this report were not yet staged when
`reports:check` ran, and `pnpm reports:check` and `pnpm findings:check` were
re-run over the final tree to take the two counts quoted here.

### Two tests went red, and neither was about this change

Worth its own paragraph, because it is the kind of red that gets "fixed" by
lowering a number without reading it.

```
voice.test.ts    expected 75 to be greater than or equal to 126    // 3 * 2 * 21
naming.test.ts   expected 550 to be greater than or equal to 600
```

Both are *the sweep did not come back empty* floors, and both were written as
hand-copied arithmetic over `served.ts`' dimensions. Halving the sweep halved
what they count, so they said the sweep had gone quiet for a change that touched
no copy at all. They are re-measured and stated with the date — 550 mentions and
75 inside a sentence, floors at 400 and 50; `3 * 21` — and **the `naming.test.ts`
in-sentence floor of 80 would have been the next failure** at 75 against 80. It
is filed rather than generalised here, because the fix that suggests itself is
the one this lane filed against on 27 September: a floor derived from
`SERVED_STATE_COUNT` is an expected value taken from the code under test.

---

## Findings

**Closed** — 20 October, ***`counting` is handed to the chrome of every page and
read by nothing***, filed and owned by this lane. Shapes 1 and 2 together, as it
recommended.

**Filed** — two, both for this lane, both *nothing is broken*:

- ***a hand-off is only visible when the field keeps its name.*** The stated
  limit of what shipped. `counting: context.counted` reads the field in the
  courier and hands it on under another name, so the courier would be credited
  with a read it is not doing — this entry's own instance with one word changed.
  Nothing in this route group does that today. Two ways costed; the
  recommendation is to leave it written down, because the alternative is an
  allowlist of exceptions.
- ***two sweep floors are hand-written copies of another module's
  arithmetic.*** What cost this run the two reds above. The shape worth having
  is a floor *per served state* rather than a total, which would have survived
  today untouched; it is a finding rather than a fix because putting it in this
  diff is how a test ends up derived from the run that broke it.

**No decision record.** The constraint this encodes — a stored page may not be a
function of a deployment setting — is 0259's, and what is new is a test holding
it rather than a direction. The docblock on the rule says so.

---

## Found while building, and not acted on

- **`(docs)` wears a `PRE-PRODUCTION ALPHA` badge and this site says nothing.**
  Carried from #670, #676 and #683, unanswered. The front door sends readers to
  that page, so the deployment tells a visitor two different things about its
  own maturity depending on which surface they are on. Still not written here,
  because how loudly a product says it is early is positioning.
- **The questions band's two columns are uneven at 1280.** Unchanged from 17–20
  October and still deliberately left.
- **The `/demo` half of the 4 October finding is still open** and untouched.
- **The second key read on a counting deployment**, named in `counting.ts`
  yesterday and still named rather than built around. Unchanged by this run,
  which does not touch that file.
- **`chrome.ts` reads nothing off the context but `current`.** Noticed while
  checking which fields survive the tightened sweep. It is not a defect — the
  header and footer are a function of the route and little else — but it is why
  `counting` had nowhere to be read, and it is worth knowing before the next
  field is put on that type.

## Needs your input

- **Whether the front door should say this is pre-production.** Carried from
  #670, #676 and #683, and the one I would most like settled.
- **Whether a status colour is a thing Loom's palettes should have.** Carried
  from #662, #666, #670, #676 and #683, unanswered.
- **Whether `/how-it-works` should carry a reader to the change it describes.**
  Carried from the same five, unanswered.
- **Whether the footer's counting disclosure is coming back.** Yesterday's
  question, narrowed. It no longer blocks anything — the field is out either
  way, and bringing the words back is a page reading a render option rather than
  a context field. Asking because if the answer is *yes*, the next run should
  know it is writing copy rather than plumbing, and the words would be yours.
- **Nothing here is positioning and no copy was invented.** Not one word on the
  site changed, and the markup is byte-identical to `main`'s.
