# Reader signals — the approved plan

**Status: approved by the maintainer, 13 September 2026.** This supersedes the
*Maintainer direction — do not start these* section of
[`reports/2026-09-12-reader-signals.md`](../reports/2026-09-12-reader-signals.md),
which deferred capture, storage, aggregation and interpretation. **That deferral
is lifted.** Work in this document is approved and may be started by the lane
that owns it.

Written by the framework routine at the maintainer's instruction, in an
interactive session on 13 September — the same route by which
[`routines.md`](routines.md) came to exist, since a routine cannot write the
governance it is bound by on its own initiative.

## Why this matters more than it looks

Loom exists so a page can change from how people actually use it. **A model that
cannot hear what readers did cannot adapt well** — it can only restate the tree
back at itself. Signals are the input half of the entire premise, and until now
the framework could speak them and nothing could hear them.

The commercial half follows from the same fact: a deployment that can see, app by
app, which bands readers reach and which asks they answer has a reason to open
the portal every day.

## What is already built

| | |
| --- | --- |
| Five closed kinds | `viewed`, `dwelled`, `activated`, `disclosed`, `completed` |
| Identity | node id + primitive type, filed under the batch's tree and revision |
| Content | **none** — no text, no URLs, no typed values, nothing about the reader |
| Configuration | the host's argument, never a prop in the tree |
| Default | off; an unaddressed render is byte-identical |
| Browser cost | **4.8 KB**, guarded by `src/signals/browser-weight.test.ts` |
| How much of what it says gets read | words readers reached against the words the page says ([0235](../decisions/0235-how-much-of-a-page-gets-read-is-a-share-of-words-that-partition-it-and-the-typical-reader-is-a-ceiling.md)), with the passages nobody saw |
| What a change did to what gets read | the words both revisions say, read before against read now ([0239](../decisions/0239-a-change-is-read-against-the-words-both-revisions-say-and-a-floor-costs-the-page-total-and-not-the-passage.md)), with what the change wrote counted apart |
| Whether readers had time to read it | time on screen against the time its words take ([0230](../decisions/0230-a-part-was-read-when-readers-had-time-for-its-words-and-only-the-skim-is-a-safe-claim.md)), where only the skim is a claim |
| What a page's own shape says | where reading stops, as falls between siblings ([0221](../decisions/0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)), derived from counters that already existed |
| Arrivals | one batch of a page view says it opened one, which is how a region is counted once per reader, and how page views are counted exactly |
| Whether a funnel question still names anything | each end looked up in the revision, with what is withheld decided per figure ([0238](../decisions/0238-a-funnel-end-the-revision-no-longer-has-is-a-standing-and-what-is-withheld-is-per-figure.md)) |
| What a change did | two readings compared, pair by pair, as shares and never counts ([0224](../decisions/0224-a-before-and-after-reading-compares-two-shares-and-a-pair-the-change-dissolved-is-an-answer.md)) — which is also *this week against last week* |
| How far readers got, as a share of the readers there were | estimated against the appearances and bounded against the openings ([0229](../decisions/0229-a-share-of-readers-is-estimated-against-the-appearances-and-bounded-against-the-openings.md)), so a rate can be stated with its own error beside it |
| What *on screen* means | published as `READABLE_VISIBLE_FRACTION` and `READABLE_VIEWPORT_FRACTION` ([0218](../decisions/0218-what-a-counter-means-is-published-and-the-browser-pays-for-the-number-and-not-its-name.md)), so a page quotes the rule instead of typing it |
| What a reading means when it says nothing | the condition and the subject behind all fifteen names ([0240](../decisions/0240-a-silence-is-a-condition-and-a-subject-and-the-two-names-for-one-state-were-not-synonyms.md)), so one state is one sentence and the two `unmeasured`s are two |

Decision [0136](../decisions/0136-a-published-page-broadcasts-reader-signals-when-its-host-asks.md).
The guide is */docs/the-runtime/what-your-readers-do*.
`prototypes/ski-apparel` is a working end-to-end example, including the rail.

## Who owns this

**`Loom signals`**, a routine the maintainer created on 30 September 2026 to run
beside `Loom daily build` on the same schedule. Its lane is `src/signals/`, the
intake under `apps/loom/app/`, and this file.

It is pointed at one thing: **what Loom can answer about its readers, rather than
how much it collects.** The six rules below are the shape of that, and the first
place to look for new capability is what is already in a batch — a tree id and a
revision join to the registry on the server, so most "we should send more" turns
out to be "we should interpret what we have".

`src/render/` and `src/sdk/` stay `Loom daily build`'s, so an attribute on the
markup or a declaration on a primitive is a finding filed for that lane. So is
signal-to-intent derivation, which is still out of scope for everyone.

## The rules this is built under

These are settled. A change to any of them is a decision record, not a judgement
call inside a pull request.

1. **A signal stays anonymous and node-shaped.** No visitor id, no device id, no
   fingerprint, no cross-page stitching, no replay, no cursor coordinates
   ([0146](../decisions/0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)).
2. **A funnel is correlated inside one page view** — an opaque random `view` key
   that never leaves the aggregation step, never persists, and is never derived
   from anything about the reader (0146). This is what makes conversion
   answerable without making a reader identifiable.
3. **Measurement is never a prop in the tree.** A proposal must not be able to
   switch reader measurement on by writing a delta (0136). This rules out a
   "tracking component" a page could drop in, and it is deliberate.
4. **Performance is not traded for measurement.** The broadcaster's import graph
   reaches no package; `browser-weight.test.ts` fails if one creeps back in. The
   ledger is linear, not quadratic — it was quadratic once, and a 6,000-node page
   took 314 ms. Anything added stays behind both.

   One limit found in it on 2 October, measured and recorded in
   [0218](../decisions/0218-what-a-counter-means-is-published-and-the-browser-pays-for-the-number-and-not-its-name.md):
   **a name the browser entry point *exports* survives minification.** Two
   exported constants cost 77 bytes minified where the same two numbers imported
   into `broadcast.ts` cost nothing, and the two spellings are
   indistinguishable in a diff. A value the browser applies and a page needs to
   quote lives in its own module, imported there and re-exported from
   `@jam-overture/loom/signals`.
5. **Aggregates are the durable artefact.** Raw batches are a short-lived buffer,
   rolled up and expired. Retention is per-deployment configuration with a short
   default, never a constant (0146).
6. **The vocabulary stays closed.** Five kinds, `completed` having landed on
   1 October ([0211](../decisions/0211-a-completion-is-a-form-the-browser-let-go.md)).
   A sixth is a record.

## The plan, in order

Each step is a lane's to build. Later steps depend on earlier ones being on
`main`; do not start one whose input does not exist yet.

### 1. The broadcaster stops going blind · `Loom signals` · **done**

`broadcastReaderSignals` finds addressed elements once, when it is called
(`src/signals/broadcast.ts:296`), and never looks again. Anything rendered
afterwards is invisible to `viewed` and `dwelled`: a band behind a Suspense
boundary, a region a client component mounts, a list that grows — **and every
band the Gate just changed.**

That last one is the whole product. *Before versus after a change* is the
measurement that justifies Loom existing, and it is exactly the measurement
that does not work. Client-side navigation is the sharpest case: a broadcaster
left on the old root reports nothing more, and nothing says so.

**Done looks like:** a `MutationObserver` on the root for added and removed
addressed elements — the broadcaster already runs one for disclosures at
`broadcast.ts:336` — and a sentence in the module documentation that a new root
or revision is a new broadcast. Closes the open finding of 12 September.

### 2. `completed`, the kind that closes a funnel · `Loom signals` · **done, 1 October**

The existing four measure attention. None of them says a reader *finished*
anything, so the portal could show engagement and never conversion.

`completed` fires when a form inside an addressed node submits successfully. It
is observable from the root the way clicks already are (`broadcast.ts:378`
delegates `click`), it carries no more than the other four — a node id, its type,
an instant — and it is the difference between "they looked at the pricing band"
and "they bought".

**Not approved:** `hovered`. It is absent on touch, fires constantly, and is the
one addition that genuinely threatens rule 4. If it is ever wanted it should be
*hovered with intent* — dwell-thresholded — and it needs its own argument.

**Done**, and three things were settled in the building that the step did not
say ([0211](../decisions/0211-a-completion-is-a-form-the-browser-let-go.md)).
A completion is a `submit` the page did not cancel, which is the whole of what a
browser can attest — so a form posted with `fetch` and cancelled reports
nothing, deliberately. The cancellation is read in a microtask after the
dispatch, because whether the broadcaster's listener runs before or after the
page's own is registration order. And the kind **carries `within`**: it is a
third `DELEGATED_READER_SIGNAL_KIND`, since the node a completion names is the
form and the band the form was the end of is the thing worth reading — the
rarest kind in the vocabulary, so 0167's volume argument does not reach it.
`ReaderTally` gains `completions`; a `FunnelPair` ending in `completed` is a
conversion rate and needed no new shape. The broadcaster grew 281 bytes
minified, 88 gzipped.

### 3. Ingestion, storage and rollup · `Loom signals` · **done**

**Reuse the telemetry subsystem's shape; do not build a parallel one.**
`src/telemetry/` already has a journal, a sink, memory and Postgres
implementations, a contract suite and `retention.ts`. Signals get the same
treatment: an ingestion function that parses with `parseReaderSignalBatch`, a
store interface with two implementations and one contract suite, and rollup to
per-node-per-revision counters.

The `view` key of 0146 is minted here-ward — in the broadcaster, carried on the
batch, consumed by rollup, dropped with the raw window.

**Also here:** the fold. `prototypes/ski-apparel/readings.mjs` is already a pure,
browser-safe aggregation of batches into dwell, reached, jumps and opened. It
becomes a framework module so that the portal's view and any demo rail are the
same arithmetic rendered twice rather than two implementations that drift.
(`prototypes/` belongs to no lane and is not edited — the module is written in
`src/`, taking the prototype as the reference.)

### 4. The portal view · `Loom portal` · **approved, after 3**

App by app: which bands readers reach, how long they stay, which asks they open,
which they complete, and the funnel pairs the deployment named. Before and after
a change, because step 1 makes that honest.

**Do not start before step 3 is on `main`** — there is nothing to read until
then, and a screen built against an imagined shape is a screen rebuilt.

### 5. Docs, lessons, marketing · their lanes · **approved, after 3**

The guide exists for broadcasting and will need the capture half. Lessons and
marketing follow the same rule: **after the shape settles, not during.** Writing
them while step 3 is in flight means writing them twice.

### 6. What a signal means, joined on the server · `Loom signals` · **done, 1 October**

A batch names a node, a tree and a revision. The registry knows what that node
*is* — the part it plays (0114), which of its props a reader reads (0122) — and
intake and rollup hold both. So `dwelled on n_42` can be counted as *time spent
on a pricing band* with **no byte added to the payload**, no browser change, and
no new decision about what to keep.

That is the asymmetry worth exploiting: the wire stays node-shaped and anonymous,
while what can be asked of the counters grows. Which roles readers engage with
and which they skip; which parts of a page are read and which are scrolled past;
which copy a reader actually reached.

**Not this:** sending the metadata from the browser. 0167 already refused
ancestry on the high-volume kinds — payload multiplied by page depth, to buy what
the server could derive — and the same argument covers roles, parts and copy.

**Done.** `pageReadingOf(tree, tallies, declarations)` in `src/signals/parts.ts`
is the join: every element node of a revision in reading order, each with the
role its type declared, the words it says itself, and the counters filed against
it or nothing. Four things were settled in the building and are in
[0212](../decisions/0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md):

- **The join is at read time, not at rollup time.** A declaration is a fact about
  the library, not about a window of reading, so stamping it onto a stored row
  bakes today's silence into counters that outlive it — and the correction is
  impossible once the raw window has expired. Read-time means the day
  `src/primitives/` declares `copy` across itself, every counter already stored
  reinterprets.
- **The tree is what makes silence a measurement.** A part nobody reached has no
  row, so no reading of the counters alone can say a part was *skipped*. The
  element nodes of the revision are the universe — a text or slot node carries no
  identity attributes, so no signal can ever name one — and against that universe
  absence is an answer. This is the half of step 6 that works today and needs no
  declaration from anybody.
- **Three standings, not two.** `read`, `skipped`, and `unknown` for a window
  with no views at all or a part that reported something other than a view. A
  two-valued reading has to call a page nobody opened a page everybody skipped.
- **A grouped row adds occurrences and never view counts.** `views`, `reached`
  and `engaged` are absent from every per-role total: distinctness cannot be
  added (0147), and `engaged` would count one press twice, once on the control
  and once on the band it was inside (0167). A role row counts *parts* read,
  skipped and unknown instead.

**It answers thinly today, and the thinness is in another lane.** Nothing in
`src/primitives/` declares `role` or `copy`, so every part comes back
`role: null` with its string props named in `copy.unread` — 0114's and 0122's
stated bargain, where *nobody has said* is a different answer from *there are
none*. Filed for `Loom primitives`, which now has a second consumer and a
concrete payoff.

### 7. Region, as an aggregate and nothing else · `Loom signals` · **done, 2 October**

Where readers are, which the intake can read from the request without the browser
knowing anything about it. Three constraints are the design:

- **it lands on a counter, never on a batch** — a region beside a `view` key on a
  raw row is a step toward a profile;
- **a bucket is kept only once it holds enough views to not be a person**, with
  the floor as configuration and the reason in the record;
- **the address it came from is never stored**, and no digest of one outlives the
  process.

**Done**, and one thing the step did not anticipate turned out to decide the whole
shape ([0214](../decisions/0214-where-readers-are-is-a-floored-bucket-counted-at-the-door-and-a-page-view-says-when-it-began.md)).

**A region counter has to count page views, and an intake cannot count them.**
Rollup counts distinct views by comparing view keys inside a window; the door
cannot, because a view key may never be written down, so it has no way to tell a
reader's fortieth delivery from a fortieth reader. The only unit available to it
unaided is the delivery — and that does not merely blur the number, it **inverts
the floor**: a reader who stays ten minutes posts a hundred batches, so one person
clears any floor on their own and is reported as a readership.

So a batch now says whether it opened its page view — `first: true`, on at most
one batch of a view, refused by the parser unless the batch names the view it
opened. It is the one addition to a payload this plan has made, it is **31 bytes
minified and 13 on the wire once per page view**, and it is the thing that could
not be derived: deriving it server-side means remembering view keys, which is the
one value rule 2 forbids keeping.

What that bought, beyond the floor meaning something: **a region view is exact.**
It is counted once, when a page view began, so region numbers add across
revisions, trees and months — unlike `views` on a tally, which is a distinct count
summed across windows and over-counts the views that straddle one (0147). The same
marker would give a rollup an exact count of page views *begun* in a window, which
is that approximation solved rather than bounded. Not built: it is a column and a
counter, and it is the next question rather than this step.

Three other things settled in the building:

- **The floor is 25 views, applied when the rows are read, and raise-only.** A
  floor enforced at write time cannot work — a bucket that is never written can
  never reach the floor, so the map stays empty for ever. What is withheld is
  still reported as a total that names nowhere, so a reading accounts for every
  view there was. An operator may be more careful than the default and not less,
  and the status endpoint says so when a smaller number was refused.
- **The readers nobody could place are a bucket and are never withheld.** They
  name no place, so there is nobody in them to re-identify, and hiding them would
  make a reading's numbers stop adding up.
- **A region is a closed set — two letters, or the word for not knowing.** The
  header is written by whatever is in front of the application, so on a deployment
  whose proxy passes a caller's value through it is written by the caller.
  Anything that is not a country code is unplaced, which makes the worst a
  poisoned header can do *adding to a bucket that already exists*.

**How a deployment switches it on.** Nothing, if intake is on: regions are counted
by default, read from `x-vercel-ip-country`, floored at 25. `LOOM_SIGNAL_REGION=off`
refuses it, `LOOM_SIGNAL_REGION_HEADER` names another platform's header, and
`LOOM_SIGNAL_REGION_FLOOR` raises the floor. `GET /api/reader-signals` says which
of those is in force. The operator-facing documentation is another lane's and is
filed as a finding.

### 8. The page view, counted once · `Loom signals` · **done, 3 October**

The column and the counter §7 named and did not build. Every figure the portal
will show is a rate, and the denominator was `views` on a tally — a distinct
count added across rollup windows, generous by every page view that straddled one
(0147), bounded by arithmetic a deployment cannot evaluate from its own rows.

**Done**, and the shape is in
[0219](../decisions/0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md).
`loom_reader_page_views` is a tree, a revision and two numbers. `opened` is
counted at the door from the opening markers of a delivery, once per page view,
deduplicated by view key — the same walk the region buckets are stamped onto, so
the two counters can never disagree about how many readers arrived. `appearances`
is what every rollup already computed and nobody kept: the window's distinct page
views, per revision.

**The difference between the two is the over-count, in the rows.** For an honest
sender the only way they can differ is a visit that spanned two windows, so
`appearances − opened` is the straddle and `drift ÷ opened` is how generous the
distinct counts against that revision are. 0147's bound is still true and is no
longer all a deployment has. `pageViewReadingOf` is the reading: `opened`,
`appearances`, `drift`, `inflation`, and `pending` for the openings a rollup has
not reached yet — which is the other sign of the same subtraction and what a
stalled collection looks like.

Three things settled in the building:

- **Nothing new is on the wire and nothing new is in the browser.** The marker
  already ships for §7, at 31 bytes minified and 13 once per page view. This is
  the second thing derived from it, which is the asymmetry this plan exists to
  exploit: the payload stays node-shaped while what can be asked of the counters
  grows.
- **No floor and no switch.** A region bucket is floored because a country with
  four views in it is a person; *four page views of revision 3* names nowhere and
  nobody. A deployment with intake on counts them, and an operator has nothing to
  turn on first.
- **The marker still stops at the door.** Both journals drop it and the contract
  suite says so, so a rollup is never a second place deciding how many readers
  there were. Putting it on a raw row would make the buffer say *this page view
  began at this moment*, which is the step toward a profile §7 refused.

**What it leaves for the portal**, which is `Loom portal`'s and filed: an exact
denominator for every rate on the reader screen, and a figure for how generous
the per-node numbers are beside it. A rate shown without that was quietly wrong
by an amount nobody could state.

### 9. Where in a page reading stops · `Loom signals` · **done, 3 October**

§6 made the tree the universe a window is read against, so a part nobody reached
has an answer instead of no row. What it stopped short of is the **shape** of
that answer, which its own doc comment named: *where in the page the reading
stops, and a set of rows keyed by id cannot show it.*

**Done.** `readingProgressOf(reading)` in
[`src/signals/progress.ts`](../src/signals/progress.ts) takes a `PageReading` and
returns the falls — *readers get through the first four bands and the fifth is
where they leave*. It is the first thing this lane has built that tells a
**model** something to act on rather than telling a person something true, and it
is the third thing derived from the server-side join rather than collected
(§6, §7 and §8 being the others). **Nothing was added to a payload, a browser, a
column or the vocabulary**; the broadcaster was not touched, so its weight is
unchanged.

Two things decided the shape, and both are about honesty rather than mechanics
([0221](../decisions/0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)):

- **The obvious answer — a page-wide curve of `reached` in reading order — is
  not a curve.** A part deep inside the first band comes before the second band
  in document order and is reached by fewer readers than either, so the sequence
  does not descend and a fall in it is not a reader leaving. The unit is a **run**
  instead: one parent's children, in the order a reader meets them. Siblings are
  comparable, cousins are not, and every part is a step in at most one run — so
  no reader's progress is counted at two depths.
- **A fall is reported as a ratio of two `reached` counts off the same rows, and
  that is what makes it showable.** A reader who straddled a rollup window
  straddled it for the whole page, so the over-count 0147 names is very nearly
  common to the numerator and the denominator and divides out. *Four in ten
  readers stopped here* survives an inflation that *four hundred readers* does
  not — and the exact denominator §8 added is deliberately **not** used here,
  because `opened` and `reached` are different counters written in different
  places and their ratio can honestly exceed 1.

Three more settled in the building: a part that reported something other than a
view **cannot anchor a stop** (its `reached` of 0 means *unknown*, not *nobody*,
so a stop names the two nearest parts that can anchor one and the rest are
counted in `unanchored` — which is a diagnosis nobody had, since a sender
delegating presses to regions no `viewed` names previously looked exactly like a
quiet page); a **rise** is counted rather than reported as a negative fall,
because scrolling cannot produce one; and the page's one headline figure is
ranked by **readers lost** rather than by share, because a band two readers out of
three abandoned is a worse rate and a smaller problem than one four hundred out
of a thousand did.

**What it leaves for the portal**, which is `Loom portal`'s and filed: the shape
of the reader screen, rather than one more row on it.

### 10. Before and after the change · `Loom signals` · **done, 4 October**

Everything above reads **one window of one revision**. The measurement Loom
exists for is the comparison of two — a model proposed, a gate recorded, the page
changed, and the question that justifies all of it is whether readers got
further. §1 made that honest at the collection end, where a broadcaster used to
go blind at exactly the bands the Gate had just changed. Nothing read it.

**Done.** `readingChangeOf(was, now)` in
[`src/signals/change.ts`](../src/signals/change.ts) takes two `PageReading`s and
answers *six in ten readers left at the pricing band and now four in ten do*. It
is the fourth thing taken out of the server-side join rather than collected (§6,
§7, §8 and §9 being the others): **nothing was added to a payload, a browser, a
column, a store or the vocabulary**, and the broadcaster was not touched, so its
weight is unchanged.

Three things decided the shape, all of them about what is comparable
([0224](../decisions/0224-a-before-and-after-reading-compares-two-shares-and-a-pair-the-change-dissolved-is-an-answer.md)):

- **A `reached` count is not comparable across two revisions and a share is.**
  Two revisions are two trees read by two sets of readers in two windows, so the
  counts differ for three reasons at once and nothing divides out. A stop's share
  is `lost ÷ reached` off two rows of one revision, so 0221's cancellation has
  already happened on each side before the two sides meet. So the unit of
  comparison is the **stop**, and nothing here divides one side's count by the
  other's.
- **A pair the change dissolved is an answer, not a gap.** A change can remove an
  end of a pair, move one away, swap them, or insert a band between them — and a
  comparison that joined on pairs and dropped the misses would be silent about
  *the commonest change anybody will make*. Five fates are reported with the
  side's own figure: `absent`, `unanchorable`, `moved`, `reordered` and
  `separated`. The last is the one worth looking at hardest.
- **The measurement that looks most like success can mean the page stopped being
  read.** A share of 0.6 beside a pair nobody now reaches subtracts to a perfect
  fix. It is `unreached`, filed on whichever side somebody reached, and it is
  never a fall that was fixed.

Four more settled in the building: the threshold for a real move is **one
reader**, evaluated by cross-multiplying integers so no rounding error decides
whether a reader exists; the ranking key is **readers kept at the volume the page
has now**, not share, for 0221's reason; there is **no page-level total** of
readers kept, because one reader who got past two bands is in both stops'
figures (0147, 0167); and **two readings of one revision is a first-class
question** — hand it two windows of the same page and the same function answers
*this week against last week*.

And the tree half of the answer stands when the reader half cannot: a window with
no views still reports what the change did to the page — parts added, removed,
moved and reworded — because *three bands moved and one was reworded, and nothing
has been measured since* is a true and useful sentence. `reworded` is a **floor**
and says so: a part whose type declares no `copy` has no words to compare, which
is the §6 thinness showing up in a second place, and `unreadable` counts how many
parts that is rather than calling them unchanged.

**What it leaves for the portal**, which is `Loom portal`'s and filed: the one
sentence a reader screen can lead with, and the four things to be careful of.

### 11. The denominator every rate was missing · `Loom signals` · **done, 4 October**

§8 counted page views exactly and §6 joined the counters to the tree, and the two
halves of every rate in this subsystem were then one row apart and never met. A
part's `reached` is a distinct count added across rollup windows, so it is
generous by every visit that straddled one (0147); the denominator a reading used
was the largest `views` any single row reported, which it calls a floor because
that is honestly all it is. The exact number sat in `loom_reader_page_views` and
nothing took both.

The lane that owns the screen said the same thing from the other side the same
morning: on a reader card **the exact counts are the misleading figures and the
rounded share is the honest one**, which is backwards from how every other number
on it reads.

**Done.** `pageReachOf(reading, rows)` in
[`src/signals/reach.ts`](../src/signals/reach.ts) answers *about two hundred of
the three hundred and twenty readers who arrived got as far as the pricing band*.
It is the **fifth** thing taken out of the server-side join rather than collected
(§6, §7, §8, §9 and §10 being the others): **nothing was added to a payload, a
browser, a column, a store or the vocabulary**, and the broadcaster was not
touched, so its weight is unchanged.

Two denominators decide the shape, and the reason there are two is that they fail
in opposite directions
([0229](../decisions/0229-a-share-of-readers-is-estimated-against-the-appearances-and-bounded-against-the-openings.md)):

- **The estimate is taken of the appearances**, which are the same page views as
  the rollups counted them — so the straddle over-count is in the numerator and
  the denominator and very nearly divides out. That is 0221's cancellation one
  level up: a part against its page rather than a part against its neighbour.
- **The ceiling is taken of the openings**, which are exact, so the true share
  cannot be above it. For a part nearly everybody reaches it is 1 and says
  nothing, and that is the ordinary state rather than a fault — which is exactly
  why §9 refused this denominator for a fall between two siblings and why that
  refusal still stands.
- **The gap between the two is the straddle**, which is the measurement §8
  published and nothing had used. It closes to nothing where nobody's visit
  spanned two windows, and that is the first time the one control a deployment
  has over this error — the window length — can be checked against a number after
  it is turned.

Four more settled in the building. The headcount is **one division of two whole
numbers** rather than the share multiplied back up, because seven in a hundred
times a hundred is seven and a quadrillionth in a float, which breaks its own
ceiling. It is **withheld while any opening is pending**, because projecting the
folded rate onto page views no rollup has reached answers a question about
readers nobody measured. **Three silences rather than a null**, of which
`unopened` is the one worth having: a row with appearances and no openings is a
deployment whose **senders are not marking their openings**, every rate
denominator-less while the counters look healthy, and nothing else here would
say so. And **reach above the appearances is named**, because rows written by the
same rollups cannot produce it — node counters older than the page-view column
can, which is what an upgraded deployment's first reading looks like.

**What it leaves for the portal**, which is `Loom portal`'s and filed: the
honest figure for every rate on the reader screen, the inflation to print beside
it, and the one state to refuse to draw.

### 12. Reached is not read · `Loom signals` · **done, 5 October**

§6 answers *which parts came into view* and is careful to say only that: `read`
there means **a row says this part was on a reader's screen**. A band a reader
scrolled through in two seconds satisfies it, a page of them reports as a page
read top to bottom, and nobody looking at the result can tell. This document's
first priority names the other half directly — *which parts of a page are read
and which are scrolled past* — and until 4 October it was unanswerable, because
nothing knew how much there was to read.

**Done.** `readingPaceOf(reading, options)` in
[`src/signals/pace.ts`](../src/signals/pace.ts) sets the time each reader had
against the time a part's words take. Both sides were already in hand: a tally
has carried `dwellMs` beside `reached` since the counters existed, and
[0223](../decisions/0223-a-prop-is-copy-when-a-reader-could-quote-it.md)
supplied the words the day before this was built — reinterpreting every counter
already stored, with no change here, which is 0212's read-time join paying out
for the third time. **Nothing was added to a payload, a browser, a column, a
store or the vocabulary**; the broadcaster was not touched, so its weight is
unchanged. It is the fifth thing taken out of the server-side join rather than
collected.

The shape is in
[0230](../decisions/0230-a-part-was-read-when-readers-had-time-for-its-words-and-only-the-skim-is-a-safe-claim.md),
and one thing in it decides everything else:

- **Only the skim is a claim.** Three things bias the comparison and all three
  bias it the same way — dwell is time on screen rather than time reading
  (0218), a word count is a floor where a type declared no `copy` (0122), and
  `reached` is generous by the page views that straddled a window (0147). So the
  time credited is generous and the words are a floor, and `skimmed` says the
  time was short **even after every doubt has been resolved in the page's
  favour**. `paced` and `lingered` are the weaker claims and are withheld where
  the words are a floor, which is why `skimmed` is reached before the floor is
  consulted and everything else after it. *Readers are not reading this* is
  worth being sure of; *readers read this* is not a sentence anybody acts on.
- **The rate is published and overridable; the thresholds are published and
  not.** `READING_WORDS_PER_MINUTE` is 240 and may be replaced, because the pace
  of a page's text is a fact about that text and its language. `SKIMMED_BELOW`
  and `LINGERED_ABOVE` are the framework's statement of how much margin a claim
  needs, which is a promise rather than a local fact — 0218's argument at the
  one remove where it still holds.
- **The straddle correction is handed in rather than assumed.**
  `PaceOptions.inflation` takes `drift ÷ opened` off §8's rows and credits each
  reader with proportionally more time. The third thing derived from that
  counter.
- **A part is judged against its subtree's words, so nothing is added up.** The
  words on screen while a band was up are the band's and its children's, so the
  figures nest and there is no page-wide word count at all. The root is reported
  apart, as `whole`, because it contains every part it would outrank.

**What it leaves for the portal**, which is `Loom portal`'s and filed: the
sentence that names a cause rather than a location — §9 says where reading
stops, this says what was not taken in before it stopped — and the one figure on
it that must never be drawn as engagement.

### 13. The funnel against the readers who arrived · `Loom signals` · **done, 5 October**

§8 counted page views exactly and §11 joined that count to the node counters.
The funnel was left out of both, which made it the last counter here with no
honest share of its own. A `FunnelAnswer` is two counts off one window, so
`converted ÷ reached` needed no denominator handed to it — and it is not the
number anybody quotes. *Of the readers who arrived* is what a deployment means
by a conversion rate, and a pair whose first end sits at the bottom of a long
page can post a magnificent rate while converting four people.

**Done.** `funnelReachOf(where, funnels, rows)` in
[`src/signals/funnel.ts`](../src/signals/funnel.ts) answers *a hundred readers
arrived, forty reached the pricing band and six bought*. It is the **sixth**
thing taken out of the server-side reading rather than collected (§6, §8, §9,
§10, §11 and §12 being the others): **nothing was added to a payload, a browser,
a column, a store or the vocabulary**, and the broadcaster was not touched, so
its weight is unchanged.

Two things decide the shape, and the second is a correction to an accepted
record ([0231](../decisions/0231-a-funnel-is-three-shares-of-the-arrivals-and-the-straddle-is-the-one-error-here-that-leans-down.md)):

- **The unit is three shares of the arrivals, and they partition them.**
  `lostBefore` never reached the first end, `lostBetween` reached it and did not
  convert, and the conversion share did both; the three sum to 1. Reporting all
  three rather than the rate is the whole value, because **the two losses have
  opposite remedies** and `rate` cannot tell them apart — the first loss is
  entirely inside its denominator. `worse` names the stage that costs more
  readers, by headcount rather than share, which is 0221's ranking rule at its
  two-element case.
- **The straddle leans *down* on this one counter, and 0147 says it does not.**
  0147's consequences record that *a conversion rate is honest and a view count
  is slightly generous*, because a funnel answer is computed inside one rollup
  run where distinctness is exact. True of one answer, and not of the stored row,
  which adds every window's. A reader who met the first end in one window and
  converted in the next contributes `reached 1, converted 0` to the first and
  nothing to the second: **the conversion is lost, not duplicated.** So `rate` is
  the only figure in this subsystem biased downward — the safe direction for
  *readers convert* and the unsafe one for *this funnel is broken* — and
  `rateAtMost` spends §8's drift on the only error bar a funnel can have. It
  closes onto `rate` where nobody straddled, and it opens wide where the rollup
  window is short, which is the second time that counter has turned an argument
  into a number. 0147 is **not superseded**: its decision stands and one
  sentence of its consequences is corrected.

Three more settled in the building. **`ReachSilence` is reused rather than
restated**, because the three reasons there is no denominator are states of the
deployment and not of the question asked, so `unopened` — *senders are not
marking their openings* — reads the same on a funnel card as on a part. **There
is no ranking across pairs and no page-level total of conversions**: two pairs
are two questions about different nodes, and the pair losing the most readers is
reliably whichever first end is deepest in the page, while a total would count
one page view once per pair it satisfied (0167). And `rateAtMost` carries **no
cap of its own on the recovery**, because the honest-looking clause cannot change
the result and a clause nothing can falsify is not a safeguard.

**The pairing rule is now published once.** `pageViewsFor` and `inflationFor` in
[`page-views.ts`](../src/signals/page-views.ts) pick the door row a reading
belongs to; `pageReachOf` and `funnelReachOf` both use it. The matching is the
part of every join here that fails quietly when it is got wrong, because the
aggregate inflation published beside the rows is the obvious thing to reach for
and handing a busy page's straddle rate to a quiet one is an invented correction
with three decimal places on it. That closes `Loom portal`'s finding of
5 October with its first shape.

**What it leaves for the portal**, which is `Loom portal`'s and filed: a
conversion rate that can be said out loud, with the stage that is costing the
readers named beside it, and an interval rather than a point wherever the
deployment's rollup window is short.

### 14. How much of what a page says gets read · `Loom signals` · **done, 6 October**

This document's first priority names three questions, and until today the third
of them had an answer that was not a measurement. `wordsReadIn` filters the
reading of §6 and hands back the text of every part a row says was seen — which
is exactly *which copy a reader actually reached*, and is a list of strings. It
cannot be put on a screen as a figure, compared between two windows, or ranked,
and it cannot say what is on the other side of it: **the words nobody got to**,
which are the ones a page is changed because of.

**Done.** `copyReadingOf(reading)` in [`src/signals/copy.ts`](../src/signals/copy.ts)
counts both sides. *This page says twelve hundred words, every one of them
reached somebody, the average reader got to two hundred and sixty, and the three
hundred nobody saw are these.* It is the **seventh** thing taken out of the
server-side join rather than collected (§6, §8, §9, §10, §11, §12 and §13 being
the others): **nothing was added to a payload, a browser, a column, a store or
the vocabulary**, and the broadcaster was not touched, so its weight is
unchanged.

Two things decide the shape ([0235](../decisions/0235-how-much-of-a-page-gets-read-is-a-share-of-words-that-partition-it-and-the-typical-reader-is-a-ceiling.md)):

- **A page-wide word total is sound here, and §12's refusal of one still
  stands**, because they are two different quantities. A pace reading judges a
  part against its **subtree's** words, which nest — so a sum charges one reader
  once per level and 0230 refused a page total of it. This takes a part's **own**
  words, which nest nothing: a text node and a slot node are never parts, every
  element descendant is a part in its own right, and a part's copy is therefore a
  partition of the page's words across its parts exactly once. That is the
  property 0212 published so a role row could be added up, and a page total is
  the same addition one level further. Nothing is superseded. It is also why the
  root needs no special case here where §12 had to report it apart.
- **Two shares, because *the words somebody read* and *the words a reader reads*
  are different sentences and only one of them is what a person hears.** `share`
  is the share of the page's words at least one reader reached, which is what a
  standing of `read` asserts and nothing more — on a busy page it is near 1 and
  it is true. `typical` is the words the average reader got to, and it is a
  **ceiling**: `reached` is generous by the straddle (0147) and the view floor it
  is divided by is short of the page views there were (0212), so it leans up in
  both terms. The straddle very nearly divides out, which is §9's cancellation
  one level up and the only reason the figure is worth publishing.

Four more settled in the building. `typical` is **withheld rather than
qualified** in four states, of which `floored` is the one that matters — a type
declaring no `copy` leaves the numerator short one way and the denominator short
the other, so the two errors stop leaning together and a mean can no longer be
published as *at most*; a share survives a floor and says so. The floor is
counted **per standing**, because undeclared words on a part readers reached are
missing from both halves of a share while undeclared words on a part nobody
reached are missing from the denominator only, and the share then reads high.
`unseen` is **`skipped` only** and ranked by words, since putting an `unknown`
part's words under *nobody read this* would turn *nothing can be said* into a
claim. And the word-counting rule now lives in
[`words.ts`](../src/signals/words.ts) and both readings import it, because two
spellings of one rule that agree today is what the counter keys did before they
were published once.

**What it leaves for the portal**, which is `Loom portal`'s and filed: the two
shares side by side as the sentence a reader screen can lead with, and the
passages nobody saw as the one list on it a person can act on without reading
anything else.

### 15. The pair the change dissolved · `Loom signals` · **done, 6 October**

§13 read a revision's funnels against the readers that revision had, and §6 made
the tree the universe a window is read against. Nothing held the two facts
against each other, so a pair whose end a change moved out, renamed or removed
answered `reached 0, converted 0` — which §13 turned into *every reader who
arrived failed to reach the start of this funnel*. **That is byte-identical to a
pricing band nobody scrolls to, and the two remedies are opposite:** one is a
page to fix, the other is a question to re-point.

**Done.** `funnelReachOf` now takes a `PageReading` where it took a tree id and
a revision number, looks each end up in it, and gives it an `EndStanding`. It is
the **eighth** thing taken out of the server-side join rather than collected
(§6, §8, §9, §10, §11, §12, §13 and §14 being the others): **nothing was added
to a payload, a browser, a column, a store or the vocabulary**, and the
broadcaster was not touched, so its weight is unchanged.

Four things decide the shape ([0238](../decisions/0238-a-funnel-end-the-revision-no-longer-has-is-a-standing-and-what-is-withheld-is-per-figure.md)):

- **The reading *is* the revision.** Handing in a `PageReading` keeps 0231's
  property — the revision is handed in rather than inferred, both row sets
  filtered to it, the drops reported — and closes the gap it left: a caller can
  no longer name one revision while holding another revision's tree. 0231 is
  extended rather than superseded.
- **What is withheld is per figure, not per pair.** An absent `to` leaves
  `reached` a fact about readers, so `entry` and `lostBefore` still stand; an
  absent `from` withholds all of them, `lostBefore` included, because its nought
  reads as *every reader failed to reach it*. The counts are always published,
  because *this question is stale and here is what it last counted* is the
  useful sentence.
- **`rate` is withheld on a stale end although it needs no denominator.** A
  silence is *no denominator* and a stale end is *no question*, and only the
  first is a thing to publish a ratio under.
- **A pair is never reported as out of order.** The tree makes *the `to` now
  precedes the `from`* available and tempting, and it is refused: a pair has no
  path and no ordering beyond its two ends (0146), so a reader who scrolls back
  up satisfies it honestly and document order is not a fault.

Two more settled in the building. The standing has **two members and not three**
— *the node is there and cannot satisfy this kind*, which is what a pair asking
for `activated` on a band falls into, is the case nothing in the tree can speak
to, because `role` declares one member today and it is not *a control*; so
`present` means the question still names something and no more. And an absent
end **with a count against it** is `orphaned`, the alarm `PageReading.orphaned`
raises for the node counters raised for the pairs — a tree and a window that do
not belong together, independent of `unreconciled` and both able to be set at
once.

**What it leaves for the portal**, which is `Loom portal`'s and filed:
`stalePairs` as the figure a reader screen leads with after a change lands, and
each stale pair drawn as a question to re-point rather than a funnel to fix.

### 16. The words a change put in front of readers · `Loom signals` · **done, 7 October**

> §15 is the stale funnel pair, written on the branch of #539 and not yet on
> `main` when this was built. The number is left for it rather than taken, since
> that pull request was opened first and nothing here depends on it.

§14 counts how much of what a page says gets read, of **one window of one
revision**. The sentence a change is judged by is the next one, and it is the
sentence this whole plan is pointed at: *the words nobody read last week are
read now*, or the worse one, *the three hundred words this change wrote are
words nobody has reached.* §10 asks that of where reading stops. Nothing asked
it of text.

**Done.** `copyChangeOf(was, now)` in
[`src/signals/copy-change.ts`](../src/signals/copy-change.ts) answers it. It is
the **ninth** thing taken out of the server-side join rather than collected (§6,
§8, §9, §10, §11, §12, §13 and §14 being the others): **nothing was added to a
payload, a browser, a column, a store or the vocabulary**, and the broadcaster
was not touched, so its weight is unchanged.

Two things decide the shape, and the first is a subtraction that reads backwards
([0239](../decisions/0239-a-change-is-read-against-the-words-both-revisions-say-and-a-floor-costs-the-page-total-and-not-the-passage.md)):

- **The unit is the words both revisions say, word for word.** The figure
  anybody would write first — the later reading's read words minus the earlier
  one's — answers two questions at once: a change that adds four hundred words
  readers all reach raises it by four hundred while making the page *less* read
  as a share of itself. The page got longer and the reading got worse, and one
  number says *better*. Identical text on both sides is the only condition under
  which the difference is about reading, so every reader figure here is of the
  carried words and what the change **wrote** is a census beside them — exact,
  because no reader is in it, and therefore the half that answers in a window
  with no page views at all. *The change took two hundred words away and readers
  had never got to a hundred and eighty of them* is one row.
- **A floor costs the page total and not the passage, which narrows §14's
  refusal rather than excepting it.** A passage's `gain` is `words × (now.reach −
  was.reach)` over the same words on both sides, so a type declaring no `copy`
  (0122) scales it toward zero and **cannot flip its sign** — *at least this many
  words moved* is safe, which is more than 0235 could say of one window. The
  page total adds signed terms that floors scale by *different* factors, so a
  floored passage that gained and an exact one that lost can sum to a regression
  where the truth is an improvement; it is withheld, as 0235 withholds `typical`.
  `passagesByMovement` is published beside the word totals because a count of
  passages survives a floor outright.

Four more settled in the building. A **standing is not comparable and a share of
a side's own views is** — `read` means *at least one* reader (0212), so a
movement from `skipped` to `gained` moves with traffic, and it is reported as a
movement rather than as a verdict and never divided by anything. A passage the
change **moved is compared like any other**, which is the one place this reading
is more forgiving than §10's, where a moved sibling dissolves the pair it was
half of — a pair is a position by construction and a passage is not. There is
**no fate vocabulary** here as §10 and §15 have one: added, removed and reworded
are structurally exclusive and carry different payloads, so they are three typed
lists rather than a union of three shapes. And a part that **said nothing before
and says something now is a word the change wrote**, not a part the change
added — which is why `passageOf` is now published from `copy.ts` and the
comparison is built over every part rather than over a copy reading's passages.

**What it leaves for the portal**, which is `Loom portal`'s and filed: the one
sentence a reader screen can lead with after a change lands, the list of
passages a change did not fix, and the two figures on it that must never be
added together.

### 17. What a reading means when it says nothing · `Loom signals` · **done, 7 October**

Nine readings built over twelve days, and each of them publishes a closed set of
reasons a figure is absent. By §16 there were five such sets, each written by
whoever was writing its module, and a window that held no page views was
`nothing-measured` to one and `unmeasured` to another. The lane filed that the
same morning as a wart rather than a defect — every set is right in its own
sentence, and the cost falls entirely on a surface drawing two readings on one
card, which meets two spellings of one thing and has nothing to tell it they are
one thing. The finding's remedy was **one exported mapping rather than a
renaming**, because four accepted records would have to be amended to rename and
each set's names are right where they are.

**Done**, and the building found the half the finding had not seen, which is the
half that matters
([0240](../decisions/0240-a-silence-is-a-condition-and-a-subject-and-the-two-names-for-one-state-were-not-synonyms.md)).

- **One name already meant two different things.** A copy reading's
  `unmeasured` is *the window's counters report no views of this revision*. A
  share-of-readers reading's `unmeasured` is *there is no page-view row at the
  door for this revision*. They are read off different rows and a deployment can
  be in either without being in the other — the node counters hold a window of
  readers while the door row is missing, which is what the first reading of a
  deployment upgraded past §8 looks like. **A surface keeping its own table of
  synonyms would have mapped those two together**, and would have been wrong in
  the direction that hides a fault: *nobody has read this page*, printed over a
  page several hundred people had read. So the overlap runs both ways, and a
  vocabulary recording only *these two names are one state* would have been as
  misleading as none.
- **A silence has two parts, and the second is why renaming could not have
  worked.** The condition it reports, and the subject that condition is true of.
  The two spellings the finding named are *the same condition said of different
  things*: a comparison names no side, so *one of the two windows held no page
  views* is a fact about the pair, while a copy reading's is a fact about the
  page on the screen. Collapsing them to one name would have licensed a card
  drawing *nothing has been measured* over a page whose own window was busy.
  Two names are not synonyms when one of them is about twice as much.

`src/signals/silences.ts` maps all fifteen members of the five sets onto **nine
conditions** and **three subjects**, renames nothing and supersedes nothing.
The subject turned out to be a property of the **reading** rather than of the
silence — every reason a copy reading gives is about its page, every reason a
pace reading gives is about one part, every reason either comparison gives is
about the pair — so it is published as one table over the five vocabularies
rather than as a field repeated nine times.

`relateSilences` answers in three: `one-state` (one sentence serves both),
`one-reason` (one condition about two subjects, worth two sentences and never
one), `unrelated`. It ignores which reading published either silence, which is
the whole of what the module is for. `distinctSilences` is the one operation
built on it: the silences as a surface holds them, most of them `null`, in and
the distinct states out, in order, keeping the first reading's vocabulary so
that reading's own sentence can still be printed.

Three more settled in the building. **The mapping cannot drift, and that is a
compile-time property**: each `meaningOf*` is an exhaustive `switch`, so a sixth
member added to any of the five sets stops `pnpm typecheck` until it is mapped —
measured, not assumed, at exactly one new error. A test holds the other side,
that no condition is published which no silence reports, so a rename cannot
leave an unreachable condition behind. And **the subjects are not ordered**: a
surface holding a `one-reason` pair is told they are two sentences and not which
to lead with, because which of a page and its part a person came to read is a
judgement about a screen.

It is the **tenth** thing taken out of what this subsystem already knows rather
than collected: **nothing was added to a payload, a browser, a column, a store or
the vocabulary of kinds**, and the imports in the module are types only, so it
does not survive into any bundle at all. The broadcaster was not touched.

**What it leaves for the portal**, which is `Loom portal`'s and filed: one
sentence per state on a card drawing several readings, rather than one per
reading — and the one pair of `unmeasured`s never to collapse.

## Still not in scope

- **Signal-to-intent derivation** — a signal automatically becoming a
  `system-signal` proposal. The runtime has gated `system-signal` since §2 and
  the wiring is deliberately still open. It is the next question after this
  plan, not part of it, and it is planned in
  [`adaptation.md`](adaptation.md) — which is where that work goes, so this lane
  does not start it.
- **Anything in rule 1's list.** Identity is not a later phase; it is refused.
- **A tracking primitive.** See rule 3.

## Under consideration, not approved

**Per-reader identity, deferred 30 September 2026.** A unique id per reader,
returning-reader measurement, anything that stitches one person across page
views. The maintainer is interested and has parked it: intake stays per
deployment, not per person, because a persistent reader id is personal data in
the EU, the UK and California, and shipping it would hand every Loom deployment a
consent obligation it did not ask for.

When it returns it is **opt-in, and a gate with a record rather than a banner**: a
broadcaster that refuses to start without a recorded decision, an intake that
refuses an identified batch which cannot show which decision allowed it, and
collection that can be shown and withdrawn. A consent *prompt* may be a primitive
that displays the choice and calls a handler the host supplies — the switch stays
host configuration, per rule 3.

**It is parked, not open.** Do not build it and do not write a record arguing for
it. If a design choice would make adding it later expensive, say so in a report.

**Longer retention as something a deployment pays for.** The maintainer's
intent, and the reason rule 5 makes the window configuration rather than a
constant: selling a longer window should be a number per deployment, not a
migration on live data. No pricing, no tiers and no billing work is approved —
only that the design must not foreclose it.
