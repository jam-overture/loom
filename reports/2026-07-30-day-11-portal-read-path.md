# 2026-07-30 (day 11) — how the portal should work, and the read path

**Build order section:** §5 — Portal. The recommendation, and the first pane.

**Visual:** [the portal rendering a stored tree](2026-07-30-day-11-portal-preview.png)

**Branch:** `day-11-portal-read-path`, off `main` at `b9e125c`

---

## The recommendation you asked for

Recorded as **0019**, because it rules out the thing a reasonable engineer reaches
for first.

"A thin UI over the persisted tree" hides two products with almost no overlap. A
**design tool** — canvas, layers panel, property inspector, drag to position — is
what everyone expects, and is where most of the effort would go. A **review queue**
treats a *proposed change* as the primary object: what was asked, what the
interpreter made of it, what the Gate decided and why, what it would look like,
and what it would undo.

**It should be the review queue**, because Loom's premise is that UI is proposed
rather than written. A canvas is a tool for writing UI. Building one first would
quietly invert the thesis — direct manipulation becomes the main path, the model
becomes a novelty attached to it, and the Gate becomes an obstacle between a user
and a canvas they are already dragging things around on. That inversion is not
recoverable by refactoring.

Three panes, in priority order:

1. **The change** — the prompt box, and the anatomy of what came back: rationale,
   stakes factors, reversibility, disposition, provenance, confidence.
2. **The preview** — the real tree via `renderRequest` in edit mode, so changes
   are seen in situ rather than as an abstract diff.
3. **The tree** — an outline. An address book for scoping an intent, not a layers
   panel to drag in.

`awaiting-confirmation` is the state that justifies the product. A runtime that
only ever applied or refused would need a log, not a portal. The portal is where a
human is the missing input to a decision the Gate deliberately did not make alone.

And **history is a first-class view, not an audit tab** — 0016 made the log the
truth, so revert-from-inverse-delta is what turns "reversible" from a claim into a
button.

What it deliberately will not do: no freeform canvas (the tree has no layout
model — dragging can only mean reparent or reorder), no arbitrary property editing
(0011 means the inspector shows the declared schema and nothing else), no publish
button (there is no build step between the tree and what is served), and no
wrapping to force a handle on an undecorated primitive (0012 — it degrades to the
nearest decorated ancestor and says so).

**Build order within §5 follows dependencies, not priority:** read path →
addressing → write path → history → calibration. The most important pane is third
because it needs the other two to have anything to talk about.

---

## What was completed: the read path

The portal now renders a tree it stored, through the runtime, with no privileged
access. The screenshot is the actual running build.

- **Four primitives** — `loom.page`, `loom.card`, `loom.heading`, `loom.prose` —
  registered through the public SDK exactly as any host would (0018), each
  declaring its props strictly and spreading `loom.editable`.
- **`lib/registry.ts`** — one registry serving as both resolver and prop
  validator, which is what makes the narrowed prop types sound.
- **`lib/seed.ts`** — a tree built through the public builders rather than written
  as a literal, so it cannot drift out of the shape `parseTree` accepts. A seed
  that failed to parse would look like a renderer bug.
- **`lib/store.ts`** — one memory store per process, seeded once, `already-exists`
  ignored by design so a re-evaluated module cannot replace an edited tree.
- **`/trees`** and **`/trees/[treeId]`** — the listing and the preview pane, the
  latter rendering with `editMode: true` so every element carries
  `data-loom-node` for the addressing work that comes next.
- **`PreviewFrame`** shows render diagnostics rather than logging them. 0008 made
  the renderer total so it degrades instead of throwing; that only helps if the
  degradation is visible to the person who can fix it.

---

## The deferred compile step stopped being a cost and became a blocker

Day 8 deferred the build step and day 10 called it "slightly more pressing." It
broke the build today, and it is worth being precise about why, because the
diagnosis is not the obvious one.

`next build` failed with **35 errors**, all variants of "export X doesn't exist."
Typecheck was green and all 464 tests passed. The cause is the runtime's internal
import convention: specifiers are written `./audit.js` and resolve to `./audit.ts`.
That is correct for `tsc` and for Vitest, and unresolvable for a bundler that takes
the extension literally — so the re-export chains came back empty rather than
erroring at the import.

Day 8 hit the *same convention* from the other side, in Node's type stripping. This
is the second time, and 0018 predicted the portal would be what forced it.

`extensionAlias: { ".js": [".ts", ".tsx", ".js"] }` is the standard answer, and it
is why the portal builds on **webpack rather than Turbopack** — Turbopack exposes
no equivalent knob today. That is a workaround and `next.config.ts` says so. **The
real fix is the build step**, and it is now the highest-value piece of
non-feature work in the repo.

---

## A mistake worth recording

The first build also failed on `./seed.js` in the portal's *own* code. I had
written the portal's internal imports with `.js` specifiers, copying the runtime's
convention without asking whether it applied.

It does not. The runtime uses that convention because it targets Node's ESM
resolution; the portal is bundler-resolved and its idiom is extensionless. Copying
a convention across a boundary because it was familiar is exactly the kind of thing
0018's arm's-length arrangement is supposed to surface, and it did — on the first
build.

---

## A real framework gap, left open deliberately

**`TreeStore` has no `list`.** The portal cannot enumerate stored trees, so
`/trees` shows the tree this process seeded and is named honestly as that rather
than dressed up as a listing.

Per 0018 this is a framework gap to close in the framework, not a shortcut to take
in the portal — but it is not a one-line addition. A real store needs the listing
scoped and paginated, and `list(): Promise<TreeId[]>` would be a contract that only
works for the in-memory reference implementation. It landed hours ago, and adding
a method to it at the end of a long session is how contracts get shapes nobody
chose. **Next session's first decision.**

Knowing the id of a tree this module created is not privileged access, so the
current arrangement is not the shortcut 0018 warns about. Listing trees it did not
create is what needs the answer.

---

## Decisions I made that weren't specified

1. **`editMode: true` unconditionally in the preview.** It costs one boolean test
   per element when off, and serving an undecorated version of a page only the
   portal looks at would be an optimisation of the wrong thing.
2. **The seed's id is stable** (`t_seed1`, from a seeded factory), so its URL
   survives the process dying — which an in-memory store otherwise would not give.
   A test pins it.
3. **Four primitives, not one.** A registry with one primitive cannot show that
   the resolver dispatches, that declared props reach the element, or that nesting
   renders. It is the smallest set that makes the render path's behaviour visible.
4. **`loom.card` stacks its children with a gap.** Caught by looking at the
   screenshot, not by a test — the nested heading and prose were touching.
5. **The store lives on a `Symbol.for` carrier.** Next may evaluate a module more
   than once per process; two stores would mean a change applied to one and read
   from the other.

---

## Test coverage / status

```
@loom/runtime   51 files, 451 tests   green
@loom/portal     2 files,  13 tests   green + build
```

`pnpm verify` green across the workspace. **7 new tests.** What they pin down:

- every primitive the seed uses resolves from the registry
- **the portal's own primitives pass their own conformance audit** — 0012 means
  registration would have succeeded with an undecorated one, so this is what makes
  them addressable in fact rather than by intention
- the seed parses, starts at revision 0, and keeps a stable id
- the seed renders its text, and in edit mode every element carries
  `data-loom-node` with the tree id on the root
- a declared prop reaches the element that reads it (`variant: "outlined"` →
  a border, `level: 1` → an `h1`), with no diagnostics

---

## Open questions for the next session

1. **`TreeStore.list` — the first decision.** See above. Needs a shape that works
   for a real store, not just the reference one.
2. **The compile step.** Now demonstrably a blocker rather than a cost, and worked
   around in `next.config.ts`. Highest-value non-feature work in the repo.
3. **Addressing is next on §5's build order** — the tree outline and selection,
   reading the `data-loom-node` decoration this unit started emitting.
4. **Then the write path**, which 0017 already designed: `EditIntent` →
   `composeChange` → `append`, with an optimistic client reconciling a
   `revision-conflict`.
5. **The schema is at 3381 of a 3500 guard.** Untouched. Carried.
6. **Node-level provenance.** (Carried from day 1.) Still unforced.
