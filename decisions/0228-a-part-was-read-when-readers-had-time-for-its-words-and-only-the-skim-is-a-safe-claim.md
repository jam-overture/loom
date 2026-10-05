# 0228 — A part was read when readers had time for its words, and only the skim is a safe claim

**Status:** Accepted
**Date:** 2026-10-05
**Section:** §4c (reader signals)

## Context

[0212](0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md)
answers *which parts of a page came into view*, and it has always been careful
to say only that. `read` in
[`src/signals/parts.ts`](../src/signals/parts.ts) means **a row says this part
was on a reader's screen** — nothing more, and the doc comment says so.

What a person reads off a screen built on it is something else. A band a reader
scrolled through in two seconds is `read`, a page of them is a page read from
top to bottom, and nobody looking at the result can tell. That is the
plausible-false-number failure this subsystem has now found in five places: the
figure is the right shape, it is on the screen, and it is wrong in the direction
nobody checks.

[`docs/signals.md`](../docs/signals.md) names the question directly in its first
priority — *which parts of a page are read and which are scrolled past* — and
until two days ago half of it was unanswerable. A tally has carried `dwellMs`
beside `reached` since the counters existed. What was missing was the other
side: how much there was to read.
[0223](0223-a-prop-is-copy-when-a-reader-could-quote-it.md) supplied it on
4 October by declaring `copy` across the starter library, and 0212's read-time
join means every counter already stored was reinterpreted the moment it landed.

So both sides of *time on screen against the time the words take* are in hand,
on the server, off rows that already exist. Nothing has to be collected, which
is the asymmetry this plan is built to exploit.

**The obstacle is not the arithmetic. It is that every error in it points the
same way.** Three of them:

- **Dwell is time on screen, not time reading.** The readable rule published in
  [0218](0218-what-a-counter-means-is-published-and-the-browser-pays-for-the-number-and-not-its-name.md)
  counts an element half-showing, so a part accrues dwell while a reader reads
  its neighbour, and an ancestor accrues it for as long as any child was up.
  Time is credited generously.
- **A word count can be a floor.** A type that declares no `copy` has words
  nothing can see
  ([0122](0122-a-primitive-says-which-of-its-props-a-reader-reads.md)), and a
  declared prop holding something that is not a string is a word owed and not
  given. A part says *at least* what was counted.
- **The reader count is generous.** `reached` is a distinct view count summed
  across rollup windows
  ([0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)),
  so a page view that straddled a boundary is two readers carrying one reader's
  dwell, and the mean time per reader is short by that much. This one is
  measured rather than argued, per revision, since
  [0219](0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md).

A module that reported *read* and *not read* off that arithmetic would be making
two claims of very different strength and presenting them as one.

## Decision

**A part is judged by the time its readers had against the time its words take,
and the only verdict that is a claim is the skim.** `readingPaceOf` in
[`src/signals/pace.ts`](../src/signals/pace.ts) takes a `PageReading` and
optional corrections, and returns a verdict per part.

1. **The comparison is `dwellMs ÷ reached` against the subtree's words at a
   published rate.** `READING_WORDS_PER_MINUTE` is 240, the middle of the range
   usually reported for adult silent reading of ordinary prose. It is a costing
   rate, not a claim about a reader, and the verdicts are built to survive it
   being wrong by a wide margin in either direction.

2. **The verdict is asymmetric on purpose: `skimmed` is reached before the floor
   is consulted, and every other verdict after it.** Words nobody counted can
   only make a part *more* skimmed than it already reads, so a skim stands on a
   floor. `paced` and `lingered` do not: where the words are a floor they are
   withheld and the part is `unknown`, with `unreadable` saying why. The time
   credited is generous and the words are a floor, so **`skimmed` says the time
   was short even after every doubt has been resolved in the page's favour.**
   *Readers are not reading this* is worth being sure of. *Readers read this* is
   not a sentence anybody acts on.

3. **Thresholds are the framework's, the rate is the deployment's.**
   `SKIMMED_BELOW` is 0.5 and `LINGERED_ABOVE` is 3; both are published and
   neither is configurable, because they are the statement of how much margin a
   claim needs and that is a promise rather than a local fact. The rate may be
   overridden, because the pace of a page's text is a property of that text and
   its language, which the framework cannot know. Overriding it is safe for the
   reason 0212 gives: the join is at read time, so a deployment that changes the
   rate reinterprets its whole history and invalidates no stored row.

4. **The straddle correction is handed in, not assumed.** `PaceOptions.inflation`
   takes `drift ÷ opened` off the page-view rows (0219) and credits each reader
   with proportionally more time. Absent, negative, zero or not finite are all
   *no correction*, because a negative inflation is not a thing a rollup can
   produce and trusting one would widen the safe claim rather than narrow it.
   This is the third thing taken out of the counter 0219 added.

5. **A part is judged against its subtree's words, so the figures nest and
   nothing adds them.** The words on screen while a band was up are the band's
   and its children's. So a band and the paragraph inside it are both here, the
   paragraph's words are inside the band's count, and **there is no page-wide
   word figure at all** — one reader who scrolled past a band scrolled past
   everything in it, and a sum would charge them for it once per level
   (0147, [0167](0167-a-delegated-signal-names-the-regions-it-happened-inside.md)).
   The root is reported separately as `whole`, and is held out of the ranking
   because it contains every part it would outrank.

6. **Subtrees are gathered by depth, never by parent id.** A slot node is not a
   part and can hold element children, so walking parent ids strands a whole
   band's words on a node the reading has never heard of. The parts are
   pre-order with depths, so a part's subtree is the run of following parts
   deeper than it, which one stack closes in amortised constant time per part.

7. **The ranking key is the words readers passed**, `reached × wordsWithin`,
   most first and ties to reading order. By words passed rather than by the
   worst ratio, for the reason 0221 ranks stops by the readers they lose: a
   caption two readers hurried past is a worse ratio and a smaller problem than
   a band four hundred of them did. It nests, so it ranks and is never summed.

8. **Nothing is collected.** No payload, no browser byte, no column, no store
   method, no kind. The broadcaster is untouched and bundles to the same 6,477
   bytes minified. This is the fifth thing derived from the server-side join
   rather than asked of a reader.

## Consequences

- A reader screen can say *readers spend eight seconds on a band that takes
  fifty to read*, which is the first thing this lane has produced that names a
  **cause** rather than a location. 0221 says where reading stops; this says
  what was not taken in before it stopped, and the two are read together.
- `lingered` is published as a question rather than an answer, and its doc
  comment says so. Dwell counts a part that was merely up, so the tall thing at
  the bottom of a page lingers by construction. A surface that drew it as
  *engagement* would be inventing the opposite of the failure this record
  exists to prevent.
- **The silences are a diagnosis of the library, not of the page.** A deployment
  whose primitives declare no `copy` gets `unreadable` on most of its parts and
  a page of withheld verdicts. That is 0122's bargain showing up in a third
  place, it is the honest answer, and it improves on its own the day the
  declarations land — as the starter library's did, between this record being
  needed and it being written.
- A deployment that never reads its page-view rows gets uncorrected means, which
  are short, which calls marginally more parts skimmed than should be. The bound
  is the one 0219 measures and the option to close it is in the signature.
- **Per-reader identity is neither cheaper nor dearer for this.** Every figure
  is a mean over a window, taken off counters already collapsed from view keys
  to counts — by which point rule 2 has thrown the keys away. Nothing here
  forecloses the same comparison against a real denominator if identity ever
  returns opt-in, because `readingPaceOf` takes a reading and does not know
  where its counts came from.

## Alternatives considered

**Report a reading time and let the surface judge it.** Honest and useless: the
judgement is the hard part and every consumer would invent its own threshold,
which is arithmetic rendered twice and the thing the fold module exists to stop.
The verdict is published *with* the numbers it came from, so a surface that
disagrees can still see the working.

**Two verdicts rather than four.** Read or not read is what a screen wants and it
cannot be given, because the evidence for the two is not the same strength. The
four-member set is the strength written into the vocabulary where a consumer
cannot drop it.

**Judge a part against its own words only.** It would make the figures additive
and it is wrong: a band's dwell is accrued while its children are being read, so
a band whose own copy is a two-word heading would linger on every page it was
ever on.

**Make the thresholds configurable too.** Rejected as a dial-fitting kit. A
deployment that can move the line between *skimmed* and *paced* can produce any
answer it wants about its own pages, and the number would stop meaning anything
across deployments while the field name stayed the same — which is the argument
0218 makes about the readable fractions, holding at the one remove where it
still applies.

**Infer the rate from the page's own dwell distribution.** Self-fulfilling: a
page nobody reads would calibrate to the speed of not reading it and report
itself as read at a normal pace.

**A statistical test on the per-part means.** Declined for the reason 0224
declines it: the error here is systematic rather than sampling, so an interval
computed as though the dwells were independent draws would be narrower than the
truth and would carry more authority than any other figure on the screen. The
asymmetric verdict is a weaker claim that is actually true.

**Count characters rather than words.** More robust across languages and less
legible in every figure derived from it. Words are what a rate is quoted in, and
the override exists for the text the whitespace rule is wrong for.
