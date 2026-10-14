# Reader signals — the words the typical reader reached

**Routine:** `Loom signals` · **Date:** 2026-10-14 (evening run) · **Branch:**
`signals-31-the-words-the-typical-reader-reached` · **Section:** §31 of
[`docs/signals.md`](../docs/signals.md)

## What I completed

`libraryWordReachChangeOf(was, now)` in
[`src/signals/library-word-reach-change.ts`](../src/signals/library-word-reach-change.ts):
*the typical reader who met your testimonial band reached two hundred of its
words and reaches three hundred now — and it is the readers who moved, not the
traffic.*

It is the **twenty-first** thing taken out of what this subsystem already knows
rather than collected. **Nothing was added to a payload, a browser, a column, a
store or the vocabulary of kinds**, and the broadcaster was not touched —
measured both sides and byte-identical at **6,477 bytes minified / 2,935
gzipped**.

It is the last of the three units this lane filed on 12 October, the morning
§27 landed. Six readings of a library now stand on one list of `PageReading`s:

| | |
| --- | --- |
| the **places** a kind stands, and how many were reached | §23, 0257 |
| the **readers** who met those places, and how many read it | §24, 0256 |
| **those readers**, and how many acted inside it | §25, 0265 |
| what a change did to those **places** | §26, 0266 |
| what a change did to the **words** those places kept | §27, 0270 |
| what a change did to **those readers** | §30, 0279 |
| what a change did to the **words one reader gets to** | §31, 0280 — new |

### Why it is a unit and not a field

§27 compares a kind's carried words by **standing**: a word counts as read where
at least one reader reached the part saying it. That answers *of the words this
kind kept, the share that is read anywhere* — which is a real question, and is
not the one an author who rewrote a component asks. They want to know how far
into it a reader gets.

The filed entry named two things it left open, and the building settled three.

**The unit is the page and not the place, which is the whole structural
difference from §30.** A share of the readers who met a kind is a weighted mean
of per-place shares, so its weight is added once per place (0256). Words are not
a share: a part's own words partition its page exactly once, so two placements
of one kind on one page **add**, and what a reader reached is their sum rather
than either one. So the term is a page's whole carried mass and the weight is
the page's door, added **once**. Adding the door per placement would weight a
page by how finely it was written, and a kind standing three times would have
its figure cut to a third with nobody reading differently. It is in the suite.

**So a whole-library figure is publishable here, and §30 refuses one.** Words
partition and places do not, so adding every kind's carried words reads no
sentence twice — asserted down both keys, which must agree. It is the first
reading-wide number any library comparison publishes, and nothing about it
generalises to a reading whose unit is the place.

**The weights move for §30's reason and are answered by §30's method**, imported
rather than restated: `ifTrafficHeld`, `ifReadingHeld` and a sufficiency verdict,
so no threshold decides anything. The filed entry guessed the two figures would
turn out to be one unit; they turned out to be two units sharing one argument,
which is the better half of that guess.

## Decisions I took that the plan did not specify

**A floor withholds every difference and leaves both levels standing, and it is
stated as one rule rather than a list.** 0239 found what a floor costs at one
page — a single passage's gain survives it because one factor scales it, a sum
of signed terms does not because floors scale them by different factors. Every
figure here is a sum over passages, so: a level is a sum of non-negative terms
and survives a floor **as a floor** (*at least this many words*, which is an
answer); every figure a surface would subtract is withheld, the two
counterfactuals included, because the only thing anybody does with a
counterfactual is subtract a level from it; and the weights survive whole,
because there is no word in them.

**A word nothing can be said about is in no mass.** A carried passage `unknown`
on either side contributes nothing to either side. `unknown` with views in the
window is not *nobody reached it* — it is a press delegated to a band no
`viewed` ever named, so the reader plainly had it in front of them and the
counter is missing. Counting it as nought reader-words understates the figure in
the direction nobody checks. Those words travel as `unspoken`.

**Three rules are now imported rather than copied.** The door-on-both-sides
window, the sufficiency verdict and the weight-movement figure are published
from `library-reach-change.ts`, whose record owns them, exactly as the door's own
scale moved into `door.ts` when a third reading needed it and as the pairing of
two windows is taken from `library-change.ts`. A fourth reading of a library
needs none of them written again.

### One fault found in §27, fixed in the same change

**0270 triggered its floor on a count of words, and the commonest floor there is
has none.** A part whose type declares no `copy` at all says nought visible words
and hides every word it has (0122), so `flooredWords` stayed nought for exactly
the case the rule exists for: a kind whose floored placements all declared
nothing published a signed `change`, a `taken-up` or `abandoned` verdict and no
silence, with a hundred unseen words able to reverse all three.

Both readings now trigger on a count of **placements**, which 0239 has always
done and which 0270 already published on its own row. **0270 is not superseded**
— the rule it states is the rule, and what moved is the number the rule is read
off. One new test in `library-copy-change.test.ts` builds the case and fails
against the old trigger; I checked that by reverting the fix and watching it go
red.

I found it by building this reading, which had to answer the same question to
exist, and I fixed it here rather than filing it because two modules disagreeing
about when a floor bites is the drift the counter tables' upsert keys were moved
into one module to prevent.

### Two things the adversarial re-read found, before anything was pushed

**A withheld row was not saying how much was behind it.** A page bearing a word
both windows could speak for was counted as one of the kind's pages only where
the door could also scale it, so a row withheld for `unscaled` reported nought
pages — which is the row that most needs to say *there is something here I
cannot price*. The page is now counted wherever both windows can speak for a
word on it.

**`unreconciled` could fire on a page with no door row at all.** A page with no
row has nought appearances, so every passage with a reader on it read as *more
reach than the page had appearances* — an alarm about counters pointed at a
deployment whose real state is `unscaled`. It is now counted only where both
doors spoke.

**Two newly published names were too generic for the package surface.** The
window a second reading needs is exported from `library-reach-change.ts` as
`ScaledPage` and `LibrarySide` rather than `Scaled` and `Side` — a bare `Side`
beside the existing `ReadingSide` is a name a caller would guess wrong.

## Records

- [0280](../decisions/0280-the-words-of-a-kind-of-part-the-typical-reader-reached-are-weighted-once-per-page-and-a-floor-withholds-every-difference.md)
  — *The words of a kind of part the typical reader reached are weighted once
  per page, and a floor withholds every difference.* Accepted; nothing is
  superseded and nothing in it needs built code migrated.

**On the number.** 0277 and 0278 are claimed by #633, which is open and waiting
on your decision about 0278, and 0279 is on `main`. So this took **0280**, the
next number free on `main`, and leaves 0277 and 0278 reported as holes on this
branch, which 0097 allows.

## Findings

**Closed:** this lane's 12 October entry on the word-weighted reader figure,
built here as it proposed it, with the three things it left open decided and
written into the entry. That was the last of the three units filed that
morning — nothing in this lane's queue now waits on a figure that does not
exist.

**Filed, and closed in the same run:** the 0270 floor trigger, written down
because it is a published figure that was wrong rather than thin.

**Filed, open:** that a page's own word comparison (0239) counts an `unknown`
passage as nought reader-words, where the library figure refuses to. It is one
decision about two published figures and a third that quotes them, not a line to
change, so it has a shape rather than a patch. Nothing is lost by waiting: both
figures are ceilings, and this makes them looser ones, which is the safe
direction for a number published as *at most*.

**Filed for `Loom portal`:** the third mass a kind of part now has, which is the
one figure on a library card that is **not a share** and must not be drawn on a
share's axis, with four things the screen must not do — each a refusal in the
record rather than an oversight in the filing.

### One thing measured by accident after the pull request opened

#640's first body carried two markdown links, 228 and 156 characters, and both
came back with backticks injected around the URL — the open mangling entry, hit
again. The comment's 82-character preview URL came back clean, and the body
rewritten with a 117-character link under a short sha came back clean too.

Three readings in one evening, two of them on either side of the old bracket:
the threshold moves from `(133, 177]` to **`(133, 156]`**. Filed as its own
entry extending this morning's rather than edited into it, since that one is
another lane's. The rule this lane will follow until it is fixed is in the
entry: a URL in a pull request body goes under a short commit sha, and anything
longer is named in backticks rather than linked.

## Tests

`pnpm verify` **green, exit 0** — **5,075 runtime tests across 225 files** and
**5,797 app tests across 327 files**, 1,201 findings checked and none malformed,
1,832 visuals none over 1.1MB, and 133 prerendered pages with 1,839 text
junctions and none run together. Nothing skipped, nothing weakened, no `any`,
no new `eslint-disable`.

| suite | tests |
| --- | --- |
| `src/signals/library-word-reach-change.test.ts` | 22, new |
| `src/signals/library-copy-change.test.ts` | 30, one new for the floor trigger |
| `src/signals/silences.test.ts` | 46, the fifteenth vocabulary registered |
| `src/signals/library-reach-change.test.ts` | 26, unchanged against the three rules it now exports |

**Fourteen mutations were planted and two of them survived the first pass**,
which is the useful half of the exercise. The twelve caught immediately: the
weight added per placement rather than per page, the counterfactual weights
swapped, the mass not put on the door's scale, the floor triggered on words, a
passage no window can speak for counted as nought, a recast place carried by the
whole library, a door blocked on one side ignored, a rewritten placement counted
into the mass, the levels withheld under a floor along with the differences,
`weightMoved` withheld under a floor, a kind withheld for a subset of its pages
rather than whole, and the `wordless` check read off words.

The two that survived, and the tests they produced:

- **the movement stated at the earlier window's scale** — every fixture had the
  two windows the same size. The test now compares a window of 100 arrivals
  against one of 200 at the same reading, and asserts `wordsMoved` is 240 and
  not 120.
- **role rows holding a place whose role changed** — the role vocabulary has one
  member (0114), so no fixture had a node whose role moved. The test now hands
  the same type in with two different declarations, one window each, and asserts
  the `heading` row loses the place, the `null` row gains it and holds it in
  neither, while the type row holds it throughout. Catching it needed an
  assertion on the row that would have **gained** the place wrongly, not only on
  the one that lost it — the first version of the test asserted half of that and
  the mutation walked through it.

Every planted mutation was re-run after the arithmetic was ordered to match
0256's published order of operations — `mass × counted ÷ appearances` — so that
the whole-library figure over one exact page is `copyChangeOf`'s own `typical`
to the last bit, which is its own test and asserted with `toBe`.

## Browser cost

**Nothing new runs in a browser.** Measured both sides from a clean
`git archive`: the broadcaster bundles to **6,477 bytes minified, 2,935
gzipped** on `origin/main` and on this branch, and `cmp` reports the two bundles
byte-identical. The reading is server-side arithmetic over counters that already
exist; `browser-weight.test.ts` still finds no package in the broadcaster's
import graph.

## Open questions

Nothing blocking. Two things worth your eye, both with a recommendation in the
pull request comment: whether the `unknown`-passage treatment should be carried
back into 0235 and 0239 (I think yes, as its own unit), and whether a reading
should ever publish a whole-library figure at all, now that one does.

## On the door that is parked

Nothing in this unit touches per-reader identity and nothing in it makes adding
that gate later more expensive. Every term is a count of page views and a count
of words. The one place a person could have been introduced — a headcount to
state the typical reader in — is deliberately a rate per page view at the door's
scale instead, for the reason 0256 gave on 11 October.

## On the lane beside this one

#633 (`Loom daily build`) was open through this run and touches
`src/store/`, `src/testing/` and `lessons/` — nothing on the signal path, so
nothing was raced. It claims 0277 and 0278; this branch takes 0280 and reports
both as holes. The shared files it also touches are `FINDINGS.md` (union-merged,
appended to here and not reflowed), `decisions/README.md` and
`reference.generated.json` (both regenerated, never hand-resolved).
