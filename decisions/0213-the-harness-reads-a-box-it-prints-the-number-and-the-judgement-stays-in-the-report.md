# 0213. The harness reads a box, it prints the number, and the judgement stays in the report

**Status:** Accepted
**Date:** 2026-10-01
**Section:** §1 (process)

> **2026-10-02 — renumbered from 0212, and one clause added to the fifth
> decision.** `0212` went to [#477](https://github.com/jam-overture/loom/pull/477)
> while this branch was open; two routines wrote the same number on the same day,
> which is the collision `FINDINGS.md` has now recorded three times. Nothing this
> record decides changed. The one addition is a clause under *the judgement is
> in Node and the reading is in the page*: the formatter takes
> `DescribableShot`, so a shot built by hand need not carry a measurement while
> the harness's own result still always does. That is a clarification of where
> the split already fell, not a new direction.

## Context

Every visual unit this repository has shipped for a fortnight is argued on a
measurement, and until today not one of those numbers came from anything the
repository contained.

*The payoff card is 975px in an 857px rail.* *The caution is 103px.* *The rail's
furthest scroll is 623 against a card top of 740.* *1 of your last 3 changes
would have gone a different way, and the sentence saying so is 17px.* Those
numbers decided which unit was worth building and whether it had worked. All of
them were taken by a `playwright-core` script written fresh in a scratch
directory, run once, and deleted with the container.

`Loom demo` filed it on 30 September, after writing the third such script in
three runs, and appended a fourth data point the next day while writing the
fourth. Three lanes have now done this. The scripts have one shape, and none of
them is in the repository, reviewable, or capable of being wrong in a way
anybody could notice.

What the harness could already do was the hard half.
[0159](0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md) gave a
shot a `do` list, so a lane can press, type and scroll its way to the state
worth measuring;
[0182](0182-a-shot-may-reach-a-state-it-does-not-photograph-and-may-name-the-document-it-reaches-into.md)
gave it a `before` and a `frame`;
[0195](0195-a-shot-may-say-what-the-browser-started-with-and-it-says-it-as-data.md)
gave it a start state. A shot can reach the third screen of a signed-in flow
inside an iframe with a seeded record behind it — and then it can only
photograph.

So the cost was never reaching the state. It was that the instrument standing in
front of the fact could not read it, and a lane with a page already in exactly
the right condition had to go and build a second browser to ask how tall
something was.

**And the measurement that is missing is the one with no other witness.**
`Loom demo` shipped a unit on 30 September whose whole content was *the payoff
card fits its frame* — 975px down to 765px, with the reply moving from 23px
below the bottom edge to 186px above it. There is a test that the card's
reasoning folds. There is nothing that can fail if the card grows back past the
fold, because nothing in this repository could see a box. The next run that adds
two lines to that card puts the demo's closing argument under the fold and the
suite stays green.

## Decision

**A shot may read a rectangle. It prints the number, and nothing in it decides
an exit code.**

This is 0159's line held exactly where 0202 already put it. 0159 refuses
*assertion* — anything phrased as *did it…*, *is it…*, *wait until it says…* —
and it has never refused *measurement*: the document overflow check has printed
a reading off the page since the harness existed, and 0202 added a second
reading beside it. This is the third, and it is the first one a lane asks for by
name.

`measure` on a shot: an array of selectors, resolved in that shot's own `frame`,
read after the `do` list for the reason the overflow measurement is taken after
it. Per selector, per match, six numbers — `x`, `y`, `width`, `height`,
`scrollHeight`, `clientHeight` — and one printed line.

```json
{ "path": "/demo", "out": "…", "measure": ["aside", "aside li[id]", "text=Put it back"] }
```

```
the-rail  1280x900@2x  scrollWidth 1280 / innerWidth 1280
    aside  x 24 y 24  352x857  holding 1239 in 857
    aside li[id] (1 of 4)  x 40 y 377  320x358  ← 195 past the fold
    text=Put it back  no match
```

Five things had to be decided rather than inherited, and each of them is a way
this could have become a test runner with a camera attached.

**Nothing here changes the exit code**, which is 0202's rule and the load-bearing
one. `pnpm shoot` exits 1 on a document wider than its viewport and on nothing
else. A block below the fold is a copy and ordering decision — six of this
repository's last ten visual units have been exactly that argument — and the
instrument that reports it has no business settling it. The lane reads the
number, makes the call, and writes the call down where somebody can disagree.

**A selector that matches nothing prints `no match` and does not fail the run.**
This is the single place the decision is most easily got wrong, because a
missing match looks so much like a broken shot. It is not one: a lane whose
selector stopped matching has learnt the most interesting thing the run had to
tell it, and learning it as a printed line beside the picture is strictly better
than learning it as a dead run with no artefact. The moment a selector can fail
a shot, `measure` is an assertion with a different spelling and every lane will
write its journeys through it.

**Every match, in document order, not the first.** A lane asking about
`aside li[id]` is asking about the list. A harness answering with its head would
be answering a question nobody asked while appearing to answer the one they did
— and it is `(n of m)` on the line rather than a bare repeated selector, because
the two facts a lane needs about the second row of a table are which row it is
and how many rows there are.

**The reading is raw and the rounding is presentation.**
`getBoundingClientRect` is fractional, layout is fractional, and a reading
rounded at the source is one whose error nobody can see afterwards: two blocks
0.4px apart arrive as the same integer and get quoted as touching. `ElementBox`
carries what the page said; `describeShot` rounds.

**The judgement is in Node and the reading is in the page**, which is 0202's
split and its reason. Reading a rectangle needs a laid-out document; deciding
whether that rectangle fits is arithmetic. `insideViewport` and `pastTheFold`
are pure functions over six numbers and a viewport, so the rules they encode are
tested without a browser instead of checked by taking a photograph and reading
the output.

**And the formatter asks for less than the harness promises.** `describeShot` is
the one part of this instrument that something outside it builds a result *for* —
a lesson teaching what a report's line is made of hand-builds the shape, which is
how this clause came to be written at all. `ShotResult` keeps `measured`
required, because `captureShots` always takes the reading and a measurement
missing from a real run must not be a silent `undefined`. `DescribableShot` makes
it optional, and the formatter takes that. Both facts are true at once: a shot
that measured nothing carries an empty list, and a shot that is not the harness's
has nothing to say about selectors at all. The alternative — one type, weakened
to the weaker caller — would have the producer promise less than it delivers, and
the next hand-built shot would find out the same way this one did.

**`measure` is `pnpm shoot`'s and not a specimen's**, and the reason is the same
shape as 0159's reason for withholding `do` from a static specimen. A specimen
is photographed `fullPage` because the reason to photograph a composition is to
see all of it — so its picture has no fold in it, and `pastTheFold` against the
viewport it happened to be laid out at would report a number about a boundary
the artefact does not have. A lane wanting a band measured against a screen is
asking about a screen, which is this harness's other subject.

## Consequences

Four reports' worth of geometry claims become reproducible. The line a report
pastes is the line the run printed, and the run is `pnpm shoot` with a shot list
committed beside the pictures — so a number in a report can be re-taken by
anybody, which is the property none of the scratch scripts had.

**It does not close the gap it was asked to close, and that is deliberate.** The
finding's sharpest sentence is that nothing can fail if the payoff card grows
back past the fold. After this, still nothing can: the number appears in the
run's output and a person has to read it. Making it fail is a different
decision, it needs a per-shot budget a lane declares, and 0202's last line is
the argument for not taking both at once — folding a measurement that had never
been taken into a merge-gate failure is how an instrument gets switched off
rather than fixed. The budget is the obvious next ask and it should be asked for
with a run's worth of these readings in hand.

`Shot` gains a required `measure: readonly string[]` rather than an optional
one, for 0159's reason: the capture loop never branches on undefined, and the
absence of a measurement is stated where a shot is planned.

`SpecimenPage` gains a `boxes` seam beside `measure`, and the two are separate
because only one of them is taken on every shot. A shot that named no selector
does not reach into the page at all — which is every shot in this repository
today, and a round trip they would all have paid for none of them.

`LaunchedLocator` gains `evaluateAll`, deliberately non-strict where `click` and
`scrollIntoViewIfNeeded` are strict. There, two matches are an ambiguity whose
outcome ends up in a picture and the lane must resolve it; here two matches are
the answer.

A ceiling of twenty matches per selector, with an `…and N more matches` line
under it. This is `CLIPPED_SHOWN`'s reasoning with its sign reversed, and the
reversal is why the number is higher and why the truncation is announced: a
clipping box is discovered, so a cap protects a lane from a page, while a
measured box was asked for, so a cap withholds something a lane wanted. The
failure worth preventing is a lane quoting a truncated table as a complete one,
and the line saying it was cut is what prevents it.

## Alternatives considered

**Let a shot run arbitrary Playwright.** The thing every one of these scratch
scripts actually is, and 0159 already refused it in the same words: it is how
the harness stops being a harness, a shot list becomes a program, and the thing
six lanes share becomes a test runner nobody chose and nobody owns.

**A `height` budget per selector, failing the run when a block exceeds it.**
What the finding's own framing points at, and the thing that would have caught
the defect it names. Rejected for now and not forever, for 0202's reason stated
in its own last line: the first run of this instrument across six lanes'
surfaces will find blocks below the fold on pages nobody considers broken, and a
gate that goes red on all of them on the day the reading first exists is a gate
somebody switches off. Take the readings, then write the budget against what
they say.

**Fold the boxes into `Overflow`.** One measurement, one field, one call. Rejected
for the reason 0202 refused to fold the clipped list into the overflow verdict,
plus one of its own: the overflow reading is the page's business and is taken on
every shot whether a lane asked or not, while this one exists only because a lane
named something. Folding them makes every shot in the repository pay a round trip
into the page to be handed an empty list.

**Read the selectors with a `querySelectorAll` inside `page.evaluate`.** One
round trip for all of them instead of one each, and it was built first. Rejected
on a real failure rather than on taste: `text=Put it back` and `>> nth=` are the
driver's selector engine and not the document's, so a lane writing the selector
the rest of the shot list taught it would be handed `no match` forever, with no
error and nothing to read. The reading goes through a locator, which is also
what makes `frame` mean here what it means everywhere else in a shot.

**Document-relative coordinates instead of viewport-relative.** More stable
under scroll, and wrong for the question. Every geometry claim this repository
has made is about a screen — *975px in an 857px rail*, *186px above the bottom
edge* — and a document-relative reading is a different number that reads exactly
the same, which is the worst kind of wrong answer.

**Print the hidden difference rather than the pair.** `382px hidden` instead of
`holding 1239 in 857`. Rejected because the difference is the only part a report
would quote and the pair is what makes it checkable: the pair says where the
remedy is, and a lane reading `382px hidden` cannot tell a rail that needs to be
taller from a list that needs to be shorter.
