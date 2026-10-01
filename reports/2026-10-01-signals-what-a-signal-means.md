# Reader signals — what a signal means, joined to the tree that was read

**Routine:** `Loom signals` · **Date:** 1 October 2026 · **Branch:**
`signals-02-what-a-signal-means`

## What I completed

**Step 6 of `docs/signals.md` — the interpretation layer.** A reader signal is a
node id, a type and an instant, because rule 1 says so and the broadcaster is
5 KB because of it. The server, unlike the browser, holds the registry and the
tree the batch names. `pageReadingOf(tree, tallies, declarations)` in
`src/signals/parts.ts` is that join, and it adds **nothing to the payload, the
broadcaster, or any stored row**.

| | |
| --- | --- |
| Input | a `LoomTree`, a window's `ReaderTally[]`, and `copyFor` + `typesWithRole` |
| Output | every element node of the revision in reading order, with its role, its own words, and its counters or nothing |
| Browser cost | **zero bytes** — `broadcast.ts` is untouched and still bundles to 6,446 minified |
| Record | [0212](../decisions/0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md) |
| Size | 465 lines of module, 398 of test, 21 tests |

The three questions step 6 names are answerable:

- **which parts of a page are read and which are scrolled past** —
  `PartReading.standing`;
- **which copy a reader actually reached** — `wordsReadIn(reading)`;
- **which roles readers engage with and which they skip** — `reading.roles`.

### The thing that turned out to be the point

I went in expecting the value to be in the metadata — a role on a counter, words
on a counter. The sharper thing is the opposite direction, and it is the one
sentence I would keep if I could only keep one:

**A part nobody reached has no counter row, so no reading of the counters alone
can ever say a part was skipped.** Absence of a row is absence of data. The tree
is the universe of parts — every element node is an addressed node, and a text or
slot node carries no identity attributes so no signal can ever name one — and
against that universe silence becomes a measurement.

So *which parts did readers skip* is not a counter anybody forgot to add. It is a
join, and it needs no declaration from any other lane, which makes it the half of
step 6 that works **today**.

## Decisions I took that the step did not specify

Four, all in 0212 with what I rejected. In short:

**1. The join is at read time, not at rollup time.** Rollup holds the tree and
the registry too, so it could stamp the role and the words onto rows as it stores
them — and the plan's own wording (*"intake and rollup hold both"*) could be read
as inviting that. I think it would be a mistake. A declaration is a fact about
the library, not about a window of reading: the day `src/primitives/` declares
`copy` across itself, a read-time join reinterprets every counter already stored,
including windows rolled up months ago, while a rollup-time one has baked
yesterday's silence into rows whose raw batches have expired and cannot be
recounted (rule 5). Read-time also keeps the durable rows node-shaped, for the
same reason the wire is.

**2. Three standings rather than two.** `read`, `skipped`, and `unknown`. The
third is the one I want to defend: a window with no views at all makes every part
`unknown`, not `skipped`, because a page nobody opened is not a page everybody
skipped. The sharper case for it is a part that reported something *other* than
coming into view — a press delegated to a band no `viewed` ever named — where a
reader plainly had it in front of them and the counter that would say so is
missing. A two-valued reading has to call both of those *skipped*, and that is
the plausible-false-number failure: a figure of the right shape, drawn on a
screen, about nothing.

**3. A grouped row adds occurrences and never view counts.** `reading.roles`
carries `dwellMs`, `activations`, `opens`, `closes`, `completions` — and
deliberately no `views`, `reached` or `engaged`. Two reasons and they are
independent: distinctness cannot be added (one reader who read three headings is
three in a sum of `reached` and one person, which is 0147 one level up), and
`engaged` would count a single press twice, once as the button's `activations`
and once as the band's `engaged`, which is 0167 working as designed. What a role
row says about views instead is how many of its *parts* were read, skipped or
unknown — a count of parts, which cannot be misread as a count of readers. There
is a test that fails if either field reappears.

**4. A mismatched tree is an alarm, not a silence.** Pass revision 7's counters
with revision 6's tree and most parts read `skipped` while every number stays
plausible. So the reading reports `foreign` (rows filed under another tree or
revision, dropped), `orphaned` (rows naming a node this tree does not have) and
`duplicated` (a node handed in twice: the first row stands, the rest are named).
`duplicated` is the one I added on second thought, because summing is wrong —
view counts are not addable — and overwriting silently halves somebody's dwell
time.

One mechanical choice worth naming: a part's words are **its own** — its declared
copy props plus its direct text children — never its subtree's. That makes the
page's words a partition across its parts, so a caller can add two rows without
reading a headline twice. It is implemented by handing `copyIn` the node with
only its text children, rather than reimplementing its rules about blank strings
and non-string values, and there is a test asserting the concatenation of every
part's words equals `copyIn` over the whole tree.

## Real test numbers

`pnpm install && pnpm verify` — **green**, on the final tree.

| | |
| --- | --- |
| Runtime suite | **172 files, 3,462 tests, 0 failed** |
| Application suite | **348 files, 6,040 passed, 1 skipped, 0 failed** |
| `findings:check` | 931 findings, 0 malformed |
| `prerender:check` | 120 pages, 1,451 text junctions, 0 run together |

**21 tests added**, all in `src/signals/parts.test.ts`. No existing test was
changed or weakened, and nothing was skipped.

Three runs failed on the way and all three are worth recording:

1. **An unused type import** in the new test file — `tsc --noEmit` caught it, which
   is the gate doing its job and cost one line.
2. **`src/documentation.test.ts` — *never makes a decision-record number part of
   a published sentence*.** I had written *"`unread` and `unspoken` are 0122's and
   mean what they mean there"* inside a published declaration comment, and an
   indented comment is published whole rather than first-paragraph-only. The rule
   is the maintainer's, from the API reference: a casual reader does not know
   what `(0122)` is, so a number may only ever be a parenthetical the site can
   lift out. Rewritten so the sentence reads without it. **The check is good and
   I would not have caught this by reading my own comment** — it is exactly the
   failure mode of writing documentation for the person who already knows.
3. **The published surface moved, and two checks in the docs lane said so.**
   `extract.test.ts` — *is what the generator produces right now* — and
   `offered.test.ts` — *hands back exactly what its page says it does*, which
   listed all four new exports with the sentence *"something is published that a
   reader has no way to find"*. The four names are `pageReadingOf`,
   `wordsReadIn`, `PART_STANDINGS` and `describePartStanding`, on
   `@jam-overture/loom/signals`. The remedy is the one the assertion names —
   `pnpm --filter @loom/app docs:api` — and it is a **regeneration, not an
   edit**: `reference.generated.json` is produced from `dist/*.d.ts`, so
   hand-resolving it is the one thing never to do with it. 95 lines added, 18
   changed, all of it the new module's entries and the two export counts that
   move with them.

### The double-count case, named

The brief asks for one, and this module has exactly one shape of it: a grouped
row adding `engaged` beside `activations`, which would report one reader's one
press as two things that happened and look entirely right. The test asserts the
total is one press, **and** that the fields which would make the mistake possible
are absent from the row at all. The second assertion is the one that will still
be there in six months.

Four more that are the same family:

- a node handed in twice adds nothing and is named (`duplicated`);
- a part's words never appear in an ancestor's row (the partition test);
- counters from another revision are dropped rather than merged into the reading;
- the view floor is the largest row, never the sum of the rows.

## Browser bytes, measured

Nothing in this change runs in a browser, which is the whole architecture of step
6 rather than a convenience. Measured anyway, because the brief asks for a number
and "zero" should be a reading rather than a claim:

`src/signals/broadcast.ts`, bundled with esbuild (`--bundle --minify
--format=esm`): **6,446 bytes minified, 2,923 gzipped** — identical to the
figure in this lane's previous report. `browser-weight.test.ts` still passes
unchanged; `parts.ts` is not in the broadcaster's import graph and reaches the
schema library and the tree package freely, as a server module may.

## Records, findings, plan

- **Added:** decision **0212**, *What a reader signal means is joined to the tree
  when it is read, and the tree is what makes silence a measurement*. **Accepted**
  — `docs/signals.md` already approved step 6 and nothing here contradicts an
  accepted record; it adds no payload, touches no tree schema and no delta. Index
  regenerated. 0212 is the next free number on `main` and **no open pull request
  claims it** (#463 claims 0209, which already exists on `main` and will be
  renumbered on merge — not mine to fix).
- **Filed, three.** `Loom primitives`: `role` and `copy` now have a reader that
  turns them into a sentence about readers, and the library declares neither — an
  addition to the open 19 September entry rather than a new ask, with the measured
  size of the gap. `Loom portal`: the reading shape step 4 was told to wait for,
  with two things to carry into the screen rather than re-derive. `Loom daily
  build`: nothing can ask a store for the tree as it was at revision N, and
  before-versus-after needs two of them.
- **Closed:** none. The one open finding owned by this lane is the `fetch` hole of
  this morning, which is a question for the maintainer rather than a unit of work.
- **`docs/signals.md`** marks step 6 **done, 1 October** and records the four
  things settled in the building.
- **Cross-lane edits: one, and it is a regeneration.**
  `apps/loom/app/(docs)/_lib/api/reference.generated.json`, produced by
  `pnpm --filter @loom/app docs:api` exactly as the failing assertion instructs.
  It is a generated file in another lane's route group, and four new exports move
  it; not regenerating it turns the gate red for all four surfaces. No hand edit,
  no prose, nothing else under `(docs)` touched. Everything else is this lane's or
  shared by convention: two new modules in `src/signals/`, its index, the record,
  the regenerated decision index, the plan, and appended findings.

## Open questions

**1. Still open from this morning, and unanswered: the `fetch` hole.** A host's
form that posts with `fetch` reports no completion, and the only honest fix is a
function the host calls — `completed(node)` on the broadcast handle. Rule 3
refuses measurement as a *prop in the tree* so a proposal cannot switch it on; a
host's own code is not a proposal. **Recommendation unchanged:** allow it, and
write the distinction down in a record that amends nothing. Not built, not
proposed, waiting on your reading. Repeating it here because a question nobody
answers is indistinguishable from a question nobody asked.

**2. Region (step 7) is next and I did not start it.** It is a separate unit —
intake, the counter, a floor as configuration, a record — and half of it in this
pull request would have made both halves harder to review. Said plainly so the
ordering is a decision rather than an omission: step 6 first because the portal
is waiting on a shape, and region second because it is the one that needs new
configuration and a number you may want to choose yourself. **One thing I would
value your view on before I build it:** the minimum views before a region bucket
is kept. I would default it to **25** and make it per-deployment configuration —
low enough that a small deployment sees anything at all, high enough that
*Luxembourg: 1* can never appear. If you have a number in mind, it is cheaper to
hear it now than to ship mine and change it.

**3. Nothing else is blocking.** The join is additive, it reads rows that already
exist, and a deployment that never calls it is byte-identical.

## On the parked door, since the brief asks

Nothing here makes per-reader identity more expensive to add later, and one thing
makes it slightly cheaper to keep refusing. A reading is a function of a tree, a
window of counters, and the library's declarations — **no argument of it is about
a reader**, and there is no field a reader id could arrive in without changing the
shape. If an identified batch ever arrives behind a consent gate, it arrives
through the same intake and rolls up into the same counters, and this join reads
them unchanged.

Worth one note in the other direction: the reading is the first artefact in this
subsystem that contains page *content* — the deployment's own copy, joined from
the deployment's own tree. That is not reader data and rule 1 is untouched, but
it does mean a reading is a thing a deployment should treat as its own content
rather than as anonymous arithmetic, and the record says so.

## What a lane owner reading this next should know

The half of step 6 that works today needs no declarations: **read versus skipped,
in reading order, with depth.** The half that is dark needs `src/primitives/` to
declare `copy` and `role`, which is one pass over the library and is already
filed. If you are building the portal's screen, build the first half now — it is
the one that answers the question nothing else in this repository can.
