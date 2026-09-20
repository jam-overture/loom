# Back the way it came

**Routine:** `Loom demo` · **Branch:** `demo-23-back-the-way-it-came` ·
**20 September 2026**

**Deployed preview:** on the pull request. Open **`/demo`** — it is public, no
sign-in — and press **Re-theme the whole page** twice. (Not opened from this
environment: `vercel.app` is not on the sandbox's egress allowlist, the standing
19 August finding.)

The twenty-third run of this lane, and the first one in five about the *record*
rather than about the screen the record sits on.

---

## What a stranger could not understand before this run

**Whether the second press did anything.**

Two of the five asks on this surface are toggles. `palette` swaps the theme ids
and swaps them back; `backdrop` swaps `aurora` for `panel` and back. Both are low
risk, so both land unattended, so both are the press a visitor makes when they
want to see the thing happen twice — which is the natural second thing to do
after watching it happen once.

Driven against a real `next build` of `main`, two presses of **Re-theme the whole
page**:

> **Applied** · *“Switch this page to the other palette.”*
> How the whole page looks changed. Not a word on it changed.

> **Applied** · *“Switch this page to the other palette.”*
> How the whole page looks changed. Not a word on it changed.

Identical to the word, over a page that had visibly gone back to how it started.
The ring the second press drew on the band read **Just changed**.

This is the worst thing left on this surface and it is worth being plain about
why. The demo's argument is not *an AI changed a page* — everyone shows that. It
is *the change and the record of it, side by side*. Two identical records
describing two opposite changes is that argument failing in the one place it is
being made. A stranger pressing twice learns that Loom writes something down and
that what it writes down does not distinguish between a thing and its opposite.

Filed by this lane on **14 September** as the honest limit of the unit that gave
a landed card a sentence at all. It has been open for six days and four runs.

## What a stranger can understand now

The same two presses, on this branch:

> **Applied** · *“Switch this page to the other palette.”*
> **The whole page went back to how it looked.** Not a word on it changed.

> **Applied** · *“Switch this page to the other palette.”*
> How the whole page looks changed. Not a word on it changed.

And the ring on the band, for the same second press of **Repaint the top band**,
goes from **Just changed** to **Changed back**.

| | `main` | this branch |
| --- | --- | --- |
| the second press's sentence | the first press's, word for word | *The whole page went back to how it looked* |
| the mark it draws | `Just changed` | `Changed back` |
| palette, band, **palette** | the first press's sentence | the first press's sentence — **refused, deliberately** |
| horizontal overflow, 1280 / 390 | none | none |

## The change

### Nothing here writes a new sentence, and that is the point

The demo already had a vocabulary for a change that puts something back. It is in
`plain-change.ts` as `restoringOperation` — *“The whole page went back to how it
looked”*, *“This came back off the page, leaving it as it was before”* — and in
`spotlight.ts` as `restoringLabel` — *“Changed back”*, *“Back — exactly as it was”*.
All of it was written for the undo, and all of it was reachable only by pressing
**Put it back**, because `restoring` was read off the record's provenance
(`isUndo`, the runtime's `REVERT_INTERPRETER` stamp).

**Provenance answers *which control raised this*.** What the second press of a
toggle needs answered is *what this did to the page*. They are different
questions and they have the same answer, so this unit computes the second one and
the words it unlocks are words that were already written and already tested.

The 14 September finding recommended shape (2) — a new sentence, *“Back to how it
was before your last change”*. This is that shape, taken further: no new string
at all, and therefore no second place for the surface's account of a restoration
to drift.

### `_lib/put-back.ts` — what a change moved, and whether that put the last one back

Two exported functions and one type.

`settingsMoved(before, delta)` reads a delta against the tree it was planned
against and reports `{ nodeId, key, from, to }` per prop a `configure` moves. It
walks operation by operation, carrying the tree forward, for the reason
`plain-change.ts` does: two configures on one node inside one delta are legal, and
reading both against the original tree would report the second one's `from` as a
value the first had already replaced. A configure that sets what is already there
moves nothing and is dropped, so it can never be the thing a later change is said
to have reversed.

`from` and `to` are **absent** rather than `null` when a prop was not there and
when an operation cleared it. `null` is a value `JsonValue` allows, so a reading
that spent it on "no value" would report a cleared prop and one set to `null` as
each other's reverse. Values are compared by serialisation, which is the
runtime's own rule for a props bag, borrowed from `src/tree/compare.ts` rather
than reinvented — and its reasoning quoted, because the order-sensitivity of
`JSON.stringify` is deliberate there and matters here for the same reason.

`reversesTheLastChange(moves, last)` is the reading, and **`last` is the change
immediately before this one rather than the last change to this setting.** That
distinction is the whole of what keeps the card honest; see below.

### `record.ts` — two fields, frozen where `did` and `touched` are frozen

`settingsMoved` and `wentBack` are computed at the `change-assessed` fold, which
is the one moment the delta and the tree it was planned against are both true,
and carried through `draftFrom` for the same reason `did` is: answering a hold
re-folds with no tree in hand, and a drop would empty the reading at the press
that makes it true.

`AssessedAgainst` gains `earlier` — the asks already made, newest first. It is
the caller's own knowledge about its own session, exactly as `before` is the
caller's own knowledge about its own tree, and `actions.ts` hands in
`session.records` from the helper that already reads the head.

`settingsMoved` is the only field on this record that carries a prop's **value**.
The technical half already names what a change configured — `configure demo-n3:
backdrop` — and stops there, which is why two presses printed one string twice.

### `undo.ts` — one predicate, because there is one claim

```ts
export const putsSomethingBack = (record: ChangeRecord): boolean =>
  isUndo(record) || record.wentBack === true
```

Three places read this: the card's frozen sentence, the mark on the page, and the
*would* sentence on a change still waiting. `isUndo` was exported in the first
place because a claim made in three places has to be read from one — a band ringed
*New* over a card saying it went back is the defect that put it there. This is the
same argument reached from the other side, so the join is next to it rather than
in each of the three.

### The overclaim, refused

The obvious reading is *the last change to this setting*, and it is wrong. Press
the palette, then the band, then the palette again: that third press does reverse
the last thing done to the palette, and the page is still carrying a repainted
band. *“The whole page went back to how it looked”* would be a sentence a stranger
can see is false, which on this surface is worse than saying nothing.

So the comparison is against **the change immediately before this one, and only
one that reached the page**. A held ask moved nothing, so it is stepped over
rather than treated as the change before — which means a question sitting in the
rail cannot hide the press this one really reverses. A change that moved no
setting at all is a barrier rather than a skip: a removal is not something a later
configure put back.

Both directions are asserted, in `put-back.test.ts` and again over the real write
path in `pipeline.test.ts`, and the refusal is [photographed](2026-09-20-demo-back-the-way-it-came-in-between.png).

## Decisions taken that were not specified

- **Settings only.** A configure is the one operation whose reversal a visitor can
  reach without asking for an undo. The structural mirror — an `insert` that puts
  back exactly what the last change removed, asked for as an ordinary change — is
  not covered, is not reachable from any button this surface offers, and is filed.
- **Frozen rather than read per render.** `wentBack` is computed against the
  history *at the moment of the ask*. A reading taken later would answer a
  different question every time the visitor pressed something else, and a card
  that changes its account of what happened is the one thing a record may never
  do.
- **The card was not otherwise touched.** No new element, no badge, no second
  line. The sentence that was already in that position now says something
  different, which is the smallest intervention that closes the finding and the
  one that cannot make the card longer.
- **`isUndo` was not widened.** It still means what it meant — the runtime's own
  stamp — and the new fact sits beside it. Conflating provenance with effect would
  have made `askedLine` quote *Put it back* on a card nobody pressed it on.
- **No decision record.** Nothing here touches the tree schema, the delta model or
  an `Accepted` record. Nothing was escalated and nothing was left out.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and this report. `src/` was not opened at all.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, read off the run rather than
off a pipe.

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 156 | 2,844 |
| `@loom/app` | 283 | 4,990 |

716 findings, 0 malformed. 109 prerendered pages, 859 text junctions, 0 run
together.

The demo lane's own suite goes from **36 files / 463 tests** to **37 files / 491
tests** — **twenty-eight added, none weakened, none skipped**:

| file | `main` | branch |
| --- | --- | --- |
| `_lib/put-back.test.ts` | — | 16 |
| `_lib/pipeline.test.ts` | 20 | 26 |
| `_lib/undo.test.ts` | 24 | 28 |
| `_lib/record.test.ts` | 14 | 16 |

### The defect matrix

Each defect restored in turn against the commit, the whole lane suite run, and
the tree returned to `HEAD` between rows.

| defect restored | what fails |
| --- | --- |
| the walk reads every configure against the original tree | 1 file |
| a configure that sets what is already there counts as a move | 1 file |
| a cleared prop and a prop set to `null` become the same fact | 1 file |
| the history stops skipping asks that never reached the page | 1 file |
| `draftFrom` stops carrying what the change moved | 1 file |
| the card's frozen sentence stops taking the second press into account | 1 file |
| `putsSomethingBack` reads provenance only | 2 files |
| it reverses only part of what came before, and is called going back | **nothing — until this run's last test** |
| **`page.tsx` stops telling the marks a change put something back** | **nothing — 490 passed** |
| **`actions.ts` stops handing the earlier asks in** | **nothing — 490 passed** |

**The eighth row is the matrix earning its keep inside one run.** The
same-count guard had no test: the case that needs it is a change before this one
that moved *two* settings and a change after it that reverses *one* — every move a
perfect reverse, and the page still carrying the other half. My own
half-reversal test passed either way, because its second move had no
counterpart at all. One test added, and the row goes red.

**The last two rows are the two standing findings, and both got a fresh data
point today**; see below. Neither is new and neither was introduced by this unit.

## Findings

**Closed one:**

- The **14 September** entry — *a change that only configures says what kind of
  change it was and never which way it went*. Shape (2), taken as described
  above. Its shape (1) is untouched and still `Loom primitives`' — naming the
  values, *“the top band went from the soft wash to the flat panel”*, is still
  the truest answer and still a registry question. This closes the *direction*,
  not the vocabulary.

**Filed two:**

- `Loom daily build` — **`main` in this session's clone is fifty-one commits
  behind `origin/main`, and the procedure says to branch off it.** This run did,
  and landed on a three-week-old working tree that `git` reported no problem
  with. It was caught only because files read minutes earlier came back without
  components another lane added on 19 September. A pull request cut that way
  proposes reverting three weeks of four lanes' work while reading as whatever
  small unit the run wrote, and `pnpm verify` is green on it. Recommended as a
  paragraph in `docs/routines.md` beside *Reading the merge gate*, which is the
  other entry about a thing a **run** does rather than a thing the repository
  contains — and the same shape of trap, in that nothing fails.
- `Loom demo` — **a change that structurally reverses the one before it is still
  described as an arrival.** The honest limit of this unit; not reachable from
  any button this surface offers today, and recommended to wait until something
  can produce it.

**Two data points added, not re-filed:**

- The **17 September** `page.tsx` entry gets its **fifth**. The eighth reading
  moved into that file today and it unwires by changing one word, with 490 tests
  green and no stray `TS6133` this time either. `whatTheRailShows` is four runs
  old as a recommendation.
- The **14 September** `actions.ts` entry gets its **second**. The file now
  carries a third decision of its own — which earlier asks a change is compared
  against — and deleting that one line puts the demo's second press silently back
  to printing the first press's sentence. `assessedAgainst` is the named function
  that entry asked for, and it is still on the wrong side of `"use server"`, which
  turns out to be the half that mattered.

**Re-verified, not re-filed:** `21st.dev` `EGRESS_BLOCKED`, a **twenty-second**
consecutive run. The cost was nil again and for a new reason worth recording: what
this unit needed was not a visual reference but a decision about what a sentence
is allowed to claim, and no gallery has an opinion about that.

## Open questions

Nothing blocking.

- **The strictness is the judgement worth an eye.** Palette, band, palette says
  nothing about going back, on the argument that the page has not gone back. A
  looser rule — *this setting went back* — would fire more often and would need a
  narrower sentence than the one the undo already uses. I think the strict reading
  is right and the screenshot is there to disagree with.
- **`page.tsx` is eight readings and five data points.** Recommended as this
  lane's next unit for the fourth run running.
- **The automatic re-ask** (16 September) is still the largest thing open on this
  surface and still recommends being designed before it is built.

## The visuals

All driven against real `next build` outputs — `main`'s for the befores, this
branch's for the rest — with reduced motion, on a first arrival with no session.

| | |
| --- | --- |
| [the rail, before](2026-09-20-demo-back-the-way-it-came-before.png) | `main`, after two presses of **Re-theme the whole page**: two cards, identical to the word, over a page that has visibly gone back |
| [the rail, after](2026-09-20-demo-back-the-way-it-came-after.png) | the same two presses on this branch. The newest card, at the top, reads *The whole page went back to how it looked* |
| [the mark, before](2026-09-20-demo-back-the-way-it-came-mark-before.png) | `main`, two presses of **Repaint the top band**: the ring says **Just changed** |
| [the mark, after](2026-09-20-demo-back-the-way-it-came-mark.png) | this branch, same two presses: **Changed back** |
| [the refusal](2026-09-20-demo-back-the-way-it-came-in-between.png) | palette, band, palette — the newest card says what it said before, because the page is still carrying a repainted band |
| [a phone, before](2026-09-20-demo-back-the-way-it-came-phone-before.png) · [after](2026-09-20-demo-back-the-way-it-came-phone.png) | 390 × 844, stacked, no overflow either way |

**To see it yourself:** open the preview at `/demo` and press **Re-theme the whole
page** twice. The card that appears at the top of *the record* is the whole of
this run.
