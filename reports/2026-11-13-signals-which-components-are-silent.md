# Which of your components are silent

**`Loom signals`, 13 November 2026 (morning run).** One unit, built and green:
`librarySendersOf` — the silent-sender defect gathered by kind of part instead
of by page. Branch `signals-88-which-components-are-silent`, one record
([0391](../decisions/0391-a-silent-component-is-a-census-over-the-placements-the-defect-could-be-seen-on-and-the-share-is-bracketed.md),
Accepted), three findings filed, one of them closing the half of an older entry
this was queued behind.

## What I completed

On 11 November this lane added `parts-unreporting` to the fault vocabulary
(0382): **a part that reported nothing while a part inside it reported reach.** A
reader was demonstrably below it, so it was on a screen and did not say so —
usually a primitive that does not spread the identity attributes a broadcaster
reads. The entry filed the same evening said what was still wrong with it, in
its own words: *a primitive to fix **in the library**, not a page to rewrite* —
and the fault is raised per page. A deployment with forty pages built out of one
silent `loom.accordion` gets forty faulted pages, and the errand the fix-list
hands over is *rewrite these forty pages*.

`librarySendersOf` is the other half. One row per primitive type and per role,
ranked by the places to fix, so the sentence is *`loom.accordion` is silent in
thirty-one of the thirty-four places it stands, across nineteen of your pages*.
It is the twenty-fourth reading taken out of the server-side join rather than
collected: **no payload field, no counter, no column, no table, no byte on any
wire, and nothing in a reader's browser.**

Both open pull requests from yesterday's runs (#880, #884) recommended this as
the next unit, and the names cap that was holding it was relieved by #859.

## The decision I took that was not specified, and why

**The denominator.** This is the whole of the design and the only place a
surface can read the row wrong.

A silent **leaf** — a heading, a price, a control with nothing under it —
produces exactly the rows a leaf nobody reached produces. No payload would tell
them apart; the defect is undetectable there for ever. A part that holds things
but has nothing reported below it is undetectable *today*: nobody has been under
it yet. So every placement is in exactly one of three states, and the row
publishes all three because they add to the placements:

| state | meaning |
| --- | --- |
| `leaves` | holds nothing — never checkable |
| `unwitnessed` | holds parts, nothing below reported reach — not checkable in this window |
| `witnessed` | at least one part below reported reach — the population this reading is about |

**`share` is `silent ÷ witnessed`, never `silent ÷ placements`.** The obvious
denominator is the one a reader of the row would assume, which is the argument
for it. It is also wrong in the direction that matters: it falls as a library
gains leaves and as a window loses readers — a figure that moves when nothing
about a sender has. A deployment whose senders are entirely broken publishes
`witnessed: 0` and a silence, never a healthy share, which is the failure that
would have mattered and is tested.

**And the figure is bracketed rather than guessed.** A witnessed placement whose
own standing is `unknown` reported *something that was not a view* with a reader
below it — a press delegated to a band no `viewed` ever named. That is plausibly
the same defect, and 0382 does not claim it, because `unknown` is the absence of
a claim. So it is neither claimed nor dropped: `indeterminate` counts them,
`share` excludes them and `atMost` includes them. Where none exist the two are
equal and the bracket is a point, which is what a working deployment publishes.

**The figure is a floor and the record says so twice.** Three populations are
outside it. A surface that printed *these are all the parts that went missing*
would be printing something the reading did not say — the same limit the fault
carries, one level up. The portal view is `Loom portal`'s and is bounded by it.

**One refactor, which I would rather have avoided and could not.** The census
needed three projections `pageFrontierOf` already computed and did not publish:
each part's container, the end of its subtree, and the parts below it reporting
reach. Copying them would have been the failure `parts.ts` already names — *two
spellings of a projection that agree today*. They moved to
**`src/signals/subtrees.ts`**, and `frontier.ts` takes them from there with its
27 tests passing untouched. It is **not** re-exported from `index.ts`: it
publishes no answer about a deployment, so it is nobody's door and costs the
names index nothing, which is where `join.ts`, `counters.ts` and `words.ts` sit.

## Records added

- `decisions/0391-a-silent-component-is-a-census-over-the-placements-the-defect-could-be-seen-on-and-the-share-is-bracketed.md`
  — **Accepted.** Ten clauses, six alternatives recorded with their reasons.
  Nothing superseded; it contradicts no accepted record and changes no schema.

0391 was the next number free on `main` **and** on every open branch: 0383,
0384 and 0386 are claimed by #867, #869 and #872, and 0390 is claimed twice —
by #884 here and by #883 in the framework lane.

## Findings filed and closed

Three filed, all appended, none reflowed:

1. **The census landed, and what it does not close.** Closes the open half of the
   11 November (evening) entry — *silent placements gathered by `KindKey`*. The
   entry's **other** open half is untouched and still two lanes' work: nothing
   says how many fixtures in this repository model the defect by accident, and a
   helper in `src/testing/` that refuses a page reading whose root has no row is
   still the cheapest honest version. This lane's new fixtures are built the
   other way round on purpose.
2. **The pre-order walk has one spelling on purpose.** `subtrees.ts`, and the
   rule worth reusing: a module in `src/signals/` that answers nothing is not
   re-exported.
3. **Seven new names on `@jam-overture/loom/signals`**, owned by `Loom docs`,
   with the sentence the page would want written out to be lifted. Fourth entry
   of its kind from this lane.

## Real test numbers

`pnpm verify` **EXIT=0** on the committed tree.

| | |
| --- | --- |
| Framework suite | **287 files, 6,993 tests passed** — one new file and **+21 tests**, all mine |
| Application suite | **487 files, 7,889 tests passed** — untouched by this branch |
| Findings | **1,538 findings, 0 malformed** (1,535 on `main`; three filed here) |
| Prerender | 139 pages, 2,087 text junctions, 0 run together |
| Mutation check, by hand | **15 run, 15 killed** |

**Nothing failed and nothing was skipped or weakened.** One test did go red on
the first full gate and it was mine: `src/documentation.test.ts` enforces the
maintainer's rule that a decision-record number is never part of a published
sentence, and a member comment said *"the defect, by 0382's rule exactly"*. The
sentence was reworded; the rule was not touched.

**The fifteen mutations**, because the list is the evidence and two of them are
the ones this unit exists to get right: `share` over `placements` instead of
over `witnessed`; `silent` raised without a witness below; `indeterminate`
claimed as silent; every placement a leaf; nothing a leaf; the two silences
swapped; `atMost` equal to `share`; the order by share instead of by count;
`null` share sorting first; deduplication removed; `silentTrees` counted on every
placement; `examples` uncapped; `unwitnessed` folded into `witnessed`;
`worstSender` ignoring silence; the role disagreement never raised. All fifteen
killed.

## Byte cost

**Nothing I added runs in a reader's browser.** `broadcast.ts` and its import
graph are untouched and the bundle measures `main`'s figure exactly:
**7,852 minified / 3,458 gzipped**, re-measured on this branch, of ceilings of
8,000 and 3,600.

**The published names index: 79 bytes**, measured by building the file both ways
rather than remembered — **27,289 bytes over 2,116 names on `main`, 27,368 over
2,123 with these seven**, leaving **12,632** of the 40,000. Seven names for 79
bytes is #859's front-coding doing what it was for; the same seven would have
been most of the old cap's headroom.

## Open questions

**Nothing blocking.** Four things worth the maintainer's eye, none of which
holds this branch:

1. **The plan's browser-cost row on `main` still says 7,543** and the true figure
   is 7,852. I did not correct it here: **#884 already carries that correction**
   and a second branch correcting the same row is a conflict. If #884 merges
   first this is already done; if it does not, the next run here should take it
   on a branch of its own.
2. **#884's standing recommendation — that the plan's browser-cost row be a
   tested figure rather than a remembered one — is the right call** and I would
   repeat it. It has gone false twice in six days and I have just had to reason
   about it a third time. `tools/` is in no lane's row, which is why neither of
   us has taken it.
3. **The governance questions on #881 are still open and I made the same call a
   third time today**: I corrected a measured figure in a living document in
   place, with the old value and the date visible — here, §88's own byte figures
   between drafting and measuring. Same recommendation: allow it for a measured
   figure in `docs/`, keep `Superseded by` for anything that changes what a
   record decides.
4. **The next unit from this lane**, unless something outranks it: nothing in
   this subsystem can say *which roles readers engage with and which they skip*
   over a **range** rather than since counting began, and the hourly table's
   limit is the reason. That is priced and declined (6 November), so the honest
   next unit is smaller — the portal can now ask which component to fix, and
   what it cannot ask is **what a fix was worth**: a silent-sender census of two
   windows, which is `library-change.ts`'s shape applied to 0391's rows.

## On the parked door

Nothing in this unit touches per-reader identity and nothing here makes adding
it later more expensive. The census is a count of placements, keyed on the tree
and the type; it has no reader in it at any point, and an opt-in identified
batch would change none of its arithmetic.

## Process

Four open pull requests from this lane were read before starting (#856, #880,
#881, #884) and this branch is off `main`, not stacked on any of them. **No code
overlaps #884**, which touches `part-pace.ts` and its test only. The shared files
are the usual four: `FINDINGS.md` appended and never reflowed, `docs/signals.md`
appended, and `decisions/README.md` and `reference.generated.json` regenerated.

**Nothing self-scheduled, nothing subscribed, no check-in armed, no polling.**
