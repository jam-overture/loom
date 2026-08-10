# 2026-08-09 (day 43) — a revision, as somewhere a reader can go

**Build order section:** §5 — Loom Portal. The gap day 41 opened and day 42
carried: `/history` could be *sent* to a revision, but nobody could ask it for
one.

**Branch:** `day-43-naming-a-revision`, off `day-42-relocation`.
**PR:** against `day-42-relocation`, so the diff is this unit alone.

---

## Where this run started

First run of 9 August; day 42 was twelve hours ago. Ten PRs open, all mine, and
**still no maintainer feedback**. I checked #59 (comments and review threads) and
#58: every human-looking comment is one of my own report comments or Vercel's
deploy bot, and the one genuine human comment in recent history remains *"tell me
more about item number 2"* on #45, answered in full on 4 August. That fork is
still yours.

So nothing to act on before continuing. §2's gap closed yesterday, §1's open item
is the architectural question that is yours, and both remaining §2 items are
recorded "leave it" with reasons (0042). The next incomplete unit in build order
is §5, and both of the last two reports named the same thing as its smallest
remaining gap. That is what this run built.

## What was built

### The gap, stated exactly

A revision number is public and stable — it *is* the log entry's identity — which
is precisely why it travels further than the links that carry it. It turns up in
a report, in a message from whoever asked for the change, in a screenshot of
somewhere else in the portal.

0043 made the store able to open a page at a named revision, and the portal has
used that from links ever since. But a reader **holding** a number and no link had
exactly two options: page back through the log until it appeared, or hand-edit
the URL. The capability existed and had no door on it.

### The box

A `go to revision` box on `/history`, writing the same `?at=` parameter a link
writes. One way in, one thing to explain when it misses.

**A plain GET form, not a server action and not a client component.** Naming a
revision is a read: it is idempotent, and the result is a URL worth keeping and
worth sending to somebody. A server action would turn a shareable page into a
POST; a client component would put JavaScript between a person and a query
string. `next/form` keeps the client-side navigation the rest of the portal has
via `Link` and degrades to the native form it already is.

**It submits `tree` and `at` and deliberately drops the cursor.** `historyRead`
resolves a cursor ahead of an anchor — a step a reader took is a later instruction
than the link that brought them — so a form carrying `older` through would name a
revision the read then ignored, and the box would silently do nothing from the
second page onward. Typing a revision is not a step from where you are; it is a
fresh position. This is the one part of the change that would have shipped broken
without thinking about it, and there is a test.

### The parse had to stop swallowing its refusals

This is the part worth arguing with, and it is the reason the unit is not just a
form element.

`parseRevisionParam` answered `number | undefined`, and `undefined` meant two
different things: *nobody named a revision* and *somebody named `elevn`*. While
every anchor arrived from `revisionHref`, that was the kindest reading available —
a malformed `at` could only be a hand-edited URL, and showing the newest page was
a fine answer to a URL nobody built.

A typo is not a hand-edited URL. It is the ordinary way a typed field goes wrong,
and it produces the one response a person who just typed something cannot act on:
the page they would have got anyway, with nothing said.

So the parse is now **exactly as strict** — a revision is still a whole number
from 1 up, and `0`, `-2`, `3.5`, `four` and `1e400` are still not positions — and
it reports the refusal instead of discarding it:

```
absent | { malformed, typed } | { named, revision }
```

`anchorOf` gives the store a position or nothing, so the read is unchanged;
`echoOf` gives the box what to show back.

### Four misses that used to look the same

`describeStaleAnchor` became `describeAnchorMiss`, over the whole parse rather
than over a number. A page that is not showing the revision asked for looks
identical in four situations, and a reader can act on only one of them:

| what happened | what the page says now |
| --- | --- |
| typed value is not a revision | `“elevn” is not a revision — a revision is a whole number from 1 up, so this is the newest page instead.` |
| revision is past the log's end | `Nothing on this page is revision 900 — this log reaches revision 12.` |
| log has no entries at all | `… — this log has no accepted changes yet.` |
| reader paged away from it | `… , which is further along / further back than this page.` (unchanged) |

The second row is the one that costs nothing and was worth having. An anchored
read with no cursor runs `older` from the anchor, so the newest row it can return
is `min(anchor, head)` — which means on a miss, the row at the top of the page
**is** the log's head. The page already had the number; it just was not saying it.

That is also why the function takes `newestOnPage` rather than `head`. Once a
cursor is in play the top row is not the end of anything, so the branch that names
an end is unreachable from there — asserted in a test, because a sentence naming a
head the page has not seen would be a guess dressed as a fact.

### While I was there: the last revision the portal named as plain text

The preview header on `/trees/[treeId]` read `{treeId} · revision 12` as text.
"What did the change I am looking at actually do" is the obvious next question
from that spot, and the answer was a trip to `/history` and a descent through the
log to find a number already on screen. It is a `RevisionLink` now.

That surfaced revision 0 — a tree nothing has changed yet — which no other caller
could produce. A link to it would open a page that cannot hold it and explain
that the log has not reached it: true, and useless. `RevisionLink` is total over
it now and renders the number without linking, **in the component rather than at
each call site**: a rule three callers have to remember is a rule one of them will
forget, and the failure mode is a link that lands on an apology.

## Decisions I made that were not specified

**No decision record this run, and I want that to be a visible choice rather than
an omission.** Everything here is implementation detail inside designs already
agreed: 0043 decided a revision is a position a caller may name, 0026 decided the
log is read a page at a time from an end, 0018 and 0019 decided what the portal
is. Making a position typeable rather than only linkable does not constrain the
tree schema or the delta model, does not fix a contract another component must
implement, and rules nothing out that a reasonable engineer would reach for. The
`decisions/README.md` rule is explicit that this belongs in the report, and
writing a record for it would dilute the index rather than add to it.

**The parse reports its refusal; it does not become lenient.** The tempting
alternative was to accept `007` or `#12` or `revision 4` and be helpful. I would
rather one definition of a revision that everything in the portal agrees on, and
a sentence when something is not one.

**The refused value is bounded at the parse, not at the view.** It is echoed back
into an input on a page anyone can be sent a link to, so a 5,000-character query
parameter would otherwise become a 5,000-character input value. Twenty-four
characters, decided where the parsing happens so no view has to remember. There
is a test.

**`revisionHref` stays total; reachability is a separate function.** Where a
revision *would* be and whether it is worth going are different questions, and
folding the second into the first would make the href lie by omission.

**The empty box means "newest".** Submitting it clears `at` and lands on the page
`/history` shows anyone arriving from the nav, which is the same thing the
`latest →` link does. No separate clear control for a thing the field already
does.

## Decision records

**None added, none superseded, nothing contradicted.** 0043, 0026, 0018 and 0019
all hold unchanged; this builds on them rather than adjusting them. No escalation:
`LoomTree`, the delta model, `TREE_SCHEMA_VERSION` and every store contract are
untouched — apart from this report, the run changes no file outside
`apps/portal`.

## Test coverage and status

`pnpm verify` green end to end: build, typecheck, both suites, portal build.

- **Runtime: 993 tests / 78 files**, all passing, **nothing skipped** — unchanged,
  as expected for a run that touched no runtime file.
- **Portal: 328 tests / 28 files**, up from 313 / 28. Fifteen new tests, no new
  file; all landed in `lib/history-link.test.ts`, which went from 19 to 34.
- **Both live API tests ran and passed** against `claude-opus-5`
  (`DEFAULT_INTERPRETER_MODEL`, unchanged). Nothing in this unit calls a model —
  they ran because `ANTHROPIC_API_KEY` was present and the suite is not allowed to
  quietly skip when it is.

What the new tests hold down:

- **The parse:** a revision reads as a revision; absent and empty and whitespace
  read as absent; every value the old parse refused is still refused and now says
  so; the refused value comes back trimmed and bounded to 24 characters.
- **The store is never given a non-position:** `anchorOf` yields nothing for both
  `absent` and `malformed`, so the read is byte-for-byte what it was.
- **The echo:** a revision comes back as the number it was read as, a refusal as
  the value that was refused, an absence as an empty box — and never more than
  the parse was willing to keep.
- **The four misses:** each produces its own sentence; the revision asked for is
  named in every one; the log's end is named only when the page has actually seen
  it, and **not** when a cursor is in play.
- **Silence where silence is right:** nothing is said when the revision is on the
  page, and nothing when nobody asked for one.
- **Reachability:** revision 0 is not a destination, revisions from 1 up are.

**Nothing weakened. Nothing skipped.**

### Not verified in a browser

The portal has no browser or component test harness (day 26, still open), and I
did not add one inside this unit — that is its own piece of work, not a side
effect of a form element. What is covered: the production build compiles, the
route builds, every class used resolves in the emitted CSS (`sr-only`, `w-20`),
and all the branching logic is pure and tested. What is not: that the form
actually navigates, and that the box looks right next to the header. **The Vercel
preview on this PR is the fastest way to check both, and it is worth thirty
seconds of your time** — `/history?tree=…`, type a number, type `elevn`, type
`900`.

## Open questions and blockers for the next session

1. **§5's named gaps are now closed.** `/history` reads both ways (day 41), can be
   opened at a revision (day 40/41), and can be asked for one (this run). Every
   revision the portal names is a link. **Recommendation for next run: the portal
   component test harness** (day 26) — it is now the thing blocking confident work
   on every remaining portal surface, and this run is the second in a row to end
   with "not verified in a browser".
2. **Lesson 07 (#58) still documents behaviour #59 changes.** Unchanged from
   yesterday and still the same recommendation: **land #58 before #59**, then let
   the lessons routine correct lesson 07 as it corrected lesson 04 in #49. Second
   instance of the build/lessons collision (#52/#54 is the first).
3. **Ten PRs are open, and the build stack is eight deep** — #49, #50 → #51 → #53
   → #54 → #56 → #57 → #59 → this one, and #52 → #55 → #58. **Recommendation:
   land #50**, the bottom of the build stack; #49 is independent and also ready.
   `main` last moved on 5 August.
4. **Merge order between #52 and #54 still matters** and is unchanged; detail is
   on #52.
5. **Still nothing scheduled** — telemetry prune (day 34) and snapshot audit
   (day 28). **Recommendation: one nightly Vercel cron covering both**, once you
   are happy with the 90-day default. Longest-carried item, unanswered across nine
   runs.
6. **Carried, still yours — sign-in lockout history** (option B, #45/#50).
   **Recommendation: not yet**; a governance call about retaining failed attempts
   against a public form.
7. **ARCHITECTURAL, from day 35, still yours: should a tree carry the ids it has
   retired?** Unchanged. **Recommendation: not yet.**
8. **Carried, unchanged:** a contained emit failure is invisible by design
   (day 39); a sink can still block (day 39); telemetry written before day 37
   keeps `interpreter-unavailable` on failures that were really rejections; RLS
   fails closed for a non-owner role (day 34, by design); a missed `db:push` is
   still a sign-in outage (day 32); `policyId` is a name rather than a fingerprint
   (day 31); calibration does not segment by policy (day 31); and the reply schema
   sits near its 3500-byte guard.

**§7 — Marketplace — remains the only section I will not start without you saying
so.** Sections 1–6 are functional end to end; what is left in each is the list
above.
