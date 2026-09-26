# 0195. A shot may say what the browser started with, and it says it as data

**Status:** Accepted
**Date:** 2026-09-26
**Section:** §1 (process)

## Context

[0159](0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md) drew
the line — *an instrument may reach a state and may never assert one* — and
[0182](0182-a-shot-may-reach-a-state-it-does-not-photograph-and-may-name-the-document-it-reaches-into.md)
applied it to four findings at once. Both of them are about the same axis:
*what happens after the page is open*. A `do` list presses, types and waits,
and every state it can reach is downstream of a load.

Two findings since then are not on that axis, and neither could be answered by
another step.

| filed | lane | what it could not photograph |
| --- | --- | --- |
| 17 Sep | `Loom lessons` | three screens whose subject is what the browser held **before** the load |
| 25 Sep | `Loom demo` | the frame a visitor reaches by **scrolling back**, which no press lands on |

Both were photographed anyway, by hand-written Playwright in a scratch
directory, which is the arrangement
[0116](0116-a-screenshot-is-taken-by-the-repository-and-playwright-is-never-a-dependency.md)
exists to keep from becoming normal. That is now eight such pictures across
three lanes, and what is lost each time is the one property the harness exists
to give: a picture taken that way cannot be retaken from anything in the
repository.

**The scroll is not what this record is about.** `scrollTo` is a fifth member
of a set 0159 and 0182 already decided the shape of — it names a state, it
reports nothing, and 0159 listed *scrolling to a position* by name as a reach
it had not been asked for yet. It has now been asked for, it is built, and it
needs no record of its own beyond this paragraph saying which one it belongs
to. What was declined with it is `scrollBy: <pixels>`, offered in the same
finding: a distance is a position chosen against a scroller the list does not
name, at a viewport that changes between `phone` and `wide`, and the two lanes
that would write it mean *the controls* rather than *four hundred pixels*.

**What needs deciding is the pre-load state**, because the obvious field for it
is a script, and the finding that asked for it said so and declined to guess:

> An `initScript` is arbitrary JavaScript in a JSON file, and the harness's
> whole posture is that a shot list is *input* — Zod rather than a
> hand-written type, `strict` on every step, so that a misspelling is loud. A
> field that runs whatever it is given is the opposite of that posture,
> whatever it buys.

It also named the cost of the safe answer: a map of keys cannot reach the state
most worth photographing, which is storage the reader has **blocked**. There is
no value of any key that means *this throws*.

## Decision

**A shot may carry a `start`: a closed set of named states the browser is put
into before its first document loads. It is never a script.**

Two members today, and a union rather than two optional fields, so the pair
cannot be asked for:

| `start` | what the browser does |
| --- | --- |
| `{ "storage": { "<key>": "<value>", … } }` | those keys are in `localStorage` before the first paint |
| `{ "storageBlocked": true }` | `window.localStorage` throws a `SecurityError` on access |

Three consequences of the shape, each of which is the decision rather than an
implementation detail:

1. **A lane supplies values, never a body.** The JavaScript injected is written
   in `tools/specimen/start-state.ts`, in this repository, typed and tested
   like everything else. The shot list hands it an argument. This is what keeps
   `strict` meaning something: every field of a start state is checkable,
   because every field is data.
2. **It throws where a browser throws.** `storageBlocked` replaces the
   `localStorage` *getter*, not `getItem`. A page that guards the call and not
   the access is exactly the page worth photographing, and a block that threw
   only from `getItem` would photograph it working.
3. **It is the shot's, and it precedes the `before`.** The state belongs to the
   browser context, and a context is what a shot gets one of. A shot that signs
   in and then reads a record needs the record there for both loads.

`scrollTo` ships alongside as the fifth `do` step, under 0159 and 0182 rather
than under this record.

## Consequences

- The two findings close, and the eight scratch-directory pictures become a
  category that should stop growing. The next one is a finding about this
  record, not a run's private script.
- **`start` will be asked to grow**, and the answer is another named member —
  a cookie, a media preference, a clock — each of which is a small decision
  about what is data. The answer that is ruled out here is the one that makes
  all of them unnecessary at once, and that is the point: a set that grows by
  name stays checkable, and a field that runs a string never does.
- An init script runs on **every** document in the context, so a shot whose
  `before` writes to a key this seeds will have the seed reapplied on the next
  navigation. That is stated in the docblock rather than worked around. A shot
  that needs the two to interact is asking for a sequence, and a sequence is
  what `do` is.
- The harness still cannot hover, cannot scroll by a distance, and cannot read
  anything back out of a page. The first two are findings if a lane wants them;
  the third is the line itself.

## Alternatives considered

**An `initScript` string.** One field, covers every case including the ones
nobody has thought of, and it is what a person writing this by hand would
reach for. Rejected because it makes the shot list unverifiable in exactly the
place the shot list is verified. Everything else in `plan.ts` is `strict` so a
misspelling is loud; a string of JavaScript has no misspellings, only different
programs, and the failure it produces is the one this harness exists to prevent
— a `ReferenceError` thrown inside a page nothing is watching, surfacing as a
correct-looking photograph of the wrong state. It is also a standing invitation
to put the assertion 0159 forbids into a shot list, one `if` at a time.

**A `storage` map alone.** The safe half, and it was tempting to ship it and
leave the blocked case to the scratch directory. Rejected because the blocked
case is the one of the three screens a reader cannot see is happening, which
makes it the one most worth a picture — and leaving it out would have left the
finding open while looking closed.

**A `boolean` for `storageBlocked` rather than the literal `true`.**
`storageBlocked: false` is a field that reads as a decision and means nothing.
A lane that writes it has said something it will believe later.

**Putting `start` on the approach shape, beside `waitFor` and `frame`.** It
would let a `before` bring its own. Rejected: two approaches in one shot could
then give two answers to *what did the browser start with*, and only the second
would win — a disagreement resolved by ordering, in a file whose whole posture
is to refuse rather than to resolve by precedence.

**`scrollBy: <pixels>`**, offered beside `scrollTo` in the 25 September
finding. Rejected as above: it is a position rather than a subject, it means a
different thing at each viewport, and neither lane that asked for it wanted a
distance.
