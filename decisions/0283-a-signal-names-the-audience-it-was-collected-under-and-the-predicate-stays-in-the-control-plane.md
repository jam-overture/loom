# 0283. A signal names the audience it was collected under, and the predicate stays in the control plane

**Status:** Accepted
**Date:** 2026-10-15
**Section:** §5 (signals), §1 (schema)

> **Renumbered on 2026-10-15**, from 0280, before this branch was opened for
> review. `main` had meanwhile accepted a different 0280 — *the words of a kind
> of part the typical reader reached are weighted once per page* (#640) — and
> two records sharing a number is fatal (0097). Nothing in this record changed
> but its number, and 0281 and 0282 were taken by the same interval.

## Context

[0273](0273-the-reader-tables-take-the-application-now-and-the-audience-when-it-is-ratified.md)
landed `application_id` on the five reader tables alone and owed a second
migration, on a condition it stated rather than implied:

> The reader tables take `application_id` now, alone. **The audience dimension
> lands when 0263 is Accepted, as a second migration**, and that cost is
> accepted rather than avoided.

[0263](0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md) was
accepted on 13 October. The condition is met and the debt is due. This record
pays it, and in doing so settles what 0263 required without describing:
**what an audience looks like on the wire.**

That is this record's real work. The column is five statements on a
pattern 0273 already proved; what nobody had settled is what goes *in* it.
0263 clause 1 says an audience is a predicate over the opaque render context —
site, region, locale, cohort, flag, whatever the host puts there — and clause 4
says the match is evaluated in the customer's app, per request, with nothing
about the reader leaving their process. Both of those are about *deciding* an
audience. Clause 5 then requires that *a signal names the audience it was
collected under* and says nothing about what naming one means. The two
plausible answers are a long way apart: the predicate itself, or a name for it.

## Decision

**A signal carries an opaque `audience_id` naming which audience it was served
under. The predicate that selected that audience lives in the control plane's
rules, and Loom's reader tables never hold it.**

- `AudienceId` is a branded id on the `aud` prefix, minted like every other
  (`src/audience/audience.ts`), with `DEFAULT_AUDIENCE_ID` spelled
  `aud_everyone` — **the audience that matches every reader**, which is what a
  deployment serving one form of a page has always been doing without a word
  for it.
- All five reader tables carry `audience_id text NOT NULL DEFAULT
  'aud_everyone'`. **On the four counters it is second in the key, immediately
  after `application_id`** — the same shape, in the same position, as the
  dimension 0273 added, and it must be in the key, because the key *is* the
  identity of a counter and two audiences folding into one row is the failure
  clause 5 names.
- **The buffer takes the column and neither its key nor its index moves**,
  which is where this dimension stops resembling the last one. 0273 widened
  that index because every read of the buffer is inside one application, so the
  application belongs in its prefix. Nothing reads the buffer by audience — a
  rollup folds a whole window and groups by the column afterwards — so leading
  with it would push `tree_id` and `seq` out of the prefix and make every read
  that exists scan wider, in exchange for a filter no caller expresses.
- The batch a page posts carries `audience` **optionally**. Absent means
  `aud_everyone`, which keeps every existing sender, fixture and worked example
  meaning exactly what it meant.
- A read names an audience or omits it, on the convention `revision` already
  follows: omitting reads every audience, and the row names its own, so a
  caller comparing two groups them. Nothing sums two audiences without being
  asked to.
- **The predicate is not here.** No column holds a rule, an expression, a
  context key or a matched value. What an `aud_` means is the control plane's to
  say, exactly as what an `app_` means is.

## Consequences

- **0263 clause 5 is satisfied** — *a signal names the audience it was
  collected under, or the measurement is worthless* — and the adaptation plan's
  measurement rests on it, so the comparison that plan asks for is now
  expressible: two audiences, one tree, one revision, counters apart.
- **0273's debt is discharged.** `scoped.test.ts` goes on being the one file
  that says what scoping means across the whole store, now in two dimensions.
- **A tally is finer-grained than it was**, so a deployment that begins serving
  variants sees its rows split from the day it starts. Rows written before this
  migration read `aud_everyone`, which is true of them: there was one form of
  every page.
- **Loom still learns nothing about any reader.** An `aud_` is a name the host
  chose; this record makes the opacity a property of the schema rather than of
  nobody having written the column yet.
- **The portal gains a dimension it must not silently collapse.** A screen that
  sums two audiences into one number is the failure 0273 names about
  applications — *a number that looks right forever* — and the row carrying its
  own audience is what lets a screen avoid it. No screen reads this yet.
- Nothing in §2 moves. The Gate judges a variant as 0263 already settled.

## Alternatives considered

**Store the predicate with the signal** — the matched context, or the rule that
matched it. Rejected on the contract 0263 clause 1 keeps and 0262 depends on: the
predicate is evaluated in the customer's process over context Loom never sees,
and a column holding it would be Loom learning what the values mean. It is also
the one shape that could make a reader identifiable: a rule narrow enough to
select one visitor, stored next to what that visitor did, is the correlation
0146 exists to prevent. An opaque name cannot do that however narrow the
audience is.

**A row per audience in a side table, joined.** Normal, and it buys nothing
here: the id is already opaque and fixed-width, so the join would fetch a name
the counters never read. It also puts a row somebody has to create before a
signal can be filed, which makes ingest fail on an unregistered audience — the
opposite of the default's purpose.

**Scope the stores by audience at construction, as `StoreScope` does for the
application.** The symmetry is tempting and the dimension is not the same shape.
An application is fixed for the whole of a handle's life — *spanning two is
unexpressible* is exactly what 0220 wanted — whereas comparing two audiences is
the **point** of serving two, so a handle that could not span them would make
the measurement 0263 clause 5 asks for impossible to read. It stays a column and
a filter, like `revision`.

**Wait, and land it with the composing `TreeSource`.** The same argument 0273
had to overturn, and it fails the same way: the table is where the measurement
accumulates, so a column that arrives with the renderer arrives after the
readers it was meant to tell apart. The counters cannot be backfilled from
rows that never recorded which form they saw.

**Default the column to `NULL` for *audience unknown*.** Rejected for 0269's
reason about `app_default`: it is not a null. Every read filters on it and every
write sets it, and a nullable dimension would make *every* counter read a
two-case question — the row for everyone, and the row for nobody knows — where
one of those cases is a state no sender can produce.
