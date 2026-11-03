# 0341. A turned-down change is remembered, and the AI weighs a new proposal against it

**Status:** Accepted
**Date:** 2026-11-03
**Section:** §5 (portal), the reasoning plane

## Context

[0329](0329-loom-proposes-changes-to-a-published-page-from-what-its-readers-did-on-a-copy-that-starts-as-that-page.md)
left the copy where it was when a change was turned down, so the next day's
look could propose the same change again. Nothing remembered the answer.

The maintainer, on 3 November 2026:

> _I think it should keep track of changes you turned down, weigh the
> suggestion against it's previous rejection. I would expect most of the time
> that it won't be brought up again, but it could._

## Decision

1. **Every change turned down on *Waiting* is remembered** in
   `loom_turned_down`: the page, what was proposed, who turned it down, when,
   and the reason when one was given. It is kept per page, not per copy, so a
   change turned down on one version of a page counts on the next (0340).

2. **Turning down asks why, and does not insist.** *Waiting* offers an optional
   box of up to 300 characters beside *Turn down*. The change is turned down
   whether or not the remembering works: a person who said no has said it.

3. **The AI is shown a page's ten most recent turned-down changes** with each
   reason, after the readings, every time it looks at that page.

4. **The weighing is the AI's, told to lean against.** It is told not to
   propose a turned-down change, or anything amounting to it, unless the
   figures now argue for it clearly more strongly than any reason it was
   turned down for. If it does propose one again, it must say what has changed,
   and that sentence travels with the request, so whoever answers on *Waiting*
   reads *Turned down before. Proposed again because: …*.

## Alternatives considered

- **Never propose a turned-down change again.** Simple to enforce by comparing
  requests, but the maintainer said it could come back, and two requests that
  amount to the same change are rarely the same words, so a text comparison
  would block too little and the wrong things. A page whose readers changed a
  great deal deserves the question again.
- **Suppress a turned-down change for a fixed time, then allow it.** Easy to
  explain, but it ignores the evidence: a change turned down for a reason that
  still holds would come back on a timer, and one whose figures doubled would
  wait for no reason.
- **Score similarity with embeddings and a threshold.** More reliable than
  text comparison for spotting the same change in other words, but it needs a
  second model call per page and a threshold nobody can explain, and it still
  cannot judge whether the evidence is now stronger. The proposing model
  already reads the page and its figures, so it is the one placed to weigh both.
- **Require a reason to turn a change down.** Would make every entry more
  useful, but it puts a form in the way of the one action that must always be
  quick, and the change is just as unwanted without one.

## Consequences

- One new table, `loom_turned_down`, created by `pnpm db:push`. Until it runs,
  nothing is proposed: the proposer reads it before it asks the model.
- The weighing is only as good as the model's judgment. *Waiting* shows when a
  change is back, so a person can see each time the AI chose to ask again.
- Changes turned down before this record are not remembered.
