# 2026-08-10 (day 47) — a name that stopped meaning one thing, and the page that now says so

**Build order section:** **§2 → §6** — the Gate stamps what a policy contained,
and calibration reads it back.

**Branch:** `day-47-policy-fingerprint` (→ `main`).

This is the **second run of 10 August**. The first shipped the day 45 stack
recovery and day 46's calibration-by-policy.

---

## Where this run started

`main` is current: **#63 and #64 are both merged** (`ac861fd`), so the eight
stranded units and the per-policy calibration are on `main`, and `gh pr list
--state open` is empty. That closes the previous run's first and largest open
question — nothing in this run had to work around a stale base.

### Review feedback

One maintainer comment since the last run, on #64:

> *Let me know what I need to do to run the telemetry prune.*

**Answered on #64 at 11:42 UTC** — the runner already exists and works by hand:
`cd apps/portal && pnpm telemetry:prune`, needing only `DATABASE_URL`, with
`LOOM_TELEMETRY_MAX_AGE_MS` defaulting to 90 days and a one-hour floor. The reply
covered what it will and will not do (prefix-only deletion, never cutting an
episode in half, 5,000 records per run, telemetry only) and a safe first run with
a 365-day horizon that should print `nothing to forget`.

What is genuinely missing is only the **schedule**, and the reply flagged the part
I did not want to decide alone: a Vercel cron invokes an HTTP route, so making it
nightly means **publishing an endpoint that deletes history**. Recommendation
stands — a `CRON_SECRET`-guarded route that fails closed when the secret is
unset, one route covering both the prune and the day-28 snapshot audit. **No
answer yet, so I did not build it.** It is question 1 below.

With that answered and nothing else outstanding, this run went back to the build
order. §2 was the earliest section with an open gap.

## What was built

### The gap, stated exactly

0033 stamped the policy's **name** onto every verdict and put a contract on the
host to go with it: *a name identifies content*. A host that edits a policy gives
it a new name, because every disposition already written under the old name claims
to have been judged by what that name meant then. 0033 said outright that the
runtime could not check this, and left a fingerprint "stored alongside the name"
open if drift proved real.

**0047 made it real, yesterday.** Calibration now segments by policy name and
presents a survival rate per gate. So a host that nudged `checkout`'s
`minimumConfidence` from 0.7 to 0.8 and moved on gets one row over two gates — and
the row is rendered with exactly the confidence of a correct one.

That is worse than the pooling 0047 fixed, not better. A reader looking at a
pooled headline might apply a caveat of their own. A reader looking at a page
that has just told them it is segmented will not.

The failure mode is mundane, which is why it will happen. Nobody sets out to
misattribute a verdict; they edit a config file and forget that a name is load
bearing.

### `policyFingerprintOf`

A pure, synchronous function from a `GatePolicy` to a string, stamped by `gate`
onto `Disposition.policyFingerprint` — the same place and for the same reason the
name is stamped there. A caller could supply a fingerprint other than the one the
rules consulted, and a disposition claiming contents it was not decided under is
worse than one claiming none.

**The fingerprint is two halves, `shape:values`, and this is the part worth
reading.**

- `shape` digests **which knobs exist**.
- `values` digests **what they are set to**.

Without that split, the first Loom release to add a policy field would change
every fingerprint in every corpus, and every reader would report that hosts had
edited policies they had never touched. With it, records from either side of an
upgrade are **incomparable** — an explicit "cannot tell" rather than a confident
wrong answer. This is not speculative generality: `incomparable` is precisely what
the next policy knob to be added will produce.

Four more properties, each deliberate:

- **The name is excluded from the digest.** A rename is not an edit. Folding the
  name in would make the two indistinguishable, which defeats the point — renaming
  on edit is the discipline 0033 asked for, and this exists to reward it.
- **The digest is of meaning, not spelling.** Vocabulary lists are membership
  tests and `ceilingFor` reads its record by key, so list order, repeated entries
  and key order change no decision and change no digest. A reformatted config file
  is not a policy change.
- **The projection is a mapped type over `keyof Omit<GatePolicy, "policyId">`.**
  A knob that escaped the digest would report "unchanged" about a policy that had
  changed — worse than no fingerprint at all — so adding a field to `GatePolicy` is
  a compile error until someone says how it is digested.
- **FNV-1a, 64-bit, written out in the module.** A cryptographic digest means
  `crypto.subtle`, which is async, and the Gate is synchronous and pure by 0002 and
  0033. There is no adversary here — a host that wants its records to misdescribe
  its policy can simply change nothing.

### What a reader can now tell

Each `PolicyCalibration` segment carries the distinct fingerprints its judgments
named, and separately the count that named none. `rulesetContinuityOf` reads that
list as one of four states:

| state | means |
| --- | --- |
| `unrecorded` | nothing carried a fingerprint; those judgments predate the field |
| `single` | one ruleset judged all of them — the name held |
| `changed` | two fingerprints of one shape differ — someone edited without renaming |
| `incomparable` | different shapes — a Loom version changed; this cannot say more |

The count of unfingerprinted judgments stays **outside** the list on purpose. One
fingerprint plus fifty unrecorded judgments is not a segment shown to be constant,
and a list of length one would say that it was.

### The portal

`/calibration`'s breakdown now appears **when a single segment's rules changed**,
where before it needed two segments. One name over two rulesets is a pooled page
with one row, and staying silent there would reproduce 0047's failure exactly.

The row carries a note when there is something a reader would act on: *"the rules
changed under this name — 2 different rulesets judged these claims while calling
themselves `checkout`"*. Silent when a name held and everything was recorded,
because a caveat on every row every day is a caveat nobody reads on the day it
matters.

## Decisions I made that were not specified

**The breakdown's trigger moved from a length check to a predicate.** This is the
change that makes the fingerprint useful rather than merely stored. A length check
misses the single-segment drift, which is the exact case the fingerprint exists
for.

**Segments are still keyed by name, not by `(name, fingerprint)`.** Splitting
silently would contradict 0047 — a verdict belongs to the gate the *host* named —
and would put two rows both labelled `checkout` on the page, which a reader cannot
tell apart without reading digests, which are not names. Drift is reported *inside*
the segment instead.

**A change of schema is never reported as a change of rules.** Crying wolf on every
Loom release would teach a reader to skip the one row that mattered.

**An unparseable fingerprint compares as its own shape**, so it reads as
incomparable rather than as agreement. Failing toward "cannot tell" is the right
direction for a field whose whole purpose is doubt.

**The table gained a second row per segment, not a sixth column.** A column
reserves width on every page for a sentence absent from most of them, and has to
be filled with something on the rows that have nothing to report. `PolicyRow` was
extracted to its own file rather than growing `PolicyBreakdown` past the size where
it stays readable.

**One test was written and then deleted.** I wrote a case asserting that an
explicitly-`undefined` ceiling and an absent one fingerprint identically. It does
not compile (`exactOptionalPropertyTypes` forbids the shape) and it does not parse
(`gatePolicySchema` rejects it), so the state is unreachable at every boundary the
runtime has. The `undefined` filter in the encoder survives as **type narrowing**
— `Object.entries` over a `Partial` yields `V | undefined` — and its comment now
says that rather than claiming to handle a case that cannot arrive.

## Decision records

Added **0048 — A policy's name is checked by a fingerprint stored beside it**
(§2 → §6). Index rebuilt with `pnpm decisions:index`.

It earns a record on two of the four criteria: it fixes a contract other
components implement (`Disposition` gains a field the Gate must stamp and readers
may consult), and it rules out approaches a reasonable engineer reaches for first
— hashing the id itself, reflecting over the policy object, and segmenting
calibration by `(name, fingerprint)`.

**Nothing superseded, and no escalation.** 0033 explicitly left a fingerprint
"alongside the name" open, so this fills a hole its author marked rather than
reversing it; 0033's rejection was of a hash *as* the id, which still stands. 0047
holds unchanged — the partition is still by name and still sums to `overall`.
`LoomTree`, the delta model and every store contract are untouched, and no
migration is needed: dispositions and telemetry events are `jsonb`, and the new
field is optional.

## Test coverage and status

`pnpm verify` **exits 0**: build, typecheck, both suites, portal build, all eleven
routes still `ƒ`.

- Runtime **1032 tests / 79 files** — **+31 tests, +1 file**, nothing skipped.
- Portal **381 tests / 34 files** — **+14 tests**, nothing skipped.
- The **live API tests ran against the real API and passed**. Nothing in this unit
  calls a model; they ran because a key was present, and they skip cleanly without
  one.

What the new tests hold down:

- **The digest is stable, and is `shape:values`** in the format the reader parses.
- **Every one of the eleven knobs changes it** — twelve variants, twelve distinct
  fingerprints, none equal to the default's.
- **A rename does not change it**; an edit does; **adding a ceiling entry does**.
- **Order, repetition and key order do not change it**, so a reformatted config is
  not an edit.
- **A prop key containing the encoder's separators cannot forge another policy's
  digest.**
- **The Gate stamps it on all three verdict kinds**, and two policies sharing a
  name are told apart by contents through the real `gate`.
- **Continuity across all four states**, including that an edit on one side of a
  schema change still reads as `changed` rather than being lost to
  `incomparable`.
- **Calibration segments** carry their own gate's rulesets only; unfingerprinted
  judgments are counted without making a row look settled; fingerprints are sorted
  so two readings of one window agree. Every calibration fixture is a real run
  through the real Gate, except the two states no live run can produce (a judgment
  from before the field existed, and one from another schema version), which are
  reached by rewriting a real fold through helpers that say so.
- **The portal** renders the breakdown for a single drifted segment where it
  previously rendered nothing, names which policy stopped meaning one thing, does
  not call a version change an edit, and stays quiet on a clean row.

**Nothing weakened, nothing skipped.** One existing test changed its assertion —
`recordOf` now keeps a digest beside the policy name — and it still asserts that no
policy *value* crosses into telemetry.

## Open questions and blockers for the next session

1. **The nightly prune route — your call, and the only thing I am waiting on.**
   The runner works by hand today. Scheduling it means an HTTP endpoint that
   deletes history. **Recommendation: a `CRON_SECRET`-guarded route under
   `app/api/cron/` that fails closed when the secret is unset (0027's posture),
   covering both the prune and the day-28 snapshot audit, one nightly entry in
   `apps/portal/vercel.json`.** It earns a record, being the first write path that
   is not a human action. Say the word and it is the next unit.
2. **Stacking.** Moot this run — `main` was current, so this PR is based directly
   on it, which is what I recommended last time. **Recommendation: keep it that
   way**; I will base every PR on `main` and resolve conflicts myself.
3. **A fingerprint says *that* the rules changed, not *how*.** Answering that
   needs the policy documents, which the runtime deliberately does not store
   (0023, 0033). **Recommendation: leave it.** A host that wants a diff has its own
   configuration history, and storing the document is the thing both records
   rejected.
4. **Every judgment recorded before today is unfingerprinted, permanently.**
   During the alpha most segments will read "partly recorded". That is honest and
   it decays on its own. **Recommendation: no action.**
5. **38 of 42 portal components still unrendered by any test** (day 44). The new
   `PolicyRow` is covered through `PolicyBreakdown`. **Recommendation: unchanged —
   cover components as they are touched.**
6. **Playwright as a thin smoke test beside `verify`, not inside it** (day 44).
   **Recommendation: worth one run**, now that §6 has had two.
7. **Carried, still yours:** sign-in lockout history (option B, #45/#50 —
   **recommended: not yet**, a governance call); the **ARCHITECTURAL** question of
   whether a tree should carry the ids it has retired (**recommended: not yet**); a
   contained emit failure is invisible by design (day 39); telemetry written before
   day 37 keeps `interpreter-unavailable` on failures that were really rejections;
   RLS fails closed for a non-owner role (day 34, by design); a missed `db:push` is
   still a sign-in outage (day 32); and the reply schema sits near its 3500-byte
   guard.

**No model id changed.** The interpreter still defaults to `claude-opus-5`, and
this unit adds no model call.

**§7 — Marketplace — remains the only section I will not start without you saying
so.** Sections 1–6 are functional end to end; what is left in each is the list
above.
