# 2026-08-02 (day 25) — is the log still the truth?

**Build order section:** §5 — the Portal. Reaches into §1 (a comparison of two
trees) and rests on the store's replay module.

**Branch:** `day-25-snapshot-audit`, off `main` at `11e3793`

---

## Where this run started

No open PR. #32 (`/primitives`) and #33 (guarding it) both merged overnight, and
neither carries a maintainer comment — only Vercel's deploy bot. **There was no
review feedback to act on**, so this run continued the build order.

One gap to record plainly: **the previous run left no report.** #32 and #33
landed on `main` with a screenshot (`2026-08-02-day-20-primitives.png`) and no
`.md` beside it, so what those two PRs decided is only in their commit messages
and in the code. Nothing was lost that this run needed — the day 22 and day 23
reports still name the queue — but it is the first missing entry in the trail.

Day 22's third recommendation, approved by the maintainer along with the other
two, was an on-demand `/audit` page. Day 23's first recommendation was
`answeredBy` on the stored revision. This run took the audit page and
**escalated the other rather than building it** — see below.

---

## What was built

**A page that checks whether the log still produces the tree being served.**

0016 made the log the truth and the snapshot a materialised view of it. That has
been a claim. `auditSnapshot` is the only thing that can test it — fold the whole
log from the tree's original shape and compare — and it had never run outside a
unit test since the day the store was built.

- **`/audit`** lists the trees that can be audited, and the ones that cannot,
  with the reason. Naming a tree runs the fold.
- **A verdict, in three states.** *Agrees*: the log reproduces the snapshot
  exactly. *Diverged*: it does not, and here is every node that disagrees.
  *Unreplayable*: the fold stopped, so there is no second answer to compare —
  deliberately worded as worse than divergence, not milder.
- **`compareTrees` (§1)** turns two trees into a list of differences: a node in
  the snapshot the log does not produce, a node the log produces that the
  snapshot lacks, or a node both have that differs — in kind, primitive, props,
  text, parent, or sibling position. Joined on node id, so a moved card is one
  changed node rather than a subtree reported missing and an identical subtree
  reported added.
- **`SnapshotAudit`'s `diverged` case now carries the stored tree too**, not only
  the replayed one. The audit read the snapshot to reach its verdict; a caller
  that had to read it again to find out *how* the two differ could describe a
  divergence that was never the one observed.
- **The nav's fourth entry is back.** It has pointed at nothing since day 10 and
  came out on day 24; the page now exists, so the claim is true again.

Recorded as **0028**.

---

## What it refuses to do, and why that is the interesting part

Folding needs a starting point, and the store holds neither. The snapshot is the
current tree; the log is every delta *after* revision 0. So the seed is a
parameter — and a host that cannot reproduce a tree's original shape cannot audit
it.

The tempting shortcut is to fold from the snapshot when no seed is known. It
would make every tree auditable and every audit pass, because it compares the
tree with itself. A green tick that cannot fail is worse than no audit at all, so
`/audit` lists such a tree as unauditable and says why.

For the same reason it lists them rather than hiding them. A page showing only
the trees it could check looks exactly like a page reporting that everything is
fine.

This portal seeds one tree, deterministically, from a builder in source, and
`seedFor` re-derives it rather than reading a copy back. That is what makes it
evidence: a stored seed that had been overwritten would make the audit agree.

---

## Decisions I made that weren't specified

1. **The comparison lives in the runtime, not the portal.** The scheduled job
   that should eventually run this needs the same explanation, and so does any
   host with its own review UI. Fixing "diverged is not actionable" for one
   consumer would have left it broken for the rest.

2. **`compareTrees` produces a description, never a delta.** It was tempting to
   emit operations that reconcile the two, since the machinery exists. Rejected
   firmly: a second shape that describes change gets applied by somebody
   eventually, and the log gains entries no proposal produced. 0028 records the
   reasoning.

3. **A props bag that differs only in key order is a difference.** Props are
   rewritten wholesale (0009), so two orderings came from two different writes.
   Calling them equal would hide one of them.

4. **A mistyped tree id is a 404, not a considered refusal.** The seed lookup
   answers first and would have reported every unknown id as "this deployment
   cannot reproduce its seed", which is true and misleading. An unknown seed now
   costs one `head` read to tell a wrong URL apart from an unauditable tree — the
   fix came out of probing the running page, not out of a test.

5. **A store outage is not a 404 either.** Only `not-found` sends the page to
   `notFound()`; anything else renders `describeStoreError`, so a database
   problem cannot be read as a tree that does not exist.

6. **The audit runs on demand and never on page load.** The fold is unbounded in
   the length of the log, which is the exact cost 0016 introduced the snapshot to
   keep off a request path. The tree is named in the URL, so an audit is a link
   that can be sent to somebody.

7. **The verdict borrows the portal's existing outcome palette** rather than
   introducing a second one. `unreplayable` maps to `uninterpreted` and not
   `rejected`, which is the same distinction the activity view already draws
   between an answer nobody liked and no answer at all.

8. **The difference list is capped at 25 and says how many it did not show.** A
   drifted tree can differ at every node. Truncating silently would read as a
   short list of problems rather than the start of a long one.

9. **The nav test's known-bad route changed from `/audit` to `/nowhere`.** It
   guards the guard — a broken href must be detectable as broken — and `/audit`
   stopped being an example of one.

---

## The escalation: `answeredBy` on the stored revision

**ARCHITECTURAL — needs review. Not built. Nothing depends on the answer.**

Day 23's first recommendation was to record who approved a held change on the
revision itself, so the log alone can answer "who allowed this". 0027 decided the
opposite — the approval lands in the journal — and named this as the leading
alternative it rejected *on scope*, adding that it "should be the first thing
reconsidered if anything ever depends on the log without the journal."

`/audit` is the first thing that reads the log without the journal. The condition
0027 named is met.

Building it would contradict a sentence in an Accepted record, which is an
escalation and not a refactor, so it is written up as **0029 with status
`Proposed`** and left there. 0027 stands, unedited. The rest of this run does not
depend on the answer.

**My recommendation is to accept it**, for the reason 0027 half-conceded: the log
and the journal have different durability stories, and putting an accountability
fact only in the observability store means that retention policy, when it
arrives, will silently become a policy about how long approvals are remembered.

---

## Decision records

| #    | Title                                                          | Status                        |
| ---- | -------------------------------------------------------------- | ----------------------------- |
| 0028 | A tree is auditable only if its host can reproduce the seed      | Accepted                      |
| 0029 | The approval belongs on the revision, not only in the journal    | **Proposed — needs review**   |

Nothing superseded. 0028 constrains hosts rather than the tree schema or the
delta model, and contradicts no Accepted record — it is what `replay.ts` already
implied, written down and enforced by a page.

---

## Test coverage / status

```
@loom/runtime   64 files, 656 tests   green   (was 63 / 640)
@loom/portal    17 files, 128 tests   green + build   (was 14 / 105)
```

`pnpm verify` green across the workspace, offline, with no database and no API
key present. Nothing skipped, nothing weakened, no test disabled.

The 16 new runtime tests are 15 on `compareTrees` — identical trees, a revision
counter that must be ignored, a subtree missing, a subtree extra, each of the six
facets on its own, a props bag reordered without a value changing, a move
reported once rather than twice, a re-parent, several facets at once in a fixed
order, ordering across both trees, and the effect of a real delta rather than a
hand-built fixture — plus one on `auditSnapshot` reporting both of the trees it
compared.

The 23 new portal tests are three files:

- **`audit-view.test.ts` (13)** — the three verdicts and their wording, singular
  and plural change counts, a tree at revision 0, the cap and its omitted count,
  a divergence with nothing in it, and every difference and facet phrase.
- **`audit.test.ts` (5)** — the read path joined up: a freshly seeded tree agrees;
  it still agrees after a change has been accepted; the *registered* seed still
  matches what was stored (a seed builder edited carelessly would make every
  audit report drift, and blame the log for a change in source); a seed that does
  not match the log stops the fold rather than guessing; and a staged divergence
  names the drifted node.
- **`seeds.test.ts` (5)** — the seed is known, is at revision 0, is the same
  object every time, and is not invented for a tree this host never created.

**Verified against the running portal**, not only in tests: unauthenticated
`/audit` → 307 to `/sign-in?from=%2Faudit`; signed in, the chooser lists
`t_seed1` as auditable; `/audit?tree=t_seed1` renders *agrees* over 0 accepted
changes; an unknown tree id and a malformed one both 404. The 404-for-unknown was
a bug this probe found — see decision 4 above.

**No screenshots this run**, and two things went unverified by eye. The probe
above reads the served HTML rather than a rendered page, because this session's
container had no working browser automation — the runtime and the layout are
unchanged, so the risk is a styling mistake rather than a wrong answer, but it is
worth saying rather than implying a screenshot was taken and looked fine. And
nothing rendered against the live model, because no `ANTHROPIC_API_KEY` was
present in this session's environment; the interpreter is untouched by this run
and degrades honestly without a key, so nothing here depends on it. Between them
that means the *diverged* and *unreplayable* panels have been exercised by tests
and not by eye.

---

## Open questions for the next session

1. **0029 needs a decision** (above). **Recommend accepting**; it is a nullable
   column, a `StoredRevision` field and both store implementations. Nothing
   outside this repo implements `TreeStore` yet, which is the reason to do it now
   if it is going to be done.

2. **Nothing schedules the audit.** The page is the precondition for a job, not a
   substitute: a drift appearing at 3am is still found by the next person who
   looks. **Recommend** it after 0029 is settled — and note that a scheduled
   audit needs somewhere to put its result, which is either the journal (0023) or
   a new thing, and that is worth deciding before writing the cron.

3. **Only one tree in this deployment is auditable at all**, because only one has
   a reproducible seed. That is honest today and does not scale: any host that
   creates trees from user input gets a portal where nothing can be checked.
   0028's alternative — keeping revision 0 in the store — is the fix, and it is a
   schema change. **No action recommended yet**; it should follow 0029 rather than
   compete with it, since both touch the same contract.

4. **`loom_telemetry` still needs `db:push` and RLS before the next deploy**, and
   nothing has read a *stored* log or journal yet. (Carried from day 20, still
   not done, and now slightly more pointed: `/audit` against the deployed
   Postgres store would be the first real read of a stored log end to end.)

5. **The deployment's two identity variables** must be set or it will correctly
   admit nobody. (Carried from day 23.)

6. **No retention policy**, **the compile step**, **the schema at 3381 of a 3500
   guard**, and **node-level provenance** — all carried, all unchanged by this
   run.
