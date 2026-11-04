# 0345 — A journal is asked for a half-open window over when it learned of a record, and a page reports the stretch it covers

**Status:** Accepted

**Date:** 4 November 2026

**Section:** §2 (the runtime's record of itself)

## Context

A telemetry journal is append-only and paged by `seq`, which is arrival order.
Until now that was the only way in: `TelemetryReadRequest` held `treeId`,
`cursor`, `direction` and `limit`, and nothing about time.

`Loom portal` filed the consequence on 6 October, from a screen it had just
shipped. `/portal/trust` answers *is the AI getting better at judging itself* by
folding the newest page of the journal against the page before it. That is a
true statement, and it is a statement about **two hundred entries** rather than
about any stretch of time — so the screen is written to say *the stretch of the
record before this one*, to print the dates each stretch covers, and
deliberately never to say *last week*, which is the thing a person would have
asked.

**The gap is not cosmetic, and it gets worse quietly.** Two pages are two
stretches of unequal wall-clock time, and how unequal depends on how busy the
deployment was. A deployment that gets busier covers less time per page as it
grows, so the same section compares a shorter and shorter window against a
longer one — and the comparison changes meaning while every number on it stays
right. Nothing on the screen can detect that; the screen can only say so in a
sentence.

The entry named two remedies, smallest first: time bounds on the read, and a
page's own ends on `TelemetryPage` so a consumer does not take them off the
first and last record and get them wrong on an empty page. It filed them rather
than taking them, per
[0018](0018-the-portal-is-a-consumer-not-an-insider.md): a
read shape is not something a consumer may widen.

## Decision

**A journal may be asked for a half-open window over `recordedAt`, and every
page reports the stretch it covers.**

Four parts, and each is a choice that could have gone the other way.

### 1. The window is measured against `recordedAt`, never `occurredAt`

`recordedAt` is stamped by the journal on arrival. `occurredAt` is what the host
said, and a host with a skewed serverless clock or a replayed batch is
describing its own timeline.

This is the same argument `journal.ts` already makes about retention — *an age a
writer can choose is an age a writer can dodge* — and it is sharper here. A
bound on the dodgeable field would let a reader ask for a window and be handed
records from outside it, **in page order, with nothing saying so**: the page
would look exactly like a correct answer.

The contract suite can tell the two apart. Every record in its fixture carries
an `occurredAt` months in the past, so a window taken from the journal's own
stamps holds them all, and an implementation bounded on what the host said
answers with nothing.

### 2. The window is half-open — `since` is included, `until` is not

Consecutive windows tile without overlapping, which is the whole purpose of the
shape: *last week* against *the week before* must not count a record that landed
on the boundary twice. The reading this was filed for is exactly that
comparison, so a shape that double-counted at the seam would have reproduced the
defect it was built to remove, in a smaller place and harder to see.

`since` equal to `until` is therefore empty by construction. That is allowed: a
caller slicing a range into windows produces it at the edges, and refusing it
would make a caller special-case its own arithmetic.

### 3. A window is built by a constructor, and holds instants rather than strings

`telemetryWindow({ since, until })` returns a `Result`. The window it returns
holds epoch milliseconds.

**Instants rather than the ISO strings a caller held**, because one instant may
be written two ways — `2026-01-01T02:00:00Z` and `2026-01-01T04:00:00+02:00` —
and an implementation comparing those as text orders them backwards and answers
with a window nobody asked for. Holding the instants makes comparing them the
only thing an implementation can do.

**A constructor rather than two optional strings on the read request**, because
of what the alternative does with a bad bound. `Date.parse` of a typo is `NaN`,
and every comparison against `NaN` is false, so a journal handed one would
answer **nothing happened that week** — which is indistinguishable from the
truth, on a screen whose entire job is to say whether something changed. That is
the same class of defect as part 1.

Refusing the bound at construction also means `TelemetryError` does not grow.
Its doc comment claims, with reasons, that `unavailable` is the only way a
journal fails, and a typo in a caller's bound is not a journal being
unavailable. The fault belongs to the caller and is returned to the caller.

### 4. `TelemetryPage.span` is the page's own ends, or `null`

`{ from, to }` as the journal stamped them, and **`null` when the page holds
nothing** — rather than two nulls, which cannot tell *there is no answer* from
*the answer covers no time*.

It is **the earliest and latest stamp, not the first and last record.** A page
ascends by `seq`; `seq` is allocated at insert while `recordedAt` is a clock's
reading, so two writers whose transactions overlap can land a lower stamp at a
higher position, and first-and-last would report a span running backwards. A
page is bounded by a clamped limit, so scanning it costs nothing worth saving.

It is **the page's ends and never the window's.** A window is what was asked
for and may be wider at both ends than anything that landed in it, so a screen
naming the window would overstate what it is describing.

## Consequences

**The reading the portal shipped can be re-asked in the words a person used.**
*Has it got better since last week* is now two reads of two windows rather than
two pages of unequal duration, and the screen can name the stretch it is
describing from the page instead of inferring it.

**A window and a cursor compose, and paging a window stays inside it.** The
window says which records a read is about; the cursor says how far through them
it has got. Both implementations put the bound in the same filter as the cursor,
*before* the limit, which is what keeps the `limit + 1` probe a question about
the window — so a reader paging to the end of last week is told it has reached
the end of last week rather than handed a cursor out of it.

**`span` is a required field on `TelemetryPage`.** Nothing consuming a page
breaks, because a consumer reads it; the two implementations in this package
produce it, and a third-party journal must. `withinTelemetryWindow` is published
for exactly that implementor: a journal keeping records in process applies it,
and one backed by a query writes the two comparisons as a `where`.

**Seven names are published from `@jam-overture/loom/telemetry`** and the
generated reference was regenerated with them. The 3 October finding about
publishing a name without a prose page applies: the generated reference is
tooling and regenerates cleanly, and whether these want a sentence on a
documentation page is `Loom docs`' call. Filed rather than crossed into.

**A stamp the journal cannot read is outside every window.** It stays visible to
an unwindowed read, where it can be noticed, and never joins a stretch somebody
is about to draw a conclusion from. The same rule gives it no part in a span.

## Alternatives considered

**Two optional ISO strings on the read request, `since` and `until`, with no
constructor.** This is what the 6 October finding literally asked for and it is
the smaller change. Refused for the reason in part 3: a bound that cannot be
parsed has only three fates — ignore it, which is the documented hazard of
handing back records from outside the window; throw, which Loom does not do
across a module seam; or widen `TelemetryError`, which contradicts its own
recorded reasoning. A fourth, *compare it anyway and let `NaN` make the page
empty*, is safe and silent, and silence is what makes it worse than a refusal.
The constructor costs a caller one line and removes all four.

**Inclusive at both ends.** Rejected in part 2: two consecutive windows would
share any record stamped on their boundary, and the reading this exists for is
a comparison of two consecutive windows.

**A window on `occurredAt`, or a choice of field.** Rejected in part 1. A choice
would be worse than either fixed answer, because the wrong half of it is
undetectable from the page.

**`from` and `to` as two nullable fields rather than a nullable `span`.**
Rejected in part 4: it makes *no records* and *no time* the same answer, which
is the mistake the field exists to prevent.

**Deriving the span in each consumer.** This is the state the finding describes,
and the portal had already written the four lines. It is where the empty-page
case goes wrong, and the next consumer writes it again.

**Storing a `recordedAt` index hint or a materialised window.** Not needed: both
implementations already have what they need. The memory journal filters a
predicate it already filters two others with, and Postgres adds two comparisons
on a column written on every insert. Nothing here is a schema change, and no
built code migrates.
