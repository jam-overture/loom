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
   * the clinic's — and in the conditional for both moments where nothing has
   * happened yet, because the whole point of that frame is that it is still
   * the visitor's to refuse.
   *
   * The third moment is the exception and earns it: a change that has landed
   * is a thing that happened, so `KEPT_LEAD` is in the past tense. It is the
   * only sentence here making a claim about the page rather than about a
   * proposal, and the two refusals below are what keep it honest.
   */
  readonly lead: string
  /**
   * Which of the three moments this excerpt stands in, decided here rather
   * than where it is rendered.
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
   * The three callers already know. `partInQuestion` is called for a hold,
   * `partTheAskWouldTouch` for a press nobody has made, and
   * `partTheRecordKept` for a change that has landed, so the answer is the
   * function you are in rather than a prop somebody remembers to pass.
   *
   * `kept` is the one of the three a wide screen must draw, and for the
   * question's own reason read forwards: the question is exempt because the
   * band is ringed on the stage forty pixels away, and after a removal the
   * band is not on the stage at all.
   */
  readonly where: "question" | "ask" | "kept"
  /**
   * The same sentence in the imperative, for the one moment this excerpt
   * arrives **shut** — and present exactly when it does.
   *
   * On the arrival screen the band under the green button was the largest
   * thing a stranger met: 358px of a re-rendered stat grid, measured on a
   * production build at 1280×900 in an 857px scroller, against a rail whose
   * whole content is 1,277px. The four asks that carry the only evidence this
   * surface has that the governing is real — *GOES AHEAD*, *ASKS YOU FIRST*,
   * computed and printed per row — began at 797 and the screen ended at 857.
   * The claim was above the fold and its proof was three pixels under it.
   *
   * So the ask's excerpt is a disclosure, and this is what its control says.
   * **It is a field rather than a string typed into the markup** for the
   * reason `where` is one: it is derived from the same operation `lead` is
   * derived from, by the same function, so the words on the shut control and
   * the words inside it cannot come to describe different changes. A summary
   * reading *Show what would come off the page* over an excerpt of something
   * being **added** is a sentence no test would fail on and no type would
   * catch, and it is exactly the drift `WEIGHED_QUESTIONS` was made a shared
   * constant to prevent one surface up.
   *
   * **Its absence is how the other two moments say they are not folded.** A
   * question's excerpt stands open beside the two buttons it is waiting on,
   * and a kept excerpt is the only place on a wide screen the removed content
   * exists at all (`globals.css` argues both). Neither is a thing to put
   * behind a click, so neither gets one — and `part-in-question.tsx` branches
   * on this field rather than on `where`, which is what keeps a disclosure
   * from ever rendering with nothing to say on its control.
   */
  readonly invitation?: string
}

const LEADS: Readonly<Record<TreeOperation["op"], string>> = {
  insert: "This is what would be added.",
  remove: "This is what would come off the page.",
  move: "This is the part that would move.",
  configure: "This is the part that would change.",
}

/**
 * And the one sentence for the moment after — the same words in the tense the
 * change has earned, with the claim they are evidence for attached.
 *
 * It is `LEADS.remove` with *would come* in the past and one clause added.
 * Deliberately not a new voice: the visitor read that sentence under the button
 * before they pressed it, and the whole of what this moment adds is that it has
 * happened and the thing is still here.
 *
 * **One string rather than a table, because this moment is only ever reached
 * for one operation**, and `partFromOperations` is where that is made true. An
 * inverse that removes, moves or configures reads its subject out of the tree
 * on the stage, so its subject is by construction a thing the visitor can
 * already see — and the refusal that withdraws a spent undo refuses those in
 * the same line. An inverse that *inserts* carries its node, which is the only
 * case where drawing it is drawing something the record alone is holding.
 */
const KEPT_LEAD = "This is what came off the page. The record is still holding it."

/**
 * And the same four, in the imperative, for the control a shut excerpt wears.
 *
 * **One table and not a reworded copy of `LEADS`.** The two are read off the
 * same operation in the same return below, so the only way they can disagree
 * about what the excerpt is of is if somebody edits one of these tables and
 * not the other — which is a visible edit in a file of four lines, rather than
 * a string typed into a component three directories away that nothing will
 * ever compare against anything.
 *
 * **Imperative, and that is the whole difference.** `LEADS` is declarative
 * because it stands *over* the thing it names — *This is what would come off
 * the page*, with the band directly under it. A shut disclosure has nothing
 * under it, so the same words would be pointing at a gap. *Show what would
 * come off the page* is the same fact as an offer, which is what a control
 * has to be.
 *
 * No capital-letter vocabulary and no full stop: these are labels on a
 * control, and they are held to `in-question.test.ts`'s sweep over the words a
 * stranger has not earned yet exactly as the leads are.
 */
const INVITATIONS: Readonly<Record<TreeOperation["op"], string>> = {
  insert: "Show what would be added",
  remove: "Show what would come off the page",
  move: "Show the part that would move",
  configure: "Show the part that would change",
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
 * The refusals, each one a case where a preview would be worse than none.
 * Three of them are about any moment:
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
 *
 * And one is the `kept` moment's alone, because that moment makes a claim in
 * the past tense and the other two make theirs in the conditional:
 *
 * - **The tree already has the node.** It withdraws the excerpt the moment a
 *   visitor spends the undo, because the nodes come back with the ids they had
 *   (0032) — and it is also what keeps the sentence off an operation that
 *   could not have removed anything, since every operation but an insert reads
 *   its subject out of this tree.
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
   * **Kept draws a node the page does not have, or it draws nothing**, and
   * that one refusal is the whole of what keeps `KEPT_LEAD` honest.
   *
   * It does two jobs and they looked like two conditions. *This is what came
   * off the page* must not stand over something still on it — so once an undo
   * has landed and the nodes are back with the ids they had (0032), the
   * excerpt goes, with no flag and nothing to remember to clear. And the
   * sentence must not stand over an operation that could not have taken
   * anything off at all.
   *
   * **The second was written as its own `op !== "insert"` line and the defect
   * matrix caught it by nothing**, which is the useful kind of nothing: for
   * every operation but an insert, `subjectOf` is `findNode` against this very
   * tree, so a subject that exists is a subject the page has and this refusal
   * has already fired. A guard no restoration can make fail is a claim no test
   * can check, so it is gone and the reasoning is here instead.
   */
  if (where === "kept" && subject !== undefined && findNode(tree.root, subject.id) !== null) {
    return undefined
  }

  /*
   * Elements only. A slot is a named position rather than a thing on the page,
   * and a bare text node renders as a string with no ground under it — both
   * would be a preview of something a visitor cannot see the edges of.
   */
  if (subject === undefined || subject.kind !== "element") return undefined
  if (subject.id === tree.root.id) return undefined

  return {
    tree: { ...tree, root: subject },
    lead: where === "kept" ? KEPT_LEAD : LEADS[operation.op],
    where,
    /*
     * The ask's, and only the ask's. Both strings come off `operation.op` on
     * this one line, which is the property `invitation`'s own comment is for:
     * the control and the thing behind it are read from one operation by one
     * function, so a later edit cannot leave them describing different changes.
     */
    ...(where === "ask" ? { invitation: INVITATIONS[operation.op] } : {}),
  }
}
