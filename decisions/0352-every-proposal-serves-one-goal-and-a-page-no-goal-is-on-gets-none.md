# 0352. Every proposal serves one goal, and a page no goal is on gets none

**Status:** Accepted
**Date:** 2026-11-05
**Section:** §5 (portal), the reasoning plane

## Context

[0350](0350-a-project-sets-goals-from-signals-already-collected-and-one-of-them-is-primary.md)
let a project set goals, one of them primary, and left the proposer (0329) as it
was: it still proposed the change most likely to help readers *get further or
act more*, with no stated aim. The concept wireframes the maintainer set as the
portal's target on 5 November 2026
([`docs/portal-wireframes.md`](../docs/portal-wireframes.md), *3 · Goals*) say
how the two meet:

> *"One goal is primary. Loom proposes toward it unless a page has its own. A
> page with no goal on it gets no proposals."*

and, under *2 · For review*, that each card leads *"with its goal chip"*. His
words on the wireframes:

> *"This is a great start… this should be the starting point goal to work
> towards."*

Three things the spec does not say had to be settled to build it: which goal a
page has when several are on it, what *on a page* means for a goal counted on
every page, and how a held change remembers its goal, given that the custody of
held changes (`loom_holds`) belongs to the framework and the portal may not add
a column to it.

## Decision

1. **A goal is on a page when it covers the page and the page has its part.**
   It covers the page when it counts on every page or names this one. The part
   must be on the published page, because a change to a page cannot move a
   count of something the page does not have; this is the same rule 0350 uses
   to count a goal on *every page that has it*.
2. **Of the goals on a page, the page's own comes first, then the primary,
   then the oldest.** A page's own goal is one that names the page. Among
   several that do, and among those that count everywhere, the order is 0350's
   (`primaryFirst`).
3. **A page no goal is on has nothing proposed for it**, and the person who
   pressed *Look now* is told so in one sentence that sends them to *Goals*.
   The model is not asked, so no key is spent on it.
4. **The model is told the goal.** The brief names it, says what it counts
   (*counts each time a reader presses n_…*), and asks for the change most
   likely to get more readers to do it.
5. **Which goal a proposal serves is recorded before the proposal is made**, in
   the portal's own table `loom_proposal_goals`, keyed by the intent the
   proposal is made from. The intent id is minted before the write path runs
   and every held or made change carries its intent whole, so the record
   reaches the change without touching the framework's tables. The goal's name,
   kind and part are kept as they were, so a change still names what it was
   for after its goal is removed. If the record cannot be written, nothing is
   proposed: a change never waits without naming its goal.
6. ***For review* leads each card with a green goal chip.** A change raised
   before this record says *No goal named*. While the table cannot be read, the
   screen says so and names `pnpm db:push`, and the changes are listed without
   chips.

## Consequences

- **A project with no goals stops getting proposals.** That is the spec's
  intent, and a change for this deployment: until a project sets a goal on
  *Goals*, the daily sweep and *Look now* propose nothing for it, and say why.
- **`pnpm db:push` is needed** to create `loom_proposal_goals`. Until it runs,
  proposing stops with *the store did not answer* and a line naming
  `pnpm db:push`, and *For review* lists changes without their goal.
- A record whose intent never became a change (the interpreter or the Gate
  refused it) is kept and never read. It is one small row per refusal, and
  nothing lists the table except by the intents of changes that exist.
- The *goal picker* on *For review* and *changes for it* on *Goals* can now be
  built from this table. Neither is in this record's change.

## Alternatives considered

**Writing the goal into the request's words**, for example a trailing
*(Goal: Starts a trial)*, needs no table and no `pnpm db:push`. It was rejected
because the screen would then have to parse a sentence the model's text sits
beside to find a fact the portal itself decided, and a goal renamed or removed
could never be matched back to a goal id for the *changes for it* count the
wireframes ask for on *Goals*.

**Deriving the goal when the screen is drawn**, from whichever goal is on the
page now, needs no record at all. It was rejected because it is wrong as soon
as the primary goal moves or a page gets its own: a change proposed to raise
trial starts would start claiming to serve sign-ups, and the before and after
of unit 8c would be measured on a goal the change was never aimed at.

**Keying the record by the proposal id** reads more naturally, but the proposal
id is minted inside the write path and is only known after the change is held
or made. Recording after the write leaves a window in which a held change names
no goal; keying by the intent, which the portal mints, closes it.

**Falling back to the primary goal for a page that does not have its part**
would keep proposals flowing on every page, but would ask the model to raise a
count the page cannot raise, and the result would be measured on a part that is
not there.
