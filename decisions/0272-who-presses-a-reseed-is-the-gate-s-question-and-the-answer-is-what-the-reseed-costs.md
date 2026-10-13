# 0272 — Who presses a reseed is the Gate's question, and the answer is what the reseed costs

**Status:** Accepted
**Date:** 2026-10-13
**Section:** §2 (the store), §4 (the Gate), §6 (the log)

> **Why this number.** `0269` is the highest record on `main` at `1b66070`. Two
> open branches — `#613` and `#614` — both add a `0270`, which is a clash between
> those two rather than with this one, so the next number certainly free is
> `0272`, leaving `0271` for whichever of them renumbers.
>
> **Why `Accepted` rather than `Proposed`.** It contradicts no `Accepted` record,
> extends no schema and migrates no built code. It adds one function to `src/write/`
> and changes nothing a deployment already has: `TreeStore` is untouched, seeding
> stays create-if-absent, and a host that never calls `reseedPage` is where it was.

## Context

[0268](0268-a-page-is-put-back-by-proposing-the-change-that-puts-it-back-and-a-store-never-deletes.md)
decided that a page is put back by proposing the change that puts it back, and
built `planReseed` to produce that change. It deliberately stopped there:
nothing proposed the operations, and `TreeStore` gained nothing.

`Loom marketing` filed the consequence the same day, and filed it as a cost
rather than as a gap, which is the version that says who is blocked:

> **Merging a marketing pull request no longer changes the marketing site.**

Every page that surface serves is already a row on any deployment that has been
visited once. `idFor` reads the id off the builder, so an edited builder looks
for the same `t_home1` it looked for yesterday, finds it, and leaves it alone.

The entry asked for exactly one decision beyond the operation — **who presses
it** — and set out three answers it could live with:

1. only a person may, so a marketing change reaches readers when the maintainer
   says so, which is a new step in a release;
2. it runs on deploy, so the authored page wins by default and a portal edit
   survives only until the next release;
3. the portal offers *put this page back to the version in the repository* on
   the page's own screen, beside its history — which that lane preferred,
   because it is the product's own shape rather than a deployment step.

Each of those is a switch somebody sets, and each is wrong for some page: (1)
makes a maintainer approve a reseed of a page nobody has ever opened, (2)
silently discards an editor's work, and (3) is right but reaches only the pages
somebody thinks to visit.

## Decision

**A reseed is proposed through the one write path, declaring what it would
overwrite, and the Gate decides whether a person has to press it.** There is no
fourth switch, and none of the three answers above is built.

`reseedPage(path, request)` in `src/write/reseed.ts` reads head, plans the
reseed, reads the log for what the reseed would write over, and commits the
proposal — the same seven steps `revertRevision` takes. Two pieces make the
declaration real:

- **`reseedDiscards(reader, { treeId, operations })`** in `src/store/reseed.ts`
  walks the log and returns the entries that touched any node the reseed names.
  It is keyed on the reseed's **operations** rather than on the plan's `revives`
  and `retires`, because the commonest reseed there is — one edited value —
  names neither, and a declaration built from those two lists would have been
  empty for it.
- **[0035](0035-discarded-work-is-a-stake-and-only-the-runtime-declares-it.md)
  already decided the rest.** Discarded work is a *rule* in the Gate rather than
  a level, because ceilings are per origin and the thing that must not happen —
  work discarded with nobody in the loop — does not depend on who asked.

So the behaviour falls out rather than being chosen:

| the stored page | what it declares | what happens |
| --- | --- | --- |
| nobody has edited it since it was seeded | nothing | the reseed applies |
| somebody accepted an edit through the portal | those revisions | **held** for a person, who is shown what it would overwrite |

**The caller does not choose the safety; the cost of the particular reseed
does.** A deploy step may call this on every release and cannot quietly discard
an editor's change. A portal button may call it and does not have to re-ask
about a page nobody has touched. Answer (3) remains the one `Loom portal` should
build, and it is now a button over a function rather than a decision.

Three consequences of shape, recorded because each was a fork:

- **`already-authored` is its own outcome**, not an obstacle. A reseed is
  pressed twice — by a person who cannot see whether the first took, and by a
  deploy on every release — so *the page is already right* is the healthy answer,
  and a caller that could not tell it from *the page cannot be put back* would
  report a success as a failure on every release after the first.
- **`undoes` is absent** on a reseed's provenance. It names the one revision a
  change restores; a reseed restores none, carrying the page to a tree that was
  never in the log. The revisions it writes over live in `discards`, where they
  are true.
- **A failed log read stops the reseed.** Proposing one with an empty
  declaration would tell the Gate the log was clean, and 0035 is explicit that
  absence means *nobody looked*.

## Consequences

`TreeStore` is still `create`, `head`, `revisions`, `list` and `append`. Seeding
is still create-if-absent. Nothing migrates, and a deployment that never calls
`reseedPage` behaves exactly as it did.

What changes for the lanes: **a marketing change can reach readers again**, by
whatever surface calls this. `Loom portal` owns where the button goes.

This also closed a defect that had nothing to do with reseeds and was found by
building their path beside the revert one. `revertRevision` assembled its
composition runtime as an object literal naming five fields;
`propsVocabulary` and `bindingReader` were added to `CompositionRuntime`
afterwards ([0179](0179-what-a-primitive-accepts-is-a-vocabulary-the-write-path-is-handed-not-a-field-on-a-policy.md),
[0208](0208-a-question-nothing-reads-is-refused-before-it-is-written.md)), and a literal
does not fail to compile when the type it returns grows — it silently stops
passing the new field. So **every undo in this repository was judged as though
the host had wired neither check**, and recorded `wiredChecks: []` saying so.
That second half is the worse one:
[0248](0248-which-optional-checks-were-in-place-is-named-on-the-judgment-beside-the-rules-that-were-consulted.md)
exists because the policy fingerprint cannot see a seam, so a record claiming a
wired check was not wired is worse than no record — a later reading cannot tell
it from the truth.

`computedChangeRuntime` in `src/write/computed.ts` is now the one place both
computed changes get their runtime. It removes `repairer` by name and carries
everything else by rest element, so the omission stays a statement while a
seventh seam reaches the Gate on the day it lands. Repair
([0006](0006-one-repair-attempt-and-both-halves-recorded.md)) is
dropped for the reason the revert path always gave: there is no smaller version
of putting something back.

## Alternatives considered

**Make seeding overwrite.** Rejected, and it is the one the finding itself ruled
out: it hands every deploy the power to silently discard a governed page, which
is the trade 0259 took deliberately.

**Build answer (1) — a reseed only a person may press.** Rejected. It is a true
statement about the dangerous case made into a rule for every case, so it makes a
maintainer approve the reseed of a page nobody has opened. The Gate already
distinguishes the two, and a switch in front of it would override a judgment with
a blanket.

**Build answer (2) — reseed on deploy.** Rejected on its own: it is answer (1)'s
opposite error, and discards an editor's accepted work with nobody asked. It is
*not* rejected as a caller — a deploy step calling `reseedPage` is now safe,
because the hold stops exactly the case that made this unacceptable as a policy.

**A `force` or `allowDiscards` flag on `ReseedRequest`.** Rejected, and this was
the closest call. It would let a deploy skip the hold for pages it believes
nobody edited. But the belief is the thing the log already knows, and a flag that
a caller sets from outside the log is a way of being wrong about it — the first
caller that passed it for convenience would be the silent-overwrite answer
wearing a parameter name. A caller that genuinely wants the reseed answers the
hold.

**Declare the discards from the plan's `revives` and `retires`.** Rejected on
measurement rather than taste: a reseed that only reconfigures a changed value
names neither, so the declaration would have been empty for the commonest reseed
and the Gate would have applied it over an editor's change. The test that holds
this is `declares work for a reseed that revives and retires nothing`.

**Fix `revertRevision`'s dropped seams in place and leave the two literals
separate.** Rejected. The bug was not that somebody wrote the wrong five fields;
it was that a literal cannot notice a sixth. Fixing it in place would have left
the same trap for the reseed path and for the third computed change.

## Open questions

**What a reseed should do when a page has drifted so far that the reseed
discards most of its history.** Today it is one hold with a list of revisions on
it, and a reviewer answering it has to read that list. Whether there is a point
at which the honest answer is to refuse rather than to ask is a policy question
and nothing here depends on it.

**Whether a surface should be able to ask for the reseed's cost without
proposing it** — the *this page has drifted, and putting it back would overwrite
three changes* a screen would show before offering the button. `planReseed` and
`reseedDiscards` are both exported and a caller can compose them, so this is a
convenience rather than a gap, and it belongs to whoever builds the screen.
