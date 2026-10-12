# Reader signals — what the readers who met a kind of part did inside it

**Routine:** `Loom signals` · **Date:** 2026-10-12 · **Branch:**
`signals-19-what-readers-do-in-a-kind-of-part` · **Section:** §25 of
[`docs/signals.md`](../docs/signals.md)

## What I completed

`libraryActionOf(readings, rows)` in
[`src/signals/library-action.ts`](../src/signals/library-action.ts): *of the
readers who met your pricing card, three in ten did something inside it.*

It is the **sixteenth** thing taken out of what this subsystem already knows
rather than collected. **Nothing was added to a payload, a browser, a column, a
store or the vocabulary of kinds**, and the broadcaster was not touched —
measured both sides and byte-identical.

Three readings now stand on one list of `PageReading`s and answer three
different questions about one primitive type, keyed the same way and pairing on
the published `kindKeyOf`:

| | |
| --- | --- |
| the **places** it stands, and how many were reached | §23, 0257 |
| the **readers** who met those places, and how many read it | §24, 0256 |
| **those same readers**, and how many acted inside it | §25, 0265 — new |

`engaged` has been on a tally since the counters existed and §18 interpreted it
for one page four days ago. Nothing had ever asked it of a **component**, which
is the thing an author can replace and the thing `git log` holds.

### Why this one can answer where the last one had to withhold

A placement's own share is `engaged ÷ reached`: two distinct page-view counts off
one row, so the straddle divides out (0242, 0221). Across pages it does not, so
each page's weight goes on the door's scale exactly as §24 does.

**But both terms here are reaches off the same rows**, so a page's own scale
cancels inside that page's contribution and the door is needed only to weigh one
page against another. §24's share divides a reach by the *arrivals*, which puts
the scale in its denominator and takes the whole figure with it when a page
cannot be scaled. So:

- **a kind borne by one page needs no door row at all** — its share is that
  page's own sound figure, and a test gives the same answer at a fourfold
  straddle with no row present;
- **a page nobody reached needs no scale either**, because it contributes nothing
  to either term whatever its scale is.

Two or more pages contributing reach with one unscalable is §24's refusal
unchanged, for its reason. The practical consequence is on the pull request
comment and in a finding: #584 reports that the screen's commonest state is every
reader figure withheld, and this column will often be full where that one is
empty.

## Decisions I took that the plan did not specify

All of them are in
**[0265](../decisions/0265-what-readers-do-inside-a-kind-of-part-is-a-share-of-the-readers-who-met-it-and-the-door-is-only-a-weight.md)**
(Accepted; nothing superseded, nothing edited).

**A count is published only on the door's scale.** A scale-free row publishes its
`share` and **not** `met`, `acted` or `ignored`. Putting the counters' own number
in the same column as rows corrected to the door would mix two scales in the one
ordering that matters, and `mostIgnored` reads that column. `onDoorScale` says
which a row is and `unranked` says how many rows the lead could not see — because
a ranking that silently skipped rows is the kind of omission a surface presents as
a complete answer.

**There is no nought share, and that is not a gap.** The denominator is the
readers who *got there*, so a kind nothing reached is `unread` and never a nought
— a nought is the one thing the counters cannot tell apart from nobody ever
seeing it. The census and §24 can both report a nought; this cannot, and the
difference is in the record.

**A page crediting nobody is refused rather than blended.** A page with presses
and no `within` (0167) puts real reach into the denominator and a filing-rule
nought into the numerator, so a mean across pages would be dragged down by a
sender's configuration with no reader involved. That is the same class of error
as a page the door cannot scale, so it gets the same refusal, and
`LibraryAction.unwalked` names the pages.

**No ceiling, and `settled` rather than `exact`.** §24 bounds its estimate
against the openings because openings are exact. Nothing counts an action at the
door, so there is no exact term to bound this with — and none is needed, since
the straddle cancels inside each page's contribution instead of surviving into
the result. `settled` reports the one error left, which is openings not yet
folded moving the weights.

**The lead excludes a kind that is only ever a page's root — and this was found
by a test rather than designed.** My first ranking led with `loom.stack`, because
a root is reached by every view that renders and its `engaged` is the page-wide
*did anybody do anything at all* (0242). Such a row contains every row it would
outrank, so it would lead this reading for ever with *readers opened your pages
and did nothing*. It is excluded the way a page's own reading excludes its root —
**but by the row's `roots` against its `placements` and never by the type's
name**, because a kind is not a node: a type that is a root on one page and a
band on another is a fact about a component, stays in the ranking, and carries
`roots` to say how much of it is page-wide. A test covers that mixed case
specifically.

**The row publishes a places figure as well as a readers figure.** `standings` is
every placement's 0242 standing including the leaves — *readers acted in it in 3
of its 9 places* — beside a share of readers that can be an order of magnitude
away from it. That is the pairing care the other two library readings already
needed, now over three readings, and it is filed for the portal.

## Records added

- **0265** — *What readers do inside a kind of part is a share of the readers who
  met it, and the door is only a weight.* Accepted. Nothing superseded.

I took **0259** because it was the next number free on `main` at the time (0258
the highest; 0252 a gap that #566 will take when it merges) and no open branch
claimed it: #583 and #585 add no record, #566's renumbers to 0252 by its own
merge comment, and #548's is 0245.

**It was renumbered to 0262 by the following run**, on this same branch: #592
merged a marketing record as 0259 between this branch being pushed and `main`
being merged into it, so the repository held two 0259s and `pnpm decisions:index`
refused to build. See `reports/2026-10-12-signals-the-change-a-component-made.md`
— only the number moved, and the record's own direction is untouched.

> **Renumbered again on 2026-10-12 by `Loom merge`, to 0265.** `main` accepted a
> different 0262 (#602) before this branch merged, so the number clashed a second
> time; this branch's other record moved from 0263 to 0266 in the same merge.
> Only the number moved.

## An eleventh silence vocabulary, and the twelfth condition

`library-action`, seven members, subject `kind`. **Five are §24's whole set taken
as it stands** — the census's two and the door's three. That is the affirmative
use of the limit §24 found: a set cannot be reused across *subjects*, and this
reading's subject is a kind exactly as that one's is, so one word means one state
and a test asserts the pair relates as `one-state` rather than `one-reason`. It
is the first set in this subsystem built on another's type rather than beside it.

Two are added. `unwalked` is the eighth set's `no-action-credited` said of a kind.
`unenterable` is the **twelfth condition**, `nothing-inside`: a kind standing only
in places with no element part under them has no question to answer. It is the
first condition here about the **shape of a page** rather than about a window, a
row, a vocabulary or a filing rule — every other one would change if the
deployment were read differently or read more, and this one would be exactly as
true if everybody had read everything. Its one sibling is `says-nothing`, the same
fact about a page's words, and the pair is now the shape of a page in the two
things a reader can do with a part: read it, and act in it.

0240 is not superseded and not edited. The module carries the corrected counts —
twelve conditions, forty-four members, eleven sets, four subjects — and the
paragraph about what this set narrows.

## Findings filed and closed

**Filed (3)**

- **`Loom portal`** — *a kind of part now has three figures, two of them are
  shares of readers and only one is about what readers did.* With the scale-free
  row that has a share and no count, the two silences whose remedies are
  opposite, the `unenterable` state that is neither, and the row not to lead with.
- **`Loom primitives`** — *the missing role declaration now costs a share of what
  readers did as well, and this is the sixth consumer.* What is new is that this
  is the one place where that gap and this lane's 6 October entry are the **same**
  gap: a role for *a thing a reader acts on* would make both answerable at once.
- **`Loom daily build`** — *running a formatter on this repository reformats
  whatever it is pointed at.* See below; it is mine and I caught it, and it is
  filed because the next lane will reach for the same tool.

**Closed (0).** The four open findings owned by this lane are all limits written
down rather than things to build, and the fifth is a question for the maintainer
that has not been answered: the `fetch`-form hole in the conversion counter, open
since 1 October, still wants a reading of rule 3 before it is a unit of work. It
is not blocking anything.

## What went wrong on the way, and it was mine

**I ran `npx prettier --write` on a repository that has no formatter
configuration, and it rewrote three files.** There is no `.prettierrc`, no
`prettier.config.*`, no `.editorconfig` and no format step in `package.json` — so
prettier ran on its own defaults, which are not this repository's: a semicolon on
the end of every statement and a rewrap at 80 columns where the code sits at about
100. Two of the three files were `src/signals/silences.ts` and its suite, where
my actual change was a vocabulary member and a condition. The reformat would have
turned about 150 reviewable lines into a diff touching nearly every line of a
640-line module and a 700-line suite.

**Nothing in `pnpm verify` would have caught it** — there is no lint or format
step, so a wholly reformatted file is green. I caught it because the semicolon
count in a file I had not written looked wrong. Both existing files were reverted
with `git checkout` and re-edited by exact string replacement; the two new files
are mine and were brought back to the repository's style. Filed for the lane that
owns the tooling, with the two cheap ways to close it.

**`pnpm verify` also went red twice and both were mine:**

1. `src/documentation.test.ts` — one field comment read *"the standing 0242 gives
   them"* and another *"the pairing care 0257 and 0256 already needed once"*. A
   record number in the grammar of a sentence is not a parenthetical citation the
   check can lift out. This is the maintainer's own rule about the API reference
   and the check was right; it is the second consecutive run in this lane to trip
   it, in a different spelling.
2. `app/(docs)/_lib/api/extract.test.ts` — the generated reference had been
   regenerated *before* that comment was rewritten, so it was one paragraph stale.
   Regenerated with `pnpm --filter @loom/app docs:api` rather than hand-resolved.

Three of my own test expectations also failed first and were wrong rather than
the module being wrong: two were the root-row ranking above, which is a real rule
I had not thought of, and the third asserted that a share above 1 happens
*exactly* where a placement is unreconciled. The second half of that is false and
instructively so — a role row that adds the impossible placement to a sound one
is dragged back under 1 and still carries the alarm. The test now asserts the
implication that holds and pins the surviving alarm, which is stronger than what
I first wrote.

## Test numbers, which are real

`pnpm install && pnpm verify` — **green, exit 0.**

| | |
| --- | --- |
| Runtime | **206 files, 4,679 tests, all passing** (+1 file, +37 tests) |
| App | **425 files, 7,960 tests, all passing** |
| `src/signals/` alone | 33 files, **892 tests** |
| New tests | **34** in `library-action.test.ts`, **3** in `silences.test.ts` |
| Prerender | 133 pages, 1,798 junctions, 0 run together; 3 metadata conventions, 0 unserved |
| Findings | **1,138 findings, 0 malformed** |

Nothing was skipped and no test was weakened.

## Browser byte cost

**Nothing was added that runs in a browser**, measured rather than assumed.
`src/signals/broadcast.ts` bundled with esbuild (minified, ESM, browser) from a
clean `git archive` of `origin/main` and from this working tree:

| | `origin/main` | this branch |
| --- | --- | --- |
| minified | **6,477 bytes** | **6,477 bytes** |
| gzipped | **2,935 bytes** | **2,935 bytes** |

`cmp` reports the two bundles byte-identical. Gzipped with `gzip -9 -n -c`, per
the note about the file name landing in the header. `library-action.ts` imports
types and two pure functions and is not in the broadcaster's import graph;
`browser-weight.test.ts` passes.

## The double count, five shapes, all covered

0158's rule is that counting a window and forgetting it are one operation, so
every count here is tested against the case where it would double.

1. **One reading handed in twice** — dropped, counted in `duplicated`, and the
   kind's whole row asserted equal to the single-reading row.
2. **One door row handed in twice** — ignored, counted in `duplicatedRows`,
   `arrivals` not doubled and the share and `met` unchanged.
3. **Two revisions of one tree** — two weighing pages, one tree, kept apart from
   the duplicate case, with the weighted share asserted.
4. **One page bearing three placements of one kind** — its readers counted three
   times in that kind's `met`, which is what the unit means, and **once** in the
   reading's `arrivals`. Both asserted in one test, because the two numbers look
   like each other.
5. **A kind standing inside itself** — counted at both depths, tested as the
   thing it is rather than guarded against.

Plus the two that are not double counts and read like them: a share above 1 is
asserted to imply an unreconciled placement over every row of the reading, and a
door row for a page that was not handed in is ignored without being counted as a
duplicate.

## Open questions

Nothing blocking. Two judgements worth a line each are on the pull request
comment, with a recommendation for each.

## Not built, and deliberately

- **A deployment-wide share across kinds.** Refused with its reason in 0265: its
  denominator counts a page once per element node.
- **Signal-to-intent derivation** — the framework lane's, and still out of scope
  for everyone.
- **Per-reader identity** — parked since 30 September; nothing was built and no
  record argues for it. **Nothing in this unit makes it more expensive to add
  later**: every input is a per-deployment aggregate and the published unit is *(a
  page view, a place)* with no identity in it. If an opt-in identified batch ever
  lands, a share of distinct readers who acted would be a new figure beside this
  one rather than a correction to it.

## Working beside the framework lane

I read the open pull requests before starting and `git fetch`ed before branching.
**Nothing open touches the signal path:** #585 is the demo, #584 is the portal
(and is the consumer of §23 and §24, which is why its comment is quoted above),
#583 and #566 are the framework lane's — #566 is still parked on three strings of
portal copy and renumbers its record to 0252 on merge — and #548 is
`src/primitives/`. No branch of this lane was open, so this is a new branch off
`main` per procedure step 3.

The generated API reference moved — the new module's exports — and was
regenerated with `pnpm --filter @loom/app docs:api` rather than hand-resolved;
`decisions/README.md` was regenerated with `pnpm decisions:index`. `FINDINGS.md`
was appended to and nothing in it was reflowed.
