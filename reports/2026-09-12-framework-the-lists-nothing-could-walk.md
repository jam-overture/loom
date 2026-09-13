# The lists nothing could walk

**Routine:** `Loom daily build` · **Date:** 2026-09-12 · **Branch:**
`framework-29-the-lists-nothing-could-walk` · **Section:** §2 — Composition
Runtime, §4 — Framework SDK

---

## First, for the three routines reading this for it: the migration is done

**`apps/loom` exists, and nothing in the tree is half-migrated.** The four route
groups — `(marketing)`, `(docs)`, `(lessons)`, `(portal)`, plus `(demo)` — have
been on `main` since 19 August. `apps/portal`, `apps/docs` and `apps/marketing`
are retired. One `vercel.json`, one workspace, one deployment.

My brief still opens with that migration as *"⚠ Your next unit"*, twenty-four
days after it landed. The 11 September run said the same thing. Nothing is
blocked by the stale brief; it just costs each run the time to establish that the
work is already done before it can choose real work. It is in *Needs your input*
again, once, and I will not keep re-filing it.

---

## What was built

Four holes of one shape, closed together: **a public type that could be reacted
to and not walked.**

A union of string literals is exhaustive in the direction the runtime was
designed for — a `switch` over one cannot miss a case. It is not enumerable in
the other. Anything that wants to *walk* the members (a page telling a host what
it must handle, a dashboard wanting a bucket per code, a conformance check) keeps
its own copy, and a copy is a list that is silently wrong the day a new member
lands. Four surfaces now consume this runtime, and four of them had filed it.

| What | Where | Filed by |
| --- | --- | --- |
| `STORE_ERROR_CODES` — the five ways persistence refuses | `src/store/errors.ts` | `Loom docs`, 2 Sep |
| `CLI_ERROR_CODES` — the nine ways a command refuses | `src/cli/plan.ts` | `Loom docs`, 2 Sep |
| `GatePolicy` derived from its schema | `src/runtime/policy.ts` | `Loom docs`, 4 Sep |
| The catalogue's types on the SDK door | `src/sdk/catalogue.ts` | `Loom marketing`, 8 Sep |

The first two use `everyMemberOf` from `src/closed-set.ts`, which is the shape
`WRITE_OUTCOME_KINDS` and `TELEMETRY_EVENT_TYPES` already settled — the list
stops compiling when a member is missing. **All four of the unions that could not
be walked now publish their list.**

### The one that was not a paper cut

`GatePolicy` stated the Gate's thirteen knobs twice — once as `gatePolicySchema`,
once as a hand-written type — and the line that looked like it held them
together, `defaultGatePolicy: GatePolicy = gatePolicySchema.parse({})`, only
caught one direction.

I did not take this on description. I added a fourteenth field to the schema and
type-checked the repository, on `main` and on this branch:

| | A 14th field added to `gatePolicySchema` |
| --- | --- |
| **`main`** | compiles clean. **No errors anywhere.** `keyof GatePolicy` never hears about it. |
| **this branch** | fails to compile in **two** places |

The second of those two is the part worth having. One is the new test. The other
is **`src/runtime/policy-fingerprint.ts`**, whose `PolicyProjection` is a second
consumer keyed on `keyof GatePolicy` — inside `src/`, not on a surface — which
had been projecting thirteen of fourteen fields with nothing anywhere to say so.
The documentation lane predicted that consumer would exist and get no warning. It
already existed.

`GatePolicy` is now `Readonly<z.infer<typeof gatePolicySchema>>`. The lane's
guess that `z.infer` might "simply work now" was nearly right: it disagreed in
exactly one place — the three host-vocabulary arrays, which infer mutable and
were promised `readonly`. Taking the naive derivation would have **narrowed a
public type**, so the three schemas carry `.readonly()`, which is already this
package's idiom in seven other array schemas. Everything else matched, including
the enum-keyed `autoApplyCeiling`.

---

## The thing I got wrong, and how it was caught

The SDK fix was recommended as one line, `export type * from "../catalogue.js"`.
I wrote it, and it **published a false page.**

After regenerating the API reference, `@loom/runtime/sdk` advertised
`catalogueFields` and `closedChoices` as **functions this door offers**. It does
not offer them. They are `export const`; `export type *` cannot carry a value and
does not. Against the built package:

```
catalogueOf:      function
catalogueFields:  undefined
closedChoices:    undefined
```

The reference generator resolves a star re-export by walking the target module's
symbols and does not honour the `type` modifier. Naming the three types instead
says the true thing, and the reference is now truthful — 887 exports rather than
the 890 the starred version claimed.

**What caught it was not a test.** `pnpm verify` was green on the starred
version, once the reference was regenerated, because `extract.test.ts` pins the
reference to *what the generator produces right now* — and the generator produced
it. It was caught by reading the regenerated diff and noticing two of the six new
names were values, then checking the built package rather than assuming. Filed
for `Loom docs` with the fix that would catch the class rather than the instance:
check symbols the reference calls `function` against `dist/`.

---

## Records

**Added:** [0132 — A type that mirrors a schema is derived from
it](../decisions/0132-a-type-that-mirrors-a-schema-is-derived-from-it.md),
Accepted. The rule, its one exception (where the derived type would be weaker,
the difference goes in the schema), and three rejected alternatives.

**Superseded:** none.

**Numbering:** 0131 is claimed by my own unmerged #264 and 0135 by #265, so this
took 0132. `pnpm decisions:index` reports 0126–0129 and 0131 as holes, which is
0097 working as designed — a hole is reported, a clash is fatal.

---

## Findings

**Closed (4 entries, 5 counting the duplicate):**

- `StoreError` has five codes and no way to list them — **and its "fourth of
  four", `CliError`, with it.**
- A field added to `gatePolicySchema` and not to `GatePolicy` compiles. *This
  entry exists twice in the file, byte for byte; both copies were closed.*
- `@loom/runtime/sdk` exports `catalogueOf` and not the type of what it returns.
- `WriteOutcome` still has no list of its kinds — **closed as already done.**
  `WRITE_OUTCOME_KINDS` has been on `main` since `framework-21`. The entry sat
  open for ten days calling itself *"the first thing on the next run's list"*
  while the thing it asked for was already there.

**Filed (3):**

- **The generator and `export type *`** (`Loom docs`) — above, with two candidate
  fixes.
- **Three copies of a runtime list can come out** (`Loom docs`) —
  `failures.ts`, `scaffold.ts` and `knobs.test.ts` can now read the published
  lists. An offer, not a defect.
- **`FINDINGS.md` is 1 MB and 30 entries are filed twice**
  (`@jonathanbravecredit`) — below.

### The channel is duplicating itself

Every brief names `FINDINGS.md` as *read first, every run, before choosing work*.
It is **1,015 KB, ~19,400 lines, 524 entries**, of which **494 headers are
unique — so 30 are exact duplicates**, whole entries repeated byte for byte.
Merge residue from an append-only file, most likely.

The hazard is concrete, and today came within one edit of it: a duplicated entry
can be **closed in one copy and left open in the other**, and the next run reading
the stale copy redoes work already on `main`. The `gatePolicySchema` entry I
closed was one of the 30. Filed rather than fixed, because the file's own rule is
*append; do not rewrite someone else's entry*, and a routine deciding unilaterally
which copy of a finding survives is not an arrangement that stays safe.

---

## Tests

`pnpm verify` **green, exit 0**, run twice — once before the report and findings
edits, once after.

| | Files | Tests |
| --- | --- | --- |
| Runtime (`src/`) | 124 | **2,061** |
| Application (`apps/loom`) | 232 | **3,857** |
| | | **5,918 passing** |

**Nothing failed in the final run, nothing was skipped, and no test was weakened.**

Two failures happened along the way and both were real, both fixed rather than
worked around:

1. `src/documentation.test.ts` — my new doc comment became the file's first
   `/**` and was attached to a declaration, so `src/sdk/catalogue.ts` no longer
   opened with a detached module paragraph. The repository's own rule, catching
   exactly what it is for. Reordered.
2. `app/(docs)/_lib/api/extract.test.ts` — the published surface moved, so the
   committed reference no longer matched. Regenerated with
   `pnpm --filter @loom/app docs:api`, as the failure message instructs.

**One cross-lane file changed:** `apps/loom/app/(docs)/_lib/api/reference.generated.json`,
which belongs to `Loom docs`. It is generated, and it is generated *from* the
runtime's published surface, so a change to what `src/` exports cannot leave it
alone. It is the `next.config.ts` case in `docs/routines.md` — the lane follows
the content, and the content here is mine. Regenerated by the committed script,
not edited by hand.

---

## No screenshot, and why

There is nothing to look at. This unit changed no tree, no primitive and no page.
`tools/specimen/` — the harness #250 built so that lanes stop writing their own —
photographs a declared Loom tree specimen, and pointing it at something unrelated
to the change would be decoration rather than evidence.

The evidence that matters for a type-level change is the compiler, and it is in
the table above: the same fourteenth field, silent on `main` and fatal here. The
other artefact worth seeing is the API reference diff, and the six names it moved
are listed in full in the finding.

---

## Open questions

1. **#230 is still open, eleven days and forty-plus merged pull requests behind
   its base.** It is not mine to merge and the recommendation has been made on
   the pull request every twelve hours since 3 September, which is itself now
   noise. I am making it once here and not commenting on #230 again.
2. **The commit-identity rule is stranded on an unmerged branch.** #264 adds the
   *Commit identity* section to `docs/routines.md` — author every commit as
   `jonathanbravecredit <60827135+…@users.noreply.github.com>` — and that section
   is **not on `main`**. Every lane reads `docs/routines.md` on `main`, so until
   #264 merges, every lane keeps hitting the Blocked-deployment trap that has now
   been filed seven times. I applied the rule by hand this run after verifying it
   against `main`'s own history.
3. **Whether `knobs.test.ts` retires** is `Loom docs`' call, filed, not urgent.
4. **The reference-vs-`dist` check** would close a class rather than an instance,
   and it is the one new piece of work today's run recommends anyone start.
