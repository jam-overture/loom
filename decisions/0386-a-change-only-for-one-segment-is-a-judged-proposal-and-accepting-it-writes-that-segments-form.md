# 0386. A change only for one segment is a judged proposal, and accepting it writes that segment's form

**Status:** Accepted
**Date:** 2026-11-12
**Section:** §5 (portal), the governance and connection planes

> **Accepted on 13 November 2026.** The maintainer: *"Okay, take the proposal
> for 872."* The three defaults stand as written: the person picks the segment
> at *Accept*, one segment per change, and the Gate's verdict for everyone
> stands for one segment. Piece 2 of clause 9 landed before acceptance, from
> the framework's lane: [0392](0392-a-segments-form-arrives-in-the-same-pull-as-its-rules-and-a-form-that-cannot-be-applied-costs-the-reader-their-segment.md)
> (#886) has the door answer `{ pages, rules, forms }` and the pull client
> compose a reader's segment with `pageForReader`, falling back to the base
> where a form cannot be applied. Clause 6's rebuild keeps the portal from
> writing such a form; 0392 clause 4 is what a site does if one reaches it
> anyway. Pieces 1 and 3 are the portal's.

## Context

[0371](0371-a-segment-is-an-audience-the-site-sorts-its-readers-into-and-loom-keeps-only-its-rules-and-its-name.md)
(Accepted 11 November, the maintainer: *"Okay to accept."*) builds segments in
four pieces. Pieces 1 to 3 are on `main`: *Segments* writes each page's rules
through [0376](0376-a-pages-audience-rules-are-an-attributed-log-and-its-forms-are-rows.md)'s
store (#863), the read door answers those rules beside the live pages (#866),
and a segment picker narrows *Signals*, *By page* and *Goals* to one segment's
readers (#868). The pull client that sorts a site's readers by the rules and
names the segment on their signals is on pull request #870 (Proposed there), in the
framework's lane.

Piece 4 is what is left of the wireframe's *6 · Segments*
([`docs/portal-wireframes.md`](../docs/portal-wireframes.md)): *"only for:
<segment> on a proposed change"* and *"a split of before and after on
History"*. 0371 clause 7 says it *"is settled by its own record when piece 3 is
on `main`"*, and its acceptance note left one question to that record:
**whether a segment's form is judged by the Gate.** `FINDINGS.md` (10 November,
*a form an audience is served is a change a reader sees that no policy judged*)
sets the question out: a change to the base passes the Gate under a recorded
policy (0033); a row written to `loom_audience_forms` passes nothing, and
changes what that audience sees at once. The framework lane recommended
*leave it, and write the asymmetry down*, and said nothing waits on the answer.

Three things are already settled and this record builds on them:

- **0358**: *Accept* is the last human step, the site pulls its live pages from
  the read door with no reader in the request, and a newer version of the
  site's page restarts the copy and replays the accepted changes oldest first,
  dropping and listing any that no longer fit.
- **0359**: a composed page is the base with the matching audience's form
  applied, the last matching rule wins a contested part, and a form that
  cannot be applied is refused whole by the composition.
- **0376**: a page's form for one audience is one row, replaced in place, with
  its `base_revision` beside it; *"the record of how a form came to say what it
  says is the proposal that produced it."*

## Decision

1. **The portal writes a segment's form only from accepted changes, and every
   one of them passed the Gate.** A change reaches *For review* the one way
   any change does (0329): the proposer makes it, the Gate judges it under the
   project's policy, and a person accepts it. *Only for: <segment>* is a choice
   made on that judged change, never a second path around it. So for every form
   the portal writes, the Gate question has one answer: **judged**. Whether a
   form written straight to the store by something other than the portal is
   judged stays the framework's open question in `FINDINGS.md`; nothing in this
   record depends on its answer, and the portal never writes a form any other
   way.
2. **The person chooses the segment, at *Accept*.** The drawer's *Accept* keeps
   its meaning (every reader) and gains *Accept for <segment> only*. The
   proposer stays on the base, as 0371's defaults keep it: proposing for a
   segment needs that segment's own readings and a choice of which segment to
   aim at, which is the model seam of the plan's row 9 and a later record. A
   judged change narrowed to fewer readers carries no more risk than the
   judgment it was given for all of them, so the Gate's verdict stands for the
   narrower audience.
3. **Offered only where it can do something.** *Accept for <segment> only* is
   offered for a segment the page has rules for **and** has counted page views
   under. A segment nobody has been sorted into would accept a change no reader
   is served, which is a button that does nothing; the drawer says instead
   *No reader has been counted in <segment> on this page yet*, as the picker
   already does (0371 clause 6, *figures only once a segment has page views of
   its own*).
4. **One segment per change.** A change is for everyone or for one segment. Two
   segments that both want it are two acceptances, each measured on its own
   readers. A constant to widen later, never a cap on the segments a page has.
5. **A segment's form is the copy plus the changes accepted for it.** On
   *Accept for <segment> only*, the portal checks the change still fits the
   segment's form (the copy with that segment's earlier changes applied, as
   0340's re-check does for the copy), then writes the form through 0376's
   store against the copy's current revision. The form's own record is the
   list of accepted changes behind it, each with its proposal, its goal, the
   stake the Gate put on it and who accepted it, exactly as a change for
   everyone is kept.
6. **A form is never answered behind its page.** When the copy moves (a change
   for everyone accepted, or a newer version of the site's page starting a new
   copy, 0358 clause 6), each segment's form is rebuilt on the new copy from
   its accepted changes, oldest first; one that no longer fits is dropped from
   that form and listed on *Page history* as *no longer fits*, for that
   segment. The read door answers a page's forms only where every form's base
   is the page's live revision, beside the pages and the rules and failing
   with them, so a site never holds a form from one pull beside a page from
   another. Undoing a change for a segment rebuilds its form without it.
7. **A change for a segment is measured on that segment's readers alone.** Its
   before and after read the counters under the segment's `aud_` id, with the
   same 14 days a side, 1,000 page views a side and 95% two-proportion test
   (0371 clause 6, `docs/portal-wireframes.md`). Its *Live* step is the first
   answer carrying the form that the site named back (unit 8's kept-answer
   rule); until the site sorts readers, it says so rather than *Live*.
8. **Page history splits by segment and never compares segments.** Each
   version's verdict keeps its line for everyone, and under it one line per
   segment that has counted page views on both sides, each a verdict on its
   own population (0290, 0300). A change for one segment carries the chip
   *only for: <segment>* on its card, and its verdict is that segment's alone.
   Two segments' lines are never set against each other as a result.
9. **Built in three pieces, each on `main` before the next.**
   1. *Accept for <segment> only*, the fit check, the form written through
      0376's store, and the rebuild when the copy moves. Where an accepted
      change keeps which audience it was for is a new column on the portal's
      accepted-change record, so this piece needs `pnpm db:push`, and until it
      runs the drawer offers *Accept* for everyone only and says why.
   2. The read door answers the forms, and a finding for `Loom daily build`:
      the pull client composes the page for a reader's segment with
      `composeTreeForContext` from the forms it pulled.
   3. Measuring per segment, the *only for* chip, and the split on *Page
      history*.

**Defaults taken, reversible, for the maintainer to confirm** (`## Needs your
input` on the pull request):

- **The person picks the segment; Loom does not propose for one yet** (clause
  2).
- **One segment per change** (clause 4).
- **The Gate's verdict for everyone stands for one segment** (clause 2), rather
  than the Gate judging the change again against the segment's form.

## Consequences

- The question 0371 left to this record is answered for the portal without
  waiting on the framework's: every form the portal writes passed the Gate,
  because it is made of changes that did. The finding of 10 November stays
  open for forms written some other way, and the deployment guide's sentence
  about them is the framework lane's to write.
- A site that does not sort its readers sees no change, and the portal offers
  no *only for* until it does. Until #870's pull client is released and a site
  wires it, piece 1 is a screen with nothing to offer, which the rule *no
  screen before its data* forbids. **So piece 1 is not built until some site
  has counted page views under a segment**; this record can be accepted before
  then, and the order holds.
- A segment's readers see changes for everyone and changes for their segment
  together. Where both touch one part, the segment's form wins that part
  (0359), so a later change for everyone does not reach a part a segment has
  its own version of; *Page history* says so on the change for everyone.
- Every segment's form is rebuilt each time the copy moves, so a page with ten
  segments costs ten replays per acceptance. Ten is 0371's cap and the replays
  are pure, so this is bounded.
- `docs/portal.md` row 9 and `docs/portal-wireframes.md` *6 · Segments* point
  here once this is accepted.

## Alternatives considered

**Write forms straight to the store, unjudged, and let the framework's answer
decide later.** This is what 0376 allows today and what the framework lane
recommended for forms in general (*leave it, and write the asymmetry down*). For
the portal it would mean an owner could type a different page for a third of
the site's readers with no proposal, no stake and no record beyond a row's
author and time. That is the hole 0329 and 0358 exist to close for the base,
and opening it one dimension across, on the one screen built to stop it, is the
wrong place to start. Building the portal on judged changes costs nothing the
framework's answer could need back.

**The proposer proposes for a segment from that segment's readings.** The
wireframe's *only for: <segment> on a proposed change* reads most naturally
this way, and it is where segments earn most: a phone-only change found from
phone readers. It needs per-segment readings at 0329's 30-view floor, a choice
of which segment to aim at, and a model brief that knows about segments. None
of that has data today (no site sorts readers yet), and choosing what to aim
at is the model seam the plan names as the maintainer's. Letting a person
narrow a judged change first is useful at once (a cautious rollout to one
group), and the proposer can join later without changing anything here.

**Judge the change again against the segment's form at *Accept*.** Stricter,
and it would catch a change that fits the base harmlessly but lands oddly on a
segment's own version of a part. It would also put a second Gate run inside a
person's click, with its own hold and its own wait, for a change already judged
for a larger audience. The fit check of clause 5 catches the structural case;
the remaining case is a question of taste a person is looking at when they
press the button.

**Keep a portal table of forms beside 0376's store.** 0371 already turned this
down for the rules: two copies drift, and 0376 exists to be the one.
