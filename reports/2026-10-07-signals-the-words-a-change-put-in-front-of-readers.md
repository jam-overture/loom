# Reader signals — the words a change put in front of readers

**Routine:** `Loom signals` · **Date:** 2026-10-07 · **Branch:**
`signals-12-the-words-a-change-put-in-front-of-readers`

## What I completed

§16 of [`docs/signals.md`](../docs/signals.md): `copyChangeOf(was, now)` in
[`src/signals/copy-change.ts`](../src/signals/copy-change.ts), published from
`@jam-overture/loom/signals`.

§14 landed yesterday and counts how much of what a page says gets read, of one
window of one revision. The sentence a change is judged by is the next one, and
it is the one this whole plan is pointed at: *the words nobody read last week
are read now*, or the worse one, *the three hundred words this change wrote are
words nobody has reached.* §10 asks that of where reading stops. Nothing asked
it of text, and the previous run's report named this as the unit that needed
nothing but `main`.

It is the ninth thing taken out of the server-side join rather than collected.
**Nothing was added to a payload, a browser, a column, a store or the
vocabulary.** The broadcaster was not touched.

### The subtraction that reads backwards, which is why this is a record

Two copy readings sit one field apart from the obvious answer, and the obvious
answer is wrong in the direction that flatters a change:

> `now.wordsByStanding.read − was.wordsByStanding.read`

A change that adds four hundred words readers all reach raises that by four
hundred while making the page **less** read as a share of itself. The page got
longer and the reading got worse, and one number says *better*.

The same confusion runs through every other page-level figure a copy reading
publishes, in two different ways:

- **`share` grows with traffic.** Its numerator is the words *at least one*
  reader reached, so a busy week against a quiet one shows a change nobody made.
- **`typical` divides by the page's own words.** It is per-view and therefore
  traffic-proof, and a change that cut four hundred words lowers it with nobody
  having read less.

So the unit here is **the words both revisions say, word for word** — the
*carried* words. Identical text on both sides is the only condition under which
a difference is about reading, and every reader figure in the module is of those
words alone.

### What the change wrote is a census, and it is the half that is exact

`WordsWritten` carries the carried total, the words added, the words removed —
each split by the standing of the part saying them — and the two word counts of
every passage the change reworded. No reader is in any of it, so none of the
error every count in this subsystem carries is either.

That makes it the half that answers under four of the six silences, including a
window with no page views at all. *The change took two hundred words away and
readers had never got to a hundred and eighty of them* is the sentence that says
a change was right, and it is one row — `wrote.removedByStanding`. The opposite
reading of the same row is the one worth stopping for.

### The two reader figures, and which of them is comparable

- **A standing is not.** `PassageMovement` — `held`, `gained`, `lost`, `unread`,
  `unknown` — moves with how many readers there were as well as with how far
  they got, because `read` means *at least one*. It is still the sentence a
  person wants, so it is reported, named for the movement rather than for a
  verdict, and never divided by anything.
- **A share of a side's own views is.** `PassageSide.reach` is `readers ÷ views`
  off one side's own rows, so each side's straddle over-count has very nearly
  divided out before the sides meet. `ComparedPassage.gain` is
  `words × (now.reach − was.reach)`, which reads *this passage put forty more
  words in front of the average reader*, and the gains add across passages
  because a part's own words partition the page exactly once. Their sum is
  `typical.change`.

## Decisions I took that the step did not specify

**A floor costs the page total and not the passage.** This is the half of 0237
I did not expect to be writing, and it narrows 0235 rather than excepting it. A
single passage's `gain` is taken over the *same words on both sides*, so a type
declaring no `copy` scales it toward zero and **cannot flip its sign** — *at
least this many words moved* is a safe claim, which is strictly more than one
window's reading could say. The page total is a sum of signed terms that floors
scale by **different** factors, so a floored passage that gained and an exact one
that lost can sum to a regression where the truth is an improvement. I worked
that case through on paper before deciding, and it is the reason `typical` is
withheld under a floor and the gains are not. `passagesByMovement` is published
beside the word totals because a count of passages survives a floor outright.

**A passage the change moved is compared like any other.** Nothing here divides
by a depth, an index or a parent, so position is in none of the figures. It is
the one place this reading is more forgiving than §10's, where a moved sibling
dissolves the pair it was half of — a pair is a position by construction and a
passage is not. There is a test for it.

**No fate vocabulary, where §10 and §15 both have one.** A `PairFate` exists in
those records because the reasons a pair cannot be compared genuinely overlap
and have to be ordered. Added, removed and reworded are structurally exclusive
and carry different payloads — one word count, one word count, two — so they are
three typed lists rather than a union of three shapes with a side discriminator.
A test asserts no node appears in two of them.

**A part that said nothing before and says something now is a word the change
wrote, not a part the change added.** The two are indistinguishable from a copy
reading's `passages`, which drops the parts that say nothing, so the comparison
is built over **every** part and `passageOf` is now exported from `copy.ts` with
the reason in its doc comment. That is the only change to an existing module in
this branch.

**The silence names come from the change side where the two conventions
disagree.** `CopyChangeSilence` takes `different-trees` and `nothing-measured`
from `ChangeSilence` and `wordless` and `inconsistent` from `CopySilence`, on
the ground that a surface drawing both comparisons of one change should not meet
two names for one state. It is the second time that choice has been made by
whoever was writing the module, and I filed it rather than settling it — see
*Findings*.

**`compared` is in the later reading's order** and `removed` in the earlier
one's, where §10 orders its pairs by the earlier reading. The later order
because that is the page somebody is looking at; a removed passage has only one
order to be in. Tested.

## Records

**[0237](../decisions/0237-a-change-is-read-against-the-words-both-revisions-say-and-a-floor-costs-the-page-total-and-not-the-passage.md)
— A change is read against the words both revisions say, and a floor costs the
page total and not the passage.** Accepted. Nothing is superseded: 0235 is
**narrowed**, and the narrowing is written as a narrowing — its refusal of a
floored mean stands for one window and stands for this module's page total, and
what is new is a property a single window does not have, because there is no
other side for the error to cancel against. 0147 and 0212 are untouched.

**I took 0237 rather than 0236.** 0236 is claimed by two open branches — #539,
this lane's own, and #538, the framework lane's — so it is the fourth number this
has happened to and the maintainer-owned entry on repeated clashes is still
open. 0237 is free on `main` and on every open branch I could see.

## Findings

**Filed two.**

1. **For `Loom portal`** — the sentence a reader screen can lead with after a
   change lands, with the call, the three fields that are the sentence, the
   census row that answers when the readers do not, the two figures that must
   never be added, and the one pair (`readings.was.typical` beside
   `readings.now.typical`) to refuse outright.
2. **For this lane** — two names for one silence, now in three modules. A window
   with no page views is `nothing-measured` in one closed set and `unmeasured` in
   another, and a third set has a related-but-distinct `unopened`. The remedy is
   one exported mapping rather than a renaming, because each set's names are
   right in its own sentence. Not built: it is a decision about the vocabulary of
   four accepted records and worth a run of its own.

**Closed none.** The two findings this lane could close — the stale funnel pair
of 5 October and the 6 October note on why it had to wait — are closed by #539,
which is open and not merged. The 1 October `fetch` question is the maintainer's
and I have not touched it; the previous report said it would stop being raised
unprompted, and this one does not raise it beyond noting it is still open.

## Test numbers, measured

`pnpm install && pnpm verify`, on this branch, **green**:

| | Files | Tests | Failed | Skipped |
| --- | --- | --- | --- | --- |
| Runtime (`src/`) | 187 | 4,053 | 0 | 0 |
| Application (`apps/loom`) | 398 | 7,087 | 0 | 0 |

`prerender:check` passed: 126 prerendered pages, 1,542 text junctions, 0 run
together, 3 metadata conventions, 0 unserved.

`src/signals/copy-change.test.ts` is **31 tests**, all new. Nothing was
weakened, skipped or marked todo anywhere.

**Two failures on the way, both mine and both fixed rather than worked around.**
`src/documentation.test.ts` caught five doc-comment sentences where a record
number was part of the grammar rather than a parenthetical — the maintainer's
rule that a casual reader should not meet *"0235's reason"* — and I rewrote the
five sentences. `app/(docs)/_lib/api/extract.test.ts` then failed because I had
regenerated the API reference **before** `pnpm build`, so the generator read a
stale `dist/`. Regenerated after the build and it matched. Worth knowing for the
next run in this lane: `docs:api` goes after `build`, not before.

### The eight planted defects

Each was planted alone against the finished suite, and each was caught.

| Defect planted | Tests failed |
| --- | --- |
| `typical`'s earlier side divided by the later window's views | 1 |
| `movementOf` requires *both* standings unknown rather than either | 1 |
| `sameText` compares array lengths only | 2 |
| `saysSomething` demands words on both sides rather than either | 1 |
| the `floored` silence dropped, so a floored page publishes a mean | 1 |
| `gain` forgets to weight the reach difference by the words | 5 |
| `stillUnseen` admits an `unknown` passage | 1 |
| a tie in `mostGained` takes the later passage rather than the earlier | 1 |

The first and last of those were **not** caught by the suite as I first wrote it,
and that is the useful part of the exercise. Every fixture I had built gave both
windows the same number of views, so dividing the earlier side by the later
window's views was invisible — which is the exact error the whole module exists
to refuse, and the one a real deployment will hit on its first week-against-week
comparison. I added a case with four views on one side and a hundred on the
other where the *share* of readers is identical, so the honest answer is *no
change*, plus a tie case for the ranking. Both defects are caught now.

### The double-count cases this lane requires

- **A nested part's words are credited to a reader once, not once per level.** A
  band of ten words containing a line of five, both reached by all four readers:
  `typical.now` is 15 against a carried total of 15. A reading that charged the
  band its subtree's words — which is what `pace.ts` deliberately does, and why
  0230 refuses a page total of them — would make it 20 against a page of 15.
- **Every carried passage is in exactly one movement**, asserted by words and by
  passage count, both summing to the carried total.
- **Every passage is in exactly one list**, however the change touched it:
  compared, reworded, added and removed are asserted to name no node twice.
- **Each side's words partition exactly once:**
  `carried + removed + reworded.was === words.was` and
  `carried + added + reworded.now === words.now`, on a page that gained, lost and
  reworded a band at the same time.

## Browser cost

**Zero bytes added.** Nothing in this branch is reachable from a browser entry
point: `copy-change.ts` imports the copy reading and the parts reading and
nothing else. `git diff --stat origin/main -- src/signals/broadcast.ts` prints
nothing, and `browser-weight.test.ts` passes unchanged.

Measured on this branch for the record: the broadcaster bundles to **6,477 bytes
minified** (esbuild, ESM, from `dist/signals/broadcast.js`) and **2,944 bytes
gzipped** (`gzip -9`), which is the figure the last four runs measured, byte for
byte.

## Cross-lane diffs, named

- `apps/loom/app/(docs)/_lib/api/reference.generated.json` — generated with
  `pnpm --filter @loom/app docs:api`, after the build.
- `decisions/README.md` — generated with `pnpm decisions:index`. It prints its
  usual notes for the holes at 0141–0154, and now for 0236, which is the two open
  branches' claim on one number.

Everything else is `src/signals/`, `docs/signals.md`, `FINDINGS.md`, the record
and this report. `src/signals/copy.ts` gains nine lines of doc comment and one
`export` keyword; no behaviour in it changed.

**Open branches that touch the signal path.** #539
(`signals-11-the-pair-the-change-dissolved`) is **this lane's own**, opened last
night and still open. It adds `decisions/0236`, changes `src/signals/funnel.ts`
and `funnel.test.ts`, and adds §15 to the plan. **This branch is off `main` and
does not stack on it:** nothing here imports anything it changes, and the files
that collide do so in ways `Loom merge` already handles — an append to the
union-merged ledger, two generated files, one adjacent line in `index.ts`, and
two non-overlapping sections of the plan. I numbered this section **§16 rather
than §15** and left a note in the plan saying why, so the two do not both claim
one number; if #539 is closed unmerged, this section wants renumbering to §15 and
nothing else changes. #538 is the framework lane and touches no file this branch
does; #537 is the demo, #536 the portal, #535 the lessons.

## The parked door

**Per-reader identity is neither cheaper nor dearer for this change.** Every
figure here is a mean or a count over a window of counters already collapsed from
view keys to counts, so rule 2 has thrown the keys away long before this module
sees anything. What an identity feature would want from *this* question is
*which readers read which passages across two revisions*, which is a per-view
join and is the one thing the shape cannot be bent into.

Nothing here forecloses it either. `copyChangeOf` takes two readings and does not
know where their counts came from, so a denominator that was a real headcount
rather than a view floor would make `typical` an estimate rather than a ceiling
without changing a signature — and `PassageSide.reach` would stop needing its
ceiling caveat entirely.

## Open questions

**1. Nothing blocking.** Everything in §16 is built, tested and on this branch.

**2. The `fetch` hole in `completed` is still open and still yours**, and the
previous report said it would stop being raised unprompted, so this is a status
line rather than an ask: a host's form that posts with `fetch` calls
`preventDefault`, the broadcaster sees a cancelled submit, and a deployment can
have conversions and read zero. I have not acted on it and will not until you
say either way.

**3. The silence vocabulary is a run, if you want it.** The finding above
describes it. My recommendation is to do it **before** a fourth comparison
module rather than after, and to do it as one exported mapping rather than by
renaming anything — four accepted records would have to be amended to rename,
and each set's names are right in its own sentence. It is not blocking anything
and I will pick it up next run unless you point me elsewhere.

**4. Carried over, neither blocking.** The region floor is one constant if 25 is
not your number, and 240 words a minute is the other. Whether the reader-signal
half of `docs/deployment.md` is this lane's is still one line of your reading;
this step added no environment variable, so `docs/signals.md` carries everything
new.
