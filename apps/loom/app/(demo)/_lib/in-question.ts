import { findNode, type LoomNode, type LoomTree, type TreeDelta, type TreeOperation } from "@jam-overture/loom"

/**
 * The part of the page a held change is about, as something that can be shown.
 *
 * The demo's whole argument is that a page is data, and the Gate's question is
 * the moment that argument pays. On a wide screen the two halves of that moment
 * are on screen at once: the question is in the rail and the band it is about is
 * ringed in amber on the stage, forty pixels of eye travel away.
 *
 * **Stacked, they are five screens apart.** Measured on the built page at
 * 390×844, pressing the primary ask puts *Apply this change* at y≈646 — under
 * the visitor's thumb, as it should be — and the band the question is about at
 * y≈4,620. `SpotlightScroll` declines to carry them there and is right to
 * (`spotlight-scroll.tsx` says why: it would carry them away from the two
 * buttons). So a stranger on a phone is asked, personally, to allow a change to
 * a part of a page they have never laid eyes on, and everything they are told
 * about it is a sentence naming a registered type: *Deletes the `loom.stat-grid`,
 * and the 3 pieces inside it.*
 *
 * The way back is not the answer here and neither is a third opinion about
 * scrolling. **A part of a page is data, so it can be brought to the question
 * instead** — rendered through the same registry, wearing the same theme,
 * showing the same words. That is not a picture of the band and not a
 * description of it. It is the band, rendered a second time, which is a thing
 * only a runtime that keeps the page as a tree can do at all.
 *
 * This module answers *which* node, and what is about to happen to it. Rendering
 * it is `part-in-question.tsx`'s, and the two are split for the reason
 * `proposal-effect` gives about itself: the mapping from "a delta and a tree" to
 * "the part a person is being asked about" is the part worth testing, and it
 * does not need React to be tested.
 */

/**
 * One part, ever.
 *
 * The same discipline `MAX_SPOTS` applies to the marks on the stage, for the
 * same reason and more strictly: three previews stacked inside a question is a
 * quiz. A delta with more operations than this has its whole account one click
 * down, unchanged — the preview is the plain half, and the plain half of six
 * operations is not six previews.
 */
const FIRST = 0

export type PartInQuestion = {
  /**
   * The part, as a tree that can be handed straight to `renderLoomTree`.
   *
   * It carries the treeId and the revision of the page it came out of, because
   * that is what it is: this page, at this revision, from this node down. It is
   * a value built to be rendered and is never stored, never committed and never
   * proposed against — nothing here mints an id or writes anything.
   */
  readonly tree: LoomTree
  /**
   * What is about to happen to it, in one sentence a stranger has already been
   * told everything they need for.
   *
   * Written in Loom's voice, because the rail is Loom's voice and the stage is
   * the clinic's — and deliberately in the conditional throughout: nothing here
   * has happened, and the whole point of the frame is that it is still the
   * visitor's to refuse.
   */
  readonly lead: string
  /**
   * Which of the two moments this excerpt stands in, decided here rather than
   * where it is rendered.
   *
   * **It is a field because the alternative put the decision in `page.tsx`.**
   * The moment governs two rules in `globals.css` — whether a wide screen draws
   * the excerpt at all, and how tall its window is — and the first of those is
   * `display: none`. A `where="question"` typed by habit on the ask's callback
   * hides the excerpt at exactly the width this surface is judged at, and
   * `page.tsx` is an `async` Server Component that no `vitest` run can reach:
   * the whole suite passes, the build is green, and the arrival screen is back
   * to a button naming a band nobody can see. That is the sixth row of the
   * table `rail.ts` opens with, and it was measured on this run rather than
   * imagined — the defect was restored and **caught by nothing.**
   *
   * The two callers already know. `partInQuestion` is called for a hold and
   * `partTheAskWouldTouch` for a press nobody has made, so the answer is the
   * function you are in rather than a prop somebody remembers to pass.
   */
  readonly where: "question" | "ask"
}

const LEADS: Readonly<Record<TreeOperation["op"], string>> = {
  insert: "This is what would be added.",
  remove: "This is what would come off the page.",
  move: "This is the part that would move.",
  configure: "This is the part that would change.",
}

/**
 * The node an operation is about, read against the tree on the stage — except
 * for an insert, whose node is in the delta because it is not on the page yet.
 *
 * That asymmetry is the delta model's rather than this file's (0001), and it is
 * the reason a preview is worth building at all: an insert is the one change
 * whose subject cannot be pointed at, so the only way to show it is to render
 * what the proposal is carrying.
 */
const subjectOf = (tree: LoomTree, operation: TreeOperation): LoomNode | undefined =>
  operation.op === "insert" ? operation.node : (findNode(tree.root, operation.nodeId) ?? undefined)

/**
 * The part a held proposal is asking about, or nothing.
 *
 * A delta's operations, read by `partFromOperations` below, which is where the
 * three refusals live.
 */
export const partInQuestion = (tree: LoomTree, delta: TreeDelta): PartInQuestion | undefined =>
  partFromOperations(tree, delta.operations, "question")

/**
 * The same reading, from the operations alone — and nothing, in three cases.
 *
 * **It takes operations because a delta is not the only thing that has them.**
 * A preset plans against the tree (0057), and the plan is a list of operations
 * before it is a proposal, before it is a hold, and before anything has been
 * pressed — so the part a visitor is *about to* ask about is read exactly the
 * way the part they *have* asked about already was, out of this function.
 * `before-the-press.ts` is that caller. The alternative was a second copy of
 * this walk, free to disagree with the first about which node an operation
 * names.
 *
 * The lead sentences carry over unchanged and that is not luck: every one of
 * them is already in the conditional — *would come off*, *would be added* —
 * because a question is a thing that has not happened. Neither has an ask
 * nobody has pressed.
 *
 * The three cases, each one where a preview would be worse than none:
 *
 * - **The operation names the page itself.** The demo's re-theme is exactly
 *   this — one configure against the root — and an excerpt of the root is the
 *   whole page, rendered a second time inside the rail beside it. What answers
 *   "did something happen?" for that change is the page turning over, which is
 *   what `spotlight.ts` already says about marking it.
 * - **The operation names a node this tree does not have.** A stale proposal is
 *   a real state and the card already reports it, in the portal's own words,
 *   under *What this would do to your page*. A preview cannot improve on "that
 *   part isn't on this page any more" and would have nothing to draw.
 * - **There are no operations**, which no interpreter should produce and
 *   nothing downstream should assume it cannot.
 */
export const partFromOperations = (
  tree: LoomTree,
  operations: readonly TreeOperation[],
  where: PartInQuestion["where"]
): PartInQuestion | undefined => {
  const operation = operations[FIRST]
  if (operation === undefined) return undefined

  const subject = subjectOf(tree, operation)

  /*
   * Elements only. A slot is a named position rather than a thing on the page,
   * and a bare text node renders as a string with no ground under it — both
   * would be a preview of something a visitor cannot see the edges of.
   */
  if (subject === undefined || subject.kind !== "element") return undefined
  if (subject.id === tree.root.id) return undefined

  return { tree: { ...tree, root: subject }, lead: LEADS[operation.op], where }
}
