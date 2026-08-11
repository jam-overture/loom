# 2026-08-11 (day 48) — the variables reach the page, and the runtime takes a namespace to do it

**Build order section:** **§3 → §4b** — the render root mounts what 0049 put in
the tree.

**Branch:** `day-48-theme-at-the-render-root` (→ `main`).

---

## Where this run started

`main` is current at `e52e32f`: **#66 is merged**, so the theme layer — schemas,
applier, registry and the two-palette starter library — is on `main`. `gh pr
list --state open` is empty, and there are **no review comments** on #66 or
anywhere else, so nothing outranked the plan and this run went straight to the
next item on it.

One piece of missing continuity worth noting: **#66 shipped without a report**.
The theme layer's reasoning survives in its commit message and in 0049, which is
enough to work from, but `reports/` skips from day 47 to today.

The §4b order names step 1 as *theme, still to wire: the render root must mount
the variables*. That is what this run built. Nothing in a finished section was
opened for polish.

## What was built, in plain language

Before this run, a tree could **name** a theme and nothing looked at it. 0049
landed three registered ids on the root node, a registry that resolves them into
a palette, a font pack and a style preset, and an applier that flattens those
into `--loom-*` custom properties — and then stopped, because it had authorised
the mount without performing it. Every renderer about to be ported reads its
colour and spacing from those variables, so until something emits them, all
seventy would render unstyled.

Now the renderer resolves the theme once per render and hands the flattened
variables to the root primitive, which applies them as its `style`. The same
tree, with `palette: "editorial"` changed to `palette: "bold"` and nothing else
touched, renders with a different background, different accent, different type
and different radii — and no primitive, and no node below the root, changes at
all. That is the property the second starter palette exists to prove, and it is
now asserted in a test rather than hoped for.

Getting there needed two decisions 0049 did not make.

### The first: whose props those are

Props belong to the primitive. The registry validates them against the
primitive's declared schema, and the SDK's own documented example declares
`.strict()`. So a root primitive that does not know about themes would have
**rejected a tree wearing one** — and not cosmetically: the renderer omits a node
whose props are invalid, so a `configure` setting the theme would have blanked
the entire page. The tidy-looking alternative, making every root primitive
declare the key, contradicts 0049 directly, which promises that a primitive
"never learns which palette is mounted".

So **prop keys beginning with `loom:` are now reserved for the runtime**. The
renderer partitions each element's props on that prefix, reads the reserved half
itself, and passes only the remainder to the validator and to the primitive.
Exactly one reserved key exists: `loom:theme`, honoured on the root node. A
reserved key nothing reads is dropped and reported, because a namespace that
silently swallows what is put in it is a place for data to go missing.

Taking a namespace rather than a single key is the deliberate part. A locale, an
audience marker, a per-node capability — the next runtime-owned prop costs a key
and a diagnostic, not another architectural argument.

### The second: what carries the variables to the DOM

The obvious answer is a wrapper element around the root holding the variables in
its style, and `editable.ts` had already rejected that shape for edit-mode
attributes, in a comment written before any of this existed:

> The renderer does not wrap anything in a wrapper element to carry them,
> because a wrapper changes what `>`, `:first-child`, and `:nth-child` select,
> and a UI that only lays out correctly when edit mode is off is not the UI
> anyone reviewed.

The reason transfers unchanged — swap "edit mode is off" for "the page is
unthemed". `display: contents` does not rescue it: it removes the box, not the
node, so child and descendant combinators still see it.

So the theme arrives as `loom.theme` on the root node's render context — the same
shape of obligation as `loom.editable`, applied by the primitive to its own root
element, adding nothing to the DOM. The honest cost is that a root primitive
which drops it renders unstyled, and nothing at registration time catches that
yet. See open question 1.

### Rendering stays total

A theme the render cannot mount produces an unstyled page and a diagnostic,
never a thrown error and never a blank one — the same bargain every other render
diagnostic makes. Three new codes, plus one for the namespace:

| Diagnostic | When |
| --- | --- |
| `theme-unresolved` | the registry refused the selection — an unregistered id, or not three ids |
| `theme-unregistered` | the tree names a theme and the host wired no registry |
| `theme-misplaced` | a selection below the root, where nothing mounts it |
| `reserved-prop-unrecognised` | a `loom:` key the runtime does not read |

**There is no fallback theme**, deliberately: a host-supplied default would mount
a look the tree does not name, making the page a function of deployment config as
well as of the tree — exactly what 0049 rejected when it rejected host-supplied
theming outright. An unthemed tree renders unstyled and says nothing, because
naming no theme is not an error.

## Decisions not explicitly specified, and why

- **`loom:` as the reserved prefix, not a bare `theme` key.** `theme` is a
  plausible prop name for a real primitive (a card with `theme: "dark"`), so
  reserving it would collide with the catalogue this port is about to grow. The
  prefix also signals at a glance that the key is runtime-owned.
- **`RenderOutput` now carries the `ResolvedTheme` it mounted.** The variables
  are already on the page; this is so the portal can *say* which palette a
  revision was served in without resolving the ids a second time.
- **`ThemeRegistry.resolve` widened to take `unknown`.** A selection arrives from
  storage like the rest of the tree, and the registry's internal parse is the
  only thing that makes it a selection. Typing the parameter as `ThemeSelection`
  was a claim the caller could not honestly make. Every existing caller still
  compiles.
- **The theme resolves once, before the walk**, rather than per node. A tree
  wears one theme and the variables cascade, so per-node resolution would be the
  same answer recomputed for every node on the page.
- **The test primitives now apply `loom.theme`.** They already modelled a
  well-behaved primitive by spreading `loom.editable`; the contract grew, so they
  grew with it.

## Records added or superseded

- **Added [0050](../decisions/0050-the-runtimes-props-are-namespaced-and-the-root-mounts-the-theme.md)** —
  *The runtime's props are namespaced, and the root primitive mounts the theme.*
  Records the reserved namespace, the primitive-applied mount, the totality of
  theme failure, and the refusal of a fallback theme. Four alternatives recorded
  as rejected, including the `display: contents` wrapper and a `<style>` sibling.
- **Nothing superseded.** 0050 completes the piece 0049 explicitly left open;
  it contradicts nothing in it.

Index regenerated with `pnpm decisions:index`.

## Tests

`pnpm install && pnpm verify` — **green**.

| | Files | Tests |
| --- | --- | --- |
| Runtime | 81 | **1061 passed**, 0 failed |
| Portal | 34 | **381 passed**, 0 failed |

**Nothing failed and nothing was skipped**, with one standing exception unchanged
from previous runs: the live Anthropic smoke test skips cleanly when
`LOOM_ANTHROPIC_API_KEY` is absent, which it is in this environment.

**15 new tests**, in `src/render/theme.test.ts`, covering: variables mounted on
the root element; mounted **once**, at the root, and nowhere below; the re-theme
— the same tree under both starter palettes producing markup identical except
for the style attribute; the mounted theme named in the output; purity across
two renders; an unthemed tree producing no variables and no diagnostics; each of
the four diagnostics; reserved keys kept away from both the primitive and the
validator; no allocation for a node carrying no reserved key; and `renderRequest`
resolving the theme for the request it serves.

## Open questions

1. **Should `auditRegistry` probe for the theme mount?** A root primitive that
   ignores `loom.theme` renders unstyled and nothing at registration catches it —
   the same failure `probeEditableDecoration` exists to catch for `loom.editable`.
   Against doing it: only the root is ever handed a theme, so the probe would
   flag every non-root primitive for not applying something it will never
   receive, unless the check is somehow scoped to primitives that can be roots —
   and the tree schema has no such notion. **Recommendation: leave it.** The
   standing rule that a ported primitive must render under both palettes catches
   it per primitive, which is where the knowledge lives. Revisit if the port
   produces a primitive that is unstyled in review.
2. **Should the catalogue shown to the model include the theme registry?**
   `catalogueOf(registry)` tells a model what primitives it may build with;
   `themeRegistry.catalogue()` exists and is wired to nothing. Until they are
   joined, "make it warmer" resolves against a vocabulary the model was never
   shown, so it will guess palette ids. **Recommendation: join them in the
   primitive-library step**, when there is a real page to re-theme and the guess
   can be observed rather than imagined.
3. **Does a nested theme scope ever earn its place?** A dark card inside a light
   page is a real request, and today it is a `theme-misplaced` diagnostic. The
   mount mechanism would extend to it without a schema change — any element could
   carry the key and apply its own variables. Not built, because 0049 says one
   theme at the root and no use case has appeared. **Recommendation: wait for the
   port to produce one.**
4. **#66 shipped without a report.** Not blocking, and not something I can fix
   retroactively without inventing a session I did not run. Flagging it so the
   gap in `reports/` is a known one.

## What is next

§4b step 2: **ten primitives, not seventy**. The theme step is closed — a
renderer reading `var(--loom-accent)` is now styled, and the re-theme guarantee
that makes a port reviewable is under test. The next run picks the ten to cover
the contract rather than the catalogue: two or three that genuinely nest so slots
are exercised, a few leaves, one with a rich prop schema, one with an
enum-driven display mode, with the choice and its reasoning stated in the report.
