# 0290 — A reading is of one audience, and two forms of a page are two readings rather than one handed in twice

**Status:** Accepted

**Date:** 17 October 2026

**Section:** §4c (reader signals)

> **The number may move.** `main` carries 0289 (*a project is closed rather
> than deleted*, #658) and #659 holds a second 0289 awaiting its merge, so this
> took the next number free on `main` at the time of writing. Two records
> sharing a number is fatal
> ([0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)) and
> the numbering is claimed at merge, so a renumbering here changes nothing but
> the number — as it did twice in one day for
> [0284](0284-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md).

## Context

[0263](0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md) made a
page **one base tree plus the deltas an audience earns**, composed in the
customer's own process on every request. Two audiences therefore read *one tree
at one revision* and see two forms of it.
[0284](0284-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md)
put `audience_id` on all five reader tables, second in the key of each counter,
and said in its own consequences what that left undone:

> **The portal gains a dimension it must not silently collapse.** A screen that
> sums two audiences into one number is the failure 0273 names about
> applications — *a number that looks right forever* — and the row carrying its
> own audience is what lets a screen avoid it. No screen reads this yet.

**The stores were told and nothing above them was.** `counters.ts` already
publishes `inAudience` so the memory store cannot merge two rows that Postgres
holds apart by its primary key. Above the store, every reading in `src/signals/`
identifies a page by a tree and a revision — which two audiences share — so a
deployment that began serving a second form of one page got, without any of it
being visible on a screen:

- **the second form's counters dropped as the first form's node handed in
  twice.** `pageReadingOf` keyed its window by node id, so the second
  audience's row for `n_42` went into `duplicated`, which is the one condition
  [0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)
  makes permanent and which
  [`health.ts`](../src/signals/health.ts) reports as `rows-mishandled` — a
  **caller's** fault. A deployment doing exactly what 0263 built was told its
  surface had concatenated two reads.
- **a denominator from whichever form's door row came first.** `pageViewsFor`
  matched on tree and revision, took `matching[0]` and counted the rest as
  duplicates, so a rate could be one audience's `reached` over the other
  audience's `opened` — two populations in one quotient, with the pairing
  decided by the caller's array order.
- **one funnel question answered twice and the second answer dropped**, the
  same way, through `duplicatedPairs`.
- **the second form missing from every reading larger than a page.** The order
  over a deployment's pages and the three censuses of a library each dedupe by
  the same tree-and-revision key, so the second form was not in the order, not
  in the standings and not in the arrivals.

So the comparison 0263 clause 5 calls *the whole point of serving two* was not
merely unbuilt: the rows were there and nothing could read them without being
wrong.

## Decision

**A reading is of one audience. What makes two readings one page is a tree, a
revision and an audience, and that rule is published once.**

1. **`readingKeyOf` is the one spelling of what a duplicate is**
   ([`src/signals/audiences.ts`](../src/signals/audiences.ts)), imported by the
   five readings that refuse to count a page twice — the health of a
   collection, the order over a deployment's pages, and the censuses of a
   library by placement, by reach and by action. Five spellings that agree
   today are the shape this subsystem has been bitten by before, which is why
   `counters.ts` holds the store keys and `funnelPairKey` holds the pairing
   rule. A reading naming no audience keys as itself, so a window of rows that
   never carried the column behaves exactly as it did.

2. **Splitting a window is the caller's, and it is published rather than
   described.** `byAudience` turns the window a deployment read into one window
   per audience — exhaustive, lossless, each window's rows in arrival order and
   the windows themselves in a stable order — with `audiencesIn` and
   `forAudience` beside it. A caller that splits first gets **every** reading in
   this subsystem correct with no change to any of them, because each is then
   handed one population's counters.

3. **A window naming one audience needs no caller to say so; a window naming
   two does.** `pageReadingOf` takes an optional audience and records what it
   read on the reading itself (`audienceId`, `audiences`, `otherAudience`).
   Handed one audience, or none at all, it reads the window whole. Handed two
   with none asked for, it **reads neither**: the reading names both audiences,
   every part is `unknown`, and `health.ts` publishes the new fault
   `audiences-mixed`, whose remedy is the caller and whose remedy sentence says
   to split rather than sending anybody looking for a bad row.

4. **The audience travels with the reading, so the joins downstream are scoped
   without a caller repeating itself.** `PageReading` and `ReadingProgress`
   carry it, and the three joins that pick a page's rows out of a window match
   on it when the asking names one: `pageViewsFor` for the door row,
   `funnelReachOf` for the funnel answers, and `regionReadingFor` for the
   region map. Each gained an `otherAudience` count, which is neither `foreign`
   (another page) nor `duplicated` (a row handed in twice): it is this page's
   other form, whose readers are real and are not the ones being read. The
   region map is the one where the old behaviour was least visible and no less
   wrong — the second form's bucket for a country was dropped as the first
   form's bucket handed in twice, so one form's readership was published as the
   page's, and a readership comparison built on it (§20) would have been
   comparing neither form with itself.

5. **Two forms of one page stand as two rows wherever two revisions do**, in
   the order over a deployment's pages and in every library census, and
   `RankedPage` and `PageHealth` carry the audience so a screen can tell them
   apart. Nothing is summed across them and no net figure over them exists.

6. **Nothing was added to a payload, a browser, a column, a store or the
   vocabulary of kinds.** The column has been there since 0284; this is the
   reading of it. An `aud_` is an opaque name a host chose for a predicate Loom
   never sees (0284), so grouping on it is grouping rows by a column the host
   wrote and rule 1 of [`docs/signals.md`](../docs/signals.md) is untouched.

## Consequences

- **A deployment may now serve two forms of a page and be measured.** Each form
  has its own reading, its own door row, its own funnels, its own place in the
  order and its own health row, and the two are never added together.
- **`rows-mishandled` means what it says again.** It was going to fire on every
  page of the first deployment to use 0263, and the fault with the loudest
  remedy in this subsystem — *your surface handed in rows twice* — would have
  been the one most often wrong.
- **`duplicated` is narrower and stronger everywhere it appears.** It now means
  *the same row of the same form handed in twice*, which is the only reading of
  it that 0158's permanence is true of. The region map is the sharpest case:
  its counts are running totals rather than a window's, so a doubled bucket
  there is the one error in this subsystem that cannot be undone, and until now
  the commonest way to produce the warning was to serve two forms of a page.
- **A seventh collection fault**, and it is the second whose remedy is the
  caller. It brings no new silence vocabulary and no new condition: it is a
  fault on a page, which is `health.ts`'s own vocabulary, not a silence about a
  reading (0240).
- **The comparison across two audiences is now expressible and is deliberately
  not built.** Two readings of one tree at one revision, each of one
  population, is exactly what a comparison would take. What it must not do is
  borrow `changeOf`: that arithmetic is right and its sentence is wrong, and the
  reason is in *Alternatives considered*.
- **Per-reader identity is no nearer and no dearer.** An audience is a group a
  host named before any reader arrived, the predicate stays in the customer's
  process (0263 clause 1), and nothing here holds or derives anything about an
  individual. A window split by audience is still counters a rollup wrote.
- **A caller that hands in a mixed window loses its reading rather than getting
  a wrong one.** That is a behaviour change, and it is safe to make now because
  no screen reads the dimension yet (0284) and because the alternative is the
  number that looks right forever.

## Alternatives considered

**Compare two audiences with `changeOf`, since the arithmetic is identical.**
Tempting and refused, and the refusal is worth stating because the code would
have worked. A before-and-after comparison holds the readership still and
varies the tree, and §20's readership reading exists precisely to detect when
that assumption failed — *the two windows were read by much the same mix of
places, so the comparison beside this one is comparing like with like*. An
audience comparison is the mirror image: the tree and the revision are held
still and the **populations differ by construction**, so the condition §20
exists to flag is permanently true and can never be checked away. The same
share movement therefore carries two causes — the form the host served and the
people it served it to — and nothing in the counters separates them. A function
whose field names are `was` and `now` would publish *your change did this* over
a difference between two groups of readers. The comparison is a record of its
own when it is built, and it is not this one.

**Sum two audiences into one page's reading, as the readings did by accident.**
This is the one shape 0284 names as the failure, and the accident is the
argument: it produced plausible numbers for a week in which nobody was serving
two forms, and it would have gone on producing them.

**Pick the first audience in the window and read that.** What the code did, and
it is worse than summing, because which form a deployment was reading depended
on its caller's array order — so two screens reading the same store could
disagree and neither could tell.

**Default an unnamed window to `aud_everyone`.** Rejected for the reason 0284
rejected a nullable column, read the other way round. A window whose rows never
carried the audience is one population by construction, and `aud_everyone` is
an **assertion** about which — true of rows written before the migration and
false of a deployment that serves only `aud_pro`, where it would turn a correct
reading into a page with no door row and a `door-unscaled` fault. *Nothing here
says* is a third state and is kept as one.

**Scope the readings by audience at construction, the way `StoreScope` scopes
the application.** The symmetry 0284 already considered and rejected for the
store, and it fails here for the same reason: comparing two audiences is the
point of serving two, so a reading that could not be taken of each in turn
would make the measurement 0263 clause 5 asks for unreadable. It stays a filter.

**Thread the audience through every derived reading.** `PageReading` and
`ReadingProgress` carry it because something joins a door row or a key to them;
`PageCopy`, `PagePace` and the rest do not, because nothing keys or joins on
them — they are read off a reading that already named its audience. Adding the
field everywhere for uniformity would be five more places for it to be set
wrong, and a reading that cannot be joined by it cannot be joined by it wrongly.
