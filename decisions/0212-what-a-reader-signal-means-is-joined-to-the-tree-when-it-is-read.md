# 0212. What a reader signal means is joined to the tree when it is read, and the tree is what makes silence a measurement

**Status:** Accepted
**Date:** 2026-10-01
**Section:** §6

## Context

A reader signal is a node id, a primitive type, an instant, and nothing else.
That is rule 1 of [`docs/signals.md`](../docs/signals.md), settled in
[0146](0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md),
and it is why the broadcaster is about 5 KB and why a batch cannot be turned back
into a person.

It is also why the counters, read on their own, cannot answer the questions a
deployment opens the portal for. `dwelled on n_42 for 11s` is not *a reader spent
eleven seconds on the pricing band*. A primitive declares what part it plays
([0114](0114-a-primitive-declares-what-part-it-plays-and-the-registry-is-asked.md))
and which of its props a reader reads
([0122](0122-a-primitive-says-which-of-its-props-a-reader-reads.md)), and the
browser knows neither: it has two data attributes on an element.

The tempting fix is to send more. It is the wrong one, and
[0167](0167-a-delegated-signal-names-the-regions-it-happened-inside.md) already
made the argument in the one place the payload could afford it: ancestry was
refused for `viewed` and `dwelled` because the cost is payload multiplied by page
depth, on every reader, for ever, to buy what the server could derive. Roles,
parts and copy are the same trade and worse — they are facts about the *library*,
which does not change between page views.

The asymmetry worth exploiting is that **the server has everything the browser
does not**. Intake and rollup both hold the registry and the tree a batch names,
because a batch names its tree and its revision. So the interpretation can be
free.

There is also one question that no amount of payload could ever answer, and it is
the sharpest reason this record exists. *Which parts of a page did readers skip?*
A part nobody reached has no counter row — absence of a row is absence of data,
and a list of rows can never be read as a list of the page. Only the tree knows
what was there to be reached.

## Decision

**The meaning of a counter is joined to the tree and the registry at read time,
never written onto the counter. The tree is the universe of parts, so a part with
no row is a measurement rather than a gap.**

`pageReadingOf(tree, tallies, declarations)` (`src/signals/parts.ts`) is a pure
function of three things a server holds. It returns every element node of that
revision in reading order, each with the role its type declared, the words it
says itself, and the counters filed against it or nothing.

Five things bound it.

**Read time, not rollup time.** Rollup holds the tree and the registry too and
could stamp the role and the words onto each row as it stores them. It must not.
A declaration is a fact about the library and not about a window of reading: the
day `src/primitives/` declares `copy` across itself — nothing does yet, which
0122 predicted and a finding of 19 September still tracks — a read-time join
reinterprets every counter already stored, while a rollup-time one has baked
yesterday's silence into rows that are expensive to revisit and impossible to
correct for windows already expired.

**Three standings, because two would be a lie.** A part is `read` when some view
reported it coming into view; `skipped` when the window held views of that
revision and none of them said anything about it at all; and `unknown` otherwise
— either nothing was measured, so there were no readers to skip anything, or the
part reported something *other* than a view and a reader plainly had it in front
of them. A two-valued reading would have to call a page nobody opened a page
everybody skipped.

**The universe is the element nodes, and that is the whole tree rather than a
narrowing.** A text or slot node carries no identity attributes
(`render/editable.ts`), so no signal can ever name one. A text node's words are
read as its parent's, so every word on the page belongs to exactly one part and a
caller may add two rows together without reading a headline twice.

**A role row adds occurrences and never view counts.** `dwellMs`, `activations`,
`opens`, `closes` and `completions` sum. `views`, `reached` and `engaged` count
distinct page views and are absent from every grouped row, for two reasons: one
reader who read three headings is three in a sum of `reached` and one actual
person, which is the distinctness trap 0147 wrote down one level up; and a single
press inside a band is one `activations` on the button and one `engaged` on the
band by design (0167), so a row that added both would count one reader's one
action twice and look right doing it. What a grouped row says about views instead
is how many of its *parts* were read, skipped or cannot be spoken for — a count
of parts, which cannot be mistaken for a count of readers.

**A tree and a window that do not belong together is an alarm, not a silence.**
Rows filed under another tree or another revision are dropped and counted
(`foreign`); rows naming a node the tree does not contain are named
(`orphaned`); a node handed in twice keeps its first row and names the rest
(`duplicated`). Pass revision 7's counters with revision 6's tree and most parts
read `skipped` while every number stays plausible — so the mismatch has to be
visible from the result.

## Consequences

- **Nothing is added to a batch, to the broadcaster, or to any stored row.** The
  wire stays node-shaped and anonymous; the browser cost of this record is zero
  bytes, and `browser-weight.test.ts` is untouched because `broadcast.ts` is.
- **The reading contains page content, which no counter did before.** The words
  are the deployment's own copy, joined from the deployment's own tree — nothing
  about a reader — so rule 1 is untouched. It is worth saying plainly because a
  reading is the first artefact in this subsystem that is not pure arithmetic.
- **It answers thinly today, and honestly.** Nothing in `src/primitives/`
  declares `role` or `copy`, so every part comes back `role: null` with its
  string props named in `copy.unread`. That is 0114's and 0122's stated bargain —
  *nobody has said* is a different answer from *there are none* — and the half
  that needs no declaration, which parts readers reached and which they skipped,
  works now.
- **A past revision costs a log replay.** The head revision's tree is the
  snapshot a store already holds; an older one is `replayTree` over the log.
  *Before versus after a change* is therefore two readings and, today, two
  different amounts of work. Filed for the lane that owns `src/store/`.
- **The portal has a shape to build against** (step 4 of `docs/signals.md`), and
  it is a shape rather than a screen: `PART_STANDINGS` and
  `describePartStanding` exist so a surface renders the vocabulary instead of
  keeping its own copy.
- **A sixth thing a primitive could declare is now cheaper to want.** The role
  vocabulary has one member (0114), so the role rows are thin. The bar for a
  second member is unchanged — a consumer that cannot answer its question,
  written down as a finding — and this is now a consumer, which is worth noting
  rather than acting on.

## Alternatives considered

- **Sending the role and the copy from the browser.** Refused, and 0167 refused
  it for ancestry first. These are facts about the library, identical on every
  page view, so paying for them per batch is the clearest possible case of
  spending a reader's bytes on something already known. It would also put page
  copy on the wire, which is content leaving a page for no reason.
- **Stamping the interpretation onto the stored counters at rollup.** The
  tempting shortcut, because the data is in hand. Rejected above: it freezes
  today's declarations into rows that outlive them, and the correction is
  impossible once the raw window has expired (rule 5).
- **A reading with two standings, read and skipped.** Simpler and wrong. It
  cannot tell a page with no readers from a page whose readers skipped
  everything, and those two produce the same screen under it.
- **Summing `engaged` into the grouped rows.** It is the number regions report,
  so leaving it out of a per-role total feels like an omission. It is the
  double-count: the same press is already in the control's `activations`. There
  is a test that fails if the field reappears.
- **Deriving a page-view denominator by adding the rows up.** Rejected for the
  reason 0147 gives: distinctness cannot be added. The reading reports the
  largest single row as a *floor* on views and says so in its own name, which is
  the most that can honestly be said from counters alone.
- **Taking the tree from a store inside the function.** It would have made the
  join one call instead of two. Rejected: it would make a pure function reach a
  database, and it would let a caller ask about a revision without holding it —
  which is exactly how the counters of one revision end up drawn against the tree
  of another.
- **Interpreting against the catalogue rather than the registry.** The catalogue
  carries neither `role` nor `copy`, deliberately and by both 0114 and 0122, and
  it is what a model reads to choose a primitive. Adding them there to serve this
  would change every proposal prompt in service of a consumer that is a host.
