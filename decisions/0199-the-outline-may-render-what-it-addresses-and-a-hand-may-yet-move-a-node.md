# 0199. The outline may render what it addresses, and a hand may yet move a node

**Status:** Proposed
**Date:** 2026-09-27
**Section:** §5

## Context

[0019](0019-the-portal-is-a-review-queue-not-a-design-tool.md) is the record that
decided what the portal is, and the sentence it turns on is still right:

> A canvas is a tool for writing UI. Building one first would quietly invert the
> thesis: direct manipulation would become the main path, the model would become
> a novelty attached to it, and the Gate would become an obstacle between a user
> and a canvas they are already dragging things around on.

It gave the third pane a deliberately narrow job — *"an outline. Explicitly **not**
a layers panel to drag in: an address book, whose job is to let a selection scope
an intent."*

The maintainer, 27 September, asked for two things of that pane:

> *"I can't drill in to a specific component to see how it looks in isolation. I
> had this idea where we can see the tree as a visual representation on screen. I
> can select one or more nodes and see what just those would look like rendered.
> So I can tweak, inspect, change, etc."*

and, when asked whether that was the canvas 0019 refused:

> *"I don't agree with your assumption that a user will be tweaking. I think we
> will eventually have direct integration with a users linked AI model (whether
> commercial or private), to then prompt the AI to tweak. It is a manual prompt to
> initiate an event that might otherwise be automated. It puts the human back in
> the loop but in a limited way. Lastly, giving the user the ability to move nodes
> (via drag and drop or through a prompt), is not necessarily a bad thing. People
> still like graphical editors, so while it does collide with 0019, I think there
> is room for some flexibility here."*

Two distinct things are in that, and the reason this record exists is that they
have very different relationships to 0019.

**The first is not a collision at all.** Rendering the selected node on its own
is the *preview pane's* job applied to the *outline's* selection, and both panes
are 0019's. The framework has already built the seam and its docstring says what
it is for, in as many words: `renderLoomExcerpt` — *"A preview, an inspector and a
side-by-side are all the same shape: one node of a page, shown somewhere that is
not the page."* It is published on `@jam-overture/loom/react` and the portal has
never called it. An address book that can show you the address it points at is
still an address book.

**The second is a collision, and the maintainer says so himself.** Moving a node
by hand is direct manipulation and 0019 refused it on purpose.

## Decision

**Split them. Build the inspector now under 0019 unchanged. Record the hand as a
question 0019 does not answer, and do not build it yet.**

### What is decided and buildable

1. **A selection of one or more nodes may be rendered on its own**, through
   `renderLoomExcerpt`, in the tree's own theme, beside the page rather than
   instead of it. Several selected nodes render as several excerpts in document
   order, because a set of parts has no arrangement of its own and inventing one
   would be the canvas arriving through the side door.
2. **An excerpt may be rendered from any revision**, which is the same call
   against a tree the log produced rather than the head. This is what makes
   *what it looked like*, *what it looks like* and *what it would look like* one
   mechanism rather than three screens.
3. **The way to change what is selected is still to ask.** `scopeNodeId` is
   0019's own answer and it is unchanged: select, then say what you want
   different. A selection of several nodes scopes to their nearest common
   ancestor, and the portal states that rather than performing it silently —
   which is the rule `selected-node.tsx` already keeps for the one-node fallback.

### What is proposed and not built

4. **A hand may eventually move a node**, by drag or by a prompt that names the
   move, and **a linked model may eventually be prompted directly from a
   selection.** The maintainer's framing is the part worth keeping, because it is
   a better argument than "people like graphical editors":

   > *a manual prompt to initiate an event that might otherwise be automated. It
   > puts the human back in the loop but in a limited way.*

   That is not the inversion 0019 feared. 0019's fear is that the canvas becomes
   the *main path* and the model becomes a novelty. A person reaching in to
   trigger, by hand, the one thing the model would otherwise have done unwatched
   is the opposite motion: it is the Gate's premise extended to the moment
   *before* a proposal exists rather than after it.

   **It is still not built here**, and the reason is sequencing rather than
   doubt. A move made by hand is a delta with no intent, no rationale, no
   confidence and no interpreter behind it — so it either bypasses the Gate,
   which is the inversion, or it arrives at the Gate as a proposal a human
   authored, which is a shape `Provenance.authoredBy` already has a name for and
   which nothing in §2 has been asked to judge. That question is worth its own
   record with the framework lane in the room.

## Consequences

- The inspector is a portal unit and needs nothing from the framework. That was
  not obvious and is the single most useful fact this record carries.
- 0019 is **not superseded.** Its three panes and its five legible outcomes stand
  exactly as written; this extends what the third pane may show and leaves what
  it may *do* alone.
- Clause 4 is the open question. Until it is answered, a portal run that finds
  itself building a drag handle is building something nobody has decided, and
  this is the record to stop at.
- If clause 4 is later accepted, 0019's *"explicitly not a layers panel to drag
  in"* becomes wrong and is superseded then — at both ends, per
  [0193](0193-a-status-line-is-data-and-a-supersession-is-written-at-both-ends.md).

## Alternatives considered

**Supersede 0019 now and build the canvas.** The maintainer left room for it
(*"there is room for some flexibility here"*) and also said the 90% was enough for
now. Rejected on sequencing: the inspector needs no decision from anybody and the
hand needs one from the framework lane about what a human-authored delta is. Doing
both in one branch would put a settled thing and an open question in one review.

**Build the inspector as a separate screen.** A `/portal/parts` that renders a
node by id. Rejected because it separates the selection from the page it is a
selection *of*, which is the relationship 0019's three panes exist to hold — and
because it would be a fourth pane's worth of work to answer *which* node, which
the outline already answers.

**Arrange several selected excerpts as they appear on the page.** Tempting, and
it is the canvas. A set of parts drawn in their page positions is a page with
holes in it, and the next obvious ask is to close the holes by moving things.
Document order, stacked, with no spatial claim.

**Render the selection in place by dimming everything else.** This is the third
pane doing the second pane's job, and it answers a different question — *where is
this on the page* rather than *what does this look like on its own*. Worth having
later; it is not what was asked for.

**Let a multi-node selection scope to each node separately, sending several
intents.** Rejected: one utterance is one intent (§2), and a prompt that fanned
out into three proposals would produce three dispositions a reader never asked
for. Nearest common ancestor, stated.
