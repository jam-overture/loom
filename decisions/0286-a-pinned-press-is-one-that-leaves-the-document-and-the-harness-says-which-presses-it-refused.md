# 0286. A pinned press is one that leaves the document, and the harness says which presses it refused

**Status:** Accepted
**Date:** 2026-10-16
**Section:** §1 (process)

## Context

[0159](0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md) gave a
`do` list its pin and stated the reason in one sentence: *"a click on a real
`a[href]` navigates, so step two would run on a different page and the picture
would silently be of somewhere else."* The implementation is a capture-phase
listener that calls `preventDefault` on any click landing inside an `a[href]`.

**The implementation is broader than the reason.** A same-page fragment does not
navigate. `<a href="#the-bar-above-your-page">` sets `location.hash` and
scrolls; step two runs on the same page, in the state the press produced. The
pin refused it anyway, and what that cost is two filed findings from the lane
that photographs documentation:

- **15 October.** A press of a contents row produced a shot byte-identical to
  one that did nothing. The run tried it twice, with a 400ms wait and then a
  2,500ms one, before reading the harness. `nav[aria-label='On this page']
  [aria-current='location']` read `no match` and `h2#the-bar-above-your-page`
  was still 13,322 pixels past the fold: the page had not moved at all. The
  report's picture is of a reader scrolling, taken with `scrollTo`, rather than
  of a reader pressing — the same state arrived at the other way, and the one
  the rail exists for is the press.
- **5 October.** A shot list that opened a menu and pressed a pager to
  photograph the page it landed on produced a picture of the page it started on
  with the menu still open — *exactly* the broken behaviour the branch was
  fixing. The harness exited 0, the measurements were consistent, and
  establishing that the press was the thing not working took a second shot list
  that pressed `a[rel=next]` with no menu in it at all.

The second finding also names the cheap half nobody had got to: a press the pin
refused is invisible. The harness knows; the lane running it infers it from a
selector reading `no match` two lines below the shot, if it notices.

## Decision

**A press is pinned when it would leave the document, and not when it would
only move within one.** The comparison is `new URL(href, location.href)`
against `location.href` on three fields — origin, path and query, which is *the
same address ignoring the hash*. A press whose destination matches on all three
is let through.

Every property the pin was written for is kept, and they are the reason this
refines 0159 rather than reopening it: a press that navigates is still refused,
the listener is still capture-phase, and it still calls `preventDefault` rather
than `stopPropagation` so the page's own delegated listeners — a reader-signal
broadcaster is one — still see the click.

**An `href` that will not resolve is refused.** The property being kept is that
a press never changes the subject of a shot, and an address nothing can parse is
not evidence that it would not.

**The harness says which presses it refused.** `act` hands back the address of
each one, a shot carries the `before`'s and its own in that order, and
`describeShot` prints one line per refusal under the same indent as every other
reading:

```
a-page  1280x900@2x  scrollWidth 1280 / innerWidth 1280
    pinned  https://loom.test/docs/elsewhere  ← press refused, it leaves the page
```

It prints and it does not fail, which is
[0213](0213-the-harness-reads-a-box-it-prints-the-number-and-the-judgement-stays-in-the-report.md)'s
rule and 0159's: the exit code is the overflow measurement alone, and whether a
refused press is a defect is the report's to say.

**The pin lives in `tools/specimen/pin.ts`, alone, and that is a testing
decision rather than a tidying one.** Both functions are serialised with
`Function.prototype.toString` and run in a page, so the string that ships is the
artefact and the module Vitest compiles is not it — the trap
[0195](0195-a-shot-may-say-what-the-browser-started-with-and-it-says-it-as-data.md)
and `start-state.ts` were written around, met from the other direction. The test
that can see it compiles the module with esbuild and `keepNames` and asks *that*
module its questions, and it can only do so for a module with no imports to
resolve. `playwright.ts` has four.

## Consequences

`SpecimenPage.act` returns `readonly string[]` rather than `void`, `ShotResult`
gains a required `pinned`, and `DescribableShot` gains it as optional — so the
hand-built shape lesson 32 passes `describeShot` does not have to learn a field
to keep printing the line it prints today.

**A `click` can now move the page**, which the `do` table's one-line
description did not say it could do and now does. Reaching a page a press would
*navigate* to is still not offered: that is a step whose name means it changes
the subject, it would want a line in 0159 of its own, and it stays the open
finding of 5 October rather than becoming a second meaning of `click`.

Three shapes a lane can now photograph that it could not: a contents row
pressed, a tab or an in-page filter that is an anchor, and anything whose state
is `:target`. Two pictures in this repository are of a reader scrolling where
the lane wanted a reader pressing, and are their lanes' to retake rather than
this one's.

**Neither body may contain a named inner function**, for as long as the harness
runs under `tsx`. `keepNames` wraps a named inner function in `__name(…)`,
which does not exist in the page: the listener would never be added, the first
press would navigate, and what came back would be a correct-looking photograph
of somewhere else. It is held by a test against the compiled artefact rather
than by a comment a reader has to remember, which is the half `start-state.ts`
had and the pin did not.

## Alternatives considered

**Leaving the pin alone and adding a `{ "pressFragment": … }` step.** Rejected.
It asks a lane to know, per link, whether the thing it is pressing navigates —
which is a property of an `href` the lane did not write, on a page it is
photographing precisely because it does not know what it does. The harness can
read the `href`; the lane cannot.

**Comparing `href` as a string against a `#` prefix.** Rejected as the spelling
that looks like the decision and is not it. `href="/docs/page#the-bar"` on
`/docs/page` is the same document and does not start with `#`;
`href="#"`-plus-a-base-tag is not. The question is *which document would this
press land in*, and the only thing that answers it is resolution against
`location.href`.

**Comparing only origin and path, letting the query differ.** Rejected. The
same path asked a different way is a different page and the server decides that,
not the harness: `?x=2` is a navigation whatever the document chooses to do with
it, and a shot whose steps crossed one would be photographing a page the lane
did not name.

**Reading the refusals after each step, so the line could name the step's own
selector.** Rejected on cost against value: it is a round trip into the page on
every press in the repository to learn a selector the address already
identifies. The refusals are read once, after the last step.

**Failing the shot on a refused press.** Rejected, and it is 0159 and 0213 in
one breath. A refused press is sometimes exactly what a lane means — a shot
proving a link is there without going to it — and an instrument that decides
which is which is an instrument asserting an outcome.

**Keeping the pin in `playwright.ts` and testing it through a real browser.**
Rejected: `playwright-core` is deliberately not a dependency of this repository,
so the test would skip on every machine that matters and the merge gate would
never run it. Compiling the artefact and running it against a `JSDOM` is the
reading that is available on the gate.
