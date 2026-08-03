# 2026-08-03 (day 31) — the Gate's policy becomes a seam, and the verdict says which one

**Build order section:** §2 — Composition Runtime, with the mirror it forces in §6.

**Branch:** `day-31-policy-seam`, off `day-30-authoredby-and-undo` (PR #41), which
is itself off `main` at `3724f25`.

---

## Where this run started

PR #41 was open and unreviewed — no maintainer comment, only the Vercel bot. Its
work (keeping runtime-authored undos out of the calibration score, and putting an
undo button on `/history`) was complete and verified, so there was nothing to act
on there and nothing to redo.

The day-29 report left three open items. The first was #41's, now done. The
second was this:

> **The `GatePolicy` seam.** A static value handed to the pipeline once, with no
> supported way for a host to vary it per proposal — the concrete hole in
> "consumers build their own adaptivity".

It is a §2 gap, so it comes before anything later in the build order.

## What was wrong

`CompositionRuntime.policy` was one `GatePolicy`, set when the runtime was
assembled. Two consequences, and both are wrong for a framework rather than
merely inconvenient.

**A host could not judge two changes differently.** One process serving two
tenants, or a staging tree beside a production one, had one gate setting for all
of them. The escape hatch was to build a second runtime per request — not an
architecture, a convention nobody can enforce. 0031 claimed the interesting
adaptive behaviour belongs to the applications built on Loom; the knob a consumer
reaches for first was fixed for the life of the process.

**A disposition could not say what it was decided under.** Tolerable only while
the answer was always the same. The moment policy can vary, a stored verdict with
no policy on it is unreproducible — you cannot tell whether a change was held
because it was risky or because it was judged strictly, and "would this be held
today" has no answer. Who asked, which interpreter, how sure it claimed to be,
who allowed it: all already on the record. The standard it was measured against
was the one missing fact.

## What was built

`PolicySource` — `(context: {tree, intent}) => GatePolicy` — replaces the static
field. `fixedPolicy(policy)` is the one-line migration and the honest spelling of
what a single-tenant host wants.

Four properties carry the weight, and they are the decision rather than details
of it:

- **The source never sees the proposal.** Resolution happens *before*
  interpretation, from the tree and the ask. A source that could read what the
  model came back with could pick a lenient policy in answer to a change the
  strict one would have refused — and the refusal rate would look healthy while
  measuring nothing.
- **It is synchronous and pure.** It sits inside the decision path; an awaited
  lookup would make every change slower and every decision unreplayable. A host
  whose policy lives in a database loads it before entering the write path.
- **Resolved once per intent, not per proposal.** A repair is judged by the same
  policy as the proposal it replaces, which is the entire premise of 0006.
  `confirmChange` resolves *again*, deliberately — the second look is a look at
  things as they stand now, the same rule the recomputed assessment follows.
- **`gate` stamps `policyId` onto every `Disposition`.** Inside the Gate, not by
  the caller: a caller could name a policy other than the one the rules
  consulted, and a verdict naming a policy it was not decided under is worse than
  one naming none.

A `policy-resolved` runtime event was added, and telemetry mirrors it — narrowing
changes payloads, never membership (0023). The runtime event carries the whole
policy because the next stage needs the values; the stored record keeps only the
name.

`IntentEpisode.policyId` carries it into the fold, so an intent that failed
before it ever reached a disposition still says which policy was in force.

The portal shows it in two places: on the held-proposal card, because a reviewer
being asked to overrule a policy should be able to name it and go read it; and on
the activity view's proposal line beside the disposition.

## Decisions I made that were not specified

**The name is host-declared, not minted or hashed.** `policyId` is a string the
host chooses, like `Provenance.interpreter`. That puts a contract on the host — a
name identifies content, so changing a policy means renaming it — and the runtime
cannot enforce it. The alternative, a content digest, is strictly stronger and
was rejected *for now*: it needs a canonical serialisation stable across schema
versions, and a hash is not something a human can look up in their own config.
Recorded in 0033 as an open door rather than a closed one.

**An old record reads as `unattributed`, not `default`.** `dispositionSchema`
defaults `policyId` to `"unattributed"`. Dispositions written before this field
were decided under a policy nobody wrote down; naming today's default would be a
guess presented as a record. It borrows the word 0031 already uses for the
unattributable.

**`policyId` lives on `GatePolicy` rather than in a separate `ResolvedPolicy`
wrapper.** A policy knows its own name, so `gate(assessment, policy)` keeps its
two-argument shape and 0002 is untouched.

**One extra guard test, unrelated to the seam but exposed by it.**
`event.test.ts` has an `everyEvent` fixture list documented as exhaustive, with
nothing enforcing it. Adding a variant made that gap concrete, so the list is now
compared against `telemetryEventSchema.options` — a new event narrowed correctly
and never exercised now fails the suite.

## Decision records

Added **0033 — The policy is resolved per change, and named on the verdict**
(§2 → §6). Nothing superseded: 0002 said the Gate is a pure function of an
assessment and a policy and left *where the policy comes from* open; this fills
it in without weakening it. The Gate still sees only those two things, and the
source is called by the pipeline, never by `gate`.

Index regenerated with `pnpm decisions:index`.

## Test coverage and status

`pnpm verify` green end to end: typecheck, compiled build, both suites, Turbopack
production build.

- **Runtime: 769 tests / 72 files** — up from 747 / 70. Twenty-two new tests,
  two new files (`policy-source.test.ts`, `disposition.test.ts`).
- **Portal: 135 tests / 18 files** — unchanged.

The new tests, by what they hold down rather than by file:

- `fixedPolicy` answers the same for any context; a host-written source can
  branch on origin and on tree.
- The disposition names the policy on all three verdict kinds, and names the one
  that *decided* rather than the one the assessment was made under.
- Resolution is narrated before anything is interpreted, and the source is handed
  exactly `{tree, intent}` — asserted on the context's own keys, so widening it
  later fails here.
- A repair is judged under one resolution, not two.
- A held proposal confirmed under a narrowed policy is refused, and the
  disposition names the narrower one.
- Through the write path: one runtime, two trees, the same change held on one and
  committed on the other, each verdict naming its own policy. That is the
  end-to-end proof the seam does what it was built for.
- Telemetry keeps the policy's name and drops its values.
- A stored disposition with no `policyId` reads as `unattributed`.

**Nothing skipped, nothing weakened.** The portal's two display changes are
presentational field renders with no component-test harness in the repo to hang a
test on — the same position as the neighbouring rows they sit beside. Called out
rather than quietly counted as covered.

## Open questions and blockers for the next session

1. **`policyId` is a name, not a fingerprint.** A host that edits a policy in
   place without renaming it makes every record naming it describe something that
   no longer exists. 0033 states the contract and says the runtime cannot detect
   the breach. A digest stored *alongside* the name would close it. Recommend
   waiting for evidence of real drift before paying for a canonical
   serialisation.

2. **Nothing groups by policy yet.** Calibration and the episode fold now carry
   the dimension and neither segments on it. "The strict policy holds twice as
   much and its holds are discarded twice as often" is computable from public
   exports today; whether *Loom* should ship that reader, or leave it to
   consumers as 0031 argued, is an open call.

3. **A rate limit on sign-in**, still open in 0027. Untouched, third run running.

4. **PR #41 is still unreviewed**, and this branch stacks on it. If #41 needs
   changes, this diff moves with it.
