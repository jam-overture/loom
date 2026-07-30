# 0019. The portal is a review queue, not a design tool

**Status:** Accepted
**Date:** 2026-07-30
**Section:** §5

## Context

"A thin UI over the persisted tree" fixes almost nothing about what the portal
actually is. There are two coherent products behind that phrase and they have
almost no overlap.

**A design tool.** A canvas, a layers panel, a property inspector, drag to
position. This is what everyone expects when shown a tree of UI nodes and an
editor, because it is what Webflow, Framer and Figma are. It is also what most of
the tooling effort would go into.

**A review queue.** The primary object is a *proposed change*: what was asked,
what an interpreter made of it, what the Gate decided and why, what it would look
like, and what it would undo. Closer to a pull-request review than to a design
surface.

The distinction matters because Loom's premise is that **UI is proposed, not
written**. A canvas is a tool for writing UI. Building one first would quietly
invert the thesis: direct manipulation would become the main path, the model would
become a novelty attached to it, and the Gate would become an obstacle between a
user and a canvas they are already dragging things around on.

## Decision

**The proposal is the primary object of the interface. The portal's job is to make
a change reviewable, and everything else is in service of that.**

Three panes, and the order is the priority:

1. **The change** — the prompt box, and beneath it the anatomy of what came back:
   rationale, the stakes factors that were weighed, whether it is reversible, the
   Gate's disposition, and provenance (which interpreter, what confidence). This
   is the pane the portal exists for.
2. **The preview** — the real tree through `renderRequest` in edit mode, so
   `data-loom-node` decoration makes it addressable. Changes are shown *in situ*,
   not as an abstract diff.
3. **The tree** — an outline. Explicitly *not* a layers panel to drag in: an
   address book, whose job is to let a selection scope an intent
   (`scopeNodeId` — "make *this card* quieter").

**Five states have to be legible, one per `ChangeOutcome`:**

| Outcome                 | What the portal must show                                        |
| ----------------------- | ---------------------------------------------------------------- |
| `applied`               | done, and the inverse that undoes it                             |
| `awaiting-confirmation` | the Gate's reason, and a confirm — **the portal's reason to exist** |
| `rejected`              | which factors refused it, and the one repair attempt (0006)      |
| `not-interpreted`       | the model failed or declined; the utterance is still there       |
| `not-applicable`        | the tree refused the delta; a stale base, usually                |

`awaiting-confirmation` is the one that justifies the product. A runtime that only
ever applied or refused would need no portal — it would need a log. The portal is
where a human is the missing input to a decision the Gate deliberately did not
make alone.

**History is a first-class view, not an audit tab.** 0016 made the log the truth,
so the log is a primary surface: every revision with its provenance, its
confidence, and a revert built from the inverse delta. This is the difference
between "reversible" as an architectural claim and as a button.

## What the portal deliberately does not do

- **No freeform canvas.** The tree has no layout model — primitives own their
  layout (0009). Dragging can only mean reparent or reorder, which is what the
  delta model can express. Offering pixel positioning would require inventing a
  layout system the runtime does not have.
- **No arbitrary property editing.** A primitive declares its props and the seam
  enforces them (0011). The inspector shows the declared schema and nothing else,
  so it cannot offer a field the render seam would then refuse.
- **No publish button.** There is no build step between the tree and what is
  served; a change applies when it is approved. A publish button would imply a
  staging concept the runtime does not have and would make the store's revision
  meaningless.
- **No undecorated-primitive workaround.** 0012 made conformance reported, not
  enforced, so some primitives will not be addressable. The portal degrades — it
  falls back to the nearest decorated ancestor (0010) and says so — rather than
  wrapping anything to force a handle.

## Consequences

- Build order within §5 follows the panes' dependencies, not their priority:
  **read path** (list, preview) → **addressing** (outline, selection) → **write
  path** (prompt box, proposal anatomy) → **history and revert** → **confidence
  calibration**. The most important pane is built third because it needs the other
  two to have something to talk about.
- The portal is the surface where 0007's promise gets kept. Confidence is
  self-graded and *must be calibrated*; predicted confidence against actual
  approve/refuse rate is a portal view, feeding §6.
- Framing the portal as review rather than authoring means the first genuinely
  useful version can be small. A review queue with one pending proposal is useful;
  a design tool with one primitive is a toy.
- If direct manipulation later becomes the dominant path in practice, that is
  evidence against this record, and it should be superseded rather than quietly
  worked around. 0017 already routes gestures through the same Gate, so the
  evidence will be in the log.

## Alternatives considered

**Canvas first, review later.** Rejected: it is the version that inverts the
thesis, and the effort is not recoverable — a canvas that treats the model as an
accessory is not refactored into a review queue.

**Review queue with no preview at all** — proposals as structured diffs, like a
code review. Genuinely tempting, and much less work. Rejected because a UI change
whose effect you cannot see is not reviewable in the way that matters: the whole
argument for a tree over generated code is that the *result* is inspectable, not
just the instruction.

**Per-node inline editing as the primary interaction**, with the prompt box
secondary. Rejected for the same reason as the canvas, in weaker form: it makes
the model the fallback rather than the author.

**Wait for §6 before building history.** Rejected. Telemetry consumes the same
records, but the log exists now and reversibility is unproven until something
reverts. §6 can adopt the view; it should not gate it.
