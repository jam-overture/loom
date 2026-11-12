# Portal, 12 November 2026 (early): unit 9 piece 4's record, 0386 (Proposed)

## Why a record and not a screen

Every portal piece left in the order was blocked when this run started, as the
previous run (#871) reported:

- *For review*'s predicted effect waits on the maintainer's choice of how to
  predict one.
- *Stays on it* on *Goals* waits on time on a part being counted per reader
  (the signals lane).
- Unit 9 piece 4 (*only for: <segment>* on a change and the split on *Page
  history*) waited on **its own record**, which 0371 clause 7 requires before
  any build, and on the maintainer's answer to whether a segment's form is
  judged by the Gate.

No portal pull request or `portal-*` branch was open, and no maintainer comment
since the last run asked for anything. The record was the one piece of work
free to do, so this run wrote it.

## What shipped

[0386](../decisions/0386-a-change-only-for-one-segment-is-a-judged-proposal-and-accepting-it-writes-that-segments-form.md),
`Proposed`. In short:

- A change *only for* a segment is an ordinary proposal the Gate already
  judged, and a person narrows it to one segment at *Accept* (*Accept for
  <segment> only*). So every form the portal writes to 0376's store is made of
  judged changes, which answers the Gate question for the portal without
  waiting on the framework's open finding of 10 November.
- Offered only for a segment the page has rules for and has counted page views
  under; one segment per change.
- A segment's form is the copy plus the changes accepted for it, rebuilt
  oldest first each time the copy moves, dropping and listing what no longer
  fits; the door answers forms only where every one is on the live revision.
- Measured on that segment's readers alone, with the 14-day, 1,000-view, 95%
  rules; *Page history* gains a line per segment under each verdict and never
  sets two segments against each other.
- Three pieces after acceptance; the first needs `pnpm db:push` (an audience
  column on the accepted-change record) and is not built until a site has
  counted page views under a segment.

`docs/portal.md` (row 9 and *Blocked on the maintainer* item 7) and
`docs/portal-wireframes.md` (*6 · Segments*) point at 0386. The decisions index
was regenerated.

## Decisions taken, and why

- **Judged changes only.** The framework lane's recommendation for forms in
  general is *leave it*; for the portal, writing an unjudged form would open
  on the review screen the hole 0329 and 0358 close for the base.
- **The person picks the segment, the proposer stays on the base.** Proposing
  for a segment needs per-segment readings nobody has yet and a choice of what
  to aim at, which is the maintainer's model seam.
- **The Gate's verdict for everyone stands for one segment**, with a fit check
  at *Accept* rather than a second Gate run inside a click.

All three are listed as reversible defaults for the maintainer to confirm.

## Tests

No code changed. `pnpm verify` ran on the branch (numbers in the pull request
comment); the record has its seven sections and an *Alternatives considered*
over 100 words.

## Toward the wireframe

*6 · Segments*: the rail item, the rules editor, the door's rules and the
picker are built. *Only for: <segment>* and the split on *History* now have a
record; they wait on its acceptance, on #870's pull client reaching a site, and
on that site counting page views under a segment.
