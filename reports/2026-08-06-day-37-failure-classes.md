# 2026-08-06 (day 37) — a 400 and a 529 stop being the same event

**Build order section:** §2 — Composition Runtime. The earliest section with an
open gap, and the one the last two reports both named as the next §2 unit.

**Branch:** `day-37-model-failure-classes`, off `day-36-signin-pressure` at
`915cf8a`. PR opens against that branch, not `main`, so the diff shows only this
run's work.

---

## Where this run started

Two PRs open, both mine, neither with maintainer feedback: **#50** (§5, the
sign-in pressure page, day 36 — opened at 21:44 UTC yesterday) and **#49** (the
lesson 04 correction). The only human comment anywhere in recent history is
still *"tell me more about item number 2"* on #45, answered in full on 4 August.

So there was nothing to act on before continuing, and the build order pointed at
§2 rather than §5: day 35 found a defect there, day 36 carried it forward
unfixed, and both reports recommended it as the next §2 unit. This is that unit.

## What was built

### The defect, stated exactly

`anthropicModelClient` ended with this:

```ts
} catch (cause) {
  return err({ code: "unavailable", detail: errorDetail(cause) })
}
```

`unavailable` has a documented meaning on the seam — *"ask again later"*. The
SDK throws on a 400 exactly as readily as on a 529. So a request Loom assembled
badly (a schema the API rejects, a model id that does not exist, a body past the
size ceiling) reached every downstream consumer labelled as a transient outage.

That is not an imprecision. It is a false claim about the future: a 529 will
plausibly succeed on the next attempt and a 400 will never succeed until
something changes, and the runtime told its host the two were the same event.

The proof it was already costing something: day 35's live smoke test could not
ask the seam whether the provider had declined, because the seam did not know.
It matched `/^(429|5\d\d)\b/` against the **vendor's error message** — a string
the vendor may reword whenever it likes — to recover a fact the type had thrown
away. A test parsing prose to rebuild a discarded fact is the clearest available
evidence that the type was wrong.

### What replaced it

The seam now names **the actor who would have to do something for the next
attempt to go differently** — not what went wrong, and not whether to retry.

| Code | Actor | Meaning |
| --- | --- | --- |
| `unavailable` | nobody | could not answer now; may work later |
| `rejected` | Loom | the request itself was refused; unchanged, it fails identically |
| `misconfigured` | an operator | this deployment may not talk to this model at all |
| `refused` | the asker | the model would not answer this content |
| `incomplete` | nobody | the answer was cut off |

`InterpretationError` gains the two corresponding codes —
`interpreter-request-rejected` and `interpreter-misconfigured` — and the runtime
seam exports one total function, `interpretationFault`, mapping all seven codes
onto five actors (`asker`, `model`, `provider`, `deployment`, `runtime`). A
consumer switches on the actor and cannot get the grouping wrong; a new code
obliges its author to classify it and obliges nobody else to change.

**The adapter classifies by HTTP status, and only where it is sure.** 401/402/403
are `misconfigured`; a 4xx that is not 408, 409 or 429 is `rejected`; everything
else — 5xx, the "later" 4xx statuses, a transport failure with no response at
all, an unrecognised status, a status that is not a number — stays `unavailable`.
The asymmetry is the point: guessing "retryable" for something permanent costs
one wasted attempt, guessing "permanent" for something transient tells a host to
abandon work that would have succeeded. So the code that claims least is where
an unknown lands.

### The three things that immediately read better

- **`describeWriteOutcome`** said `not interpreted: ${detail}` for every cause.
  It now gives a sentence per code, and each says what happens if nothing
  changes. A reviewer sees *"this deployment cannot reach a model until an
  operator changes that"* instead of a vendor message.
- **The portal's keyless interpreter stops lying.** With no API key it returned
  `interpreter-unavailable` — telling a reviewer to try again at something that
  will never work. It returns `interpreter-misconfigured`. This is the most
  common instance of this failure anyone actually meets, and it was reported
  wrong.
- **The smoke test reads a code.** It skips when, and only when,
  `interpretationFault` says `provider`. A key that is present and *refused* now
  fails the build rather than skipping quietly — the outcome that should have
  been loud all along.

## Decisions I made that were not specified

**No `retryable` boolean, and no `isRetryable` helper.** The convenient thing,
and the least honest: it is unarguably true of `unavailable`, false of the two
new codes, and genuinely arguable for `malformed-proposal`, where resampling an
identical request may well produce a usable answer. A seam that must guess on one
case in five should describe rather than prescribe. A host that wants the boolean
writes `interpretationFault(error) === "provider"` and owns the policy that
phrase encodes.

**Status, not the API's `type` field.** The vendor's `type`
(`authentication_error`, `billing_error`, …) is more precise where it exists, but
it is vendor vocabulary inside the one module whose job is translating *out* of
vendor vocabulary, and it is absent on transport failures. Status is coarser and
universal; the vendor's own words survive in `detail`, where an operator reads
them.

**`misconfigured` earned its own code rather than folding into `rejected`.** One
new code would have fixed the defect as stated. Two are right because they demand
different people — a rejection is a bug report for whoever maintains Loom, a
misconfiguration is a task for whoever runs the deployment — and folding them
would have left the portal's keyless case still misreported.

**Structural reads, never `instanceof`.** The SDK is an optional peer and a test
stub throws whatever it likes, so `status` is read off an unknown object and
ignored unless it is a number. `"400"` as a string does not get to decide that a
transient failure is permanent.

**A live test for the one assumption fixtures cannot check.** Every offline test
hands the classifier an object shaped the way I *believe* the SDK shapes errors —
which is precisely the belief that would be wrong silently, collapsing all three
codes back into `unavailable` with nothing failing. So there is now a second live
test: a deliberately invalid key, asserted to come back `misconfigured`. It costs
nothing, answers instantly, and is gated on the same key-presence proxy for "this
session has network". **It ran and passed against the real API today.**

## Decision records

Added **0040 — A failure names the actor who must clear it** (§2 → §5). Index
rebuilt with `pnpm decisions:index`.

Nothing superseded, and nothing contradicted. 0005 said model access is an
optional adapter behind a narrow seam; this widens what that seam may say without
changing where it sits or who implements it.

## Test coverage and status

`pnpm verify` green end to end: build, typecheck, both suites, portal build.

- **Runtime: 926 tests / 75 files**, all passing, **nothing skipped** — up from
  886 / 74. Forty new tests, one new file (`runtime/interpreter.test.ts`, 20
  tests).
- **Portal: 273 tests / 26 files**, up from 272 / 26.
- **Both live API tests ran and passed**, against `claude-opus-5`. No model id
  changed; the interpreter's default is unchanged, and the classification work
  itself is entirely deterministic.

What they hold down:

- **The classification:** 400, 404, 413 and 422 are `rejected`; 401, 402 and 403
  are `misconfigured`; 408, 409, 429, 500 and 529 are `unavailable`; an
  unrecognised status, a status that is not a number, and a throw carrying no
  status at all all stay `unavailable`; and the vendor's message survives into
  `detail` in every case.
- **The mapping:** each new client code arrives at the interpreter as its own
  interpretation code, carrying the status through.
- **The actors:** a compiler-enforced record — adding a code to the union without
  classifying it fails typecheck — plus the two distinctions this unit exists to
  make, asserted by name.
- **The sentences:** every code produces its own, each contains the detail, and
  the three that matter say *operator*, *later* and *unchanged* respectively.
- **The write path:** the three uninterpreted causes share a tone and a headline
  and never share a sentence.
- **The real API:** a schema-constrained request still round-trips into a delta
  that applies, and a key the API rejects comes back `misconfigured` — which is
  what makes the whole classification more than an assertion about a fixture.

**Nothing weakened. Nothing skipped.** Yesterday's report described a skip
condition added for a provider outage; that condition is now narrower (it reads
the code rather than a regex) and did not fire.

## Open questions and blockers for the next session

1. **Telemetry recorded before today keeps `interpreter-unavailable` on failures
   that were really rejections.** `TelemetryFailure.code` is a free string, so
   the new codes flow into the journal with no migration — but a reader
   comparing failure rates across today's boundary is comparing two different
   vocabularies. **Recommendation: leave it.** The log is the truth (0016) and
   rewriting history to make a chart tidier is the opposite of what Loom claims
   to be. Worth knowing, not worth fixing.
2. **Nothing acts on the new distinction yet.** The runtime does not retry, so
   `provider` and `runtime` faults produce identical behaviour today — the
   difference is visible to a host reading events, and to a reviewer reading the
   portal. **Recommendation: leave it until a host asks.** A retry policy the
   runtime picks unilaterally is the thing 0040 deliberately declined to write.
3. **Sign-in lockout history (option B) is still your fork** — #45 and #50. A is
   built and shipping. **Recommendation: not yet**; it is a governance decision
   about retaining failed attempts against a public form, not an engineering one.
4. **Still nothing scheduled** — the telemetry prune (day 34) and the snapshot
   audit (day 28). **Recommendation: one nightly cron covering both**, once you
   are happy with the 90-day default.
5. **ARCHITECTURAL, from day 35, still yours: should a tree carry the ids it has
   retired?** Unchanged, and unchanged in my recommendation: **not yet**. The
   audit finds a recycling after the fact and the runtime's own minting cannot
   produce one.
6. **The prerender fix on #50 deserves one look** — one line in the root layout
   covering every guarded page, taken because it had already shipped `/primitives`
   as a cached redirect to sign-in.
7. **Carried, unchanged:** RLS fails closed for a non-owner role (day 34, by
   design); the portal has no component test harness (day 26); a missed `db:push`
   is still a sign-in outage (day 32); `policyId` is a name rather than a
   fingerprint (day 31); calibration does not segment by policy (day 31); the
   reply schema sits near its 3500-byte guard; there is no node-level provenance;
   and the README's layout tree still stops at `store/`.

**§7 — Marketplace — remains the only section I will not start without you saying
so.** Sections 1–6 are functional end to end; what is left in each is the list
above.
