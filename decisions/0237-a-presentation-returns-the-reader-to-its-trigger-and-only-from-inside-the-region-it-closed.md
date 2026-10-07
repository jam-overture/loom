# 0237 — A presentation returns the reader to its trigger, and only from inside the region it closed

**Status:** Accepted
**Date:** 2026-10-07
**Section:** §4h — the behaviour seam

## Context

[0176](0176-a-control-may-be-answerable-to-another-control-and-they-agree-through-the-dom.md)
clause 6 draws a line: *"the runtime opens and closes a boolean and nothing
more"*, and allocates focus trapping, `inert` on the rest of the page and a
scroll lock to the primitive. The 1 October finding *what a presented region
still cannot do* reports, from the lane that owns that half, what happened when
the three were attempted: the scroll lock was reachable from a stylesheet
([0210](0210-a-primitive-may-lock-the-pages-scroll-from-the-stylesheet-and-only-while-its-own-region-is-open.md)),
and the other two were not reachable at all — both are script, and both are
facts about elements the primitive did not render.

**This record does not settle those two.** They are a change to clause 6 and
therefore the maintainer's; the finding stays open and names what would close
it.

What it settles is a third thing the finding's first sentence named and the
analysis then passed over, because it is not any of clause 6's three and nobody
had noticed it was unowned: **where a reader is left standing when the region
closes.**

A presentation hides its region by publishing `data-loom-presented="false"`,
which the primitive's rule turns into `display: none`. A browser does not leave
focus on an element inside a subtree it has just hidden — it blurs it, and focus
falls to `<body>`. So a reader who opens a dialog with the keyboard, tabs to the
cross and presses it loses their place in the document entirely: the next Tab
starts again from the top of the page. Same on Escape. Three primitives shipped
on this seam — a dialog, a dropdown and a lightbox — and all three do it.

That is not a fact about the page around the region, and it is not a fact about
any element the primitive laid out. **It is a fact about the trigger's own
button**, which is this control's under 0092's split and has been since the first
control shipped. Nothing in clause 6 reserves it; it simply had no owner because
the question only arises once something *else* can close the region, which is
what 0176 added.

## Decision

**1. A presentation returns focus to its trigger when the region closes, and the
reason it closed decides whether it does.** Three ways out, three answers:

| closed by | returns focus | why |
| --- | --- | --- |
| the cross inside the region | **always** | the cross is inside the region by construction |
| Escape | **only if the reader is inside the box** | Escape is heard on the document; the reader may have left |
| a press outside | **never** | the press is itself a destination |

**2. The dismiss path does not read where focus is.** The cross is the one
control the seam refuses to register anywhere but inside a presentation (0176,
clause 3), so pressing it *is* a reader asking to leave, whatever the browser
did about focusing a button on a click — and browsers disagree about exactly
that: Safari does not focus a button a mouse presses and every other engine
does, while a keyboard press focuses it everywhere. A rule that read focus here
would work for the keyboard and silently not for one engine's mouse.

**3. The Escape path does read it, and the guard is the same fact as the limit
above it.** Because nothing traps focus (clause 6, unchanged), a reader really
can tab out of an open region into the page behind it. Escape then closes a
region they have already left, and pulling them back onto the trigger would
take away the place they moved to. The absence of a focus trap is *why* this
condition exists rather than something it works around.

**4. The outside press is settled by ordering and not by preference.**
`pointerdown` fires **before** the browser moves focus to what was pressed, so
at the moment the handler runs focus is still inside the region being closed. A
control that read `activeElement` there would conclude the reader was inside and
pull them off the thing they had just clicked. Never returning is both the
correct answer and the only one available at that instant.

**5. Nothing moves when the region opens.** Moving a reader *into* the region
means naming the region, which this control has never been able to do — the
region is laid out by the primitive and reached only by a descendant selector.
That half stays where 0176 put it.

**6. `disclose` needs none of this and does not get it.** A disclosure is closed
only by its own button, so a reader closing one is already standing on it. The
asymmetry is not an oversight: it is the same asymmetry that made `present` a
new member rather than a flag on `disclose`.

## Consequences

**Three shipped primitives become usable from a keyboard, and none of them
changes.** The dialog, the dropdown and the lightbox get this from the control
they already declare. No primitive prop, no stylesheet rule and no registration
changes, which is the property that makes it safe to land without
`src/primitives/` in the diff.

**A mouse reader sees nothing.** Returning focus to a button paints no ring
unless the last input was a keyboard, which is the browser's `:focus-visible`
heuristic and not something this decides. The change is invisible exactly where
it is unnecessary.

**The seam now has a rule whose whole evidence is a keypress, so the shot
harness grew a fifth reach.** `{ "key": "Escape" }` presses at whatever holds
focus and names no element, because a keypress has none
([0159](0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md)'s near
side, like the other four). Before it, this fix could not be photographed at
all: `click` reaches the same closed region and takes a picture of no focus
state, because a ring needs the last input to have been a keyboard.

**`inert` and a focus trap are still absent and the finding stays open.** What
this record changes is that the gap is now one thing rather than three: a reader
can still tab out of an open region, and that is the only half left. Saying so
is the point — a control that returns focus correctly reads, from the outside,
like a control that manages focus, and the next author will assume the trap is
there too.

**A fourth way out would have to answer this question to be added.** That is the
cost and it is worth naming: the three ways out are no longer three paths to one
`setOpen(false)`; each carries an answer about the reader. A fifth member of the
vocabulary that closes a presentation inherits the obligation.

## Alternatives considered

**Returning focus unconditionally, on every close.** One line, no ref, no
reading of `activeElement` — and it breaks the case the seam exists for. A
reader who clicks a field on the page behind an open dropdown would be thrown
back onto the trigger, so the panel could not be dismissed by carrying on
reading, which is the commonest way anybody dismisses one.

**Reading `activeElement` on all three paths, for symmetry.** Rejected twice
over, and each rejection is measured rather than argued: `pointerdown` runs
before focus moves, so the outside path would read the *old* focus and be wrong;
and a mouse press on the cross does not focus it in Safari, so the dismiss path
would be right on three engines and wrong on the fourth.

**Holding the trigger element in state rather than a ref, so the return is a
render.** It is not a render — nothing on the page differs because of it. State
would add a render for a value nothing displays, and the ref is read exactly one
effect after the handler that wrote it, which is a distance the component
controls.

**Putting the return in the effect that writes the attribute.** It would work:
the trigger is a child of the box the attribute lands on, never inside the
region, so it is focusable either way. Kept separate because the two are
different jobs and the ordering guarantee is worth being explicit about — an
element's effects run in the order they are written, so the region is hidden
before the reader arrives on the button.

**Taking `inert` and the focus trap in the same change, since the finding asks
for them in one breath.** They reverse clause 6 of an Accepted record and the
brief that governs this lane calls that `ARCHITECTURAL — needs review`. Landing
them here would also hold this fix behind that review, which is the opposite of
what three keyboard-inaccessible primitives need. The recommendation went to the
maintainer instead, with this record naming the half that did not need it.
