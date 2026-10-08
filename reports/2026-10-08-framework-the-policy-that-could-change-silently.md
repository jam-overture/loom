# Framework — the policy that could change silently

**Routine:** `Loom framework` (`Loom daily build`) · **Date:** 2026-10-08 ·
**Branch:** `framework-58-the-pair-either-side`

## What I completed

A policy log, and the reading that makes it mean something. It closes the
27 September finding `Loom portal` filed against this lane — *a policy can be
changed and there is nowhere for that change to be recorded* — and is recorded as
[0241](../decisions/0241-a-policy-is-a-logged-object-and-what-changed-is-a-view-over-the-log.md).

Four new modules, all in this lane:

| | |
| --- | --- |
| [`src/runtime/policy-log.ts`](../src/runtime/policy-log.ts) | `PolicyLog`, the append-only log; `memoryPolicyLog`; `policyHistoryOf` |
| [`src/runtime/policy-change.ts`](../src/runtime/policy-change.ts) | `policyChangeOf(was, now)` — what moved, and which way it moved the Gate |
| [`src/store/postgres-policy-log.ts`](../src/store/postgres-policy-log.ts) | the Postgres implementation, and the table |
| [`src/testing/policy-log-contract.ts`](../src/testing/policy-log-contract.ts) | `describePolicyLogContract`, published from `@jam-overture/loom/testing/contracts` |

**Nothing on the decision path changed.** The Gate, `GatePolicy`,
`PolicySource` and `Disposition` are untouched, and nothing was added to a
payload, a tree, a delta or the vocabulary of kinds. A deployment that does not
want a policy log carries one table's worth of DDL it never runs.

## Why this was worth a run

Loom's entire premise is that a change to a page is logged, judged and
reversible. **The policy was the one object in that system that could change
silently.**

A `Disposition` carries `policyId` and `policyFingerprint`, so a reader can prove
two judgments ran under different rules. That is as far as a digest goes: two
fingerprints either match or they do not, so `rulesetContinuityOf` can report
`changed` and can never say what changed. A refusal rate that moved in the week
somebody nudged `minimumConfidence` in a config file is either explained by that
edit or is a fault, and nothing in this repository could tell those apart.

That is also why it had to be the framework's rather than the portal's, and the
filing said so better than I would have: a portal-side history of policy edits
would be a second source of truth, free to disagree with whatever the framework
did later.

## The same four revisions, read both ways

A real run, not a mock-up — `memoryPolicyLog` with four recordings and a fifth
that is a deployment restart:

```
what the fingerprints alone can say: changed
what recording the running policy at boot did: unchanged

what the log says:

  2026-09-18  sam@example.com  revision 1 → 2  [stricter]
            after the checkout incident
            · protectedPropKeys (stricter): added action, href
            · minimumConfidence (stricter): 0.7 became 0.85

  2026-09-29  ash@example.com  revision 2 → 3  [stricter]
            wired the registry in
            · registeredPrimitiveTypes (stricter): added loom.card, loom.page, loom.text (undeclared before)

  2026-10-06  sam@example.com  revision 3 → 4  [looser]
            rolled the registry declaration back
            · registeredPrimitiveTypes (looser): removed loom.card, loom.page, loom.text (undeclared now)

a judgment carrying the current fingerprint resolves to: ambiguous — revisions 2 and 4
```

The first line is the whole argument for the unit. The last line is the thing I
did not know when I started.

**There is no screenshot, because nothing on any surface changes in this
branch.** The transcript above is the artefact, and the four properties it shows
are each a decision taken below.

## The four decisions that are the substance

**1. The log stores whole policies, never diffs.** 0016's relationship applied to
the thing doing the judging rather than to the thing being judged: the log is the
truth and every description of a change is a view. A stored diff would be a
second copy of a fact the two policies already determine, and it could not answer
about a pair nobody anticipated — *what were the rules on the 3rd* becomes a fold
from the beginning rather than a read.

**2. An actor is required and the runtime never supplies one.** A log whose whole
point is *who did this* cannot have that field be optional, so the type has no way
to express a revision nobody can be named for. The one genuinely unattributable
case — judgments made before this log existed — is answered by the absence of a
revision rather than by an invented one, which is what `loom_revisions.answered_by`
does from the other side.

**3. Recording what is already current is not a revision.** A host builds its
policy at boot and `fixedPolicy` closes over it, so a deployment that recorded on
start would append one revision per process and the log would be a list of
restarts. That is the `unchanged` on the second line of the transcript.
**Idempotence is against the head and never against history**: the 6 October
rollback in the transcript is a decision somebody made at a time, and a log that
compared against the whole corpus would have swallowed it.

**4. A digest may name two revisions.** This is the thing the filing did not
anticipate and it falls straight out of 3. The rollback on the 6th restored the
policy of the 18th, so revisions 2 and 4 carry **one fingerprint** — correctly,
they are the same rules. A judgment carrying it ran under one of them and nothing
can say which. `judgedUnder` answers `ambiguous` with both rather than returning
the newest, which would have printed an actor and an instant that are wrong and
look authoritative.

### Which way each knob moves the Gate, and the two that are not obvious

`policyChangeOf` declares a direction per field in a mapped type over
`GatePolicy`, which is `policy-fingerprint.ts`'s guard rail reused: a field added
to the policy is a compile error here until somebody says which way it moves. Two
of the fourteen are not the obvious way round, and they are the reason the table
earns its existence rather than being a long way of writing a key comparison.

**`refusalFloor` raised is looser.** The floor is the level *at which* a change is
refused, so lifting it refuses less. Read as a bigger-number-is-stricter
threshold, it is backwards.

**`registeredPrimitiveTypes` arriving where it was empty is stricter**, which is
the opposite of the ordinary reading of a longer allowlist. `gatePolicySchema`
documents why and the schema comment is emphatic about it: an empty list is
*undeclared*, not a library of nothing. So a list arriving is a limit arriving
where there was no limit, and emptying it removes the check — which is why the
transcript's third and fourth rows read `stricter` and `looser` for an addition
and a removal respectively. Every edit *inside* a declared list reads the ordinary
way round.

**A rename has no direction and is skipped by the fold.** An edit that renamed a
policy and raised a threshold is `stricter`, not `mixed`. Counting the rename
would have hidden the one half that is knowable.

## Found while building

- **A hazard this repository had already written down, met from a new side.**
  `interactivity.ts` records that a primitive type named `constructor` or
  `toString` reads a function off `Object.prototype` instead of answering
  "absent". `interactiveTypes` and `autoApplyCeiling` are both host-keyed records,
  so the first draft of the comparison would have crashed on a policy the Gate
  judges perfectly well. Both lookups go through `Object.hasOwn` and there is a
  test that drives a policy keyed on `constructor` through the comparison in both
  directions.

- **`ceilingFor`'s own fallback had to be read, not assumed.** The Gate treats an
  absent `autoApplyCeiling` entry as `low`, so a host that writes `low` where
  there was no entry has changed nothing the Gate does. The comparison reads the
  fallback rather than the record, and a test asserts that writing it is not an
  edit — otherwise a policy file tidied up would have reported a rules change.

- **The Postgres implementation needs no transaction, and that is the composite
  primary key doing its job.** Two recorders racing at one head both compute
  `N + 1` and the database refuses the second; the loser is told the revision that
  is current *now* rather than the one it raced against. `loom_revisions` gets its
  ordering the same way and `store.ts` says so. A `SELECT … FOR UPDATE` could not
  have served here anyway — the first revision of a policy has no row to lock. The
  race is driven in a test rather than argued about.

- **A rule of this repository caught my prose, and it was right.** Three doc
  comments wove a record number into a sentence — *"which 0033 requires of an
  edit"* — and `documentation.test.ts` failed them. The maintainer's rule is that
  a record number never reaches a published page, so the only permitted shape is a
  liftable parenthetical. Rewritten, not worked around.

- **I regenerated the API reference before I rewrote those comments**, so the
  first full gate came back red on `extract.test.ts` for exactly that stale
  signature. Regenerated after, in the right order (`pnpm build` then
  `docs:api`), and the gate re-run from a deleted `dist` and `.next`.

- **Three things my own adversarial re-read of the diff found, after the first
  gate run had already started.** None was a test failure, which is the point:
  `judgedUnder` read every matching row and every distinct fingerprint
  **unbounded**, against the rule that every read in Loom is bounded — bounded
  now at `MAX_POLICY_REVISION_LIMIT` in both implementations, with the argument
  for why truncating is safe (two matches is `ambiguous` whether or not the list
  is complete) and a test that drives past it. The lost-race error reported
  `expected: 0` for a caller that passed no `expectedRevision`, which reads as
  *the caller believed the log was empty*; it now reports the head the call
  actually proceeded from. And the Postgres `record` needed a `let` to carry that
  head into the `catch`, which the house style forbids — so `newest` became total
  instead, which also narrowed each `try` to the one statement that can fail.

- **Two non-null assertions, which no other non-test module in `src/` uses.** The
  fold is now a reduce whose identity is `incomparable`, and `removalThresholds`
  folds its own pair through the same function rather than through a `Set` and an
  assertion. Found by grepping my own diff against the rest of the directory.

- **The gate-reading trap, caught by having followed the rule.** The harness
  reported the verify command's exit code as **0** while the file it wrote said
  `EXIT=1`, because the status of a compound line is the last command's and the
  last command was the `echo` into the file. This is the third instance of the
  mistake `docs/routines.md` records, and the remedy worked exactly as written:
  the status went into a file as the last thing on the line and was read in a
  separate command, so the notification and the file disagreed and the file won.

- **A planted defect was not caught, and the test was the weak one.** Removing
  the clamp from the paged read stayed green, because the contract suite's log
  holds twelve revisions and a ceiling of a hundred is invisible below it. The
  contract test now asserts a limit is *honoured* at all, and the ceiling is driven
  past in `policy-log.test.ts`, which records a hundred and one — a thing the
  contract suite cannot do, because it also runs against Postgres where that is a
  minute of test time. The bound added in review had the same hole and got the
  same treatment.

## This branch now carries two units, deliberately

#547 was opened last night with the specimen harness's `--against` flag and
record 0240 — renumbered to 0243 at merge, see that record's own note. `docs/routines.md` step 3 says that a lane with an open pull request
**pushes onto that branch** rather than opening a second one, so this unit is on
the same branch and the pull request body covers both. The two touch no file in
common except `FINDINGS.md`, `decisions/README.md` and the API reference, all
three of which that document already names as non-conflicts.

Saying it plainly because it makes the pull request bigger than one subject: the
alternative was a second open branch from one lane, which is the thing the rule
exists to prevent.

## The brief, for the third consecutive run

Not re-filed, because #547's own comment on this pull request asked yesterday
for it to be cut rather than reported a third time, and that ask is still open on
the same thread. Recorded here only so the gap between the brief and the work is
not a thing a reader has to reconstruct:

- **The brief still leads with the one-application migration as this lane's next
  unit.** It has been done since 19 August. `apps/loom` holds the four route
  groups, `apps/portal` and `apps/docs` are retired, sign-in is at the `(portal)`
  boundary, and the brief's claim that three routines are blocked on it is not
  true of any of them. So I went to the findings queue, which is what the
  procedure says to do once the plan is spent.

- **The brief says the demo is this lane's.** `docs/routines.md` gives
  `apps/loom/app/(demo)/` to `Loom demo`, which has an open pull request today
  (#545). Read literally, the governance rule that a brief beats that file puts
  two routines in one directory, which is the failure the lane split exists to
  prevent. **I left `(demo)` alone**, as yesterday's run did.

## Records

**Added:** 0241 — *a policy is a logged object, and what changed is a view over
the log*, `Accepted`, §2 → §5.

It supersedes nothing and contradicts no `Accepted` record. 0033 said the runtime
could not check that a name identifies content; the fingerprint checked it and
this explains it. 0200 is still `Proposed` and this does not resolve it — 0200
decides the portal may place the control, and this is the log the control writes
to.

**Numbering.** `main` at `bd0af3d` holds records to 0239. This branch's first
record is 0240 and #546 also claims 0240; this one is 0241 and #548 also claims
0241. Filed for `Loom merge` rather than resolved here.

**Resolved at merge, 8 October.** #546 landed first, so its 0240 keeps the
number and this branch's first record became **0243**. 0241 is unchanged: #548
is held back for review (its record is `Proposed`), so nothing on `main` claims
that number but this unit.

## Findings

**Closed:** the 27 September `Loom portal` entry, *a policy can be changed and
there is nowhere for that change to be recorded*.

**Filed:**

1. **For `Loom portal`** — the log exists and nothing writes to it, which is the
   half 0200 gives them. Four shape facts they would otherwise have to discover:
   `actor` has no default, `expectedRevision` is what a form wants,
   recording twice is `unchanged` rather than two edits, and `judgedUnder` can
   answer `ambiguous`, which a card rendering it as one revision would print
   wrongly and authoritatively.

2. **For `Loom merge`** — four open pull requests from four lanes claim the two
   record numbers either side of `main`'s head. Every one of them followed the
   rule correctly; the rule cannot prevent it, because all four read the same
   `main` before any had pushed.

A third arrived on this branch from outside this run, and it is about this
report: the evening run of this lane filed *nothing in the repository can see an
unsubstituted placeholder*, after finding two of them in the gate table above.
It is right, and the class is worse than the instance — a stale number reads as
a measurement where a placeholder at least looks wrong.

## Tests

`pnpm install && pnpm verify` — **green, exit 0**, from a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command.

| | base (`b4592c7`) | this branch |
| --- | --- | --- |
| package (`src/`, `tools/`) | 189 files / 4,154 | 193 files / **4,271** |
| application (`apps/loom`) | 407 / 7,221 | 407 / **7,221** |
| findings ledger | 1,056 | **1,059**, 0 malformed |
| prerender | — | **126 pages, 1,586 text junctions, 0 run together; 3 metadata conventions, 0 unserved** |

> **Two cells of this table shipped as unsubstituted placeholders** — `PACKAGE_BASE`
> and `PRERENDER` — and were filled on 8 October by the evening run of this same
> lane, which was woken by a pull request event and read the table. Neither number
> is inferred. The base is first-hand: that run took `b4592c7`'s own gate the
> night before and `189 files / 4,154` is what it printed. The prerender row is
> `pnpm prerender:check` re-run against the `.next` this branch's gate had already
> built — exit 0, and the line above is its output verbatim. The rest of the table
> is this report's own and is untouched. Filed as a finding, because a gate table
> is the one part of a report that is read as measured fact, and nothing in the
> repository would have caught a number that was never substituted.

> **The package cell has since moved, 8 October, by this run**, which is the one
> sentence the note above can no longer claim. It read **4,270** when that run
> filled the other two cells, and the tree it described is not the tree this
> branch ships: reviewing my own diff afterwards found two unbounded reads in
> `judgedUnder`, and the test that drives past the bound they gained is the 4,271st.
> Every figure in the table is from one `pnpm verify` on the final tree, from a
> deleted `dist` and `.next` — **exit 0**, read out of the file the status was
> written to rather than from the harness, which is the other half of this
> morning's gate-reading note below.
>
> The correction is recorded rather than applied silently, for the reason that
> run's own note gives: another run's committed numbers must never change
> without a line saying who changed them and why. It was right about both cells
> and right about the class.

**+117 tests in four new files**, none of them weakened, skipped or deleted, and
no existing test rewritten. The four files were run on their own and hold exactly
that, which is how the base figure above is arrived at as well as quoted — it is
also what the gate on this branch's previous commit reported for `b4592c7` last
night, and the two agree. Three doc comments changed wording and one count of
exports in the generated reference moved; no assertion anywhere was relaxed.

The application total is unchanged because this branch does not open a route
group. The one application file that moved is
`app/(docs)/_lib/api/reference.generated.json`, regenerated with the command its
own failure message names — the diff is the new exports, and `docs/routines.md`
already names that file as one every lane writes to.

**Eighteen planted defects, eighteen red**, and two of the eighteen were green
on the first pass. Both are recorded here rather than quietly fixed, because in
both cases the defect was real and the *test* was the weak thing.

| | defect | caught by |
| --- | --- | --- |
| 1 | a field with no order poisoning the edit's direction | 3 tests |
| 2 | a registered list arriving read the ordinary way round | 1 |
| 3 | the refusal floor's direction inverted | 1 |
| 4 | an absent ceiling read as something other than `low` | 1 |
| 5 | an interactive type read off `Object.prototype` | 1 |
| 6 | `mixed` collapsed to one side | 3 |
| 7 | a set compared without sorting or deduplicating | 2 |
| 8 | `unchanged` compared against the whole history, losing a revert | 3 |
| 9 | a rename swallowed as `unchanged` | 1 |
| 10 | the staleness check dropped | 2 |
| 11 | ambiguity resolved to the newest match | 1 |
| 12 | a history folded across a gap | 1 |
| 13 | the fingerprint accepted from a caller rather than computed | 2 |
| 14 | a read reaching into another policy's revisions | 1 |
| 15 | a page handed back descending | 2 |
| 16 | the paged limit not clamped | **green at first** — now 1 |
| 17 | a history not sorted before folding | 1 |
| 18 | the ambiguous match list unbounded | **green at first** — now 1 |

Rows 8, 11, 16 and 18 are the four that work on the happy path and lie quietly.

**Row 1 is worth a sentence on its own, because the first plant for it was
wrong.** I replaced the fold's skip of an unordered field with a no-op and the
suite stayed green — correctly, as it turned out: `incomparable` is the identity
of that fold in *both* directions, so dropping the skip changes nothing. The
defect the row is actually about is an unordered field **poisoning** the fold, and
planted that way it takes three tests down. A plant that is not the defect is a
green row that proves nothing, which is the failure mode of a defect matrix.

## Open questions

**Nothing blocking.** Three worth an answer when somebody has one.

**Should recording be wired into anything at all?** Nothing in the runtime calls
`record`, because nothing in the runtime edits a policy — the writer is the portal
control 0200 authorises. That is the right division and it does mean the seam
ships with no caller inside this repository, which is a shape I would normally
file against myself. The contract suite and both implementations are what stand in
for a caller.

**Is `direction` the framework's judgement to make?** Fourteen fields, each
declared as moving the Gate one way. Eleven are uncontroversial arithmetic; the
two described above are genuinely interesting; and `policyId` has no direction at
all. If a surface disagrees with one of the fourteen, the mapped type is the one
place to change it — but it is a judgement encoded in `src/`, not a measurement,
and it is worth somebody else's eye.

**An `at` anchor on the paged read** was declined as unearned rather than
rejected. A tree log has thousands of entries and sends a reader to one, which is
what an inclusive anchor is for; a policy has tens, so a screen pages from an end.
It is additive the day a screen needs it, and `judgedUnder` already hands back a
revision number that such an anchor would take.
