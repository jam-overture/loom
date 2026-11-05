# 0350. The names a render writes on a published page are published on the light side of the split

**Status:** Accepted
**Date:** 2026-11-05
**Section:** §3 — Rendering

## Context

`addressed: true` stamps a node's identity onto the markup of a live page
([0136](0136-a-published-page-broadcasts-reader-signals-when-its-host-asks.md)):
`data-loom-node` and `data-loom-type` on each decorated element,
`data-loom-tree` and `data-loom-revision` on the root. Those four names are the
whole of the contract between a render and anything that reads a published page
afterwards.

**Every host that reads them runs in a visitor's browser, and the only door that
published them was the heaviest one.** `LOOM_TREE_ATTRIBUTE` and its three
siblings are exported from `@jam-overture/loom/react`, which carries the render
seam and every primitive's registration. 0136 split
`@jam-overture/loom/signals/broadcast` out of `@jam-overture/loom/signals`
precisely because a browser bundle must not reach a heavy entry point for a
small thing — 66 KB against 4.8 KB — and `src/render/disclosed.ts` exists as a
module of one string for the same reason, so that the broadcaster can read a
disclosure without importing the React controls that write it.

So a host asking *where is the page?* had two options, and both were wrong. It
could import one string from `/react` and undo the split the broadcaster lives
on the far side of, or it could write `"[data-loom-tree]"` by hand. Measured
across this repository on 5 November, with `apps/loom` as six consumers:

| | |
| --- | --- |
| `(marketing)/_components/count-readers.tsx` | `const TREE_ROOT = "[data-loom-tree]"` |
| `(docs)/_components/reader-signals-live.tsx` | `querySelector("[data-loom-tree]")` |
| `(docs)/_lib/fences/compiled/the-runtime--what-your-readers-do.tsx` | the same line again |
| `(portal)/_lib/connecting.ts` | the constant from `/react`, interpolated into generated source |
| `(docs)/_lib/signals/markup.ts` | all four constants from `/react`, on the server |
| `(demo)/demo/_components/spotlight-scroll.tsx` | **a client component**, `/react` for one string |

The last row is the defect the other five are a warning about: a browser bundle
that carries the render seam and every registration so that one `useEffect` can
build a selector. It is the mistake 0136 recorded, in a client component, and it
is invisible in a diff — one import line, every test green.

**And writing the literal has a second cost that is not weight.** `Loom
marketing` filed this on 4 November after leaving a panel unshipped: the lines a
reader pastes to switch counting on contain `data-loom-tree`, `tree` is in that
site's `RESERVED_VOCABULARY`, and its voice sweep reads every code panel for
those words. The sweep is right — a stranger meeting `data-loom-tree` on a
marketing page has met a word the site promised not to say. The exemption beside
it covers published package strings exactly, which is safe because it *"cannot
be widened by writing worse copy, only by publishing another package"*. A
framework attribute name has no such property. Giving the vocabulary a published
door moves the panel's one hard word into the class the exemption already
describes.

## Decision

**The four names a render writes on a published page, and the function that
finds the page, are published from `@jam-overture/loom/addressed`
(`src/render/addressed.ts`), which loads no package.**

```ts
import { addressedRootIn } from "@jam-overture/loom/addressed"
import { broadcastReaderSignals, deliverReaderSignals } from "@jam-overture/loom/signals/broadcast"

const page = addressedRootIn(document)

if (page !== undefined) {
  broadcastReaderSignals(page, { send: deliverReaderSignals({ url: "/api/reader-signals", key }) })
}
```

**`addressedRootIn(scope)` answers the root element or `undefined`**, where
`scope` is a `Document`, a `DocumentFragment` or an `Element`. Three properties
are decided here rather than left to the implementation:

1. **The scope counts as its own answer.** `querySelector` searches descendants
   only, so a host holding the root and asking for the root would be told there
   is none — the one answer that is never useful. Including the scope makes the
   function idempotent: feeding it its own result returns that result.
2. **The first in document order** when a scope holds more than one tree, which
   is `querySelector`'s own rule. A host that rendered two trees knows where it
   put them and asks within each.
3. **`undefined`, not `null`.** *There is no addressed page here* is the absence
   of an answer rather than an answer, and two callers in this repository reach
   through an optional ref, where `null` would give them two empty values to
   test for instead of one.

**The door reads; it does not write.** `editableAttributes` builds the
attributes and stays on the render seam, where the tree types it needs already
are. A host does not write these names — the renderer does — so publishing the
builder here would mean publishing the tree types with it, and the door would
stop being light for a function nobody outside this package calls.

**`DISCLOSED_ATTRIBUTE` is not in it.** The disclose control stamps it whether a
page asked to be addressed or not, so it is not part of this vocabulary; and the
thing that reads it is a stylesheet, which imports nothing. A door whose meaning
is *the names `addressed: true` writes* can be held to that; *the names Loom
writes anywhere* is a bag that grows.

**Lightness is a test, not a paragraph.** `addressed.weight.test.ts` walks the
modules the door loads and fails if any of them reaches a package, the way
`src/signals/browser-weight.test.ts` holds the broadcaster. It is a second copy
of nine lines rather than a shared helper on purpose: the two doors are in two
lanes, and a check one lane can break for another is worse than the duplication.

## Consequences

**A host's line becomes an import and no literal.** The six consumers above each
have a one-line change available to them, and none of them is this lane's file
to edit, so the finding this closes is closed at the seam and the adoptions are
filed for the three lanes that own them.

**`/react` keeps exporting the four names.** This is additive: nothing is moved
and no consumer breaks. `src/render/index.ts` still re-exports `editable.js`, so
the server-side readers — `(docs)/_lib/signals/markup.ts` and the portal's
snippet generator — are free to stay as they are, and `(portal)` has the better
reason to change anyway, which is that the snippet it generates gets shorter.

**One more door to keep honest.** `dist.smoke.test.ts` derives the door set from
the manifest and refuses a door with no named export, so this one is loaded
under plain Node like the rest. `publishConfig.exports` carries it too, because
a subpath withheld there while its file is still packed is a publication fault
the manifest check already names.

**It is a place to put the next one.** The attribute names are not the only
small thing a browser-side host reaches `/react` for; `(demo)`'s spotlight is
the proof. Anything else that is a *name on the markup* now has somewhere light
to go, and anything that needs a tree, a registry or React does not.

## Alternatives considered

**Give `broadcastReaderSignals` a `Document` and let it find its own root.** The
finding's first suggestion, and the better API for the one caller that is a
broadcast: it already refuses an element with no addresses (`"unaddressed"`), so
the failure it would report for a document with no addressed page is a failure
it has. Rejected for two reasons. `src/signals/` is `Loom signals`' lane
(`docs/routines.md`), so it is not this lane's change to make. And it answers
only the broadcaster: `(demo)`'s spotlight wants `data-loom-node` and no
broadcast at all, and a door that serves one consumer would leave the literal in
the other five. It remains available on top of this and is filed for its owner.

**Publish the selector string, `"[data-loom-tree]"`, as a constant.** One
export, no function. Rejected because it publishes the hard part — every caller
still writes the query, the null check and the `null`/`undefined` reconciliation,
which is where two of the six got it slightly differently — and because a
selector is not what a caller wants. It would also have left the portal
interpolating a selector into generated code rather than generating an import.

**Add the names to the root door, `@jam-overture/loom`.** Rejected: that door
carries the tree, the schemas and `zod`. It is the heavy-import mistake with a
different name on it.

**Move the names out of `/react` instead of also publishing them here.** The
tidier end state, and a breaking change to a published entry point for a gain
that is entirely internal to this repository. Pre-production is not a reason to
spend a consumer's time; additive costs nobody anything and the duplication is
one re-export line.

**A shared module-graph walk in `src/testing/`.** Rejected as described above:
it would put one lane's weight check in a file another lane edits.
