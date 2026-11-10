# 0376. A page's audience rules are an attributed log and its forms are rows

**Status:** Accepted
**Date:** 2026-11-10
**Section:** §5 — Persistence, and §1's audience dimension

> **Why this number.** `main` holds up to `0374`. `0371` is claimed by the open
> #834, and **`0375` is claimed twice** — by #847 and #848, both opened on
> 9 November within twelve minutes of each other. `0376` is the next free
> number, and whoever merges the two 0375s has one of them to move.

> **Why it is raised.**
> [0359](0359-an-audience-rule-is-a-conjunction-of-scalar-clauses-and-a-composed-page-is-a-projection-of-a-revision.md)
> clause 6 named what it was leaving out: *`composingTreeSourceFromStore` takes
> an `AudienceOverlaySource` — a seam, not a table. 0263's store dimension is a
> schema change on top of 0260's; the composition needs none of it to be built,
> tested or reviewed.* That was right then and it is what left a page's
> audiences unauthorable: a deployment could serve two forms of a page only by
> writing its rules into a module and redeploying. This is the table, and the
> two shapes it takes are not the same shape.

## Context

[0263](0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md) clause 3
says a page's rules and the delta each audience earns are *cacheable beside the
base*, and 0359 built the half that reads them: `audiencesFor` sorts a reader,
`composeTreeForContext` lays the matched deltas onto the base, and
`composingTreeSourceFromStore` joins the two over a seam. Everything above that
seam is a pure function of a tree, a rule list and a context.

Below it, nothing. The two things a person has to be able to **author** —
*which readers are in `aud_eu`* and *what `aud_eu`'s page says* — had no row,
no attribution and no way into a running deployment. `docs/portal.md` unit 9
asks for a rule editor; the open finding of 5 November names the two halves
that editor is waiting on and gives the store dimension to this lane.

Three questions have to be answered before a column is written, and none is
answered in 0263 or 0359:

1. **Is a rule list a record or a setting?** It is read on every request and
   edited rarely, which is what a setting looks like.
2. **What keeps the order?** 0359 clause 3 makes the rule order the precedence —
   the last matching rule wins a contested node — so the order is not a
   presentation detail.
3. **Is a form a document or an event?** Every other delta in this system is an
   event in an append-only log.

## Decision

**A page's audience rules are an append-only, attributed log of the whole
ordered list. Its forms are one row per audience, replaced in place. The
dimension is additive: a deployment that never defines an audience is served
exactly what it is served today.**

### 1. The rules are a log, because editing one changes what a million readers see

A rule decides *which readers get which form*. Editing one changes what every
reader in that audience sees — **without touching the page, its delta, or its
revision log.** Kept as a mutable row, that change would leave no record
anywhere: no revision, no proposal, no disposition, nothing to attribute and
nothing to replay. A deployment could change what half its readers see and the
only evidence would be the difference.

That is the exact hole this system exists to close, so a rule list is stored the
way the policy log is stored (0200) and for the same reason: appended, dense,
and carrying the actor who made it the rules. `loom_audience_rules`' primary key
is `(application_id, tree_id, revision)`, which makes the **database** enforce
the sequence — two editors racing at one head both compute `N + 1` and the
second is refused, exactly as `loom_revisions` and `loom_policy_revisions`
already work, with no transaction and nothing to lock on the first revision.

**A record nobody can read is not a record**, which this record has to say
because the first draft of it got that wrong. The log was written and no read
reached past its head; a planted mutation that **overwrote the log instead of
appending to it** changed nothing any caller could observe, because the revision
numbers come off the head either way. `history` is therefore part of the
contract and not a convenience: bounded, newest first, unpaged on
`ProjectStore.list`' terms. Reaching past its limit is deliberately not offered
and the rows are there for whoever first needs it.

### 2. The ordered list is one JSON value and never a row per rule with a position

The order is the precedence. An order expressed as a `position` column is an
order a reorder **half-applies**: several row updates, and a reader arriving
between two of them is served a precedence nobody authored — on the one
dimension whose whole job is deciding who sees what. One value, written once,
cannot do that. It is also why `loom_trees.document` is one column.

### 3. A form is a row, replaced in place

A delta in the revision log is an event: it happened, it advanced a revision,
and it is never edited. An audience form is the opposite — a document being
worked on, **rebased onto a base that has moved** every time the page is
published (0359's own consequence: *a base edit stales every audience delta*).
A log of every rebase would be a record of drafting rather than of deciding, and
the record of how a form came to say what it says is the proposal that produced
it.

One row per audience rather than one row per page holding every form, so two
audiences' forms are independent writes. The replace is `ON CONFLICT DO UPDATE`
in one statement rather than a read, a decision and a write back, which two
editors can lose half of.

### 4. No delete, and an audience stops being served by leaving the rules

This store has no delete, which it shares with every other store here, and here
the reason is its own: an audience stops being served by being removed from the
rules. Its form then matches nobody and costs a row — and the day the rule comes
back, the work is still there. A delete would make *we stopped serving this* and
*we threw the work away* one button.

An **empty rule list is a real recorded state**, and it is the one a page
reaches by having its last rule removed: *this page is served to everybody the
same way, and somebody decided that.* The alternative spelling — delete the row
— is the one that cannot be attributed.

### 5. A form for another page is refused at the write

`composeTreeForContext` refuses a delta whose `treeId` is not the base's at
every render. A form stored under one page carrying a delta for another is
therefore a row that can never be served to anybody, and accepting it trades a
fault a person sees now for a page that is quietly unavailable later. The two
revision checks are **not** symmetric with this one: a stale `baseRevision` is
the ordinary state of a form whose base has moved, and refusing to store one
would mean refusing to keep the work that is about to be rebased.

### 6. `base_revision` is a column, and it is the only denormalised value here

The first question anybody asks of a page with audiences is which of its forms
are behind it. Answering it off `delta` means loading every delta to read one
integer from each, on a screen whose job is to say which of them is unusable. So
`forms` is a listing that carries `base_revision` and no delta — the same
argument `loom_policy_revisions.fingerprint` is a column on. The write takes the
number from the delta beside it and never from a caller, so the two cannot
disagree.

It says `baseRevision` and not *stale*, because staleness is a comparison
against the page's head and this store holds no pages. The caller holding both
numbers is the one that can say it.

### 7. Nothing about today's deployments changes

Both tables are new, nothing was ever stored in another shape, and there is no
backfill to guess at. A page with no rows in either answers an empty overlay,
which composes to the base — so wiring `audienceOverlaySourceFromStore` into a
deployment that has never heard of an audience changes nothing about what it
serves. A test holds that, because it is the property that makes this dimension
safe to adopt before anybody has used it.

## Consequences

- **0263's store dimension is built**, and the open finding of 5 November has
  its framework half closed. What remains of unit 9 is the rule editor, which is
  `Loom portal`'s, and the one thing that screen must teach is unchanged: rules
  are an ordered list, general to specific, and the order resolves two deltas
  reaching one node.
- **`AudienceOverlaySource` has an implementation**, so §1's audience dimension
  and §5 are joined the way §2 and §3 were joined by `treeSourceFromStore`.
- **`db:push` creates two more tables**, both RLS-locked on creation, both empty
  on every deployment that has not defined an audience.
- **A form is never judged by the Gate**, and this record does not change that.
  A delta reaching the base goes through the runtime, a policy and a
  disposition; a delta reaching an audience is written straight to a row. That
  asymmetry is now visible in code rather than implied by a seam, and it is
  filed as an open question rather than answered here.
- **`history` is bounded and cannot be walked past its limit.** A deployment
  with more than a hundred recorded rule edits on one page has a reading it
  cannot complete. Stated rather than solved, because the paging vocabulary
  exists (`RevisionStart`, `pageEnds`) and adding it now would be machinery
  written for nobody.

## Alternatives considered

**A mutable row per page holding the current rules.** Smaller, one seek, and it
is the shape a settings table takes. Rejected in clause 1: it makes the one
change in this system with no record a change with no record.

**A row per rule, with a `position` column.** The ordinary relational shape, and
it gives a rule an id to point at. Rejected in clause 2: a reorder stops being
one write, and the half-applied state is a precedence nobody authored, served to
whoever is reading at that moment.

**The whole overlay — rules and forms together — as one JSON document per page.**
Reads whole, which is what the seam asks for, and it is what `loom_trees` does
with a tree. Rejected because the two halves have different writers: one
editor reordering the rules and another rebasing `aud_eu`'s form would be two
writes to one value, and the loser's work would vanish with no error.

**A log for forms too, for symmetry.** Rejected in clause 3. It would record
drafting, grow without bound on the ordinary act of rebasing, and answer a
question — *how did this form come to say this* — that the proposal already
answers better.

**Keying the forms by `(application, tree, audience, base_revision)`, so a form
is kept per revision of the base.** Attractive: a base that moves back would
find its old forms waiting. Rejected because it makes *the current form* a query
rather than a key, and because a form against a revision the page has left is
refused at render anyway — so the rows would accumulate to serve a rollback no
part of this system offers yet.

**Checking a form's `baseRevision` against the page's head at the write.** Would
catch a stale form earlier. Rejected in clause 5: this store holds no pages, and
a form whose base has moved is exactly the work somebody is about to rebase.

**Letting the store answer *stale* directly**, by reading the tree store beside
it. Rejected: it makes one handle depend on another and on their two scopes
agreeing, to save a caller that already holds both numbers one comparison.
