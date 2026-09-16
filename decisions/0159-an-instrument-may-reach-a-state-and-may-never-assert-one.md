# 0159. An instrument may reach a state, and may never assert one

**Status:** Accepted
**Date:** 2026-09-15
**Section:** §1 (process)

## Context

[0117](0117-one-harness-two-subjects-a-tree-it-renders-and-an-address-you-serve.md)
folded two screenshot harnesses into one and listed what the consolidated
harness does: finds the browser, serves the page, sizes the viewport, reduces
motion, measures the overflow, names the file. Three weeks later, two lanes have
filed the same complaint from opposite ends — **the harness can photograph a
page, and cannot reach the state on that page worth photographing.**

`Loom docs` wanted a figure that is empty until a reader uses it: a real
reader-signal broadcaster reports nothing at all until somebody scrolls, presses
or opens something. Photographed through `pnpm shoot` it is a correct picture of
a component with nothing to say, which is the one thing the page exists to prove
it does not do. So the run wrote about forty lines of Playwright in `/tmp` to
press the call to action, open a question, wait out a batch and photograph the
figure — and the report's best image is the one the harness did not take.

`Loom primitives` wanted a picture of the `checkbox` field type. A `loom.form`
in a specimen can never name a destination the render can resolve —
`resolveTreeSubmissions` appears nowhere under `tools/specimen/` — so it
correctly draws the state it draws when nobody said where to post: a notice over
a `disabled` fieldset at six-tenths opacity. That is the form being right and
the photograph being worthless. The lane lifted the fields out into a
`loom.stack` to get its picture, producing a specimen of markup no real page
has.

Both are the private-harness situation 0117 consolidated, reappearing for the
things the consolidation left out. Both were worked around by a lane writing its
own script against flags and a viewport that were *copies* of the harness's
rather than the harness's, which is exactly the drift that cost four days the
first time.

The obvious fix — let a shot run arbitrary Playwright — is how the harness stops
being a harness. A shot list would become a program, every lane would write its
journeys in JSON, and the thing six lanes share would be a test runner nobody
chose and nobody owns.

## Decision

**An instrument may reach a state. It may never assert one.** Every extension to
the harness is *data a lane declares*, and nothing in it observes an outcome.

Three additions follow, and the boundary is what they have in common:

- **`do`** on a shot: an ordered list run after `waitFor` and before the
  shutter, with exactly two members — `{ click: <selector> }` and
  `{ wait: <ms> }`. No typing, no assertion, no branch, no capture of a value.
- **`clip`** on a shot: a selector to photograph instead of the viewport.
  Refused together with `fullPage` rather than resolved by precedence.
- **`endpoints`** on a specimen: a `SubmissionTarget` per endpoint id — where a
  form posts, declared as **the answer** rather than as an endpoint that
  computes one.

Three consequences of the boundary, each of which had to be decided rather than
inherited:

**A `do` list pins the page.** A click on a real `a[href]` navigates, so step
two would run on a different page and the picture would silently be of somewhere
else. A capture-phase listener calls `preventDefault` on anchor clicks for the
duration of the steps. `preventDefault`, never `stopPropagation`: the page's own
delegated listeners must still see the click, because a reader-signal
broadcaster *is* a delegated listener on the root and suppressing the event
would photograph the instrument instead of the page.

**Overflow is measured after the steps, not before.** A disclosure that opens or
a list that grows is precisely the kind of thing that pushes a page past the
phone. Measuring the page the load produced would report the width of something
nobody is looking at.

**A specimen declares a target, not an endpoint.** The seam takes a
`SubmissionEndpoint`, whose `target` is an async call free to mint a token
against a store — and therefore free to be slow, to fail on a bad afternoon, and
to make two runs of one specimen produce two different pictures. A photograph
must not depend on a network. The declared target still goes through
`defineEndpoint`, so it meets the same schema a host's answer does: a specimen
naming an off-origin action is refused at the harness rather than in review.

**A wait has a ceiling** — 30 seconds, and there is no way to ask for more. This
is [0140](0140-a-call-into-foreign-code-has-a-ceiling-and-the-runtime-owns-it.md)'s
rule applied to an instrument rather than to a render: a harness that hangs
reports nothing at all, and a merge gate that hangs is indistinguishable from a
merge gate that is slow.

**`do` is `pnpm shoot`'s and not a specimen's.** A specimen page is
`renderToStaticMarkup` with no dev server and no hydration, so there is no
script in it to press. Offering steps there would offer a lane a list that
silently does nothing.

## Consequences

The line to quote when the next request arrives is the title. A shot may
**reach** the third screen of a flow; it may not check what is on it. Anything
phrased as *did it…*, *is it…*, *wait until it says…* is a test, belongs in
Vitest or Playwright proper, and the answer is no — the harness will take a
picture of whatever is there and the report will say what the picture shows.

`Shot` gains a required `do: readonly ShotStep[]` rather than an optional one,
so the capture loop never branches on undefined and `shotsAt` states the empty
list where a specimen's absence of steps is decided.

`renderSpecimen` is now async, because resolving a form's destination happens
before the walk and never during it (0065). The walk itself is as synchronous as
it ever was; only the harness's own entry point had to wait.

Two greyed pictures in the repository were correct records of a harness limit
rather than of a primitive, and can be retaken by their lanes: the `checkbox`
specimen that lifted its fields out of the form, and the workaround written
where it was worked around in `states-and-paging.specimen.ts`. Neither is this
lane's to retake — they are `Loom primitives`'.

What is still not offered, and is a finding rather than an omission if a lane
wants it: typing into a field, hovering, scrolling to a position, and any wait
that is for a *condition* rather than a duration. The first three are reaches
and would fit this decision; they are simply not yet asked for. The fourth is
the one to be careful with, because "wait until the selector appears" is
`waitFor` and already exists, while "wait until the count is 3" is an assertion
wearing a wait's clothes.

## Alternatives considered

**A shot list that embeds a Playwright script.** Rejected: it is the current
situation with the file moved. What a lane writes in `/tmp` today it would write
in a string tomorrow, unreviewed either way, and the shared flags would drift
again the first time someone needed one more argument.

**`do` steps available to specimens as well as addresses, for symmetry.** Rejected
on evidence rather than taste: a specimen page carries no script, so every step
would be a no-op and the symmetry would be a lie a lane discovers by getting the
picture it already had.

**Preventing navigation on every shot rather than only those with steps.**
Rejected. A shot with no steps clicks nothing, so the listener would change
nothing in the ordinary case and would quietly change behaviour for a page that
navigates itself — the kind of harness-level surprise that makes a lane distrust
its own screenshots.

**Letting `clip` win over `fullPage` when a shot sets both.** Rejected. They mean
opposite things, so a shot asking for both is a lane that believes something
untrue about what it is getting, and picking a winner hands it the wrong picture
without a word. The schema exists to catch exactly this class of mistake.

**`endpoints` taking a `SubmissionEndpoint`, matching the runtime seam exactly.**
Rejected as the more faithful-looking option that makes the instrument worse: it
puts IO behind a photograph. A lane wanting a form photographed in an
*unavailable* state does not need an endpoint that fails — it declares no target
for that id and photographs the state that produces, which is what it wanted to
look at anyway.

**Raising it as a general "harness plugin" seam.** Rejected as premature by a
wide margin. Two lanes have asked for four specific things between them; a
plugin seam would be designed against no requirements and would be the place
every assertion eventually arrived through.
