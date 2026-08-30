# 2026-08-30 — "What a checkup actually proves"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-17-what-a-checkup-proves` (→ `main`).

Visuals — the real screen, from a production build of this commit, in a
signed-in browser:

| | |
| --- | --- |
| [A page with a history, and half its original shape gone](2026-08-30-portal-what-a-checkup-proves.png) | 1280px |
| [the same screen with every disclosure opened](2026-08-30-portal-what-a-checkup-proves-open.png) | 1280px |
| [a fresh deployment, which is what a new reader meets first](2026-08-30-portal-what-a-checkup-proves-fresh.png) | 1280px |
| [a phone](2026-08-30-portal-what-a-checkup-proves-phone.png) | 390px |

**How honest these are, stated plainly.** The screen, the store, the audit, the
fold and the components are all real. The **fresh** screenshot is the unmodified
page against an unmodified store. The other three show a tree at revision 2, and
those two revisions were **appended through the store's own `append` contract by
a temporary, uncommitted patch to `ensureSeeded`** — one `configure`, one
`remove` — not composed by a model: there is no `ANTHROPIC_API_KEY` in this
run's environment, so the prompt box cannot produce a change. The patch was
reverted before committing and `store.ts` is untouched in this diff. Filed, for
the sixth run.

---

## What was asked

**No maintainer comment is open on any portal pull request.** I read the
comments on all four open portal PRs — #169, #177, #185, #193 — and every
comment on them is either Vercel's bot or this lane's own. So nothing outranked
the queue.

The findings queue did. `Loom lessons` filed a defect against this lane on 25
August, with an executed counterexample rather than an argument, and it had been
open for five days. It is the one open finding owned by this lane that is a
**correctness** problem rather than a preference, so it went first.

## What shipped

### The screen was making a claim the runtime cannot support

`/portal/checkup` answers *"Does this page add up?"*. On a clean fold it said:

> **Everything on this page adds up.**
> Loom replayed every change it has recorded for this page and got back exactly
> the page people are being served, **so nothing on it is unexplained.**

That last clause is false, and the counterexample is nine lines:

1. Create a tree; append a delta removing the footer.
2. Audit it against a seed that is **wrong** — one text node differs from the
   real revision 0. Outcome `diverged`, naming that node. Correct.
3. Append a second delta removing the header, which is where that node lived.
4. Audit again, against the same wrong seed. Outcome **`agrees`**.

Nothing was fixed between steps 2 and 4. The seed is exactly as wrong as it was;
the revision that exposed it deleted the evidence. **An audit compares two end
states, never two histories** — which is precisely what `auditSnapshot` claims
to do (0016, 0028) and precisely what the plain layer had generalised past.

### What replaced it, and why it is more than a wording fix

The sentence now names its own assumption in eight words:

> Loom replayed every change it has recorded for this page, **starting from the
> shape it has on file for the day the page was made**, and got back exactly the
> page people are being served.

That closes the finding. It would also have been the cheap answer, and a caveat
nobody reads is worth very little. So the limit is a **number** instead:

> **5 parts of the 10 this page started with have been removed since. Those are
> the parts this check cannot vouch for: removing something takes away the only
> thing there was to compare it against.**

`_lib/seed-coverage.ts` computes it. A node the seed contained and the served
tree does not was removed on the way, and the fold compared it against nothing —
so an `agrees` verdict is exactly as strong as the part of the seed that
survived. Node ids are the join key, which is what makes it countable rather
than a structural guess (0003): with the seed as the base, `compareTrees`
reports `missing` for precisely "the page started with this and no longer has
it".

Shown **only under `agrees`**. A diverged verdict already names what disagrees
and an unreplayable one compared nothing at all; a coverage figure beside either
would be a precision reading on an answer that does not exist.

### And the mechanism, one click down

*What a checkup cannot tell you* — an end-state comparison, why a wrong starting
shape plus a later removal leaves nothing to disagree, and the sentence that
makes it concrete on this deployment rather than hypothetical:

> `seedFor` rebuilds the starting shape **from source** rather than reading a
> stored copy, so editing `seed.ts` after a page already exists changes what a
> checkup starts from without changing the page. With a database attached, that
> is a checkup whose starting point drifted and whose verdict never said so.

That is not a thought experiment. It is what happens the first time somebody
edits the seed builder against a Postgres deployment, and nothing anywhere would
have told them.

### What got renamed or moved

| Was | Is |
| --- | --- |
| `…and got back exactly the page people are being served, so nothing on it is unexplained.` | `…starting from the shape it has on file for the day the page was made, and got back exactly the page people are being served.` |
| (nothing) | `5 parts of the 10 this page started with have been removed since. Those are the parts this check cannot vouch for…` |
| (nothing) | *What a checkup cannot tell you* — the end-state argument, the `seed.ts` drift case, and 0016/0028 as the reason it is not a defect |
| `Loom replayed every change it has recorded…` **at revision 0** | `Nothing has ever been changed on this page, so there was nothing to replay. Loom compared the page people are being served straight against the shape it has on file for the day it was made, and the two are identical.` |

**Nothing was removed.** `describeAudit`'s three sentences — the tone word, the
headline, *"Folding 2 accepted changes from the seed reproduces the snapshot
exactly"* — are all still on the screen, in the same disclosure, unaltered. The
second screenshot is the proof.

## Two defects the screenshots found and thirty-six assertions did not

Consistent with every run since 20 August, and the reason this lane builds a
production server every time.

**1. The limit was on the surface and the eye still skipped it.** The coverage
sentence shipped as an unweighted grey paragraph directly under a green box
reading **"Nothing to do."** Every assertion passed — including one that checked
the sentence was *not* behind a disclosure. It was not behind a disclosure. It
was still invisible, because a green panel above plain grey text reads as
reassurance with a footnote.

The instructive part is the gap between the two properties. What I asserted was
*"it is not behind a click"*. What I wanted was *"a reader cannot take the
verdict without meeting its limit"*. Only the first is checkable by a test. It
is inside a `notice` block now — the tone whose own documentation says *"a
condition worth knowing that is not a failure"*, which is exactly what this is.

**2. A fresh deployment was told work had been done that had not.** At revision
0 the verdict read *"Loom replayed every change it has recorded for this page"*
directly above the runtime's own *"Folding **0** accepted changes"*. Revision 0
is the state every new reader meets first, so it is the worst place in the
portal to describe work that did not happen — and it is the same family of
overclaim as the one this unit exists to fix, found by looking at the screen
rather than by any failing test. `AuditReport` carries the revision now, so the
reading can tell a page that has been changed from one that has not.

**Twelve across seven runs.** The recommendation about two screenshot widths in
`docs/routines.md` stands, filed, and not restated further — it is the
maintainer's call.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

**Yes**, from the first screenshot, unaided: *This page still matches its own
record, so nothing is wrong and there is nothing for me to do. But the page has
lost five of the ten pieces it started with, and Loom is telling me it cannot
promise anything about those five — once something is gone there is nothing left
to check it against.*

Where it stops, correctly: `t_seed1` — a name.

The second, harder version: could they say what the check *cannot* prove? From
one click, yes, and that is new. Before this run the screen did not know.

## What this tells a developer that they could not get elsewhere

**How much of a green tick is actually green.**

Every other tool in this space gives you a pass or a fail. Loom can say what its
pass is made of — and, uniquely, what it is *not* made of, because the seed is
not in the log. A repository has both sides of every change for free, so "does
the code match its history" is not a question git has to be asked. Loom's delta
model deliberately keeps only the forward side (0016), and the starting shape is
a parameter the store never holds (0028) — so **how much of the original page
the check could still see is a fact that exists nowhere except by computing it
here.**

Off the third screenshot: *five of ten parts checked, five unvouchable* — a
number that is in no commit, no build output, no log, and no other tool's audit
report. And the honest inverse, which is the part I think is worth the most: a
green verdict that tells you where it stops being evidence is worth more than a
green verdict that does not, and almost nothing ships the second one.

The honest weakness, unchanged: on a fresh deployment coverage is 10 of 10 and
the number is trivially reassuring. It earns its place the day a page has a
history, which is the day somebody would open this screen.

## Tests

`pnpm install && pnpm verify` **green** — typecheck, both suites, and
`next build` across all five route groups. Nothing weakened, nothing skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 111 | 1741 (untouched by this diff) |
| `@loom/app` | 135 | 1986 |

**23 net new tests**, in three files, one of them new. Each count measured
against `origin/main`:

- `_lib/seed-coverage.test.ts` — **12, new file.** Every shape of coverage, the
  reading asserted whole in singular and plural, the property that no runtime
  word reaches it, and **the finding's counterexample executed** — a seed part
  a later removal put out of the checkup's reach.
- `_lib/audit-view.test.ts` — **5 new (37 → 42).** The overclaim asserted as an
  *absence*, the starting shape named in a person's words, the revision-0
  wording, and the revision carried onto the report.
- `checkup/_components/checkup-verdict.test.tsx` — **6 new (11 → 17).** The
  number on the surface rather than behind a click, the whole-shape reading, the
  caveat present only where something was compared, and coverage omitted rather
  than guessed.

The ones that earn their place are the two **absence** assertions. "Nothing on
it is unexplained" was warm, readable and false; the only thing that stops it
returning is a test that fails when it comes back.

## What I did not do

- **`src/` is untouched**, and nothing was wanted from it. `compareTrees`,
  `outlineTree` and `SnapshotAudit` are all public, and the last of them
  carrying `revision` on both replayable outcomes is what made the second defect
  fixable from this lane at all.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an Accepted record. What a portal screen may claim is a portal decision —
  and this unit *narrows* a claim rather than making one.
- **No cross-lane edit except one**: `FACTS.decisions` 94 → 95 in
  `app/(marketing)/_lib/copy.ts`, because `main` was red and that is the merge
  gate for five route groups. It is in its own commit so it can be dropped. This
  is the fourth consecutive portal run to carry it.
- **I did not touch `/portal/pieces`, `/portal/sign-ins`, the page strip or the
  hold store**, all of which are in unmerged portal PRs. This unit was chosen
  partly so it would not conflict with them, which is a worse basis for choosing
  work than the plan and is filed as such.
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **Merge something.** Thirty-three open across seven lanes, nothing since 25
   August, and the gap is growing by roughly eight a day. Filed with the
   arithmetic; not restated further.
2. **The absence-test habit is worth spreading**, not as a shared check — the
   failure is semantic and a word list cannot see it — but as a line in the
   briefs of the four lanes currently rewriting technical prose into plain
   prose. **My recommendation: a sentence in `docs/routines.md`**, which a
   routine cannot write for itself.
3. **`LOOM_SEED_LOG` is six runs overdue** and would end the temporary-patch
   workaround this report has now described twice.
4. **Nothing blocking.**
