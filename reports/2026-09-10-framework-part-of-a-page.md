# 2026-09-10 — Part of a page

**Routine:** `Loom daily build` · **Section:** §1
**Branch:** `framework-25-where-the-face-is` (#230), twentieth unit
**Visual:** `reports/2026-09-10-framework-part-of-a-page.png`

## What was completed

`Loom demo` filed one finding this morning with two gaps in it, both met while
building a preview of the node a held proposal is about. Both are built.

**A subtree rendered on its own had no theme, and nothing said so.**
`renderLoomExcerpt(tree, nodeId, options)` renders any node of a tree on its own
and mounts the tree's theme on an element of its own around it. The picture
beside this report is the same `loom.stat-grid`, from the same tree, wearing the
same editorial selection: on the left what a lane got before, on the right what
the seam produces. Nothing in either panel is styled by hand.

The diagnosis in the finding was exact, including the part about there being no
warning. 0049 mounts a theme once, at the root, and `loom.page` is what puts the
variables on an element; a walk beginning at a `loom.stat-grid` hands that
subtree `var(--loom-accent)` with nothing above it to resolve, and `resolveTheme`
on a node naming no theme is right to answer *unthemed*. Nothing is broken. What
was missing was anything saying **this is how you render part of a themed tree**,
so the demo wrote four correct lines and the fourth surface to want a preview
writes them again — and the one that writes three of them ships an excerpt in the
wrong typeface with a green build.

**Nothing could answer what words a node shows.** A primitive may now declare
`copy`, the props whose values a reader reads, and `copyIn(node, registry)` reads
a node against those declarations. The case is `loom.stat`, whose figure, label
and caption are props because 0052 says a fixed field stays a prop — so the
portal's review queue, walking text children, reports a proposal to delete three
headline numbers as taking away *no words at all*. `Loom demo` filed that half
against `(portal)/_lib/effect-view.ts` the same morning. Two lanes, one gap, one
day.

The finding left open whether rendering was the honest answer to it, now that
0121 makes rendering a part possible. It is not, and 0122 records why where a
fresh session finds it: recovering from markup what the tree already holds needs
a DOM and a render, neither of which a queue row on a server or an unapproved
proposal has, and it hands back the component's own chrome mixed in with the
tree's words.

## Decisions taken that were not specified

- **The excerpt is wrapped, always, root included.** An excerpt of the root
  mounts the same variables twice on nested elements — the same values by
  construction, one extra element. The alternative makes the rule *an excerpt
  carries its theme unless you asked for the node that carries it already*, and
  a caller passing a node id out of a URL does not know which one it got.
- **`copy: []` and no declaration are different answers, and there is no
  default.** `[]` says this primitive shows no words of its own and is believed.
  Absence is reported in `unread`, naming the node, the type and the props
  nothing classified. Collapsing the two is the failure — a reading that returns
  nothing for a stat would be indistinguishable from a stat that says nothing,
  which is how the queue got here. Same bargain `unprobedProps` makes.
- **A non-string copy value is skipped, not coerced.** A component renders `3400`
  as *3,400* and owns the separator. `String(value)` would put a figure on a
  reviewer's screen that the page does not show, and somebody is approving a
  change against what this says. A missing word is a gap; a wrong one is a lie.
- **A declaration is trusted about its exclusions.** A primitive declaring
  `["headline"]` and holding `backdrop` has said `backdrop` is not copy, so it
  raises no `unread`. Anything else makes declaring worse than staying silent.
- **`display: contents` on the wrapper was considered and left out.** It would
  keep the variables inheriting while removing the box from layout. Nobody has
  asked, and it is a rule a caller cannot see from outside. Recorded as the
  alternative to revisit the first time a lane files that the box is in its way.
- **This unit went onto #230 rather than a new branch.** My brief says branch off
  `main`; step 3 of `docs/routines.md` — rewritten since — says push onto your
  own open pull request instead, and `pnpm queue` measured last night why: a
  second framework branch touching these files conflicts with the first, and the
  cost lands on the maintainer at merge time. It is not a stack; the branch is
  off `main`. Saying it out loud because the brief and the file disagree.

## Records

- **0121** added, `Accepted` — part of a tree is rendered by the seam, and the
  seam is what mounts the theme. Five alternatives recorded.
- **0122** added, `Accepted` — a primitive says which of its props a reader
  reads, and empty is not silence. Five alternatives recorded, including
  rendering-and-reading-back, which the finding itself raised.
- `pnpm decisions:index` regenerated. It prints `note:` for 0106 and 0110, both
  claimed on branches that have not merged, and exits 0.
- The citation check refused both records before they existed — `src/sdk/
  definition.ts cites 0122, and there is no such record` — and then refused 0121
  for linking 0049 under a filename that has never been. Working as built.

## Findings

**Closed:**

- *a preview of a tree loses its theme, and there is no seam for "the words a
  node shows"* (`Loom demo`, 10 September) — both halves. It was filed on
  `demo-13-the-part-it-is-about` and is not readable from `main`, which has not
  moved since 1 September. The branch sweep the 8 September entry recommends is
  what found it, now three for three.

**Filed:**

- *the starter library can now say which of its props are words, and none of them
  does* — owned by `Loom primitives`, with the three primitives where it pays and
  the two things worth knowing before doing it. `src/primitives/` is that lane's
  and this one stopped adding to it on 16 August.
- *`textIn` has something to ask now, and the queue is still reading text
  children* — owned by `Loom portal`, a note on `Loom demo`'s entry rather than a
  second ask. It says plainly that `copyIn` is not useful to the queue until the
  library declares.

## Test numbers

| | after | before |
| --- | --- | --- |
| runtime tests | **2,195** across 136 files | 2,168 across 134 files |
| application tests | **2,497** across 158 files | 2,497 across 158 files |
| findings checked | **373**, 0 malformed | 370, 0 malformed |
| prerendered pages | 73, 307 junctions, 0 run together | same |

`pnpm verify` exit 0. Twenty-seven tests added — ten on the excerpt, thirteen on
the reading, four on the registry — all against doubles or the starter library.
Nothing failed and nothing was skipped.

One generated file moved and was regenerated rather than edited:
`apps/loom/app/(docs)/_lib/api/reference.generated.json`, via
`pnpm --filter @loom/app docs:api`, because the runtime's published surface grew
three exports. That file is `Loom docs`' by location and generated by
construction, which is the case 0139 covers.

## Open questions

- **`copyIn` answers `unread` for the whole starter library today**, so the
  reading is honest and not yet useful. The picture shows both — what it says now
  and what it says once `loom.stat` declares three props. Whoever moves first,
  `Loom primitives` declaring or `Loom portal` switching, gets nothing until the
  other does. The declaration is the half that unblocks, and it is filed.
- **The excerpt wrapper is a `div` with no attributes.** No lane has said whether
  it wants to address it — a class, a `data-` hook, `display: contents`. Left
  bare deliberately; the first filing decides it.
- **Whether `copy` should be ordered by purpose rather than as a list.**
  `{ heading: "value", detail: "label" }` would let a consumer ask for the
  leading word. Both filings want the words in order, so a list is what shipped,
  and a list can grow into a map without a consumer changing what it asks.
- **Nothing here changes the queue.** **Thirty-seven** pull requests are open —
  counted, not estimated — and `main` has not moved in nine days. Last night's
  `pnpm queue` measured thirty and put twenty-eight of them behind three lines in
  `.gitattributes`; seven more have opened since, so that measurement is already
  a snapshot of a smaller queue than the one there is. This is the twentieth unit
  on one branch, which is the shape that keeps the lane from conflicting with
  itself and is not a shape anybody would choose for review.
