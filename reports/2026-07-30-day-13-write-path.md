# 2026-07-30 (day 13) — the write path: composing, gating, and holding a change

**Build order section:** §5 — Portal, third step of its internal order
(read path → addressing → **write path** → history → calibration).

**Visual:** [the one write path](2026-07-30-day-13-write-path.svg) ·
screenshots of the running build, driven against the live API:
[a change applied](2026-07-30-day-13-write-path-applied.png) ·
[a change held for review](2026-07-30-day-13-write-path-held.png) ·
[the result of confirming one](2026-07-30-day-13-write-path-confirmed.png)

**Branch:** `day-13-write-path`, off `main` at `453ddce`

---

## Review feedback

@jonathanbravecredit replied on #17: *"That all sounds good."* — which answers
both questions that run asked.

1. **Listing stays ordered by tree id, not recency.** Left exactly as it was.
   0020 already records what would have to change to get recency later.
2. **The write path before the compile step.** That is what this run built. The
   `extensionAlias` workaround in `next.config.ts` is untouched and still the
   highest-value non-feature work in the repo; it is first on the list for the
   next run unless something displaces it.

---

## What was completed

The portal can now change a tree, and every change it makes goes through one
server-side path with the Gate in it.

### 1. `commitIntent` — the join between §2 and §5

`composeChange` decides whether a change may happen; nothing until now decided
that it *did*. `src/write/` is that seam, and it is a module of its own rather
than a method on either side: giving §2 a store dependency would make every
pipeline test set one up, and giving `TreeStore` a pipeline dependency would put
interpretation inside the persistence contract.

Read head → refuse a stale intent → compose → append. The order matters in one
specific way: **the revision check runs before interpretation, not after.** A
stale intent is refused without a model call ever being made, and the
interpreter is never handed a tree the asker was not looking at. 0017 had
already decided the refusal; this is where it happens.

The tree a commit returns is the store's, not the one the pipeline applied in
memory. They agree — and when they ever do not, the log is the one that is
right.

### 2. Custody for held changes — recorded as **0021**

The Gate's middle answer, `requires-confirmation`, had nowhere to live. A
proposal has to survive the request that produced it, because the person who
answers it arrives later, and `confirmChange` needs the delta the Gate actually
judged rather than a fresh interpretation of the same sentence.

`HoldStore` is that place, and three properties are the real decision:

- **`release` is a take, not a read.** It removes and returns in one step, so
  "answered exactly once" is a property of the store rather than a rule every
  caller has to remember.
- **A hold whose tree has moved is dead, not stale.** Its delta names a base
  revision that is now in the past, so it can never apply again. Confirming one
  releases it and reports the conflict rather than leaving a row that refuses
  every time it is clicked.
- **Confirming re-runs the Gate.** A human saying yes is permission to proceed,
  not permission to skip the check — a policy that now refuses still refuses.

The record also says plainly what was rejected: round-tripping the proposal
through the browser (0017 forbids it — the client would be asserting its own
provenance), and holding it in the log as a non-advancing entry (0016 forbids it
— a revision is the count of log entries).

### 3. The portal actually writes

A prompt box, a review queue, and three server actions. The form posts a
sentence and the revision it was looking at; it never posts a delta. The
selected node becomes `scopeNodeId`, which is what day 12's addressing work was
for — and it is the *requested* node, not the addressed one, because scoping
narrows interpretation over the tree rather than over the DOM.

Held proposals render as a queue showing the rationale, the stakes,
reversibility, the self-graded confidence, and the Gate's reason, with apply and
discard. `portalStore.append` has exactly one caller in the whole app, which is
the only enforcement 0017 admitted was available.

### 4. Six new events, and one the runtime was missing

The stream now narrates persistence: `change-committed`, `commit-failed`,
`proposal-held`, `hold-failed`, `hold-confirmed`, `hold-discarded`, and
`intent-not-writable`. The one that mattered most to add was **`commit-failed`**
— the gap between "applied in memory" and "in the log" was the one place the
event stream could have claimed a change landed when it had not.

`hold-discarded` is the one §6 will care about most: it is the only record of a
change the Gate was prepared to allow and a human did not want, which is exactly
what 0007's calibration has to learn from.

---

## Decisions I made that weren't specified

1. **`StoreError` moved to `src/store/errors.ts`.** The runtime's event
   vocabulary now needs to say why a commit failed, and importing the whole
   store contract into `runtime/events.ts` would have made the dependency
   circular. The error taxonomy depends on nothing, so it can be shared; the
   contract cannot.
2. **`confirmChange` returns a narrower type.** It can only ever produce
   `applied`, `rejected`, or `not-applicable` — there is nothing left to
   interpret and a change the Gate holds twice is not offered a third time. It
   was typed as the full `CompositionOutcome`, which forced a dead branch in the
   write path. The type now says what the function does.
3. **The portal runs without a model, and says so.** No key means an interpreter
   that returns `interpreter-unavailable` and a disabled prompt box, rather than
   a portal that fails to boot. Every read path — which is most of §5 — stays
   usable offline.
4. **The repairer is wired in the portal.** 0006 makes "this deployment lets AI
   have a second go" a choice at the composition root; a review queue is the
   place where "refused, then repaired into something acceptable" is worth
   seeing, so it is on here.
5. **The event sink is a no-op.** Honest about §6: the runtime narrates and
   nothing consumes it yet. Applied changes lose nothing by this — their
   provenance is in the log — but refusals and discards do, and that is what the
   telemetry pipeline is for. Not built ahead of its turn.
6. **Confirming only revalidates the page when something was committed.** See
   below; this was a bug the browser found.
7. **Direct manipulation was deliberately not built.** 0017 designed it — a
   gesture enters as an intent whose delta is already known, with origin
   `developer` — and the portal has no gesture to send yet. Building the API
   before its consumer would have been speculative, and the shared path means
   adding it later changes nothing structural.

---

## A bug the browser found, not the tests

Confirming a held proposal revalidated the page unconditionally. When the
confirmation *succeeded* that is right — the card should go. When the Gate
refused it on its second look, or the tree had moved underneath it, the card was
also taken away, **and the reason with it**: a reviewer who clicked "apply"
would see the row vanish and be told nothing at all.

Fixed by revalidating only on a commit. An unanswered card stays on screen and
becomes a receipt, with its buttons hidden, because custody is a take and a
second click could only ever produce "nothing to answer".

Third run in a row where driving the real page found something no test was going
to.

---

## Model

Unchanged: `claude-opus-5`, the runtime's existing
`DEFAULT_INTERPRETER_MODEL`, reached through the `ModelClient` seam and the
Anthropic adapter's structured-output path. This run made no new model choice —
it wired the portal to the interpreter §2 already had. The key is read once at
module scope from `LOOM_ANTHROPIC_API_KEY` (falling back to
`ANTHROPIC_API_KEY`) and never leaves the server.

---

## Test coverage / status

```
@loom/runtime   55 files, 513 tests   green
@loom/portal     4 files,  25 tests   green + build
```

`pnpm verify` green across the workspace. **+42 tests** (35 runtime, 7 portal),
nothing skipped, nothing failing. The live-API smoke test ran and passes; it
still skips cleanly without a key.

What the new tests pin down:

- **custody** — a hold is answered exactly once, and the second `release` says
  `not-held` rather than returning the same proposal twice; a released hold
  cannot be read back; a listing is scoped to one tree and ordered oldest-first.
- **committing** — the store's head advances, not just the returned tree; the
  log carries the proposal's own provenance; `change-committed` follows
  `change-applied` rather than replacing it.
- **the stale check** — both revisions are named, and *the interpreter is never
  called*, which is the whole reason the check is not left to `append`.
- **holding** — the store is untouched, the hold carries the revision it was
  judged against, and custody is narrated separately from the disposition that
  caused it.
- **confirming** — it applies; it cannot be answered twice; a hold whose tree
  moved is released and reported as a conflict rather than left in the queue; a
  policy that now refuses still refuses.
- **discarding** — the tree is unchanged and `hold-discarded` is emitted.
- **not persisting** — a store that refuses the append produces `commit-failed`
  and never `change-committed`.
- **the portal's outcome mapping** — every `WriteOutcome` kind renders,
  a refusal and a failed interpretation do not share a tone, and only a
  committed write reads as applied.

Driven in a browser against the live API as well as in tests: a sentence became
a delta and reached the log (revision 0 → 1); a vaguer one was held at
confidence 0.62 and shown in the queue; discarding left the tree at revision 1;
confirming another took it from 3 to 4. `no-change-needed` came back as its own
outcome when the tree was already what was asked for.

---

## Open questions for the next session

1. **The compile step.** Now the oldest carried item and the one the maintainer
   agreed comes next: `next.config.ts` carries an `extensionAlias` workaround
   that pins the portal to webpack rather than Turbopack.
2. **Nothing expires a hold.** A tree nobody writes to again keeps its held
   proposals indefinitely. 0021 records this as deliberately unsolved — an
   expiry policy is a host decision and would put a clock in a contract that
   currently needs none. Worth revisiting when §6 can show how long holds
   actually live.
3. **A discard is attributed to nobody.** `hold-discarded` carries a proposal id
   and no actor, because the portal has no identity to attribute it to. Shipping
   an always-undefined `actor` field would have been worse than leaving it out,
   but "attributable" is one of the runtime's four claims, so this is a real
   gap waiting on auth.
4. **Direct manipulation** (see decision 7 above) — designed in 0017, not built,
   waiting for the portal to have a gesture.
5. **The schema is at 3381 of a 3500 guard.** Untouched. Carried.
6. **Node-level provenance.** (Carried from day 1.) Still unforced.
