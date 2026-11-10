# 0371. A segment is an audience the site sorts its readers into, and Loom keeps only its rules and its name

**Status:** Proposed
**Date:** 2026-11-09
**Section:** §5 (portal), the governance and reasoning planes

> **Since this was written (10 November 2026).** [0376](0376-a-pages-audience-rules-are-an-attributed-log-and-its-forms-are-rows.md),
> Accepted the next day, built 0263's store dimension in the framework:
> `loom_audience_rules` keeps each **page's** ordered rule list as an
> append-only, attributed log, and `loom_audience_forms` keeps one form per
> audience per page. Two clauses below now meet it head on, and this record is
> left `Proposed` so the maintainer can settle them together:
>
> - **Clause 3** keeps the rules in portal tables, one list per **project**.
>   0376 keeps them in the store, one list per **page** (`tree_id`). The
>   reasonable default is to drop the portal tables and have the editor write
>   through 0376's store (`rules`, `recordRules` with the head revision, so a
>   stale edit is refused, and `history`), offering one list per page with
>   *copy to every page* rather than a second, project-wide copy of the same
>   rules. Piece 1 of clause 7 would then need no table and no `pnpm db:push`.
> - **Clause 5** sends a segment's change through the Gate. 0376 writes a form
>   straight to a row, unjudged, and files that asymmetry as an open question
>   for the maintainer (`FINDINGS.md`, 10 November, *a form an audience is
>   served is a change a reader sees that no policy judged*). The framework
>   lane recommends leaving forms unjudged; this record's clause 5 is the other
>   answer. Only one of them can stand, and piece 4 waits on it either way.

## Context

Unit 9 of the portal plan ([`docs/portal.md`](../docs/portal.md), *The units,
in order*) is *"Audiences, then the model seam. Segments are the audiences of
0263; a record before any build."* The concept wireframes the maintainer set as
the portal's target on 5 November 2026
([`docs/portal-wireframes.md`](../docs/portal-wireframes.md), *6 · Segments*)
leave the screen undesigned and say what it is for:

> *"A segment is a group of readers who behave differently (new or returning,
> from search, on a phone), and it is an audience (0263), so a change for one
> segment is an audience-scoped delta. It would show as a segment filter on
> Signals, a split of before and after on History, and* only for: <segment> *on
> a proposed change. It is defined only from what a batch already says, never
> from anything personal ... It needs its own decision record before any of it
> is built."*

Units 8a to 8c are on `main`, so this is the next record the order asks for.
Four things are already settled and this record builds on them rather than
reopening them:

- **[0263](0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md)**:
  a page is one base tree plus the deltas an audience earns, and the match is
  made in the customer's app, per request. The maintainer: *"Yes, I continue to
  like audience scoped deltas."*
- **[0284](0284-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md)**:
  a signal names the audience it was collected under as an opaque `aud_` id,
  absent meaning `aud_everyone`, and every reader counter is kept per audience.
  The hourly counters the portal reads (0356, 0362) already take an audience.
- **[0359](0359-an-audience-rule-is-a-conjunction-of-scalar-clauses-and-a-composed-page-is-a-projection-of-a-revision.md)**:
  a rule is a conjunction of clauses over the scalar keys of the host's render
  context, rules are an ordered list whose last match wins a contested node,
  and a rule is *"written in the portal, kept there, and shipped to the
  customer's app, where it is evaluated."* The store dimension for
  audience-scoped deltas is not built (its clause 6, and the open finding of
  5 November in `FINDINGS.md`).
- **[0358](0358-an-accepted-change-goes-live-from-the-portal-and-the-site-pulls-it-with-no-pull-request.md)**:
  the site's server pulls its live pages from a read door with its public key,
  with no reader or audience in the request.

**The wireframe's examples and the batch disagree, and that is the question
this record has to answer.** *New or returning, from search, on a phone* are
not in a delivery: a batch names a tree, a revision, an audience, a page view
key and the signals (`readerSignalBatchSchema` in `src/signals/signal.ts`), and
rule 1 of `docs/signals.md` keeps it that way (*"No visitor id, no device id,
no fingerprint, no cross-page stitching"*). Read literally, *"defined only from
what a batch already says"* allows one segment, *everyone*. But every one of
those examples is something the site's own server knows while it draws the page:
the request's `User-Agent` says phone or not, its `Referer` says whether the
reader came from a search engine, and a first-party cookie the site already
sets says whether they have been before. That is exactly the render context
0263 put the audience predicate over.

## Decision

1. **A segment is an audience, and the portal calls it a segment.** One thing
   with two names on two sides: *segment* on every portal screen, `aud_` id in
   the technical record one click away, as an application is a project on
   screen and an `app_` underneath. There is no second, analytic kind of
   segment drawn from the signals after the fact.
2. **The site sorts its readers; Loom never learns why.** A segment is defined
   by rules over keys the site's server puts in the render context (`device`,
   `source`, `returning`, `region`, whatever it chooses), evaluated in the
   site's process on every request (0263 clause 4). What reaches Loom is the
   segment's `aud_` id on the batch, which is what 0284 already carries. The
   wireframe's *"never from anything personal"* holds in this form: a key's
   value never leaves the site, and a segment is a group's name, never a
   reader's.
3. **The portal keeps the rules, in order, per project.** A segment has a name,
   an `aud_` id minted when it is made, and one or more rules in 0359's shape
   (a conjunction of clauses, each a key and the values it may hold). The rules
   are one ordered list for the project, general to specific, and the screen
   shows and edits that order, because the last matching rule is the one that
   wins a contested part (0359 clause 3). They are kept in portal tables, as
   goals are (0350), since 0359 clause 1 puts their authoring and keeping in
   the portal.
4. **The rules reach the site through the read door, in the same pull.** The
   door 0358 built answers the project's rules beside its live pages. The
   request still carries no reader and no audience: the site receives every
   rule and every segment's form, and chooses per request, locally. A failed
   pull keeps the last rules with the last pages (0358 clause 4).
5. **A segment's form of a page is accepted changes scoped to it.** A change
   may be *only for: <segment>*. Accepting it adds it to that segment's overlay
   of the live copy rather than to the copy itself, it goes through the Gate as
   any other change does, and a newer published version replays it as 0358
   clause 6 replays every accepted change, dropping and listing what no longer
   fits. A segment whose overlay cannot be applied is refused whole by the
   site's composition (0359 clause 5), so the portal says a dropped change
   plainly rather than letting the site serve a form nobody accepted.
6. **Every figure for a segment is a figure for that audience alone.** Signals,
   By page, Goals and the verdicts on Page history read the counters with the
   segment's `aud_` id, and the 14-day, 1,000-page-view, 95% rules of 8c apply
   to each segment on its own. A comparison between two segments is between two
   populations and is said as one (0290, 0300).
7. **Built in four pieces, each on `main` before the next, each only once its
   data exists.**
   1. *Segments* on the rail: make, name, order and remove segments and their
      rules, with what the site must send (the keys, and the `aud_` id it puts
      on its signals) and each segment's page views over the range from the
      counters 0284 already keeps, *none yet* where its site has not named it.
      Needs a table and `pnpm db:push`.
   2. The read door answers the rules. The site's pull client sorting readers
      by them and naming the segment on its signals is framework code, a
      finding for `Loom daily build`.
   3. A segment picker on *Signals*, *By page* and *Goals*, beside the range
      picker, in the address (`?segment=`).
   4. *Only for: <segment>* on a change, its overlay at the door, and the split
      of before and after on *Page history*. This needs 0263's store dimension
      or a portal-kept overlay beside the live copy, and is settled by its own
      record when piece 3 is on `main`.

**Defaults taken, reversible, for the maintainer to confirm** (`## Needs your
input` on the pull request):

- **At most ten segments a project.** Every segment multiplies the counters a
  screen reads and splits the page views a verdict waits on; ten keeps the
  split readable and is a constant to raise.
- **Keys are the site's words, not a catalogue.** The screen offers *device*,
  *source* and *returning* as examples of what a site's server can put in the
  context, saying they are examples, and never implies Loom fills them.
- **The proposer stays on the base until piece 4.** Proposing *only for* a
  segment needs readings per segment (0329's 30-view floor applied per
  segment) and a choice of which segment to aim at, which is the model seam
  the plan's row 9 names and the maintainer's call.

## Consequences

- The wireframe's *"defined only from what a batch already says"* is read as
  *"Loom learns only what a batch already says"*: the batch says the segment's
  name and nothing more, and the defining happens on the site's server. If the
  maintainer meant the stricter reading, there is one segment, *everyone*, and
  unit 9 has nothing to build.
- A site that does nothing sees no change. No rules means the base for every
  reader and every batch filed under `aud_everyone`, which is what every site
  does today.
- The read door's answer grows, so the pull client in `src/` must read and
  apply the rules. That is framework work in `Loom daily build`'s lane, filed as
  a finding when this record is accepted, and until a site sorts its readers
  every segment says *none yet* rather than a nought.
- A segment can be made narrow enough to be one person (a rule on a key that
  holds an account id). Loom cannot see what a key holds, so the screen says,
  where the rules are written, that a segment is a group and never a person,
  and segment figures are shown only once a segment has page views of its own
  to show.
- `docs/portal.md` row 9 and `docs/portal-wireframes.md` *6 · Segments* point
  here once this is accepted. No screen of unit 9 is built before then.
- The open finding of 5 November (*a page can be served per audience now*) is
  answered for the portal's half: the rule editor is piece 1, and its order is
  the one thing the screen must teach.

## Alternatives considered

**Segments drawn from the signals after the fact.** The analytics product's
answer: Loom would keep device class, referrer and a returning flag on each
delivery and let a person slice by them later. It is the most familiar shape and
it fails twice. It breaks rule 1 of `docs/signals.md` and 0146, putting on every
batch three facts about the reader that Loom has refused to keep since
September. And it gives segments nothing to serve: a group defined after the
fact cannot be shown a different form of the page, so *only for: <segment>*,
which the wireframe asks for, would need a second mechanism anyway. 0263 already
chose audiences decided at render time, and a segment that is not one would be a
second model of the same idea.

**Loom sorts the reader at the read door.** The site would send the context
with each request and receive the form for that reader. Rejected with 0262 and
0358: it puts a request to Loom in front of every page view and sends reader
facts with it, which is the one thing the pull exists to avoid.

**Leave segments to the site entirely, and only measure them.** The portal
would show whatever `aud_` ids arrive and never author a rule. Cheapest, and it
contradicts 0359 clause 1, which keeps rules in the portal, and leaves *only
for: <segment>* with nowhere to be accepted. A site can still do this today;
the record does not forbid it, it just is not the product.

**Build the segment picker on Signals first.** It is the screen people would see
soonest, and it has no data: no site names an audience today, so a picker
would offer *everyone* and nothing else, which the plan's rule *no screen
before its data* forbids. Defining segments first gives the site something to
name.
