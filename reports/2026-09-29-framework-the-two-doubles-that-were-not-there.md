# The two doubles that were not there — one seam had a published way to not answer, and three lanes wrote the other two by hand

**Routine:** `Loom daily build` (framework, `src/` except `src/primitives/`, and the application shell)
**Date:** 2026-09-29
**Section:** §3 (the data and submission seams), on 0140's ceiling
**Branch:** `framework-58-the-keys-the-runtime-puts-there` — **this lane already had an open pull request (#444) and this work was pushed onto it** rather than opening a second one, per step 3 of `docs/routines.md`. The branch was level with `origin/main` at `657d27e` when this run started
**Records added:** none — see *The decision that was not taken*
**Finding closed:** *`hangingModelClient` is published and its two siblings are not, so each surface writes them* — `Loom docs`, 14 September

![Four bound regions, one of them unreachable](2026-09-29-framework-the-two-doubles-that-were-not-there.png)

*`tools/specimen/answers.specimen.ts`, 1280×900@2×, `editorial` + `editorial-serif`
+ `comfortable`. The lower-left card is the state this unit is about: a region
whose source did not answer. It is the only picture of that state in the
repository, and the specimen reaches it by **declaring** the failure. What was
missing until today was a way to reach the same state by **actually not
answering** — which is what a surface's own tests need, because a declared
failure cannot tell you whether the runtime let go of the connection
afterwards.*

## The migration is done, and this run did not touch it

Checked first, because three routines are waiting on the answer and a fresh
session has no memory of it. **`apps/loom` exists with all five route groups**
— `(marketing)`, `(docs)`, `(lessons)`, `(portal)`, `(demo)` — `apps/` holds
exactly one package, and there is no `apps/portal` or `apps/docs`. Nothing is
half-migrated, this run added nothing to it, and the tree crosses this run
boundary in one piece.

## What was completed

`Loom docs` filed on 14 September that **`@jam-overture/loom/testing` publishes a
way to make one of the three bounded seams not answer, and not the other two.**
`hangingModelClient` has been there since the ceiling shipped, with its reason
written in its own comment: *every surface with a prompt box has an "it did not
come back" state to show, and this is the only way to reach it without waiting
for one.* That is equally true of a bound region and of a form, and neither had
one.

**`hangingSource(id, description)` and `hangingEndpoint(id, description)` are
now published**, each returning `{ entry, abortedWith() }` — the same signature
`hangingModelClient` already had, which is the signature the finding asked for.

```ts
const silent = hangingSource("catalogue.services", "What this shop offers.")

const resolution = await resolveTreeData(tree, {
  registry: registryOf([silent.entry]),
  ceilingMs: 5,
})

// the region:            { reason: "unavailable", detail: "no answer in 5ms" }
// what the adapter heard: silent.abortedWith() === "no answer in 5ms"
```

### It was five copies, not three

The finding counted `(docs)`' two. Going to write the doubles, I found this
package's own suite had written the same thing twice more — and that each of
those two files had written it **twice over**:

| file | copies | why two |
| --- | --- | --- |
| `apps/loom/app/(docs)/_lib/data/shop.ts` | 1 | `silentSource`, which does have an `abortedWith` |
| `apps/loom/app/(docs)/_lib/ceiling/page.ts` | 1 | inline, reporting through a callback |
| `src/data/resolve.test.ts` | **2** | one entry that hangs, and a second near-identical `listening` entry, because the first could not report the abort |
| `src/submit/resolve.test.ts` | **2** | the same pair, for the same reason |

That second column is the finding's own argument arriving one step further on
than it knew. The `abortedWith()` half is not a convenience bolted onto the
double — it is the reason a lane that writes the double by hand ends up writing
it *twice*, because the outcome is observable from outside the adapter and the
abort is observable only from inside it.

**Adopting the published double deleted four hand-written adapters from two
files**, and the assertions on either side of them are unchanged and still
passing. `src/data/resolve.test.ts` is 29 lines removed against 6 added,
`src/submit/resolve.test.ts` 25 against 6.

**`(docs)`' two copies are untouched** — that lane owns those files. Both can
be deleted in favour of the import whenever `Loom docs` next has reason to open
them; nothing is blocked either way, and the entry in `FINDINGS.md` says so.

## The cross-lane edit, declared

`apps/loom/app/(docs)/_lib/api/reference.generated.json` is a generated file in
`Loom docs`' route group, and this run regenerated it with
`pnpm --filter @loom/app docs:api`. It had to: two tests in that lane read the
published surface out of `dist/*.d.ts` and compare it against the reference, and
**three exports added to `src/testing` moved that surface**, so the app suite went
red on a file this lane cannot leave alone and did not choose to touch.

The diff is the three new exports, one export-count (1,083 → 1,086) and two file
counts. Nothing else in the file moved, and no `(docs)` page, component or prose
was edited. Recorded here because a diff crossing a lane boundary gets a line in
the report saying which file and why, even when the framework forces it.

## The decision that was not specified: the params schema accepts anything

A double that stands in for a real source has to accept the bindings that real
source's pages already carry. `defineSource` validates params **before** it
calls the adapter, so a double with a narrow params schema would answer
`invalid-params` and never reach the promise — the region would come back
unavailable either way, the sentence would be different, and `abortedWith()`
would be `undefined` with nothing saying why.

So `hangingSource` declares `z.object({}).passthrough()`: a double whose whole
job is to not answer must never be the thing that refuses first. There is a
test named for it, and it is one of the two that catch a strict schema.

## The decision that was not taken: no record

0104 already decided that `src/testing`'s entry point is API and that what is in
it is a promise this package may not silently change. Adding two exports is a use
of that decision rather than a new one, and both are shaped exactly like the
export beside them. Nothing here would be expensive to reverse and nothing here
defines what Loom is, so there is no record — mentioned because a run that adds
to a published surface and writes no record should say it thought about it.

## Test numbers

**`pnpm verify` green, exit 0**, read out of a file rather than off a pipe.

| suite | files | tests |
| --- | --- | --- |
| `@jam-overture/loom` | 167 | **3,276** (3,267 before this unit) |
| `@loom/app` | 323 | 5,588 — unchanged |

873 findings, 0 malformed · 116 prerendered pages, 1,304 text junctions, 0 run
together · 3 metadata conventions, 0 unserved.

**9 tests added, none weakened, none skipped**, all of them in the new
`src/testing/hanging.test.ts`. The two files that adopted the published double
kept every assertion they had; the four hand-written adapters they lost were
setup, not assertions. The three files this unit touches run 47 tests together.

### What the tests were checked against

The nine were verified failing rather than assumed correct, by breaking the
implementation twice and watching which ones went red:

| mutation | red |
| --- | --- |
| the abort listener records nothing | **4 of 9** — both `reports what the runtime's abort said` tests, the params test, and the two-seam test |
| `passthrough()` → `strict()` on the params schema | **1 of 9** — `accepts the params of the source it stands in for` |

**The first attempt at that check was wrong and is worth recording.** The
mutation was applied with a `replace(..., 1)` that hit the *first* match in the
file, which is `hangingModelClient`'s abort listener rather than the new one.
The suite went green, which for about a minute looked like nine tests that
assert nothing. They were fine; the mutation had landed in a function the test
file does not import.

## The gate said 0 and the gate had failed

The first `pnpm verify` of this run **exited 2**, and the harness notification
for that same command said *exit code 0*. The status was written to a file as
`docs/routines.md` requires and the file said `EXIT=2`, so it was caught
immediately and cost nothing.

The failure itself is worth one line, because it is a gap between two tools
rather than a mistake: `answeringEndpoint` in the new test file built a
`SubmissionTarget` without its required `fields`. **Vitest does not typecheck,
so all nine tests passed against a value the compiler rejects.** `tsc --noEmit`
is what found it. A test file that goes green is not a test file that compiles.

## Findings

**Closed:** *`hangingModelClient` is published and its two siblings are not* —
`Loom docs`, 14 September, with the five-copy count recorded in the entry.

**Filed:** none. One thing was noticed and is an open question rather than a
finding, below.

## Open questions

**The specimen's declared `detail` never reaches a reader, and it does not match
what a deployment produces.** `answers.specimen.ts` declares
`detail: "the archive did not answer in time"` for its unavailable column. A
real ceiling says `no answer in 10s`. The picture at the top of this report
shows why it has not mattered: `loom.feed` draws *"This list could not be
loaded."* and the detail goes to the diagnostic channel, so the only place the
hand-typed sentence surfaces is the harness's own note line. Left alone rather
than filed — the specimen is illustrating a state, not documenting a sentence,
and the state it draws is right. It is written down here so that if the detail
ever does reach a reader, somebody knows it is invented.

**Should `(docs)` adopt the published doubles, or keep its own?** Not this
lane's call and not blocking. The two copies there are correct and tested. The
cost of keeping them is the one 0117 was written about — several lanes holding
private versions of one thing, drifting invisibly because each passes its own
tests — and it is now two copies rather than four.
