import {
  applyDelta,
  describeTreeError,
  findNode,
  type LoomTree,
  type NodeId,
  type ProposalId,
  type TreeDelta,
  type TreeId,
} from "@jam-overture/loom"

import { addressNode, type Addressing, type DecorationLookup } from "@jam-overture/loom/react"

import type { PlainWord } from "./vocabulary"

/**
 * The page as it would be if somebody said yes, and what to look at on it.
 *
 * ## The question this answers, and why nothing else could
 *
 * `docs/portal.md` phase 3 asks three questions of one page — *what it looks
 * like*, *what it looked like*, *what it would look like* — and calls them one
 * mechanism: a page drawn from a tree the record produced rather than the one
 * being served. The first is the preview pane and the second is
 * `_lib/progression.ts`. This is the third, and the plan singles it out as
 * **the review queue's most-asked question, which has never been answerable by
 * eye**.
 *
 * It is the sharpest of the three because the answer does not exist anywhere
 * else *even in principle*. The page as it looked three changes ago at least
 * happened; nobody can look at it, but it was real. This one never happened and
 * will only happen if the person reading the screen presses a button. There is
 * no build of it, no branch of it, no file to check out, no preview deployment —
 * the only account of it in existence is a held proposal's forward operations,
 * and the only way to see it is to apply them to the page and draw the result.
 *
 * `_lib/effect-view.ts` already says what a proposal would do in sentences, and
 * says it well: *"Deletes the card “Prices” n_h, and the 12 pieces inside it."*
 * That sentence is exactly true and it does not tell a reviewer that the page
 * then has two headings in a row, or that the band above it collapses to a
 * quarter of its height, or that what is left reads as an orphaned caption. A
 * reviewer who can only read the change is being asked to simulate a renderer in
 * their head. This is the renderer doing it instead.
 *
 * ## It applies the whole delta or none of it, and never half
 *
 * `applyDelta` refuses a delta whose `baseRevision` is not the tree's, and
 * refuses a delta whose operations do not all land. Both refusals are kept
 * exactly as they arrive, and this is the load-bearing decision in the file:
 * `applyOperation` is published too, so a page *could* be produced by walking
 * the operations that happen to work and skipping the ones that do not.
 *
 * It must not be. A tree assembled that way is a page that nobody will ever be
 * served under any answer the reviewer could give — the runtime applies a delta
 * atomically (0001), so a proposal that would be refused produces the page as it
 * is and nothing else. Drawing the half that lands would be inventing a state,
 * which is the same thing the progression is forbidden from doing between two
 * versions, for the same reason.
 *
 * So a proposal that would not apply has **no picture of an after**, and the
 * screen says why in the words `plainObstacle` already gives it. That is a worse
 * screen and a true one.
 *
 * ## Why the marks are ids rather than a rendered thing
 *
 * What a reviewer needs after the two pictures is *where to look*. A page has
 * forty parts and a change touches two of them, and the eye cannot find two
 * changed words in a band of body copy — which is the failure this whole screen
 * is about, arriving one level down.
 *
 * The marking is a set of node ids and a word for what each one is, and nothing
 * here renders anything. 0010 fixed that edit mode **decorates and never invents
 * DOM**, so the decoration is already in the markup: `data-loom-node` is on the
 * element, and one attribute beside it is the whole of a mark. That is exactly
 * how selection works on the page screen (`preview-surface.tsx`), and doing it
 * the same way means the outline over a proposal and the outline over a picked
 * part cannot drift apart into two overlays that disagree.
 *
 * **A mark can go unseen, and the sentences are the authority.** A text node
 * carries no element of its own, and a primitive the conformance probe could not
 * judge (0012) may turn out not to decorate. So the marks are an aid to the eye
 * and never the account of the change: the count of each kind comes off the
 * operations rather than off the picture, and `effect-view`'s sentences say what
 * would happen whether or not anything is outlined.
 */

/** What would become of one part. Four kinds, because there are four operations. */
export type MarkKind = "arriving" | "going" | "changed" | "moved"

export type Mark = {
  readonly nodeId: NodeId
  readonly kind: MarkKind
}

/**
 * Which mark survives when a change does two things to one part.
 *
 * A delta may configure a part and then remove it, or add one and then configure
 * it, and each of those is one piece of news rather than two. The strongest wins,
 * and strongest means *furthest from leaving the part as it is* — a part that
 * goes has gone whatever was done to it first, and a part that arrives is new
 * whatever was set on it afterwards.
 */
const STRENGTH: Readonly<Record<MarkKind, number>> = {
  going: 3,
  arriving: 2,
  moved: 1,
  changed: 0,
}

/**
 * The order the legend reads, which is the order a reviewer asks in.
 *
 * What is being taken away first: a deletion is the answer a reviewer most needs
 * to have seen before they press anything, and it is the one the palette's red is
 * spent on. Then what arrives, then the two that leave a part on the page.
 */
export const MARK_ORDER: readonly MarkKind[] = ["going", "arriving", "changed", "moved"]

const strongest = (marks: readonly Mark[]): readonly Mark[] => {
  const kept = new Map<NodeId, MarkKind>()

  for (const mark of marks) {
    const held = kept.get(mark.nodeId)

    if (held === undefined || STRENGTH[mark.kind] > STRENGTH[held]) kept.set(mark.nodeId, mark.kind)
  }

  return [...kept].map(([nodeId, kind]) => ({ nodeId, kind }))
}

/**
 * Every part an operation is about, and what would become of it.
 *
 * An insert's subject is the node the delta carries rather than one read out of a
 * tree, because it is not in either tree yet — it is in the proposal, which is
 * the mirror of a removal, whose only surviving account is the page it is still
 * on.
 */
const marksOf = (delta: TreeDelta): readonly Mark[] =>
  strongest(
    delta.operations.map((operation): Mark => {
      switch (operation.op) {
        case "insert":
          return { nodeId: operation.node.id, kind: "arriving" }
        case "remove":
          return { nodeId: operation.nodeId, kind: "going" }
        case "move":
          return { nodeId: operation.nodeId, kind: "moved" }
        case "configure":
          return { nodeId: operation.nodeId, kind: "changed" }
      }
    })
  )

/**
 * The marks that can actually be drawn on one of the two pictures.
 *
 * Two questions, and only one of them is about the change. **Is the part on this
 * page** — what goes is on the page as it stands and not on the page as it would
 * be, what arrives is the other way round, what is changed or moved is on both.
 * Rather than encode that as a rule per kind, which would be the same fact
 * written twice and able to disagree with itself, each side is filtered by
 * whether the tree has the part, which is the fact the rule is derived from.
 *
 * And **can this deployment put a ring round it**, which is `addressNode`'s
 * answer and not this module's. An outline is a style on an element, and two
 * kinds of part reach the page without one: the writing inside a part, which is
 * characters in somebody else's box, and a primitive that ignores
 * `loom.editable` (0012), which this host's own audit is the only thing that
 * knows about. Asking the browser for a ring on either is asking for a promise
 * the screen cannot keep — and the failure is not silence, it is worse than
 * silence: a reviewer told *one part is being taken away*, shown no red ring
 * anywhere, hunts for it and concludes the picture is broken.
 *
 * **`delegated` is refused along with `unaddressable`, and that is the decision
 * worth arguing.** `addressNode` will hand back the nearest ancestor that *is*
 * decorated, which is exactly right for a click — a reader pointing at a word
 * means the paragraph it is in. It is exactly wrong for a mark: ringing the card
 * because its heading's words are changing says the card is changing, and the
 * whole job of this ring is to say which part. A ring in the wrong place is worse
 * than no ring, because it is believed.
 */
const marksOn = (
  tree: LoomTree,
  marks: readonly Mark[],
  decorates: DecorationLookup
): readonly Mark[] =>
  marks.filter((mark) => addressNode(tree.root, mark.nodeId, decorates).outcome === "addressable")

/**
 * How a mark stands on whichever of the two pages holds its part.
 *
 * `null` for a part that is on neither — added and taken away by one change —
 * where there is nothing to say about a ring because there is nothing to draw
 * one on, on either picture.
 *
 * The page as it stands is asked first and the page as it would be second, which
 * is the order they are read in; a part on both gives the same answer to either,
 * because whether a primitive decorates is a property of this deployment rather
 * than of a version.
 */
const standingOf = (
  tree: LoomTree,
  after: LoomTree,
  decorates: DecorationLookup,
  nodeId: NodeId
): Addressing | null => {
  if (findNode(tree.root, nodeId) !== null) return addressNode(tree.root, nodeId, decorates)
  if (findNode(after.root, nodeId) !== null) return addressNode(after.root, nodeId, decorates)

  return null
}

/**
 * What the pictures cannot put a ring round, said rather than left as a gap.
 *
 * This is the sentence that makes the outlines trustworthy. Without it the legend
 * is a claim the pictures sometimes do not honour, and a reader has no way to
 * tell a ring they have not spotted from one that was never drawn. A change to
 * the words of a page is the commonest change there is, so it is not an edge
 * case: the screenshot that found this had a legend reading *taken away · one
 * part* over a picture with nothing outlined on it at all.
 *
 * Two sentences, because the two reasons suggest different things to do. Writing
 * is *visible* in both pictures and a reader can simply read it. A part this
 * deployment draws no handle on is not visible as a part at all, and the only
 * honest advice is the steps underneath.
 */
const notOutlined = (standings: readonly (Addressing | null)[]): string | null => {
  const reasons = standings.flatMap((standing) =>
    standing === null || standing.outcome === "addressable" ? [] : [standing.reason]
  )

  const words = reasons.filter((reason) => reason === "not-an-element").length
  const undrawn = reasons.length - words

  if (reasons.length === 0) return null

  const first =
    words === 0
      ? ""
      : words === 1
        ? "One of these is writing inside a part rather than a part of its own, so there is no ring to look for — the two pictures differ where it is."
        : `${words} of these are writing inside a part rather than parts of their own, so there are no rings to look for — the two pictures differ where they are.`

  const second =
    undrawn === 0
      ? ""
      : undrawn === 1
        ? "One of these is a kind of part this site draws without anything to point at, so it has no ring either — the steps below say what it is."
        : `${undrawn} of these are kinds of part this site draws without anything to point at, so they have no rings either — the steps below say what they are.`

  return [first, second].filter((sentence) => sentence !== "").join(" ")
}

/**
 * One row of the legend: what a color means, and how many parts wear it.
 *
 * A `PlainWord`, so the runtime's own name for the operation travels with the
 * plain one and the disclosure under the pictures can print it. The count comes
 * off the operations and not off the rendered page, for the reason in this
 * module's note: a part whose primitive does not decorate is still being added.
 */
export type MarkLegend = PlainWord & {
  readonly kind: MarkKind
  readonly parts: number
}

const LEGEND: Readonly<Record<MarkKind, PlainWord>> = {
  going: {
    label: "Taken away",
    meaning: "On your page now, and not on it afterwards.",
    technical: "remove",
  },
  arriving: {
    label: "New",
    meaning: "Not on your page yet. This is what would be added.",
    technical: "insert",
  },
  changed: {
    label: "Changed",
    meaning: "Stays where it is, with something about it different — its words, its size, its color.",
    technical: "configure",
  },
  moved: {
    label: "Moved",
    meaning: "The same part, somewhere else on the page.",
    technical: "move",
  },
}

/**
 * What the legend says, which is what the change does rather than what the
 * picture managed to outline.
 *
 * Only the kinds that occur, so a reviewer is never given a key to a color that
 * is not on either picture. Counted over the whole delta rather than per side: a
 * part that is taken away appears on one picture and is one deletion, and a
 * legend that counted per picture would say *1 taken away* beside the before and
 * *0 taken away* beside the after, which is arithmetic about pictures rather than
 * news about a change.
 */
export const legendFor = (marks: readonly Mark[]): readonly MarkLegend[] =>
  MARK_ORDER.flatMap((kind) => {
    const parts = marks.filter((mark) => mark.kind === kind).length

    return parts === 0 ? [] : [{ kind, parts, ...LEGEND[kind] }]
  })

export type ProposedDrawing =
  /**
   * The page as it would be, and where to look on both of them.
   *
   * `after` is a whole tree rather than a diff, because what is being shown is a
   * page and a page is the only thing that can be drawn. It is also why this is
   * a server's answer and not a browser's: two trees, rendered once each.
   */
  | {
      readonly kind: "drawn"
      readonly after: LoomTree
      readonly now: readonly Mark[]
      readonly would: readonly Mark[]
      readonly legend: readonly MarkLegend[]
      /**
       * That some of what the legend counts wears no ring, when some of it does
       * not. `null` on the ordinary change, so the line appears exactly when a
       * reader would otherwise be hunting for an outline that cannot exist.
       */
      readonly notOutlined: string | null
    }
  /**
   * The change would be refused as it stands, so there is no page to draw.
   *
   * `detail` is the runtime's own account, for the disclosure. What a reader is
   * told is `plainObstacle`'s, off the same reading the sentences come from —
   * this does not word the refusal a second time, because two modules wording one
   * refusal is how a screen comes to say two different things about it.
   */
  | { readonly kind: "cannot-draw"; readonly detail: string }

/**
 * `decorates` is this deployment's own audit of its primitives, handed in for the
 * reason `describeProposalEffect` takes a registry: which parts leave a handle in
 * the page is a fact about what this host registered, and a module that assumed
 * an answer would be describing somebody else's deployment.
 */
export const proposedDrawing = (
  tree: LoomTree,
  delta: TreeDelta,
  decorates: DecorationLookup
): ProposedDrawing => {
  const applied = applyDelta(tree, delta)

  if (!applied.ok) return { kind: "cannot-draw", detail: describeTreeError(applied.error) }

  const marks = marksOf(delta)
  const after = applied.value

  return {
    kind: "drawn",
    after,
    now: marksOn(tree, marks, decorates),
    would: marksOn(after, marks, decorates),
    legend: legendFor(marks),
    notOutlined: notOutlined(
      marks.map((mark) => standingOf(tree, after, decorates, mark.nodeId))
    ),
  }
}

/**
 * Where the screen that draws this proposal lives.
 *
 * Here rather than typed at each of the two places that link to it, for the
 * reason `page-views.ts` gives about the strip: a hand-built address is a link
 * that goes on resolving after the route it names has moved, and the two queues
 * that lead here — the front door's and the page's own — would move apart one
 * rename at a time. The page screen's reading-order test already forbids a
 * hand-built scoped link, and this is the function that makes keeping the rule
 * cheaper than breaking it.
 */
export const proposedHref = (treeId: TreeId, proposalId: ProposalId): string =>
  `/portal/pages/${treeId}/proposed/${proposalId}`
