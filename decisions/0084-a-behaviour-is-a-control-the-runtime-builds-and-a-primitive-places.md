# 0084. A behaviour is a control the runtime builds and a primitive places

**Status:** Accepted
**Date:** 2026-08-22
**Section:** §4b

## Context

`Loom primitives` filed a finding on 21 August: a code panel cannot offer a copy
button, and faking one would be worse than the gap. Every reference site a
developer reads puts a copy control on its snippets — `nextjs.org`'s single most
load-bearing element is the `npx create-next-app` line under its hero, and it
copies — and `loom.code` ships without one.

The reason is structural rather than an oversight. A copy button needs no state
worth the name: one handler calling `navigator.clipboard.writeText`, and a label
that changes for two seconds. What it needs is somewhere for a *behaviour* to
come from. A primitive's props are JSON
([0009](0009-primitives-receive-props-in-a-bag.md)), and
a function is not expressible in JSON. `interactive`
([0064](0064-a-primitive-says-whether-it-is-a-target-and-the-gate-derives-the-nesting.md)) is the
closest thing in the contract and it is not this: it *describes* a target so the
Gate can refuse a bad nesting, and describing one does not create one.

So this is the fourth gap of a shape the section has answered three times.
[§4e](../README.md#4e--data-what-a-primitive-cannot-be-told-in-props) is a
question props cannot ask, §4f is a string props must not hold, §4g is an
address props may not name. A **behaviour** is an interaction props cannot
express at all.

The finding ranked three shapes and could not choose between them from its own
lane, because the one it ranked first turns on a fact only the render seam can
establish: whether a registered component may open a client boundary at all.

**It may.** Established this run rather than assumed: TypeScript emits the
`"use client"` prologue at line 1 of the compiled module, and a Next build of
`apps/loom` with a behaviour wired into `loom.code` compiles, resolves the
boundary through the registry, and emits the control into a client chunk. That
answers the finding's open question and rules nothing out; what follows is a
choice about who *may* open one, not about whether it works.

## Decision

**A behaviour is a control this package implements, a primitive declares by
name, and the renderer hands over already built.** The vocabulary is closed and
lives in `src/render/behaviour.ts`. Its first and only member is `copy`.

- `definePrimitive` takes `behaviours: ["copy"]`. `src/primitives/` **declares
  and never implements**: nothing in the library opens a client boundary of its
  own.
- The renderer builds the control per node and puts it in `loom.behaviours`,
  beside `loom.slots` and `loom.text`. It is a `ReactNode`, not a component —
  there is nothing left for the primitive to configure, so placing it is the
  whole of its part and where it goes is the whole of its discretion.
- **What a control acts on comes from the tree.** `copy` copies `textOf(node)`,
  read from the same tree the page was projected from. Not the DOM: a primitive
  that renders a language label beside its listing would otherwise put the label
  on someone's clipboard, and reading markup would need a ref into elements the
  primitive owns and the seam does not.
- **The control's strings are the primitive's declared text.** `copy` requires
  the keys `copy` and `copied`, so a German deployment translates the button
  with the dictionary it already has and no new machinery
  ([0063](0063-a-declared-string-travels-with-the-primitive.md)).
- **Three checks at registration**, each the whole of what can be known without
  calling the component: the name is in the vocabulary; the strings its control
  needs are strings this primitive declares; and a primitive taking a control
  declares itself `interactive`, because a control *is* a target and a code
  panel with a copy button inside a linked card is a `button` inside an `a`,
  where a browser silently drops one of the two.
- **A fourth check by probe.** A declared behaviour the component never places
  is reported as `unplacedBehaviours`, exactly as a declared slot nobody
  rendered is reported as `unplacedSlots`.
- **The control renders only where it will work.** The server render and the
  first client render are both empty; the button appears from an effect once
  `navigator.clipboard.writeText` is actually there. An insecure origin, an old
  browser and a page served with scripting off are three ordinary ways to get a
  button that looks like it copies and does not, which the finding was right
  that nobody wants.

Nothing in a tree names a behaviour. There is no prop to gate, nothing for the
analysis to weigh, and no way to phrase a proposal that makes something copy —
[0055](0055-motion-is-a-static-stylesheet-the-primitive-emits.md)'s bargain,
applied to behaviour instead of motion.

## Consequences

- The runtime now ships a client boundary. Exactly one, in one module, imported
  by nothing a host reaches directly — `behaviour-copy.js` is deliberately not
  re-exported from `@loom/runtime/react`, so the only way to a control is to
  declare one and read `loom.behaviours`. A host that imported it would get a
  control with no registration behind it: no declared name to translate, and
  nothing telling the Gate the page holds a target.
- `dist.smoke.test.ts` asserts the compiled module still opens with
  `"use client"`. The whole seam rests on that line surviving compilation, and a
  directive TypeScript moved below the imports would fail in somebody else's
  application build rather than here.
- A behaviour whose text a dictionary blanks is **dropped and reported**
  (`behaviour-unnamed`), not rendered nameless. The dictionary schema refuses the
  empty string but accepts whitespace, so this is reachable; a control a screen
  reader announces as "button" is worse than no control, which is the finding's
  own bar applied to the thing that closes it.
- `probeSlotPlacement` is now `probePlacement`. It answers about slots,
  children and behaviours, and the old name would have been misleading to the
  next reader.
- **Adding a behaviour is a change to this package**, and deliberately so. It
  needs a name, an implementation, its strings, and a line in the record —
  which is the friction that keeps the set of things a Loom page may *do* a
  list somebody can read, in the same way the primitives it may name and the
  schemes a URL may use (0053) are lists.
- The vocabulary has one member and the library has no user for it yet.
  `loom.code` is `Loom primitives`' file; the finding is that lane's to close,
  and this is the seam it asked for. A run wired it end to end through
  `loom.code` to prove the Next build resolves it, and reverted that — the
  declaration belongs in the same change as the button.
- A model is never shown behaviours. They are not in the catalogue, because a
  proposal cannot author one and a vocabulary a model cannot use is prompt it
  pays for and cannot spend.

## Alternatives considered

- **A client boundary per primitive** — the finding's first-ranked shape, and
  the one this rejects after establishing it works. It needs no new machinery at
  all, which is its whole appeal. What it gives up is the closed set: a library
  where any component may open a boundary has no list of what its pages do, and
  nothing to check a declaration against. It also loses all three registration
  checks, and the one that matters is `interactive` — a primitive that grows a
  button and forgets to say so leaves the Gate approving a nesting that silently
  breaks one of the two controls, which is the failure `interactivity.ts` exists
  to describe.
- **A behaviour the host installs** — ship the control as a script and a data
  attribute, and let the deployment wire it. Rejected for 0055's reason, which
  is the same reason it gave for refusing a host-installed stylesheet: a
  primitive that renders correctly only where somebody remembered to link
  something fails silently, in someone else's deployment, with nothing in the
  render to say what went wrong.
- **A behaviour prop on the primitive** — `copyable: true` in the tree. The
  thing this record exists to refuse, and the same shape 0053 and 0055 both
  refused. It would put in the space a model writes something the Gate cannot
  weigh: setting one prop on one node is small, low-stakes and perfectly
  reversible by every measure it has, and "this panel now offers to copy
  something" is not a change anyone would want made that way.
- **A component rather than a node in `loom.behaviours`** — hand the primitive
  something to render with props of its own. Rejected because there are no props
  it could get right or wrong: the strings come from its own declarations and
  the content from the tree. A component would be a component with one correct
  call, and a second way to place a control that the probe would then have to
  understand.
- **Reading the DOM for the copy text** — a wrapper with a ref, which is what
  the finding sketched. Rejected on two counts. It copies what rendered rather
  than what the tree says, so a language label or a caption inside the wrapped
  region lands on the clipboard; and the wrapper is a box the primitive did not
  ask for, in the middle of a layout it owns.
- **Nothing, permanently** — the finding's third shape, and a defensible answer
  for a library whose claim is that the whole page is data. It fails on the
  claim's own terms: the page being data does not mean the *chrome around it*
  must be inert, and a reference site whose install command cannot be copied is
  worse at being a reference site without being any more data.
