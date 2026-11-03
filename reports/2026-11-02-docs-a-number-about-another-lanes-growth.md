# 2 November 2026 (evening) — a number about another lane's growth

**Routine:** `Loom docs` · **Branch:** `docs-75-a-number-about-another-lanes-growth` ·
**Section:** §4c

**A correction to this morning's own unit**, which merged as #750 at 16:40:39
before the correction was pushed. The report for that unit is
[`2026-11-02-docs-a-field-is-not-an-export.md`](2026-11-02-docs-a-field-is-not-an-export.md)
and is not edited here.

Branch cut from `origin/main` at `fe82802` (#750), after `git fetch origin main`.

## What this is about

`api/fields.ts` reads the declarations `SIGNATURE_CAP` cut, because a name
below a cut is a name the plain-language check can never flag, and the honest
way to state that limit is a number. **This morning's test asserted the
number:**

```ts
expect(cutDeclarations.length).toBe(11)
```

**Eleven is not this lane's number.** It is how many of another lane's types
run past 6,000 characters, and it moves whenever `src/` grows. The rule against
that was already written down twice in this directory — `search/build.ts` names
the shape, *this lane's number about somebody else's growth*, and `weight.ts`'s
`GENERATED_PAGE_CAP` is written as a trigger with a remedy in the comment
rather than a figure to defend, for exactly this reason.

It was broken in the commit that cites it.

## It survived its own merge by luck, which is the whole argument

`Loom merge` brought `main` into `docs-74` at 16:37 with #747, #748 and #749 on
it. The published set went from **1,855 names to 1,860**, and **not one of the
new declarations was long enough to be cut**, so the count stayed at eleven and
the suite stayed green.

Had one been long enough, `pnpm verify` would have failed in `(docs)` — the
merge gate for **four surfaces**, not one — naming a test about documentation
for a change in the runtime. That is the 15 October failure's exact shape, and
it would have landed on whichever lane's branch pulled `main` in next.

## What shipped

**One assertion loosened, two added, three doc comments refreshed.**

- **`fields.test.ts`** — `toBeGreaterThan(5)` in place of `toBe(11)`, plus the
  two claims this lane can make on its own: that `RenderDiagnostic` is among the
  cut declarations, and that every one of them hides lines. Strictly weaker
  about another lane's growth, strictly stronger about the property this module
  owns.
- **`fields.ts`** — the measured table now says *measured on 2 November, against
  the reference as this branch has it*, and carries the post-merge figures. The
  cut sentence reads *eleven of them on 2 November* rather than *eleven*.
- **`plain.ts`** — the two figures it quotes from `fields.ts`, refreshed.

## The figures, before and after the merge

| | at `749e4c1` | at `fe82802` |
| --- | --- | --- |
| names the package publishes | 1,855 | **1,860** |
| field names that are not exports | 823 | **826** |
| of those, camelCase — the set this rule reads | 292 | **294** |
| of those, one lowercase word — out of reach | 531 | **532** |
| cut declarations / lines they hide | 11 / 514 | 11 / 514 |
| camelCase fields printed in this site's prose | 20 | 20 |

**The rule is unaffected.** Two more names to check, one more out of reach, and
the twenty this site actually prints are the same twenty.

## Decisions taken that were not specified

- **This morning's finding is left exactly as it was measured.** Its table says
  1,855 / 823 / 292 and that was true at `749e4c1`, which the entry names. The
  movement is recorded in the new entry instead. Rewriting a merged record to
  today's numbers is the opposite of the lesson this unit is about: **a number
  belongs where it can carry a date.**
- **The merged report is not edited.** `reports/` is append-only by this lane's
  procedure, and a report describes a run rather than a state of the world.
- **A fresh branch rather than a second push to `docs-74`.** #750 is merged, and
  a merged pull request cannot track new work. The two commits that would have
  ridden it are re-applied here off the new `main`.
- **The floor is five, not ten.** The claim worth defending is that the limit is
  real and not a rounding error. A floor close to today's count is the same
  hostage with a longer fuse.

## Records

None added, none superseded. Nothing here touches the tree schema, the delta
model or an `Accepted` record, and nothing is escalated as `ARCHITECTURAL`.

## Cross-lane diff

**None.** Every file changed is inside `apps/loom/app/(docs)/`, plus
`FINDINGS.md` and this report. Nothing in `src/`, nothing in another surface's
route group.

## Findings

**One filed, closed on filing** — the entry above, with the general version:
three checks in this directory read the generated reference, and the question
to ask of any number taken from it is *would I defend this if `src/` doubled.*
If not, it is a floor, a trigger or a dated sentence — never an equality.

### Standing entries this run met again and did not duplicate

- **The commit author line** (23 October). Checked before the first commit.
- **Never let anything run after the gate on the same line**
  (`docs/routines.md`). Followed — the status was written to a file as the last
  thing on its line and read in a separate command.
- **Install before you merge, regenerate after you merge**
  (`docs/routines.md`). Both regenerators were run on the merged head during the
  `docs-74` run; neither produced a diff, because this lane's branches do not
  touch `decisions/README.md` or `reference.generated.json`.

**No pictures.** Nothing renders differently: this unit changes an assertion and
three doc comments, and no page, component or style is touched. The morning
report carries the four pictures of the pages the rule is about, and they are
still accurate.

## Test numbers

`pnpm install && pnpm verify` — **exit 0**, read out of a file written as the
last thing on its line, with nothing piped into `tail` or `tee`.

- framework: **252 files, 6,069 tests passed**
- application: **388 files, 6,273 tests passed**, of which **142 files and
  2,155 tests** are `(docs)`
- `findings:check`: 1,403 findings, 0 malformed
- `reports:check`: 2,054 visuals, 145.7MB, none over 1.1MB
- `prerender:check`: **137 prerendered pages**, 1,947 text junctions, 0 run
  together; 3 metadata conventions, 0 unserved

**The test count is unchanged at 2,155.** One assertion was loosened and two
added inside an existing `it`, so the suite is the same size and strictly more
is claimed about what this module owns. Nothing was skipped and no test was
weakened — the one assertion that is weaker is weaker **on purpose**, about
another lane's growth, and that is the unit.

## Needs your input

**Nothing.** The two questions from this morning's pull request stand unchanged
and neither blocks this lane: whether the search box should stop holding every
section it has fetched, and whether the reference pages are being cut up before
anybody designs anchors against them.
