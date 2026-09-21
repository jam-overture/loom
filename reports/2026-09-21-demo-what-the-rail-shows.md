# What the rail shows

**Routine:** `Loom demo` · **Branch:** `demo-24-what-the-rail-shows` ·
**21 September 2026**

**Deployed preview:** _(added on the pull request)_ — public, no sign-in. Open
**`/demo`** on a phone-width window, press **Take the numbers off**, then press
**Re-theme the whole page**. The second card in the record is the whole of this
run.

The twenty-fourth run of this lane, and the first one about the *wiring* rather
than about a reading or a screen.

---

## What a stranger could not understand before this run

**Why the page was showing them a picture of the thing it had just said was
gone.**

Two presses reach it, and they are the two most natural presses on this surface.
*Take the numbers off* is the panel's primary control and the Gate holds it —
that is the demo's best moment, the one where Loom says *I will not make this
change until you say yes*. Then the visitor presses something else, because
there are four more buttons and nothing tells them to answer one at a time.
*Re-theme the whole page* lands on its own, the revision moves, and the first
question dies where it stands: a hold is weighed against a page, and Loom will
not carry a decision onto a page it has not seen.

The card for that dead question said this, in this order:

> **Nothing changed**
>
> **“Take the numbers band off the page.”**
>
> The change no longer fits this page — something it referred to has moved or gone.
>
> **This is what would come off the page.**
>
> *[the appointments band, rendered, plainly still there]*
>
> You changed the page after asking for this. Loom weighed it against the page
> as it was then, and won’t apply a decision to a page it hasn’t seen.

[The card as it stands on `main`.](2026-09-21-demo-what-the-rail-shows-before.png)

One card, contradicting itself twice, at the moment this surface exists for. A
stranger reads *something it referred to has moved or gone*, then looks at the
thing, which has not moved and is not gone, under a caption in the conditional
about a change that can never happen.

It is on the stacked layout only, which is why it had never been seen:
`globals.css` removes the preview on a wide screen, where the band is ringed on
the stage instead. Every screenshot this lane has taken of a record card at 1280
was of a page where this cannot appear.

## What a stranger can understand now

The same two presses, on this branch: the card keeps the badge, the quoted ask,
the sentence saying the change no longer fits, and the button offering to ask
again — and the preview is gone, because there is nothing true left to show.

[The same card, here.](2026-09-21-demo-what-the-rail-shows-after.png)

| | `main` | this branch |
| --- | --- | --- |
| a dead question's card | preview of the band, captioned *This is what would come off the page* | the note, and nothing else |
| everything else on that card | badge, ask, sentence, *Ask for this again* | unchanged, in the same order |
| a **live** question's card | preview, effect and plain reading | unchanged |
| a first arrival, and every landed change | — | pixel-for-pixel unchanged |
| horizontal overflow, 1280 / 390 | none | none |

## The change

### The defect is the second half of this unit, not the first

The first half is that the defect was findable at all.

`page.tsx` is an `async` Server Component that reads a cookie and opens a store,
which is a boundary a `vitest` run cannot cross. Every reading this surface
shows was computed inside it, so for twenty-three runs this lane has tested the
functions the page calls and never the *calling*. The defect matrix each unit
ends with kept returning the same row, five times over four runs:

| reading | unwired by | what failed |
| --- | --- | --- |
| which asks are still worth offering | dropping `stillToAsk` | nothing — 440 passed |
| which holds can still be answered | dropping the `movedOn` filter | nothing |
| what the caution counts | dropping `openQuestions` | nothing |
| which marks the rail may claim | building `marked` from the changes, not the marks | nothing |
| whether a mark says *back* | `restoring: putsSomethingBack(…)` → `false` | nothing — 490 passed |

The 17 September finding named the shape and the name — `whatTheRailShows` — and
recommended taking it as its own unit, *before* the next reading landed in that
file rather than after. It has been open four runs and each of those runs added
a reading. This is that unit, taken on the fifth data point.

### `_lib/rail.ts` — one function, pure, handed what the request already fetched

`whatTheRailShows({ tree, records, held, registry, ids, showPart })` touches no
request, no cookie, no store and no cache. It is given the three values the page
has already fetched — the tree on the stage, this visitor's records, the holds
the store is keeping — and returns everything the rail is allowed to say:
`available`, `spots`, `marked`, `waiting`, `readings`, `about`,
`spotlightToken`.

That purity is the point rather than a tidiness. Every property this surface
guarantees is a claim about the **page as a whole** — *the caution counts
exactly the questions the panel withdrew*, *the rail never names a mark the page
is not carrying* — and a page-wide claim is precisely what a test of one helper
cannot make. It is why five units' worth of guarantees were sitting on nothing.

`page.tsx` goes from **495 lines to 266** and from eight readings to none. What
is left is the three things only it can do: fetch what the request has, render
what needs the registry, lay the two halves out.

### The preview is why the function is generic, and generic is why the test works

One reading could not simply move. A `PartInQuestion` has to be *rendered*, a
`LoomTree` needs the registry, and the registry is not something to drag across
a client boundary. The obvious answer is to return the parts as data in a
parallel map and let the page join them — which hands the wiring straight back
to the file that could not be tested.

So the function is generic in the preview and takes a `showPart` callback. The
page hands in one that returns a `<PartInQuestionView>`; the test hands in one
that returns the part itself and records that it was asked. Both get the same
map out of the same code.

That is what makes the fix assertable from both sides, and both sides are
needed: the part of a stranded hold is still perfectly renderable, so a test
that only checked the map would pass against an implementation that rendered it
and threw it away.

```ts
expect(view.readings.get(stale.recordId)?.inQuestion).toBeUndefined()
expect(shown).toEqual([])
```

### What `page.tsx` had said it was already doing

The effect and the plain reading were both filtered to the holds that could
still be answered. The comment over the preview said it applied *“the same two
conditions as the effect above and for the same reason — a change that has
already landed describes a tree that is gone.”* The code under that comment read
`holds.value.held` and applied neither condition.

The filter and the map it was meant to guard were forty lines apart in a file
nothing could open. Neither half is wrong on its own; the file is where they
stopped agreeing.

### `the-record.tsx` — `HeldReading` is an alias now, not a second declaration

It declared the same four optional fields the page built. Two declarations of
one shape, one written by the builder and one by the consumer, is a field that
can be added at one end and ignored at the other. It is now
`RailReading<React.ReactNode>` — the same type the function returns, with the
preview instantiated at what it becomes once the page has rendered it.

## Decisions taken that were not specified

- **The stranded card gets the note and nothing else.** Not a narrower preview,
  not a greyed one. There is nothing true left to say about that change except
  that it can no longer happen, and the whole record is still one click down on
  the disclosure, off the record rather than off the tree.
- **`rendered.diagnostics` stayed in `page.tsx`.** It is a fact about the
  *render*, not about the rail, and moving it would have meant handing the
  render result into a function that otherwise needs none of it. It is filed as
  the one reading left outside, with the rule that a tenth goes in `rail.ts`.
- **`RailView` is fields rather than methods**, and computed eagerly. A lazy
  reading would let two callers observe two different pages, which is the class
  of defect the whole file exists to close.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing was escalated and nothing was left out.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and this report. `src/` was not opened at all.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, read off the run and not off a
pipe.

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 156 | 2,857 |
| `@loom/app` | 288 | 5,078 |

728 findings, 0 malformed. 109 prerendered pages, 859 text junctions, 0 run
together.

The demo lane's own suite goes from **37 files / 491 tests** to **38 files / 506
tests** — **fifteen added, none weakened, none skipped, none rewritten.** All
fifteen are in one new file, `_lib/rail.test.ts`, and none of them is a copy of
an existing assertion: every one is a claim about the page that no test in this
lane could previously make.

Nothing is stubbed but the browser. The holds are real holds from the real write
path, judged by the real policy; the records are the ones `actions.ts` writes.

### The defect matrix

Each defect restored in turn against the commit, the whole lane suite run, the
tree returned between rows.

| defect restored | on `main` | here |
| --- | --- | --- |
| the panel stops withdrawing an ask already waiting on an answer | nothing — 440 passed | **3 tests** |
| a hold the page has moved past is treated as answerable | nothing | **1 test** |
| the caution counts every hold rather than every live one | nothing | **1 test** |
| the rail claims a mark the page never drew | nothing | **1 test** |
| a mark stops saying a change put something back | nothing — 490 passed | **1 test** |
| the preview is computed for a change that can no longer happen | **shipped** | **1 test** |
| the card stops being told the page moved on | nothing | **1 test** |

**Two rows were green on my own first pass, and that is worth writing down
rather than quietly fixing.** *The caution counts every hold* and *the rail
claims a mark the page never drew* both passed against a test file that had six
cases and looked thorough. Both are invisible unless the fixture puts the page
in a state my six cases never reached — one needs a hold the page has **moved
past**, the other needs **two questions open at once** whose marks must be told
apart. Two more cases and both rows go red.

The lesson is not about these two properties. **A wiring test is only as good as
the states it puts the page in**, and a file that exercises one press per case
will assert the arithmetic and miss every claim that is about a page with a
history. The two tests that caught them are the two with three presses in them.

**The seventh row is this unit's own.** It is not a defect that ever shipped; it
is the new code checked the same way as the old.

## Findings

**Closed two.**

- The **17 September** entry — *`page.tsx` is the second file in this lane a test
  cannot reach*. Five data points, four runs. Closed with the name it asked for
  and the matrix redone in full underneath it.
- The preview defect above, **filed and closed in this run**. It gets its own
  entry rather than a line in the first, because a defect that reached `main`
  and was live on the deployed demo is worth being findable by what it did to a
  visitor rather than by which refactor happened to turn it up.

**Filed one.**

- `Loom demo` — **what the move did not buy.** `page.tsx` still cannot be
  mounted; what changed is that there is nothing left in it to *compute*. The
  remaining class is substituting a wrong value into a required prop, which is
  smaller and louder than deleting an argument, and two props of compatible
  shape could still be swapped. **Recommended not to take as a unit** — the
  residual risk does not justify a second refactor. What is worth carrying
  forward is the rule: a new reading goes in `rail.ts` and arrives with the test
  that proves it is wired.

**One data point added, not re-filed.**

- The **14 September** `actions.ts` entry gets its **third**. Closing its sibling
  made it sharper: `rail.test.ts` had to write its own `assessedAgainst` — read
  the head before the write, hand in `session.records`, stamp `askedWith(record,
  preset.id)` — which makes three copies of those decisions in this repository,
  two of them in tests that exist only because the original cannot be called. My
  first version omitted the stamp and three assertions failed for a reason that
  had nothing to do with what they tested. Two-line move, unchanged
  recommendation, now with `whatTheRailShows` as the worked example to copy.

**Re-verified, not re-filed:** `21st.dev` `EGRESS_BLOCKED`, a **twenty-third**
consecutive run. The cost was nil again: this unit moved no pixels by design,
and its one visible consequence is a deletion. No gallery has an opinion about
what a card is allowed to claim.

## Open questions

Nothing blocking.

- **The judgement worth an eye is the deletion.** A stranded card now shows the
  note and nothing else. The alternative — keep the preview, change its caption
  to the past tense — would keep a picture on screen that is about a change
  nobody can make, on the one layout where screen space is the scarce thing. I
  think the deletion is right and the two screenshots are there to disagree
  with.
- **The automatic re-ask** (16 September) is still the largest thing open on this
  surface and still recommends being designed before it is built. It is also the
  first thing that would have made this defect unreachable rather than invisible,
  which is a new argument for it: a question the page has moved past would be
  re-asked rather than left on screen to be described.

## The visuals

Driven against real `next build` outputs — `main`'s for the befores, this
branch's for the rest — with reduced motion, on a first arrival with no session.

| | |
| --- | --- |
| [the card, before](2026-09-21-demo-what-the-rail-shows-before.png) | `main`: *something it referred to has moved or gone*, then a picture of it |
| [the card, after](2026-09-21-demo-what-the-rail-shows-after.png) | this branch: the note, and nothing else |
| [the rail, before](2026-09-21-demo-what-the-rail-shows-phone-before.png) · [after](2026-09-21-demo-what-the-rail-shows-phone-after.png) | 390 wide, the whole rail after the same two presses |
| [a live question](2026-09-21-demo-what-the-rail-shows-live.png) | the case that must not change: one press, the preview still there |
| [a first arrival](2026-09-21-demo-what-the-rail-shows-arrival.png) · [on a phone](2026-09-21-demo-what-the-rail-shows-phone-arrival.png) | 1280 × 900 and 390 × 844, nothing pressed — the shot this unit must leave alone |

**The arrival shot is byte-identical across the change.** Same `md5`
(`41955176d26c460db7cc93bef1227d5b`), same 749,611 bytes — one taken against a
`next build` of `main`, one against this branch's. That is the claim an
extraction has to make and the one a screenshot can check: the page a stranger
meets did not move by a pixel, and the only thing that changed is the card that
was lying.

**To see it yourself:** open the preview at `/demo` in a phone-width window,
press **Take the numbers off**, then press **Re-theme the whole page**, and read
the second card.
