# 0350. A project sets goals from signals already collected, and one of them is primary

**Status:** Accepted
**Date:** 2026-11-05
**Section:** §5 (portal), the reasoning plane

## Context

The concept wireframes the maintainer set as the portal's target on 5 November
2026 ([`docs/portal-wireframes.md`](../docs/portal-wireframes.md), *3 · Goals*)
add a screen that answers *what are we trying to get readers to do?* His words
on the wireframes, and on the order he agreed the same day
([`docs/portal.md`](../docs/portal.md), row 8b):

> *"This is a great start… this should be the starting point goal to work
> towards."*

The spec says what a goal is: one outcome per project, built only from signals
already collected, a kind (*presses*, *finishes*, *opens*, *stays on*) on a
part, on all pages or on chosen ones; one goal is primary; every proposal names
the goal it serves; and *For review* leads with it. It names the new data: a
goals table, the proposer reading goals, and a decision record. This is that
record. Until now Loom proposed a change from what readers did on a page with
no stated aim (0329), so nothing said what *better* meant.

## Decision

1. **A goal is one kind of thing a reader does to one part**, counted on every
   page that has the part or on the pages chosen, with a name the project
   gives it. It is kept per application, the grain every reader table already
   has (0269), in `loom_goals`; the portal never says *application* (0296).
2. **Three kinds, not four, for now.** *Presses it* (`activated`), *Sends it*
   (`completed`) and *Opens it* (`disclosed`) are counted per part by the
   tallies. *Stays on it* (dwelled past a threshold) is in the wireframes and
   is not offered: the tallies keep a part's time on screen as one total per
   version, so how many readers stayed past a threshold cannot be counted until
   individual events are kept ([0349](0349-a-projects-reader-events-are-kept-thirty-days-by-default-and-the-tallies-stay-the-durable-record.md)).
   A kind a goal could not be measured on is a goal that would read zero for
   ever.
3. **Exactly one goal is primary whenever any exists.** The first goal made is
   primary; making another primary moves the mark, kept with the time it was
   given; removing the primary goal passes the mark to the oldest goal left.
   The move is one statement, so no reader of the table sees two primaries or
   none.
4. **A goal's figure is the count and the page views it happened in, since
   counting began**: *7 presses in 200 page views, 3.5 per 100*. The page views
   are those of the pages the goal covers; for *every page that has it*, the
   pages whose published version or counted versions have the part. The
   wireframes' *7-day rate* and its trend are not drawn, because the tallies
   keep no time; they arrive with the kept events. The figure is an
   occurrence rate, not *readers who did it*: the tallies count presses, not
   distinct pressers, and the words say presses.
5. **Only an owner sets, moves or removes goals.** Goals steer what Loom
   proposes for every page of the project, as the model key that pays for the
   proposing does, and that is an owner's (0285, 0332). Everybody in the
   project reads them.
6. **At most twenty goals per project**, a ceiling on what a person can weigh
   rather than an invariant.
7. **This is the first half of 8b.** The proposer reading the primary goal (or
   a page's own), every proposal naming the goal it serves, *For review* cards
   leading with a goal chip, and *a page with no goal on it gets no proposals*
   are the second half. Until it lands, proposals are made as before and name
   no goal, and the *Goals* screen says so in a sentence.

Clauses 2, 4, 5 and 6 are defaults the maintainer has not ruled on. Each is
reversible without a migration: a fourth kind is a value in the `kind` column,
a time-ranged rate is a different reading of other data, the role is one
predicate, and the ceiling is a constant.

## Consequences

- `pnpm db:push` creates `loom_goals`. Until a deployment runs it, *Goals*
  says goals cannot be read and suggests the command; nothing else in the
  portal reads the table yet, so nothing else changes.
- A project tab, *Goals*, sits after *For review*, the order of the
  wireframes' rail among the screens built.
- A goal on a part the site later stops publishing keeps counting what the
  tallies hold for it, and says *a part no published page has any more*
  rather than vanishing.
- 8c's before and after on a goal reads the same counter on the same part,
  per version, which the tallies already keep per version.
- The proposer's half of 8b can read `goalsFor(application).list()` and take
  the primary goal without another schema change.

## Alternatives considered

**Offer *Stays on it* now, with the threshold applied to the average.** The
tallies hold the total time a part was on screen and the page views that
reached it, so an average per page view is computable, and a goal could have
compared that average against a threshold. It was rejected because it answers
a different question from the one the wireframe asks: *how many readers
stayed past ten seconds* is a count of readers, and an average above ten
seconds can come from one reader who left a tab open. A goal that says one
thing and measures another would make every result built on it wrong in a way
nobody could see.

**Let the primary mark be optional, or let several goals be primary.** Simpler
to store, with no rule to keep. Rejected because the wireframes make the
primary goal the default the proposer works toward, so a project with goals
and no primary would be a project for which Loom could not decide what to
propose, and two primaries would be the same problem in another form.

**Keep goals per project rather than per application.** The project is what a
person sees. Rejected because every table a goal is measured against is keyed
by application (0269), a project holds exactly one (0296), and a goal keyed
differently from its data would need a join through the registry on every
reading for no gain.

**Rate as readers who did it, from `engaged`.** `engaged` counts distinct page
views with any use inside a part, which is closer to *readers*. Rejected
because it is strictly inside: a button's own `engaged` is zero by design, so
a goal on a button, the commonest goal there is, would always read zero.
