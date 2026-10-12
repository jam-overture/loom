# Reader signals — what a change did to a kind of part

**Routine:** `Loom signals` · **Date:** 2026-10-12 (evening run) · **Branch:**
`signals-19-what-readers-do-in-a-kind-of-part` (pushed onto the existing pull
request, #586) · **Section:** §26 of [`docs/signals.md`](../docs/signals.md)

## What I completed

`libraryChangeOf(was, now)` in
[`src/signals/library-change.ts`](../src/signals/library-change.ts): *the band
you rewrote was read in three of its nine places and is read in seven now.*

It is the **seventeenth** thing taken out of what this subsystem already knows
rather than collected. **Nothing was added to a payload, a browser, a column, a
store or the vocabulary of kinds**, and the broadcaster was not touched — measured
both sides and byte-identical.

### The question that could not be asked

Three readings answer about a deployment's library (0257, 0256, 0262) and all
three read **one window**. Six comparisons read two windows and every one of them
is asked of **one page**. So the question an author who changed a *component* has
had no answer: *I rewrote the testimonial band last week; is it read now?* is a
question about a kind of part across forty pages.

The only thing available was two censuses on two screens with somebody
subtracting one share from the other, and **that subtraction is wrong, and not by
a little**: the two censuses are taken over different sets of places. Publish a
page in between and every kind standing on it reports a worse read share with no
reader behaving differently. A test in the suite builds exactly that case — one
place in the earlier window, three in the later — and publishes the number the
subtraction would give (1 and then ⅓, a two-thirds collapse) beside the number
this module gives (held, at 1 both sides).

### Why holding the places still is the whole method

Every figure is taken over the placements that stand in **both** windows: the
same node of the same page, of the same kind on both sides. That is 0239's rule
at another unit — a change is read against the words both revisions say, and a
change to a library is read against the places both windows bore.

What it buys is the thing no other comparison here has. All six compare *shares*,
because a count of readers is inflated by its own window's straddle (0147) and
nothing divides out between two windows. Here the denominator is a count of
**places**: no reader in it, no rollup window in it, and once the places are
paired it is *the same number on both sides*. So this reading publishes

- the movement as counts of places that changed hands, `tookUp` and `fellAway`;
- a verdict that is the **sign of a subtraction of two whole numbers**, with no
  threshold anywhere in it — the only comparison in the subsystem of which that
  is true.

## Decisions I took that the plan did not specify

All of them are in
**[0263](../decisions/0263-a-change-to-a-kind-of-part-is-read-over-the-places-both-windows-bore.md)**
(Accepted; nothing superseded, nothing edited).

**What is confounded is published rather than corrected.** A placement counts as
`read` where **at least one** reader reached it (0212, 0235), so a quiet window
skips more places with nobody behaving differently — and a comparison is the first
reading in which that can be mistaken for a finding. `viewsWas` and `viewsNow`
travel on the reading as floors (0147). Nothing is withheld for it and nothing is
scaled by it: a floor on a window's views is not a correction, and the obvious
alternative — withholding a comparison whose two windows differ in size by more
than some factor — would be a threshold about a deployment's own schedule rather
than about reading. Every other threshold in this subsystem is a published
constant about what reading is (0218).

**The two keys answer differently about one change, and both are right.** A node
whose primitive type changed is a place one kind left and another took: `recast`,
`lost` by the old type, `gained` by the new, because a type is what an author
replaces. The role rows hold it still wherever the two types play the same part,
because a role is what a part plays for a reader (0114). I did not pick one of
the two; the disagreement is the pair of questions a deployment has.

**A page held at two revisions in one window is excluded and named, never picked
between.** A census keeps two live revisions apart on purpose (0250, 0257); a
comparison pairs by page, so such a tree has no single counterpart and either
choice would be a number nobody could account for. It lands in `ambiguous`, which
is §7's refusal in another costume. A paired page whose revision moved *is*
compared, with the fact published as `republished`, so *your readers behave
differently* can be told from *you changed your pages*.

**The verdict is taken from the counts and never from the two shares.** They have
one denominator by construction, so the difference of the shares has the sign of
`tookUp − fellAway` exactly; taking it from the counts keeps a division out of a
verdict, which is the arithmetic 0229 was bitten by in the other direction.

**Five movements, and deliberately no sibling for the good news.**
`still-unread` is kept from `held` for the reason 0251 keeps `still-untouched`
from it: *skipped everywhere, and still skipped everywhere* is the one state here
that is an instruction. *Read everywhere and still read everywhere* is `held` at a
share of one and asks nobody to do anything, so it is not a sixth name.

**Nothing is published that would need prose to defend.** No comparison of words
(a paired placement's revision may have moved underneath it, so the two sides'
words are two different sentences), no comparison of occurrences (a press count
that doubled in a window that doubled is three sentences about traffic wearing one
about reading), and no total over the kinds (0257's reason: it counts a page once
per element node). The published keys of the reading and of a row are pinned by a
test, so a figure added later has to argue with it first.

## A twelfth silence vocabulary, and the claim it was most likely to break

`library-change`, three members, **no new condition and no new subject.**

It is the first **comparison** whose subject is a `kind` rather than the pair.
0240 publishes the subject as a table over the vocabularies, arguing that it is a
property of the reading and uniform across its set; every comparison before this
one names neither side, because *one of the two windows was quiet* is a fact about
the two readings together. This one's rows are keyed by the **vocabulary**, so
every reason it gives is about one kind of part across both windows — and a
`comparison` subject here would have printed *one of the two windows was quiet*
over a row about a primitive type. The claim holds for the reason 0250 already
narrowed it with: the subject was never the reading's own scope.

`unpaired` is `nothing-carried` — the state a comparison of two windows' words
reports of words and a comparison of two paces reports of parts, said here of a
**place**. `unread` and `unplaced` are the census's own two. Twelve vocabularies,
twelve conditions, four subjects, forty-seven members. 0240 is **not** superseded
and not edited; the module carries the corrected counts and the paragraph.

## The record I had to renumber, and why that was not a change of direction

Last night's unit took **0259**, correctly: 0258 was the highest record on `main`
and no open branch claimed it. Between that push and this morning's `git fetch`,
#592 merged a marketing record **as** 0259.

Git reports no conflict for that — two records are two files with two different
names, so `main` merges cleanly and then `pnpm decisions:index` refuses to build
with *259 is claimed by … and …*, which is `pnpm verify` red on a branch whose own
work is sound. So the first thing this run did was renumber last night's record to
**0262**: the file, its own heading, and the four places that cite it
(`silences.ts`, `docs/signals.md`, `FINDINGS.md`, and last night's report, whose
paragraph about which number it took now says what happened). **Only the number
moved** — no sentence of the record's direction was touched, and nothing is
superseded.

Filed for `Loom merge`, with the two cheap ways to stop the next lane paying for
it: the merge routine renumbering a record that clashes with `main` as it lands a
pull request, or the index builder naming the remedy in its error.

## Records added

- **0263** — *A change to a kind of part is read over the places both windows
  bore, and that is the one denominator here with no reader in it.* Accepted.
  Nothing superseded.

I took **0263** because it is the next number free on `main` (0261 is the highest
there) and 0262 is this branch's own, renumbered as above. #587 claims 0259 and
will be renumbered when it merges; #598 and #595 add none that collide.

## Findings filed and closed

**Filed (5)**

- **`Loom portal`** — *a change to a kind of part is answerable now, and the
  screen for it is the one an author opens the morning after changing a
  primitive.* A fourth column on the rows `/portal/pieces` already draws, pairing
  on `kindKeyOf`; with the two numbers that are not optional (`viewsWas`,
  `viewsNow`, and `republished`), the one row where a type and a role
  deliberately disagree, and the three states to refuse to draw.
- **`Loom signals`** — *the honest reader-weighted version of this needs the door
  on both sides and is its own unit*, filed rather than shipped inside 0263's
  type for exactly the reason 0256 was filed rather than shipped inside 0257's.
  Its weights move when traffic does, which needs its own argument.
- **`Loom signals`** — *a change to the words a kind of part says needs 0239's
  intersection per placement*, with the shape it would take.
- **`Loom merge`** — the record-number clash above.
- **`Loom primitives`** — *the missing role declaration now costs a before-and-
  after as well*, the seventh consumer, and the first where the undeclared row
  does something more than answer thinly: it is the row that holds a recast node
  still, so today every swap of one primitive for another is a place still
  standing in the one role row there is.

**Closed (0).** No finding owned by this lane was a thing to build: the two open
ones are limits written down (the 9 October entry about a reading's silences
being about its members, and the 10 October entry about the eighth set's tenth
condition), and both are still true.

## Test numbers, which are real

`pnpm install && pnpm verify` — **green, exit 0.**

| | |
| --- | --- |
| Runtime | **208 files, 4,731 tests, all passing** (+28 on the branch: 26 new in `library-change.test.ts`, 2 in `silences.test.ts`) |
| App | **429 files, 8,132 tests, all passing** |
| `src/signals/` alone | 34 files, **920 tests** |
| Prerender | 133 pages, 1,805 junctions, 0 run together; 3 metadata conventions, 0 unserved |
| Findings | **1,156 findings, 0 malformed** |
| API reference | 17 entry points, **1,549 exports** |

**One thing was red on the way, and it was not mine.** The first `pnpm verify` of
the run — taken after merging `main` into this branch and before writing a line
of the new unit — failed three app tests: `api/extract.test.ts`,
`api/offered.test.ts` and `lessons/_lib/transcripts.test.ts`, every one of them on
a count of exported package names (1,477 against 1,489). That is `routines.md`'
known red: a new export on `main` leaves `reference.generated.json` stale, and
taking either side of a generated file in a merge is only half of the remedy. It
was regenerated with `pnpm build && pnpm --filter @loom/app docs:api`, in that
order, which is what the generated-file rule says and is what the second verify
is green on.

Nothing was skipped and no test was weakened.

## Browser byte cost

**Nothing was added that runs in a browser**, measured rather than assumed.
`src/signals/broadcast.ts` bundled with esbuild (minified, ESM, browser) from a
clean `git archive` of `origin/main` and of this tree:

| | `origin/main` | this branch |
| --- | --- | --- |
| minified | **6,477 bytes** | **6,477 bytes** |
| gzipped | **2,935 bytes** | **2,935 bytes** |

`cmp` reports the two bundles byte-identical. Gzipped with `gzip -9 -n -c`, per
the note about the file name landing in the header.

## The double count, six shapes, all covered

0158's rule is that counting a window and forgetting it are one operation, so
every count here is tested against the case where it would double.

1. **One reading handed in twice in one window** — dropped, counted in
   `duplicated`, and the kind's whole row asserted equal to the single-reading
   row.
2. **One page on both sides** — one paired page and never two, with
   `pagesGained` and `pagesLost` both nought.
3. **A page held at two revisions in one window** — excluded, named in
   `ambiguous`, and kept apart from the duplicate case: `duplicated` stays
   nought.
4. **One page bearing three places of one kind** — three places, the page counted
   once, and the views floor taken once.
5. **A kind standing inside itself** — counted at both depths, which is what a
   placement is, tested as the thing it is rather than guarded against.
6. **A recast node** — in the type rows it is one `lost` and one `gained` and
   never also a paired place; the identity `Σ places = placements`,
   `Σ gained = gained`, `Σ lost = lost` over every type row is asserted on a
   comparison that holds all four cases at once.

Plus the one that is not a double count and reads like one: swapping the two sides
reverses every movement rather than producing a refusal, which is the same
property a before-and-after reading of one page publishes.

## Open questions

Nothing blocking. Two judgements worth a line each are on the pull request
comment, with a recommendation for each.

## Not built, and deliberately

- **The reader-weighted comparison** and **the library-scale comparison of
  words** — both filed, both with their shapes, both refused here for the reason
  0256 was refused inside 0257's type.
- **Signal-to-intent derivation** — the framework lane's, and still out of scope
  for everyone.
- **Per-reader identity** — parked since 30 September; nothing was built and no
  record argues for it. **Nothing in this unit makes it more expensive to add
  later**: both inputs are per-deployment aggregates and the unit this publishes
  is a *place*, which has no reader in it at all. If an opt-in identified batch
  ever lands, *the same readers came back and read more of it* would be a new
  figure beside this one rather than a correction to it.

## Working beside the framework lane

I read the open pull requests before starting and `git fetch`ed first. **Nothing
open touches the signal path:** #598 is `src/project/` and a migration, #595 and
#587 are the framework lane's (#587 renumbers its 0259 at merge), #584 is the
portal — the consumer of 0257 and 0256, and now of this — and #566 is still parked
on three strings of portal copy. This lane's own #586 was open, so this unit is on
**that** branch per procedure step 3 rather than a second one: it touches
`silences.ts`, `index.ts` and `docs/signals.md`, which are the three files a
second branch would have conflicted in.

`main` was merged into the branch; the two generated files conflicted and neither
was hand-resolved — `decisions/README.md` was regenerated with
`pnpm decisions:index` and `reference.generated.json` with
`pnpm build && pnpm --filter @loom/app docs:api`. `FINDINGS.md` was appended to
and nothing in it was reflowed.

One more thing fixed in passing, in this lane's own file: a link to 0257 in
`silences.ts` pointed one directory too high and resolved to nothing. Nothing in
`verify` checks that a record link resolves, which is why it was green; the next
lane to add a record link in `src/` is the one who would have copied it.
