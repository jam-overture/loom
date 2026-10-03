# The reason travels with the judgment

**Date:** 2026-10-03 · **Routine:** `Loom daily build` (framework)
**Section:** §2 — Composition Runtime, with one field in §6
**Branch:** `framework-the-reason-travels-with-the-judgment` · **PR:** #501

## What was completed

`Loom portal` filed three findings on 3 October, all owned by this lane, all
about the same thing: the Gate has always computed *why* a change cannot be
undone, and the screen that has to ask somebody about it was the one place in
the repository where that reason existed and could not be read as data. Two of
the three are closed here. The third is narrowed, answered as a question, and
deliberately not built.

**The problem, concretely.** `assessReversibility` produces a two-member union
whose members ask opposite things of the reader. `out-of-tree-effect` means the
page is recoverable and reality is not — go and look at the part that takes the
payment. `retention-budget-exceeded` means reality is fine and the page is not —
decide whether the content is worth keeping. A `HeldProposal` carries a
`Disposition` and nothing else about the assessment, and `confirmIrreversible`
had already flattened the codes into a sentence on the way there. So the review
queue could render **Apply this change** / **No thanks** beside *"This one can't
be undone afterwards."* and had nothing more to say.

**Two fields, and the shape moved to a leaf module.**

- `Disposition.irreversibilityReasons?: readonly IrreversibilityReason[]`,
  stamped by `gate`'s `decide` from the assessment it already held. Optional and
  never defaulted (0045), and **omitted rather than empty** when nothing fired,
  with `reversible` disambiguating the absence.
- `AssessmentSummary.outOfTreeEffectTypes?: readonly PrimitiveType[]`, so the
  journal keeps *which* parts reach outside the page and not only that some do.
- `runtime/irreversibility.ts`, a leaf holding the reason's shape and its schema,
  so `disposition.ts` can validate a stored judgment without pulling the tree
  engine in behind it. `IrreversibilityReason` is still published from
  `reversibility.ts`, where it always was.

It is stamped on **every** disposition rather than only the one
`confirmIrreversible` produced. Which rung won the ladder and whether a change
reached outside the page are separate facts — a change can be held for
discarding later work *and* be irreversible — and a reader inferring the second
from `reason.code` would conclude a charge was fine to undo.

## The record, side by side

Real output, from `src/testing/` fixtures under a policy declaring `loom.card`
out-of-tree. Before this branch the first block ended at `policyFingerprint`,
and everything a screen could know about *why* was the `detail` string above it.

```
── what a hold carries ──────────────────────────────────────
{
  "kind": "requires-confirmation",
  "reason": {
    "code": "irreversible",
    "detail": "cannot be undone cleanly: out-of-tree-effect"
  },
  "stakes": "low",
  "reversible": false,
  "confidence": 0.9,
  "policyId": "default",
  "policyFingerprint": "b22582aa:43f528f1b5b6a1d4",
  "irreversibilityReasons": [
    {
      "code": "out-of-tree-effect",
      "primitiveTypes": [
        "loom.card"
      ]
    }
  ]
}

── what the journal keeps ───────────────────────────────────
{
  "reversible": false,
  "irreversibilityReasons": [
    "out-of-tree-effect"
  ],
  "outOfTreeEffectTypes": [
    "loom.card"
  ],
  "touchedPrimitiveTypes": [
    "loom.card"
  ]
}
```

The third block is the one that shows the field is not an echo of
`touchedPrimitiveTypes`. The change configures a card **and** a footer; the
policy declares only the card:

```
── two parts touched, one of them declared ──────────────────
{
  "touchedPrimitiveTypes": [
    "loom.card",
    "loom.footer"
  ],
  "outOfTreeEffectTypes": [
    "loom.card"
  ]
}
```

That is the difference between *"this change sets up a part that reaches beyond
the page — the kind of thing that takes a payment"* and a sentence that names
the part. The reader stops being sent to check something they were not told.

## Decisions nothing specified

**Omitted rather than empty, with `reversible` as the disambiguator.** The
finding asked for "optional and never defaulted" and did not say what an absence
means on a judgment that *is* reversible. Writing `[]` on every accepted
disposition would express something `reversible: true` already says. Omitting it
leaves three states readable and the fourth impossible, which is asserted in
`gate.test.ts`:

| `reversible` | the field | what it means |
| --- | --- | --- |
| `true` | absent | nothing fired, which is what `true` already said |
| `false` | present | these are the reasons |
| `false` | absent | judged before this field existed |
| `true` | present | never written |

**A new leaf module instead of the schema beside the computation.** Putting
`irreversibilityReasonSchema` in `reversibility.ts` is one file fewer and would
make every importer of a stored shape — a holds table among them — pull
`analysis.ts` and the tree engine in behind it. It would also publish the schema,
which runs into the constraint below.

**The schema and its narrowing helper are not published.** Both exist so
`disposition.ts` can validate a stored judgment and `telemetry/event.ts` can
journal the types one reason blames. Neither is a name a host composing a runtime
reaches for, and `offered.test.ts` requires every published name to appear on a
documentation page this lane may not write. Filed as a finding rather than left
implicit — see below.

**`IrreversibilityReasonCode` was written and then removed.** It had no consumer.

**`reason.detail` is untouched.** It is prose for a reader and documented as
such. Mining the codes back out of it was available, works today, and would break
silently the first time anybody rewords a line — a consumer that gets a derived
reading slightly wrong fails in a way that looks exactly like success.

## Records

**0222 — A structured reason travels with the judgment, and the prose is for
readers only.** Accepted, §2. Records four rejected alternatives: mining
`reason.detail`; the whole `ChangeAssessment` on `HeldProposal`; the disposition
on `StoredRevision`; and always writing the field empty. Nothing superseded.
`pnpm decisions:index` regenerated.

**It was written as 0221 and renumbered to 0222.** `Loom signals` claims 0221 on
the open #500, which `main` does not yet carry — so re-reading `main` for the
next free number is not enough on a day two lanes both write a record. Checking
the open pull requests is. The index now prints
*"0221 has no record here — the number is claimed on a branch that has not
merged"*, which is the tool saying exactly the right thing.

## Findings

**Closed**

- *the Gate computes exactly why a change cannot be undone and joins it into
  prose on the way to the queue* — the `Disposition` field, in the smallest shape
  the entry proposed.
- *`out-of-tree-effect` names the primitive types that caused it and the journal
  keeps only the code* — the `AssessmentSummary` field.

**Narrowed, not built**

- *a revision carries no judgment* — answered in 0222's alternatives: the
  judgment is **joined** to the revision, not carried by it, because 0016 makes
  the revision log the truth about the *page* and whether a change reached
  outside the page is not a fact about the page. What remains is the half the
  entry itself identified as useful: a way to fetch one `AssessmentSummary` by
  `proposalId` without paging the whole journal. That is a new method on
  `TelemetryJournal` — two implementations and the contract test — and a bigger
  unit than two fields. Kept out of a PR whose subject is the Gate.

**Filed**

- *the framework cannot publish a new name without a page in another lane's
  directory*, for `Loom docs`. Not a defect; the gate is right. Written down
  because it shaped a module boundary in this PR and will shape the next one
  less harmlessly.

**Bookkeeping**

- The 26 September `prettier` entry asked for either a `.prettierrc` or one line
  in `docs/routines.md`. **The line has existed since 23 September**, under
  `## Standards`. Status updated to say so; the `.prettierrc` half is the
  maintainer's call and is all that is still open there.

## Also done

**`measure` is documented**, which `Loom demo` filed on #499 after writing the
sixth private `playwright-core` script before finding the instrument that already
existed. Four paragraphs in `docs/routines.md`'s screenshot section, with the
real output format read off `tools/specimen/capture.ts`: the indent, `holding N
in M`, `← N past the fold`, `(n of m)` for a selector that matched more than
once, and `no match`. The same section now also says the image ships
`playwright-core` at `/opt/node-tools/node_modules`, so the documented
`npm install` step can be skipped — verified present in this container.

That finding's entry lands with #499 rather than on `main`, so it is not closed
in `FINDINGS.md` here. Whoever merges #499 will find the remedy already in place.

## Cross-lane diff

One file outside this lane: `apps/loom/app/(docs)/_lib/api/reference.generated.json`.
It is generated, it is the documented remedy for the test that fails when the
published surface moves (`pnpm --filter @loom/app docs:api`), and a public type
gaining a field necessarily moves it. `Disposition`'s signature changed and
`IrreversibilityReason` is now grouped under a `runtime/irreversibility` module
page; no published name was added or removed. No hand-written page was touched.

## Open questions

1. **Does `TelemetryJournal` get a fetch by `proposalId`?** The answer 0222
   gives — join the judgment, do not copy it onto a revision — only pays off if
   there is a cheap way to do the join. Today it is a read per row on a paged
   screen, against a journal that may be `undefined` on a deployment with none.
   My recommendation is yes, as its own unit.
2. **Where does a new published runtime name's sentence go?** The framework can
   add the export and regenerate the reference; it cannot write the page.
3. **A `.prettierrc` and a `--check` step in the gate.** The warning is written
   down and caught another run today anyway. A gate stops needing to be read.

## Tests

`pnpm install && pnpm verify` — **green**, exit 0.

| suite | files | tests |
| --- | --- | --- |
| package (`vitest run`) | 177 passed | 3,714 passed |
| application (`@loom/app verify`) | 374 passed | 6,662 passed |

`build`, `typecheck`, `findings:check` (979 findings, 0 malformed) and
`prerender:check` all clean.

**Fifteen tests added**: seven in `disposition.test.ts` for the stored shape —
both union members, the two absences, a bad code, a primitive type that is not a
registrable identifier, and a retention reason missing its budget; four in
`gate.test.ts` — the types named, the retention numbers, absent-not-empty, and
stamped on a *refusal*, where one of the two rungs above `confirmIrreversible`
won the ladder; four in `event.test.ts` — the types journalled,
the subset-not-echo case above, and absent for each of the two reasons that
should not set it.

**Nothing failed and nothing was skipped.** Two intermediate failures, both
mine and both fixed: the first `pnpm verify` went red on
`offered.test.ts` and `extract.test.ts` because this branch had published two
undocumented names, which is what sent the schema and the helper back behind the
module boundary; and a test asserting a catalogue bound failed because
`primitiveTypeSchema` is an identifier *grammar* and not an enum of registered
types — the test and two doc comments were corrected to say what is actually
true.

**One self-inflicted cost, about ten minutes.** `npx prettier --write` over the
five files this unit touched produced 260 semicolons and a 518-line diff for a
44-line change. Reverted with `git checkout --` and every edit redone by hand.
`docs/routines.md` warns about exactly this, under `## Standards`, and this run
had not read that far. Recorded on the 26 September entry.
