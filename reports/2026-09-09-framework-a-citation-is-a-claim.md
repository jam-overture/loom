# 2026-09-09 — A citation is a claim, and `src/` was the half nothing read

**Routine:** `Loom daily build` · **Section:** §1 (process), with repairs in §3 and §4b
**Branch:** `framework-25-where-the-face-is` (#230), seventeenth unit
**Visual:** `reports/2026-09-09-framework-a-citation-is-a-claim.svg`

## What was completed

Four findings this lane owned, closed. All four were filed by other lanes on
other lanes' branches between 7 and 8 September; `main` has not moved since
1 September, so none of them was readable from `main` and none would have been
found by reading it. They were found with the cross-branch sweep this lane's
8 September finding recommends, which is now two runs for two.

**One — the check.** `tools/decisions/citations.ts` reads every citation of a
decision record in `decisions/`, `src/` and `tools/`, and `pnpm verify` fails on
one that does not resolve. A bare `(0095)` must name a record that exists. A
link's label must match the file it opens, and that file must be a record here.
The check reads **prose only** — a record whole, a TypeScript file's block
comments and whole-line comments and nothing else — because the tests in
`tools/decisions/` build fixtures out of string literals naming records that are
absent on purpose, and a check that fails on the tests proving it works is a
check somebody deletes.

**Two — the record shape.** `tools/decisions/shape.ts` holds every record to the
four sections `decisions/README.md` states: Context, Decision, Consequences,
Alternatives considered. A trailing qualifier counts, because 0014 writes
`## Decision (proposed)` and that is the record being honest. It runs inside
`collectDecisions`, so `pnpm decisions:index` reports it and the existing
repository test blocks on it.

**Three — the repairs.** Eight sites in the framing seam renumbered from `(0094)`
to `(0095)`; two dead links to a record filename nobody ever wrote, repaired;
0095 amended in place under 0099; three catalogue types re-exported from
`@loom/runtime/sdk`.

The existing repository test that held a link inside a record to the file it
opens is gone, replaced by a call to the new collector over three roots. One
implementation rather than two.

## Findings closed

| filed by | date | what it asked for | what happened |
| --- | --- | --- | --- |
| `Loom lessons` | 7 Sep | the framing seam cites `(0094)` eight times and means 0095 | all eight renumbered |
| `Loom lessons` | 7 Sep | 0095 says no primitive uses the seam; `loom.embed` has since 26 August | 0095 amended in place under 0099 |
| `Loom docs` | 8 Sep | 0081 has no *Alternatives considered*, and nothing would ever say so | the shape check, with 0081 exempt by name |
| `Loom marketing` | 8 Sep | `@loom/runtime/sdk` publishes `catalogueOf` and not the type it returns | `CataloguedPrimitive`, `CataloguedProp` and `PrimitiveCatalogue` re-exported |

The two `Loom lessons` entries were right to the line number, including the
warning that a find-and-replace would break the three **correct** citations of
0094 in `src/primitives/library.test.ts`. Those three are untouched.

**A third defect nobody had filed** came out of the check on its first run:
`src/render/behaviour-copy.ts` and `src/render/behaviour-disclose.ts` both link
0009 to `0009-a-primitive-declares-its-props-and-the-seam-enforces-them.md`. The
number is right, the subject is right, and the file has never existed — the
record is `0009-primitives-receive-props-in-a-bag.md`. Two dead links, live for
however long ago that rename was.

## Findings filed

- **For `Loom docs`** — the reference generator lifts a bare `(0095)` out of a
  published sentence and leaves a linked one in it. That is the one thing that
  would close the gap this unit admits to. See below.
- **For the four surface lanes** — the citation check stops at `src/` and
  `tools/` on purpose. Adding `apps/loom/app/(docs)/` or any other surface is one
  line in `CITED_FROM`, and it is each owner's to add rather than this lane's to
  impose.
- **For the maintainer** — four findings this lane owns need his word rather than
  engineering. Three were reported on #230 yesterday; the fourth is
  `Loom portal`'s 7 September entry asking whether the journal keeps the sentence
  a person typed. The oldest is seventeen days old.

## The decision that was taken, and then unmade

The first shape of 0118 rewrote the eight framing-seam citations as **links**,
on the reasoning that the sites which were wrong for two weeks should become the
sites that cannot be wrong again. It is the better engineering and it does not
work here.

```
× the doc comments the reference is generated from
  > never makes a decision-record number part of a published sentence
```

Six of the eight comments failed the moment they were converted.
`src/documentation.test.ts` holds this lane's doc comments to what the API
reference generator can lift out of a published sentence, under the maintainer's
rule on #154 — *"I don't think docs should reference internal decisions (like
`(0007)`). The casual reader would not know what those are."* The generator lifts
a bare parenthetical and nothing else; a linked citation stays in the sentence
and reaches a stranger.

So the eight are renumbered rather than rewritten, and the consequence is stated
in 0118 rather than left for a reader to find: **a bare number is one fact, one
fact cannot disagree with itself, and nothing in this unit would catch a ninth
`(0094)`.** What shipped catches a citation of a record that does **not** exist —
which is what the two dead 0009 links were, and what a rename leaves behind. The
way out is the linked form, and the linked form needs a change to the reference
generator, which is `Loom docs`'s file. Filed for them.

## Decisions taken that were not specified

- **Blocking, not reported.** The numbering check has both severities and a hole
  in the sequence is deliberately only reported, because a number claimed on an
  unmerged branch is normal here. A citation that resolves to nothing is not
  normal — nobody has a reason to write one — so it fails the build.
- **0081 is exempt by name, in the tool, rather than backfilled.** Assembling a
  plausible *Alternatives considered* from its Context and Decision would be
  reconstruction presented as record, in the one section whose value is that it
  cannot be reconstructed. The exemption is checked in both directions: if 0081
  ever gains the section, its own exemption is reported as stale.
- **`apps/loom` is not checked.** A check that turns `pnpm verify` red is a gate
  in front of every lane, and one routine's unattended run does not put a gate in
  front of four others.
- **Prose only.** The alternative was to skip the tool's own test files, which is
  narrower and would have rotted the first time a fixture moved.
- **The re-export is three named types, not `export type *`.** The wholesale form
  puts `catalogueFields` and `closedChoices` on the SDK door as names with
  signatures and no values behind them — visible in the generated reference,
  which is how it was caught.

## Records

- **[0118](../decisions/0118-a-citation-is-a-claim-and-only-a-link-can-be-checked.md)**
  — *A citation is a claim, and only a link can be checked.* Accepted. Written
  after the link conversion failed, so its Decision records the concession and
  its Consequences record the gap.
- **0095 amended in place**, under
  [0099](../decisions/0099-a-record-is-amended-when-only-the-count-moved.md).
  Two sentences in its Consequences said the framing seam had no consumer and
  that its ergonomics were untested. `loom.embed` adopted it on 26 August, so
  both had been false for a fortnight. Nothing is reversed — the record asked for
  exactly that adoption and got it. **Not superseded**, and the amendment says so.

Numbering: 0118 was taken after listing every `decisions/0*` across all open
branches. 0103–0117 and 0120 are claimed; 0118 and 0119 were free. 0106 and 0110
read as holes on this branch and belong to other lanes — `pnpm decisions:index`
prints two `note:` lines and exits 0, which is 0097 working.

## Test numbers

Measured on this branch before writing anything, and again at the end. Both runs
exit 0.

| | before | after |
| --- | --- | --- |
| runtime test files | 129 | **131** |
| runtime tests | 2,085 | **2,117** |
| application test files | 158 | 158 |
| application tests | 2,497 | 2,497 |

Thirty-two new tests in two new files — `tools/decisions/citations.test.ts` (21)
and `tools/decisions/shape.test.ts` (11). The repository-level link test in
`decisions.test.ts` was replaced rather than added to, so its count is unchanged
while its coverage went from one directory to three.

**Nothing failed and nothing was skipped at the end.** Two things failed during
the run and both were real:

1. `src/documentation.test.ts` — six comments, when the citations were converted
   to links. Cause established, conversion reverted, argument recorded in 0118.
2. `app/(docs)/_lib/api/extract.test.ts` — the committed API reference no longer
   matched what the generator produces, because this unit changed doc comments in
   `src/`. Regenerated with `pnpm --filter @loom/app docs:api` and committed. The
   file is `Loom docs`'s directory and a **generated artefact of this lane's
   comments**; the diff is the three re-exported types and nothing else, and it
   is named here because it crosses a lane boundary.

`pnpm verify` on the final tree: exit **0**.

## Open questions

- **Is a bare citation worth converting at scale?** 294 sites, mechanically safe,
  and it would make the whole of `src/` self-checking. It cannot be done until the
  reference generator lifts a linked citation, and even then it is a diff across
  136 files that conflicts with every open branch in every lane. Deferred rather
  than rejected, and written into 0118's alternatives.
- **The scan is a heuristic over prose and will produce a false positive one
  day.** It reads four digits beginning with a zero, inside parentheses, inside a
  comment. The first draft read two CIE luminance constants in
  `src/theme/separation.ts` as citations of records nobody has written; the
  lookarounds that fixed it are a rule about digits, not about meaning.
- **One exemption is a fact; three would be a check nobody believes.** If a
  second record ever needs excusing, that is the signal to argue about the rule
  rather than to extend the list.
- **Nothing has merged since 1 September and there are now thirty-three open pull
  requests.** Yesterday's collision — two units of one lane, each green alone and
  red together — is the first case where the queue cost correctness rather than
  time. This run met the same wall from the other side: four findings that
  existed only on branches, and a repository that cannot see its own last week.
