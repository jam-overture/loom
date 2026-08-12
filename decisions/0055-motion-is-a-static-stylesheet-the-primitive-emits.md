# 0055. Motion is a static stylesheet the primitive emits, never a prop in the tree

**Status:** Accepted
**Date:** 2026-08-12
**Section:** §4b

## Context

The demo vocabulary has to clear a visual bar — a hero that would not look out
of place on a real product's marketing page. That means motion: an entrance, a
backdrop that drifts, a card that lifts under the pointer, a disclosure whose
marker turns as it opens.

Every value in the library so far is an inline `style`, which is what keeps
rendering a pure function with nothing to attach and nothing to load
([0008](0008-the-renderer-is-a-total-pure-projection.md)). Three things cannot
be expressed that way, and they are exactly the three the bar needs:

- `@keyframes`, which has no inline form at all
- state selectors — `:hover`, `:focus-visible`, `details[open]`
- `@media (prefers-reduced-motion: reduce)`, which is not optional

There was also a second question underneath the first, and it is the one that
actually matters: **who gets to set the animation?** Hermes' hero variants took
raw colour and timing from the page author, and the obvious port would give
`loom.hero` an `animation` or `duration` prop. Props are JSON and props are
AI-authored, so that would put motion inside the space a model may write.

The earlier position — recorded in day 49's report as "responsiveness comes from
intrinsic layout, never a media query" — was argued from there being no
stylesheet to attach. That premise is what this record revisits. It does not
revisit the conclusion: layout still uses intrinsic responsiveness, because it
*can*, and a primitive that laid out from a breakpoint would still be wrong.

## Decision

**A primitive that needs motion or a state selector emits one static, shared
stylesheet beside its own root element. Nothing from the tree reaches it.**

The stylesheet is a module constant in `src/primitives/stylesheet.ts`. It is not
a template: no prop, no theme value and no node id is interpolated into it. Every
value it uses is a `var(--loom-…)` reference, so it is byte-identical under every
registered theme and a re-theme still changes only the root's variables
([0049](0049-a-theme-is-three-ids-in-the-tree.md)).

**What a tree may say about motion is which variant it wants, and nothing else.**
`loom.hero` takes `backdrop: "aurora"`; it does not take a duration, an easing,
a delay or a colour. The animation belongs to the registered component, which is
the thing a human approved once, rather than arriving per-node in a proposal
nobody looked at closely.

React 19 dedupes and hoists a `<style>` carrying `href` and `precedence`, so a
page whose hero, tiles, logos and questions all ask for it emits one stylesheet
into the document head. A renderer that does not hoist emits identical copies,
which are inert.

`prefers-reduced-motion` removes movement and never feedback: `.loom-rise` ends
at `opacity: 1` rather than never arriving. An entrance that is merely switched
off is how a page renders blank for someone who asked their system to calm down.

## Consequences

- Motion is outside the AI's reach by construction, not by policy. There is no
  prop to gate, nothing for the analysis to weigh, and no way to phrase a
  proposal that animates something differently. That is
  [0011](0011-a-primitive-declares-its-props-and-the-seam-enforces-them.md)'s bargain doing
  the work it exists to do, and it is worth saying plainly in the documentation
  site when §4c gets there.
- A host that wants different motion registers a different primitive. There is
  no per-deployment override short of that, which is the same answer the library
  gives for every other implementation detail.
- The library now ships one thing that is not an inline style. Its cost is a
  single hoisted element and the discipline that it stays constant — a
  stylesheet with a prop interpolated into it would silently reintroduce
  everything this record rules out. The re-theme test asserts it is identical
  under both palettes, which is what catches that.
- The claim "rendering attaches no stylesheet" is no longer true as stated, and
  day 49's reasoning about media queries needs this record read beside it. The
  *conclusion* stands: layout is intrinsic, and the only media query in the
  library is the reduced-motion one.

## Alternatives considered

- **Motion props on the primitive** (`duration`, `easing`, `animation`). The
  thing this record exists to refuse. It would make every animated primitive's
  props a place where a model can produce something no reviewer would approve —
  a four-second entrance, a strobing backdrop — with the Gate unable to help,
  because setting a prop on one node is small, low-stakes and perfectly
  reversible by every measure it has. Same shape as
  [0053](0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md).
- **A stylesheet the host installs** — ship a `.css` file and tell hosts to link
  it. Rejected because a primitive that renders correctly only when someone
  remembered to link something fails silently, in someone else's deployment,
  with nothing in the render to say what went wrong — the same class of failure
  the conformance audit exists to catch at registration rather than in
  production. Self-sufficiency is worth one hoisted element.
- **`loom.page` emits it once for the whole page.** Tidier, and wrong: a hero
  rendered inside a host's own chrome, or a tile in the portal's preview pane,
  would lose its motion depending on an ancestor it cannot see. Deduplication is
  React's job and it already does it.
- **Animate in JavaScript, in the component.** Would need effects and state,
  which makes the primitive unprobeable by the conformance audit and unrenderable
  as a pure function. The library's one interactive primitive, `loom.faq`, avoids
  this the same way Hermes did: `<details>` puts the state in the browser.
- **No motion at all.** The honest option, and it fails the brief. A port that
  renders good content models as still, unstyled divs clears neither the Hermes
  bar nor the 21st.dev one.
