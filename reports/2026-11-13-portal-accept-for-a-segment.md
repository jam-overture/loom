# Portal, 13 November 2026: *Accept for <segment> only* (unit 9, piece 4, 0386 piece 1)

## Why now

0386 (Accepted earlier today) builds *only for: <segment>* in three pieces and
held the first until some site had counted page views under a segment. The
maintainer moved it ahead the same day: *"Go ahead and build the segment button
timing."* The button is therefore built now and offered only where a segment
has readers counted on the page, which today is nowhere.

## What shipped

- **The button.** The drawer for a waiting change on *For review* offers
  *Accept for <segment> only* beside *Accept*, once for each segment the page's
  rules name (in the rules' order) that has page views counted on that page
  (`segments/offered.ts`). A change that no longer fits the site's version
  offers neither. A line under the buttons says the page stays as it is for
  everyone else. The card in the list keeps *Accept* and *Turn down* only.
- **Accepting** (`segments/segment-forms.ts`, `acceptForSegment`): the action
  checks the segment is still offered, then the change is applied on top of
  that segment's earlier changes to the page as it is live (`liveTreeOf`). A
  change that does not apply is refused and stays waiting. Otherwise the hold
  is taken (so an answer happens once, as `confirmHeld` does), the change is
  kept, and the segment's form is written through 0376's store, which the read
  door already answers (0392). What it was made from (intent, stake) is kept
  beside every made change, so piece 3 can lead with its goal.
- **Keeping it** (`segments/segment-changes*.ts`): `loom_segment_changes`, one
  row per change accepted for a segment: its page, segment, operations, who
  accepted it and when, and when it was dropped. Memory and Postgres stores
  under one contract test. **Needs `pnpm db:push`.**
- **Keeping forms on their page** (`rebuildSegmentForms`): after *Accept* for
  everyone, a run of the AI on a page (manual or the sweep), *Propose
  reverting*, and a newer version of the site's page being followed, each
  segment's form of that page is built again on the page as it is live, oldest
  change first. A change that no longer fits is dropped from its form and
  marked with when. A form already on the live revision with nothing dropped
  is left as its author wrote it. A page with no change for a segment costs one
  read.
- `scripts/db-push.ts` creates the table; `docs/portal.md` row 9 records the
  piece.

## Decisions taken, and why

- **A table of its own, not a column.** 0386 clause 9 said *"an audience column
  on the portal's accepted-change record"*. A change for one segment is never a
  revision of the copy, so its operations have nowhere else to live; putting
  them and the segment on `loom_made_changes` would make that table two things.
  Same `pnpm db:push`, and the record's intent (where the audience is kept) is
  met. Said here and on the pull request rather than by editing the Accepted
  record.
- **The answer carries the segment** (`accept-for:<word>`), because a waiting
  change's answers share one form and one field. Any answer that is neither
  *Accept* nor a segment's still turns the change down, as before.
- **A segment none of whose changes fit has no form written**, and its old row
  stays behind the page. 0376's store has no delete and a delta needs an
  operation, so the site serves that segment the page as it is for everyone
  (0392 clause 4). Piece 3 lists the dropped changes.
- **Rebuilds never decide the write they follow.** A form left behind is
  already answered safely by the site, so a rebuild that fails costs freshness
  for that segment only.

## Not in this piece (0386 piece 3)

Measuring a change for a segment on that segment's readers, the *only for*
chip, a change for a segment on *Accepted* and *Page history* (with undo), and
listing the dropped ones. Until then a change accepted for a segment shows on
*For review* as answered and nowhere else in the portal.

## Tests

- `segment-changes.contract.ts` against memory and Postgres (PGlite), plus the
  table's migration, row level security, scoping and unreadable rows.
- `segment-form.test.ts` (5), `segment-forms.test.ts` (9), `offered.test.ts`
  (3), `segment-answer.test.ts` (3), `change-drawer.test.tsx` (2 new).
- `pnpm verify`: see the pull request comment for the figures.
- No screenshot: the drawer gained one row of buttons that is drawn for no
  project yet, and the run did not render it.

## Toward the wireframe

*6 · Segments*: *only for: <segment>* can now be chosen at *Accept*. Still
missing: the split of before and after on *History* and the change's own
measuring (piece 3), and a site that sorts its readers so the button is ever
offered.
