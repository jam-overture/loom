# 0121. Part of a tree is rendered by the seam, and the seam is what mounts the theme

**Status:** Accepted
**Date:** 2026-09-10
**Section:** §1

## Context

`Loom demo` built a second rendering of one node of a page on 10 September — the
band a held proposal is about, shown beside the question, because on a phone the
band itself is 4,620px below the card asking about it. It worked, and it
reported a gap on the way:

> A theme is mounted on the root primitive, not on the tree. Render a tree rooted
> anywhere else and there is no theme at all: the excerpt comes out with every
> `var(--loom-…)` falling back, in a typeface and palette the page does not own,
> and **no diagnostic**.

Every part of that is working as designed.
[0049](0049-a-theme-is-three-ids-in-the-tree.md) puts the theme
on the root node's reserved props and mounts it once, at the root, so the cascade
carries it and a re-theme touches no node. `loom.page` is what puts the variables
on an element. A walk that starts at a `loom.stat-grid` hands that subtree
`var(--loom-accent)` with nothing above it to resolve, and `resolveTheme` on a
node that names no theme is correct to answer *unthemed* — there is nothing to
warn about, because nothing is wrong. It is a page rendered outside its page.

The demo worked around it in four lines: render the page it already renders,
read `RenderOutput.theme` off it, put `themeStyle(theme)` on the frame. That is
the right workaround and it is also the finding — **nothing in the runtime says
this is how you render part of a themed tree**, so the fourth surface to want a
preview writes those four lines again, and the one that writes three of them
ships an excerpt in the wrong typeface with a green build.

A preview, an inspector, a side-by-side, a search result and a diff are all one
shape: a node of a page, shown somewhere that is not the page. The runtime had an
answer for a page and none for a part of one.

## Decision

**`renderLoomExcerpt(tree, nodeId, options)` renders any node of a tree on its
own, and the seam mounts the tree's theme on an element of its own around it.**

```ts
const excerpt = renderLoomExcerpt(tree, "n_7", { resolver: registry, themes })
// → { element, diagnostics, theme, found }
```

Everything below the wrapper is the ordinary page walk: the same resolvers, the
same validation, the same diagnostics, the same purity. Four things bound it.

**The theme is the tree's, not the node's.** It is resolved from the root's
reserved props whichever node the render starts at, because a theme is a fact
about the document. An excerpt of an unregistered theme reports
`theme-unregistered` against the *root's* id, which is where the declaration is.

**The seam mounts it, because the primitive cannot.** Only a root primitive
applies the theme, and the node a caller excerpts is any node. Handing the
excerpt's root the `theme` prop and hoping would put the variables on `loom.page`
and nowhere else — the failure this record exists to close, with an extra step in
it. So a `div` carrying the custom properties wraps the excerpt, and the excerpt
is self-contained: it can be dropped into a page that owns a different theme or
none at all.

**The wrapper is always there, and the root is not a special case.** An excerpt
of the root mounts the same variables twice, on nested elements, which is the
same values by construction and costs one element. The rule a caller can hold is
*an excerpt carries its theme* rather than *an excerpt carries its theme unless
you asked for the node that already carries it* — and a caller passing a node id
out of a URL does not know which one it got.

**A missing node is a diagnostic, not a throw.** `excerpt-absent`, with
`found: false` and a null element. The id came from somewhere — a review queue, a
link in a record, a fragment in a URL — and an ordinary change can have deleted
the node since. A preview of a part that is gone is a thing to say.

## Consequences

- **The demo's four lines can go, and nobody else has to write them.** That is
  `Loom demo`'s call and its timing; the workaround is correct and stays correct.
- **An excerpt's root is not the tree's root, and every rule about roots applies
  to it as such.** It receives no `theme` prop, its editable attributes name no
  tree, and a `loom:theme` sitting on it is `theme-misplaced`. None of that is
  new behaviour — it is what those rules already say, met by a node that is not
  the root for the first time.
- **`renderLoomTree` is unchanged.** Both now call one internal walk, which is
  the whole of the refactor: a page is an excerpt of the root that mounts its own
  theme, and the two were never different renders.
- **Slots and text nodes excerpt too.** A part of a page is a node, and the
  kinds a tree has are the kinds this takes.
- **It does not answer "what words does this node show".** That was the other
  half of the same finding, and rendering is not the answer to it — reading back
  markup to learn what a node says needs a DOM, a render, and a string parse to
  learn something the tree already holds.
  [0122](0122-a-primitive-says-which-of-its-props-a-reader-reads.md) answers it
  from the tree instead.

## Alternatives considered

- **A `from` option on `RenderOptions`.** Smaller — no new export — and it would
  have made the theme question invisible: a caller passing `from` gets an
  unthemed subtree and a green build, which is exactly today. The wrapper is the
  decision, and a decision belongs in a function name rather than in an optional
  field on the function that does the other thing.
- **Handing back the style object and letting the caller mount it.**
  `{ element, themeStyle }`, the demo's workaround with the resolution done. It
  is one line shorter than the workaround and has the same failure: the caller
  who does not read the second field ships the bug, and there is no way to notice.
- **`display: contents` on the wrapper.** Keeps the custom properties inheriting
  while removing the box from layout, so an excerpt placed inside a grid does not
  become a grid item. Genuinely appealing and rejected as premature: nobody has
  asked, it is a rule a caller cannot see from the outside, and a caller who
  wants it can wrap the wrapper. Worth revisiting the first time a lane files
  that the box is in its way.
- **Synthesising a tree whose root is the node, and rendering that.** One line
  for a caller, and wrong in two ways it would not find out about: the synthetic
  tree carries the real tree's id and revision while not being it, and the
  excerpt's root would be treated *as* a root — editable attributes naming the
  tree, and a `loom:theme` on it read rather than reported. An excerpt is a view
  of a tree, not a tree.
- **Leaving it to hosts.** The status quo. Rejected because the failure is
  silent, wears the wrong typeface, and every surface that shows part of a page
  meets it — four of the seven lanes here already show one.
