# 0234. A primitive may name a control from the tree, and its declared string is the floor

**Status:** Accepted
**Date:** 2026-10-05
**Section:** §4h — the behaviour seam

> **Renumbered on 2026-10-06**, from 0231, when the branch that carried it
> (#528) was merged. `main` had meanwhile accepted a different 0231 — *a funnel
> is three shares of the arrivals, and the straddle is the one error here that
> leans down* (#527, merged the same morning) — and two records sharing a number
> is fatal (0097). 0232 and 0233 are claimed by open pull requests, so this took
> the next number free on `main` and on every open branch. This record was
> written on 5 October and nothing in it changed but its number; references were
> updated with it.

## Context

A behaviour declares the text keys its control needs and the primitive supplies
the strings, resolved by `textFor(type)` — **per type, not per node**. Every
`loom.code` in a deployment has a button reading *Copy*, every disclosure in a bar
reads *Menu*, and a dictionary a host already has translates all of them at once.
[0060](0060-a-primitive-owns-a-string-and-a-deployment-may-replace-it.md) and
[0063](0063-a-declared-string-travels-with-the-primitive.md) are that seam, and
for an **affordance** they are exactly right: *Expand* over the corner of a
thumbnail is the word a reader wants, and a model inventing one per tile is a page
where the same control is called four things.

[0176](0176-a-control-may-be-answerable-to-another-control-and-they-agree-through-the-dom.md)
unblocked four primitives — dialog, dropdown, lightbox, tooltip — and the
primitives routine shipped three. The fourth was not blocked by anything about
`present`. It was blocked by what a control is allowed to be **called**, and the
finding it filed on 1 October measured three costs rather than reasoning about
them:

- **A dialog's trigger is not an affordance.** It is the page's call to action —
  *Watch the demo*, *Book a call*, *See the whole record* — which is content, and
  the seam had nowhere to put it. A `loom.dialog` built then would have been a
  modal opened by a chip reading *Open*, which is a worse page than no dialog.
- **Two of the same primitive on one page are two buttons with one name.** A
  header with a *Product* menu and an *Account* menu is two buttons a screen
  reader announces identically, and `aria-label` on the panel does not fix it
  because the trigger is what a reader reaches first.
- **An icon-only trigger is unreachable**, which is the shape a tooltip actually
  takes. That one is about what a control *renders* rather than what it is
  called, and is not settled here.

The finding offered three shapes and took the third, which was to ship nothing:
*triggers stay affordances*. The first — a reserved prop every control's label
falls back to — is the thing the seam exists to refuse, because a reserved prop
is a reserved prop everywhere and a model would then be writing the word on every
copy button in the library. This record takes the second.

There is a precedent for the move and it is five days old.
[0226](0226-a-primitive-declares-where-its-control-rests-and-the-control-publishes-nothing-until-the-reader-moves-it.md)
had the same question about a number: a wipe's declared position could not reach
its slider, because `build` receives a node's text and content and not its props.
It was settled by letting the **primitive** say where its control rests, through
a channel the runtime owns, rather than by handing a control the props. The same
division works for a word, and the reason it is not simply 0226 again is that a
position is a fact about the primitive while a call to action is a fact about the
node — so this one has to be per node, and the question is what may carry it
there.

## Decision

**A primitive may name one of its own props as where a control takes its name
from. The runtime reads that prop off the node and hands the behaviour a string.
The declared text stays underneath as the floor.**

1. **`definePrimitive` takes `names`** — a map of behaviour name to prop name,
   `{ present: "label" }` on a dialog. Optional, and absent for almost every
   primitive that takes a control at all. Its keys are typed by the behaviours
   that primitive declared, so naming one it does not take is a compile error at
   the declaration.

2. **The registry checks both halves.** The behaviour must be one this primitive
   declared (`undeclared-named-behaviour`) and the prop must be one its schema
   declares (`undeclared-control-name-prop`) — the same drift `frames` and
   `interactive` are checked against, failing the same silent way: a prop renamed
   and a declaration left pointing at nothing would quietly go back to the
   declared string for ever.

3. **Declaring text is still required.** A primitive taking a behaviour declares
   its strings whether or not it names a prop, and the registry's existing
   refusal is untouched. So a control has a name in every language the deployment
   serves before any node is written.

4. **The floor is checked first.** `resolveBehaviours` drops a control whose
   declared string is blank *before* it looks at what the node carried. A
   deployment whose dictionary answered a declared key with whitespace has a
   control it cannot translate, and one node happening to carry a usable word
   does not make it translatable — so a tree cannot talk a nameless control onto
   a page.

5. **A node that says nothing gets the declared string.** Absent, `null`, a
   number, an object, whitespace: each means *this node said nothing*, and none
   of them is a diagnostic. What they fall back to is a real name in the
   deployment's language rather than a hole, so there is nothing for a render to
   report. That is deliberately quieter than the frame seam, which reports a URL
   it refused — a frame that will not render is a thing the tree asked for and
   did not get; a name that was not written is a tree declining an option.

6. **A string crosses the seam, not the props.** `build` now receives the node's
   text, the primitive's strings, and one resolved word. It still cannot see
   props, which is 0086's shape and the reason this is not the `ARCHITECTURAL`
   half of the 1 October finding: a control that reads props is a control a model
   configures.

7. **Each member decides which of its strings is reachable.** `copy` declares two
   and only one is a name — a tree may rename the button and may not change what
   it says once it has copied. The others declare one each.

8. **`BehaviourResolver.controlNamePropsFor` is optional on the interface.** A
   resolver written before this reads as a library whose primitives all name their
   own controls, which is what it is. A registry built by the SDK always answers.

## Consequences

- **A dialog can be built.** The gap inventory's first Tier B group reads *three
  of four* because of this and is now unblocked; so is the header with two menus.
  Building either is `Loom primitives`' work and not this record's.
- **A translator's job got smaller in one direction and no larger.**
  `textCatalogue` still lists every declared string, including the floor for a
  named control — which is right: it is what an untranslated deployment shows for
  every node that named nothing. What is **not** in it is the page's own call to
  action, which was never a thing to translate.
- **A model can now write a word a reader is announced.** This is the real cost
  and it is worth stating plainly rather than arguing away. The narrowing is that
  the primitive opts in per control, in a component a human approved once, naming
  a prop whose description says what it is — and that the page is correct in the
  deployment's language whatever the model writes or fails to write. It is the
  same bargain `frames` makes with a URL, which is a larger one.
- **0060's clause 8 is unchanged and still true.** Declared strings are not in
  the model-facing catalogue and a model still cannot write one. What a model
  writes here is an ordinary prop the catalogue has always carried.
- **Nothing in a tree says a control is named from it.** The knowledge lives in
  the registry, exactly as 0063 found for declared strings, so there is no
  diagnostic to add and no render-time check to wire. A reader of a tree sees a
  prop called `label`.
- **The icon-only trigger is still unreachable.** A control renders its name as a
  child, so `ⓘ` beside a term cannot be built, and that is a question about a
  control's markup rather than about its name. The 1 October finding keeps that
  third row open.

## Alternatives considered

- **A reserved prop the control's label falls back to** — the finding's first
  shape. One key, no declaration, works everywhere. Rejected because *everywhere*
  is the defect: a reserved prop is reserved on every node, so a model could name
  the copy button on a code panel, and the per-type guarantee that lets one
  dictionary cover a library would be gone for the whole vocabulary rather than
  for the one control whose words are content.
- **Name the control from the node's own text**, which is the channel `copy`
  already reads. Attractive because nothing new is declared and the word is
  plainly content. Rejected on what a dialog is: its text is the panel's, so
  `textOf` the node returns the words *inside* the thing the trigger opens. A
  seam that cannot tell a trigger's label from its panel's prose is not usable by
  the primitive this exists for.
- **Hand `build` the node's props** and let each behaviour read what it likes.
  Fewer moving parts and the one the 1 October finding marked `ARCHITECTURAL`.
  Rejected unchanged: props are AI-authored, a control reading them is a control
  a model configures, and the blast radius is every future member of the
  vocabulary rather than one declared pairing.
- **A sixth text key resolved per node** — keep the text seam as the only source
  of a control's name and let a dictionary be overridden per node. Rejected
  because it makes the dictionary the channel for content, which is backwards:
  a host translating a library would find page copy in the file it maintains, and
  `textCoverage` would report a deployment's calls to action as untranslated
  strings.
- **Let the primitive supply the trigger's children** instead of a name, which
  would settle the icon-only case too. It is a bigger change to what a control is
  — the runtime builds it today and a primitive only places it — and it answers a
  different question: a trigger rendering an icon still needs an accessible name
  from somewhere, and this is where it would come from. Not foreclosed, and the
  finding's third row is where it is asked for.
