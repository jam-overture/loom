# 2026-10-20 — addressed, with nothing listening

**Build order section:** §4d — the marketing site.

**Branch:** `marketing-11-addressed-with-nothing-listening` (→ `main`), cut from
`origin/main` at `08d7622`.

**No maintainer comment was outstanding.** This lane has no open pull request:
#676 merged yesterday. The two pull requests open this morning, #680 and #682,
belong to the signals lane. Every comment on #676 is this lane's own or the
Vercel bot's.

**On a deployment that has switched reader signals on and never minted a key,
this site served every page carrying the addresses a reader signal names, with
nothing on any of them able to send one.** 6,404 bytes of addresses on the front
door, 6,095 on `/how-it-works`, 3,629 on `/what-you-run`, read by nobody. This
run makes the switch and the key one answer, read by one function, so that
cannot happen.

---

## How the work was chosen

`FINDINGS.md` first, which is where this came from. The newest open entry owned
by this lane was filed **yesterday** by portal steering, the day
[0298](../decisions/0298-a-projects-ingest-key-is-public-and-names-its-application-and-the-door-files-nothing-it-cannot-name.md)
landed and the door started refusing every delivery it cannot name:

> *"So a deployment with `LOOM_SIGNAL_INTAKE=on` and no key minted renders
> addressed pages that say they are counting, and counts nobody… The fix belongs
> to this lane because the disclosure is: `readersCountedHere` becomes *switch on
> and a key held*."*

**Half of what it describes was already gone**, and that is worth saying before
anything else. The entry names *"whether their words say this page is counting
you"* as one of the three things the switch decides. No page has said it since
**12 October**, when the maintainer had the message taken off the site whether it
is counting or not. `counting.test.ts` has asserted the absence of both
sentences ever since.

So what was left was the half with no words in it, which is the half nothing
could see.

---

## The bug, measured on both trees

`layout.tsx` knew about the key. It read
`readersCountedHere() ? await siteSignalUrl() : null` and mounted no broadcaster
without one. `render.ts` did not: `addressed` defaulted to `readersCountedHere()`,
which was the environment variable alone.

Two conditions, two callers, one of them holding half of it. The same state
measured on `main`'s code and on this branch, with `LOOM_SIGNAL_INTAKE=on` and
no key in the table:

| page | `main` | this branch |
| --- | --- | --- |
| `/` | 110,134 bytes, **115** `data-loom-node`, tree address **yes** | 103,730 bytes, **0**, **no** |
| `/how-it-works` | 103,869 bytes, **111**, **yes** | 97,774 bytes, **0**, **no** |
| `/what-you-run` | 78,122 bytes, **67**, **yes** | 74,493 bytes, **0**, **no** |

**16,128 bytes across three pages**, in every response, naming parts of a page
for a signal that was never going to be sent. `render.ts`' own docblock already
said this must not happen, in as many words — *a page carrying the addresses
while nothing broadcasts is a page that looks instrumented and is not* — and
nothing held it to that.

**Nothing was broken and nothing was red.** The only instrument that could have
seen it is somebody reading the page source on a deployment configured that way.

---

## What shipped

`readerSignalUrl` in `readers/counting.ts` is now the one place the question is
decided: **the switch is asked first, the key table only if it said yes**, and
the boolean is that URL existing.

- **`layout.tsx`** takes the URL. One read, one answer, one import.
- **`render.ts`** takes the boolean, awaited once per request in
  `renderSitePage`.
- **`renderTree` no longer looks anything up.** Its `addressed` default was the
  environment variable; it is now `false`. A synchronous default could only ever
  ask the half of the question that is not a database row, which is exactly how
  this happened. Off is the safe way round: an unaddressed page costs a signal
  nobody was listening for, and an addressed one makes a claim the layout may be
  about to contradict. The one caller that renders a page passes the answer.
- **`stored.ts` stops reading the setting at all.** Its docblock called that a
  known limitation and gave the reason: the footer carried a disclosure, seeding
  never overwrites, so a row written on a quiet deployment would be served by a
  counting one. The disclosure left the tree on 12 October, so the read was a
  row in a table deciding nothing, and the id a page is filed under was
  nominally a function of a deployment setting it does not depend on.

**It costs a round trip, on a deployment that counts.** The key table is read
twice per request now rather than once: the layout asked it already and the
render asks it too. On a deployment that has not switched signals on — which is
every deployment today, this one included — it is one environment read and no
query, exactly as before. It is not memoised, and `counting.ts` says why: the
honest spellings are a per-request cache this repository uses nowhere and a
per-process one that would serve a stale answer across a re-mint. Worth
revisiting if a counting deployment ever measures it, and named here rather than
left to be found.

Nothing a visitor sees moved, and that is checkable rather than asserted: on this
deployment the switch is off, so the markup is byte-identical to yesterday's.

![the front door, 1280x900, on a production build of this branch](2026-10-20-marketing-front-door-wide.webp)

No colour is named anywhere on this site, so the same page is the palette's
yellow on black under `bold`:

![the same page under `bold`](2026-10-20-marketing-front-door-bold.webp)

![and at 390x844, on a browser reporting a finger rather than a mouse](2026-10-20-marketing-front-door-phone.webp)

`scrollWidth 1280 / innerWidth 1280` wide and `390 / 390` on the phone. The
footer starts 4,644px past the fold, unchanged, and the hero `h1` holds 170 in
166 — both carried from before this change and neither touched by it.

---

## What is held

Nine new tests. `counting.test.ts` gained eight and `stored.test.ts` one rule
over three pages.

| | |
| --- | --- |
| counts nobody when no key has been minted | **the live bug** |
| counts nobody when the key table cannot be read | a refusal read as a yes |
| counts its readers once the key exists | the fix answering `false` always |
| answers the renderer and the layout from one read | the two halves drifting apart |
| does not ask the key table on a deployment switched off | a round trip to be told what the environment said |
| the layout takes the switch and the key as one answer | a caller going round the one function |
| the layout does not reach the key on its own | a broadcaster on a deployment that is switched **off** |
| the layout does not read the switch a second time | the shape this replaced, restored |
| stores each page as the same tree whether counting or not | a builder putting a deployment setting back in a stored row |

### Checked against the bug, not merely observed passing

Seven mutations. **Five were caught, and two were not, which is why this section
is worth reading.**

| what I put back | what went red |
| --- | --- |
| `readersCountedHere` as the switch alone, **the live bug** | 3 rules, including *counts nobody when no key has been minted* |
| the key table read before the switch | *does not ask the key table on a deployment switched off* — **after the test was fixed** |
| `renderTree` defaulting to the environment again | *is not addressed by a render that was not told whether to be* |
| a `context.counting` read back in the footer | *stores each page as the same tree*, all three pages |
| the boolean and the URL derived separately | 3 rules, including *answers the renderer and the layout from one read* |
| the layout calling `siteSignalUrl` directly | *the layout does not reach the key on its own* — **after the rule was written** |
| the layout re-reading the switch beside it | *the layout does not read the switch a second time* |

**The two that survived are the findings of this run.**

The first was my own test being wrong. *Does not ask the key table* handed in a
store whose `keyOf` throws, and `siteSignalUrl` reads through `readWithin`,
which turns a refusal — a throw included — into `unavailable`. The sentinel was
caught, read as *no key*, and the answer came back `false` either way. **The
test passed against the exact arrangement it was written to forbid.** It counts
the reads now.

The second was a real gap in the fix. Making `readerSignalUrl` the only place
the two halves meet is worth nothing if a caller goes round it: `readers/key.ts`
still answers *is there a key*, and a layout asking it directly would mount a
broadcaster on a deployment that had switched counting **off** and happened to
hold a key — every batch posted into a refusal, on pages carrying no addresses
to name. That is this bug the other way up, and **it survived all 1,472 tests in
this route group.** A render is reachable from a test; the layout is an async
server component that mounts a client one, so what it reads is now read off its
source, which is the idiom `browser-bar.test.ts` already uses for the same kind
of claim.

### One claim I wrote and had to withdraw

The new `stored.test.ts` rule compares whole trees, and its first docblock said
the id would have been enough — *"an id is a hash of a build and two trees
differing anywhere would have to differ here first."* **That is false.**
`sequentialIdFactory("home")` counts nodes under a prefix; it does not hash what
is in them. The mutation that put a `counting` read back in the footer came back
with **matching ids and differing trees on all three pages**. The comment says
so now, with the measurement, rather than the thing I assumed.

---

## Real numbers

`pnpm install && pnpm verify`, exit code read out of a file written as the last
thing on its line:

```
Test Files  233 passed (233)      Tests  5444 passed (5444)    # framework
Test Files  343 passed (343)      Tests  6065 passed (6065)    # @loom/app
Test Files   56 passed  (56)      Tests  1472 passed (1472)    # app/(marketing)
1259 findings, 0 malformed
1909 visuals in reports/, 133.3MB, none over 1.1MB
133 prerendered pages, 1848 text junctions, 0 run together; 3 metadata conventions, 0 unserved
EXIT=0
```

Nothing skipped, nothing deleted, no test weakened to pass. The route group was
56 files and 1,463 tests at `08d7622`; this run adds no file and 9 tests.

**The gate was run three times, and the numbers above are the third.** The first
pass was green on the code and the tests but read a `FINDINGS.md` and a
`reports/` without this run's entries in them; the second read both but predated
one docblock. The third ran over the exact tree being pushed, and all three came
back `EXIT=0` read out of a file written as the last thing on its line — which
is the only reading of a gate this repository trusts, and the reason is four
recorded instances of a session's own notification disagreeing with it.

---

## Findings

**Closed** — **19 October, *the site says it is counting its readers on a
deployment that has not minted the key it counts them with***, filed by portal
steering and owned by this lane. The switch and the key are one answer, both
callers read one function, and the words half of it was already gone.

**Filed** — one entry, for this lane: ***`counting` is handed to the chrome of
every page and read by nothing, and the test written to catch exactly that
cannot see it.*** `ChromeContext` carries the field; strip the comments out of
`chrome.ts` and no `.counting` appears in the code, and it has been that way
since 12 October. `handed.test.ts` exists for this shape and passes, because
`home.ts` says `counting: context.counting === true` — a **named hand-off**,
which its regex reads as a read, into the one file in its sweep that does not
name the field. Its own docblock anticipates a *spread* and says why a spread is
not a read; a named hand-off is neither, and slips between them.

The cost is measured rather than argued:

```
ASKS 6  ASK_STATES 25  ROUTES 3  DEPLOYMENTS 2  SERVED_STATE_COUNT 150
servedPages() built 150 trees in 518ms
150 of 150 trees have an identical twin in the other deployment
```

Every one of the 150, and `servedPages()` is awaited eight times across six test
files. `served.ts`' own docblock explains the doubling by citing the footer
sentence and the `/what-you-run` sentence, **neither of which has existed since
12 October.**

The recommendation is that `counting` leaves the page context and the chrome and
stays a render option, which is what the pages are already true of. It is not
done here deliberately: it is a rename across ten files and four more expected
counts, and putting that in the same diff as a correctness fix is a marketing
pull request nobody can review. What this run leaves behind is the invariant
that work needs first — `stored.test.ts` holding the three pages identical under
both settings — so it starts from a measured fact rather than a reading of the
code.

---

## Found while building, and not acted on

- **`(docs)` wears a `PRE-PRODUCTION ALPHA` badge and this site says nothing.**
  Carried from #670 and #676, unanswered, and unchanged by this run. The front
  door sends readers to that page, so the deployment tells a visitor two
  different things about its own maturity depending on which surface they are
  on. Still not written here, because how loudly a product says it is early is
  positioning.
- **The questions band's two columns are uneven at 1280.** Unchanged from 17, 18
  and 19 October and still deliberately left.
- **The `/demo` half of the 4 October finding is still open** and still
  untouched.
- **The second key read on a counting deployment**, described above. Named in
  `counting.ts` and not built around.
- **A key minted between the layout's read and the page's** would address a page
  whose broadcaster had not started. It is written into `counting.ts` rather than
  built for: it costs a reader nothing, the next request is right, and closing it
  would mean a per-request cache this repository does not use anywhere.

## Needs your input

- **Whether `counting` should leave the page tree altogether.** The new one, and
  the only thing I would like decided before the next run. The finding above
  costs it out in three shapes; my recommendation is shape 1 with shape 2, as a
  pull request of its own. Nothing is broken either way.
- **Whether the front door should say this is pre-production.** Carried from
  #670 and #676, and the one I would most like settled.
- **Whether a status colour is a thing Loom's palettes should have.** Carried
  from #662, #666, #670 and #676, unanswered.
- **Whether `/how-it-works` should carry a reader to the change it describes.**
  Carried from #662, #666, #670 and #676, unanswered.
- **Nothing here is positioning and no copy was invented.** Not one word on the
  site changed. The diff is which function two callers ask.
