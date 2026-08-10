# 2026-08-10 (day 45) — eight units that never reached main, and a rate that described neither gate

**Build order sections:** repair first, then **§6 → §2** — calibration segmented
by the policy that judged each claim.

**Branches:** `day-45-stack-recovery` (→ `main`, PR #63) and
`day-46-calibration-by-policy` (→ `day-45-stack-recovery`).

---

## Where this run started

`git log origin/main` stopped at day 36, dated 5 August. `reports/` stopped at
day 36. `decisions/` stopped at 0039. And `gh pr list --state open` returned
**nothing at all** — every one of the eleven PRs day 44 was worried about had
been closed.

That combination has two readings, and they are very different. Either eight
units of work were rejected, or they were merged somewhere other than `main`.

### What actually happened

On **9 August between 23:18 and 23:50 UTC** all thirteen open PRs were merged, in
the order they were created. A stack has to land in the opposite order.

Each stacked PR merges its head **into its base branch**, and the base was the
previous day's branch:

| PR | merged at | head → base |
| --- | --- | --- |
| #50 | 23:20 | `day-36` → **`main`** |
| #51 | 23:22 | `day-37` → `day-36` |
| #53 | 23:26 | `day-38` → `day-37` |
| #54 | 23:46 | `day-39` → `day-38` |
| #56 | 23:47 | `day-40` → `day-39` |
| #57 | 23:48 | `day-41` → `day-40` |
| #59 | 23:49 | `day-42` → `day-41` |
| #60 | 23:49 | `day-43` → `day-42` |
| #62 | 23:50 | `day-44` → `day-43` |

`main` received day 36 at 23:20. Two minutes later day 37 was merged into
`day-36-signin-pressure` — a branch that had already landed and would never be
merged again. Every unit above it flowed into a branch below it and stopped.

The four lessons PRs (#49, #52, #55, #58, #61) targeted `main` directly, so they
did land. That is why `main` moved on 9 August and still contained nothing after
day 36 — the branch looked alive while the build stack was stranded.

**Nothing was lost.** The stack was linear, so `day-44-portal-render-harness`
already contained every commit from day 37 onward.

### The repair

`day-45-stack-recovery` is `main` with `day-44-portal-render-harness` merged into
it. No rebase, no cherry-pick, no rewritten message — the nine commits arrive as
themselves. Git merged it without a conflict.

The verification is the part worth stating: **this combination had never been
built.** The eight units were verified against each other, the five lessons
commits were verified against `main`, and the two sets had not met until this
merge. `pnpm verify` is green on the merge commit — 1352 tests across both
suites, the live API tests included, and all eleven portal routes still building
as `ƒ`.

PR **#63** is that branch against `main`. I did not merge it; that is not mine to
do.

### What was outstanding on review

Nothing. I read #62's comments and every human-looking comment on the recent PRs
is my own report comment or Vercel's deploy bot. The last genuine maintainer
comment remains *"tell me more about item number 2"* on #45, answered on
4 August. So after the repair, the build order.

## What was built

### The gap, stated exactly

0031 built calibration as a pure fold: per confidence band, how many claims were
judged, how many survived, and the gap between the mean claim and the observed
rate. One report over everything in the window.

That was right while there was one gate. **0033 ended it** — the policy is
resolved per change and named on the verdict, so a host can run a strict gate on
checkout and a loose one on marketing copy, and can tell afterwards which
judgments were made under which rules.

Under two gates the single report is not coarse, it is wrong in a specific way.
`observedRate` is presented as a fact about the model and it is not one: a claim
survives when the Gate accepted it and no human discarded it. So the rate is a
joint measurement of the model **and** the policy that judged it.

The fixture that says it best, and it is a real run through the real Gate twice:

| | judged | survived | mean claim | gap |
| --- | --- | --- | --- | --- |
| **pooled** | 2 | 50% | 90% | **+0.40** — badly overconfident |
| `generous` | 1 | 100% | 90% | −0.10 — on the mark |
| `strict` | 1 | 0% | 90% | +0.90 — refused outright |

The same model, the same confidence, the same delta. The pooled row describes
neither gate. And it *moves when a host edits a policy* — which is precisely the
moment a reader is most likely to conclude the model got worse.

Nothing about a pooled report announces that it pooled.

### `byPolicy`

The report keeps its overall score and bands, and gains the same measurement
computed again over each gate's own claims.

- **A judged claim is attributed to the policy named on its disposition, and to
  nothing else.**
- **The split is a partition, not a sample.** Every judged proposal lands in
  exactly one segment, so the segments sum to `overall` — a reader can check the
  page against itself, and a test does.
- **A segment is scored by the same code as the whole.** I refactored the tally
  into a `Bands` value used by both, rather than letting a segment grow its own
  arithmetic. A segment that scored itself differently would be a discrepancy
  nobody chose and no test would think to look for.

### The two unknowns, kept apart

`policyId: null` means *this window never saw the judgment* — the page opened
after the disposition and before the commit. The recorded string
`UNATTRIBUTED_POLICY_ID` means *the judgment was made before the Gate wrote down
which policy made it* (0033).

They look identical on a page and they are not the same fact. One is a gap in the
reader and is fixed by widening the window. The other is a gap in the record and
never will be. The portal says **"judged before this page begins"** and **"judged
before policies were named"**, and a test asserts the two strings differ.

### The portal

`/calibration` gains a breakdown under the headline: one row per gate, with the
gap read on that gate's own numbers rather than the page's.

It renders **only when more than one policy judged the window**. With a single
gate the table restates the headline in smaller type, and a breakdown that is
always present is one nobody reads on the day it matters.

This is the first component written since day 44's render harness existed, so it
shipped with a `.test.tsx` from the start rather than being covered later — which
is what day 44 recommended, applied on the first opportunity.

## Decisions I made that were not specified

**The disposition is the only source of the policy, and the intent's `policyId`
is not a fallback.** This is the mistake I nearly made: `IntentEpisode` carries a
`policyId` and it is right there next to the proposals. It is the *last* policy
resolution the window saw. A proposal held under one policy and confirmed under a
narrower one would be attributed to the gate that did not reach its verdict — a
wrong attribution presented with exactly the same confidence as a right one. An
honest `null` is worth more than a plausible guess.

**A policy that has judged nothing opens no segment.** A held proposal carries a
disposition and no verdict; a row for it would claim a rate over nothing.

**Segments are ordered by policy name with the unrecorded one last**, so two
windows produce rows in the same order and can be read side by side. Sorting by
sample size would reorder the page as the journal grew.

**The unjudged are not segmented.** Which gate is holding everything is a real
question, but it is about throughput rather than calibration, and answering it
here would put verdict-less proposals into a structure whose every other number
is a verdict.

**`harnessWith` gained an optional `policy`.** A test about attribution needs two
hosts that genuinely differ, and every fixture in that file is a real run through
the real Gate. Hand-writing dispositions would have produced a test that kept
passing after the Gate stopped naming policies at all.

**Two exceptions where a fixture is edited rather than driven.** A window that
opened after a judgment, and a record written before policies were named, cannot
be produced by running the pipeline — one is a property of paging and the other
of a past version. Both are reached by rewriting the disposition on a real fold,
and the helper says so.

## Decision records

Added **0047 — A verdict belongs to the gate that reached it** (§6 → §2). Index
rebuilt with `pnpm decisions:index`.

It earns a record on two criteria: it decides what the runtime may claim about
AI-authored change (a survival rate may not be presented as a property of the
model across differing gates), and it rules out the intent-`policyId` fallback,
which is the approach a reasonable engineer reaches for first.

**Nothing superseded, nothing contradicted.** 0031 holds unchanged — calibration
is still a reader and nothing in the runtime consults `byPolicy`. 0033 is the
record this one builds on. No escalation: `LoomTree`, the delta model, and every
store contract are untouched, and `CalibrationReport` gained a field rather than
changing one.

## Test coverage and status

`pnpm verify` **exits 0** on both branches: build, typecheck, both suites, portal
build.

**On `day-45-stack-recovery` (the repair):**

- Runtime **993 / 78**, portal **359 / 33** — all passing, nothing skipped. These
  are day 44's numbers, which is the point: the merge changed no behaviour.

**On `day-46-calibration-by-policy`:**

- Runtime **1001 tests / 78 files** — 8 new, all passing, nothing skipped.
- Portal **367 tests / 34 files** — 8 new in one new file, nothing skipped.
- The live API tests **ran against the real API and passed**. Nothing in this
  unit calls a model; they ran because a key was present.

What the new tests hold down:

- **The headline case** — one pooled rate split into the two gates that produced
  it, driven twice through the real Gate under two real policies.
- **The partition** — segments sum to `overall`, for both judged and survived.
- **Banding inside a segment** matches banding in the whole report.
- **One policy produces one segment**, whose score equals `overall` exactly.
- **Order** — by name, unrecorded last.
- **The two unknowns stay two segments**, and the portal renders two distinct
  sentences for them.
- **No segment for a policy that has only held things**, and none for an undo the
  runtime authored (0032) — asserted through a real `revertRevision`.
- **The component renders nothing** below two segments, and nothing when nothing
  was judged; each row is read on its own numbers.

**Nothing weakened. Nothing skipped.** No component was changed to make it
testable.

One thing found and fixed inside the run: a NUL byte reached
`policy-breakdown.tsx` while it was being written. It compiled and every test
passed — `git` flagged the file as binary in the diff, which is the only reason
it was caught. Removed, and the file is UTF-8 text. Worth knowing that our
toolchain does not object to one.

## Open questions and blockers for the next session

1. **Merge #63 and `main` is current.** Nothing else in this list matters as much;
   `main` is five days behind and every future PR is measured against it.
   **Recommendation: merge #63, then #64.**
2. **How should stacks land from now on?** The rule that would have prevented
   this: **a stack lands top-down** — #62 first, #50 last. **Recommended answer:
   say the word and I will stop stacking entirely**, basing every PR directly on
   `main` and resolving the conflicts myself. It costs me a little rebasing and
   removes a failure mode that cost eight units four days of visibility.
3. **Still nothing scheduled** — telemetry prune (day 34) and snapshot audit
   (day 28). **Recommendation: one nightly Vercel cron covering both**, once you
   are happy with the 90-day default. Eleventh run raising it.
4. **38 of 41 portal components still unrendered by any test** (day 44). The new
   one shipped with its own tests. **Recommendation: unchanged — cover components
   as they are touched**, rather than a bulk sweep.
5. **Playwright as a thin smoke test beside `verify`, not inside it** (day 44).
   **Recommendation: worth one run, after something in §6.**
6. **`policyId` is a name rather than a fingerprint** (day 31). 0047 makes this
   sharper rather than resolving it: the page now reads those names back, so a
   host that changed what a policy contains without renaming it will show two
   different gates under one row and nothing will notice. **Recommendation: a
   content hash beside the name, in a §2 run** — worth its own record.
7. **Calibration segments make samples smaller**, and in alpha most will report
   `null`. That is 0031's honesty applied consistently and should not be smoothed
   away, but if you would rather the page hid segments below some size, that is a
   one-line change and your call.
8. **Carried, still yours:** sign-in lockout history (option B, #45/#50 —
   **recommended: not yet**, a governance call); the **ARCHITECTURAL** question of
   whether a tree should carry the ids it has retired (**recommended: not yet**);
   a contained emit failure is invisible by design (day 39); telemetry written
   before day 37 keeps `interpreter-unavailable` on failures that were really
   rejections; RLS fails closed for a non-owner role (day 34, by design); a missed
   `db:push` is still a sign-in outage (day 32); calibration does not segment by
   policy — **closed by this run**; and the reply schema sits near its 3500-byte
   guard.

**No model id changed.** The interpreter still defaults to `claude-opus-5`.

**§7 — Marketplace — remains the only section I will not start without you saying
so.** Sections 1–6 are functional end to end; what is left in each is the list
above.
