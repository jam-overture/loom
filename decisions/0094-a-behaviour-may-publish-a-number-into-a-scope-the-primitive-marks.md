# 0094. A behaviour may publish a number into a scope the primitive marks

**Status:** Accepted
**Date:** 2026-08-26
**Section:** §4b

## Context

`Loom primitives` filed a finding on 25 August: a wipe cannot be dragged.
`loom.before-after` places its divider where a `position` prop puts it and
leaves it there, and both pure-CSS routes to moving it are worse than the gap —
`resize: horizontal` gives a real drag whose grab area is a sixteen-pixel corner
nobody finds and whose grabber is a browser artefact no palette can reach, and
CSS cannot read an `<input type="range">` at all, so a range input cannot drive
a clip. A handle that looks draggable and is not is the defect `loom.code`
refused when it declined to fake a copy button, and the primitive declined it
for the same reason.

So the finding asked for a behaviour, which is the right shape:
[0086](0086-a-behaviour-is-a-control-the-runtime-builds-and-a-primitive-places.md)
settled that a behaviour is a control the runtime builds and a primitive places,
and `src/primitives/` declares and never implements. What it could not settle
from its own lane is the part that makes this behaviour different from the two
that exist.

**`copy` and `disclose` are both complete in themselves.** `copy` acts on the
node's text, read off the tree. `disclose` acts on nothing at all: it stamps
`data-loom-disclosed` on its own button and the primitive's rule decides what
open and closed mean for the region beside it
([0092](0092-a-disclosure-control-owns-its-button-and-the-primitive-owns-the-region.md)).
Each owns one element and needs nothing from the primitive but a place to stand.

A drag is not like that. The number it produces is what a `clip-path` on another
layer is a function of, and that layer is the control's **uncle** — a sibling's
subtree, not its own. CSS gives no upward channel: a custom property set on an
element is visible to that element and its descendants and to nothing else. So
the value has to reach an ancestor, and 0086 forbids the obvious way to do that
— a ref into markup the primitive owns — for the reason it refused reading the
DOM for the copy text: the box model belongs to the primitive.

## Decision

**A behaviour may require a scope: an element the primitive marks with an
attribute, into which the control publishes a value as a custom property.** The
vocabulary's third member, `drag`, is the first that does, and the requirement
is declared in `render/behaviour.ts` beside the strings a control needs.

- **`DRAG_SCOPE_ATTRIBUTE` (`data-loom-drag`) is the primitive's half.** It
  marks the box enclosing both the control and whatever the number moves. The
  attribute's value is not read: presence is the whole of the signal.
- **`DRAG_VALUE_PROPERTY` (`--loom-drag`) is the runtime's half.** The control
  walks up to the nearest marked ancestor and sets the property there, as a
  **unitless number from 0 to 100**, so a rule multiplies it by `1%` for a clip
  or by `1px` for anything else rather than being handed a length whose meaning
  the runtime guessed.
- **The primitive writes the number first**, from whatever prop it renders the
  still version at, and the control overwrites it. The server's markup is
  therefore already correct, a page with scripting off keeps it, and the control
  starts where the page already looks instead of snapping on the first press.
  Reading is not publishing: nothing moves on hydration.
- **A control that finds no scope stays an inert placeholder.** It is the only
  control in the vocabulary that renders an element before it knows it will
  work, because being inside a scope is a question only a mounted element can
  answer. `hidden` keeps it out of the layout and out of the accessibility tree
  until the answer is yes.
- **A fifth check by probe.** `probePlacement` reports a declared behaviour that
  needs a scope and got none as `unscopedBehaviours`, and `auditRegistry`
  carries it beside `unplacedBehaviours`. They are different faults: an unplaced
  control is missing, an unscoped one is *present* — it renders, takes focus,
  follows the pointer, and moves nothing.
- **The control is a slider, and the runtime draws it.** `role="slider"` with
  the ARIA value attributes, focusable, arrow keys by one, page keys by ten,
  `Home` and `End` to the extremes, pointer capture for the drag, and both the
  pointer and the left/right keys mirrored under `direction: rtl` — a wipe is
  clipped from the inline start, so a right-to-left page mirrors the whole
  comparison.
- **It sweeps the full 0 to 100**, not the 5–95 `loom.before-after` bounds its
  prop to. That bound is about what a *proposal* may write, where an edge at the
  end is a comparison with one side missing and `remove` says it better; a
  reader dragging to the end is looking at one picture on purpose.

Nothing in a tree names this, exactly as nothing names `copy` or `disclose`.
A model is never shown behaviours and cannot author one.

## Consequences

- **A behaviour can now ask something of the primitive that takes it**, which
  none could before. That is a real widening of the seam and the reason this is
  a record: the check that keeps it honest is the probe, and a behaviour added
  later that needs a scope gets that check by declaring `scope`, not by writing
  new probe code.
- **`PlacementVerdict` and `RegistryAudit` each gain a field.** A host asserting
  a clean audit asserts one more list. Both are reported, never enforced, for
  `audit.ts`'s standing reason.
- **The runtime now draws a control that sits on content it did not choose.** So
  the grip is two-tone — a fill in the palette's surface with a one-pixel ring
  of its ink — which is the treatment `loom.before-after` arrived at on
  25 August after a single-colour divider vanished into a dark screenshot under
  `bold`. A palette cannot fix that, because the thing being contrasted against
  is a photograph.
- **`loom.before-after` does not use this yet.** That file is `Loom primitives`'
  lane and adopting the behaviour changes a shipped primitive's markup — the
  divider becomes a `var()`, the handle becomes the placed control. Filed for
  that lane with the shape, exactly as 0086 left `loom.code` to it.
- **The vocabulary is three.** Adding to it is still a change to this package,
  a name, an implementation, its strings and a line in the record, which is the
  friction that keeps what a Loom page may *do* a list somebody can read.

## Alternatives considered

- **A callback to the primitive** — hand `loom.behaviours.drag` a component that
  takes an `onChange`. The shape a React developer reaches for first, and it
  fails on 0009: the primitive would then hold state, re-render its layers on
  every pointer move, and need `"use client"` of its own — which is precisely
  what 0086 refused when it kept the client boundary inside the runtime. A
  custom property moves the edge without React knowing anything happened.
- **The control sets the property on itself**, as `disclose` sets its attribute,
  and the primitive selects with `:has()`. This is the shape that would have
  needed no new concept, and it does not work: `:has()` can find an ancestor of
  a *state*, but a custom property still does not travel upwards, so the number
  itself never reaches the layer that clips.
- **The runtime writes to the control's `parentElement`.** No attribute, no
  declaration, one line shorter. Rejected because it makes the primitive's box
  model part of the contract silently: place the control inside a chip and the
  number lands in the chip, with nothing anywhere saying so. A marked scope is
  the same reach made legible and checkable.
- **A scoped custom property on the document root**, `--loom-drag-<nodeId>`,
  which is unique per instance and needs no walk. Rejected because the
  primitive's stylesheet is static and cannot know the id, so the id would have
  to be threaded into the primitive's inline styles — the seam leaking into
  every rule that reads it.
- **A per-instance `<style>` element** written by the control. Same effect, and
  it puts a stylesheet in the middle of somebody's layout, re-parsed on every
  pointer move.
- **Publishing the value on mount**, so the slider and the page always agree
  even when the primitive wrote no number. Rejected: it moves the page on
  hydration, which is the one thing a control that renders late must not do, and
  the disagreement it fixes only exists for a primitive that skipped the
  documented half of the contract — where the probe has already said so.
- **An invisible hit area over the primitive's own handle**, so the look stays
  entirely the primitive's. Attractive, and it fails for keyboard users: an
  element with no visible focus state cannot be styled with `:focus-visible`
  from an inline style object, so the control would take focus and show nothing.
- **Nothing, permanently** — the still wipe is what most pages using this
  actually are, and that is true. It leaves the library with one interaction
  everybody expects from a before-and-after and no way to express it, and the
  next primitive that needs a number from a reader would meet the same wall.
