import { childrenOf, findNode, type LoomNode, type LoomTree, type NodeId } from "@loom/runtime"
import { LOOM_NODE_ATTRIBUTE } from "@loom/runtime/react"

import type { PlainChange } from "./plain-change"
import type { ChangeRecord } from "./record"
import type { TouchedNode, TouchKind } from "./touched"

/**
 * Where to look on the page, and what to call what happened there.
 *
 * This is the answer to the last thing the demo could not do. A visitor pressed
 * *Remove the stats*, four hundred pixels of page they could not see changed,
 * and the only account of it was a sentence in the rail and a node id behind a
 * disclosure. Three of the five presets act below the fold; two of them are the
 * ones the Gate holds, which is the most interesting thing this surface has to
 * show. The record said what moved. The page said nothing.
 *
 * So the change gets marked *where it happened*, in the same colour the card in
 * the rail is wearing — green for a change that landed, amber for one waiting on
 * an answer. The colour is the whole link between the two halves of the screen:
 * a visitor who reads "Waiting on you" on an amber badge and sees one amber ring
 * on the page has been told which band the question is about without a word of
 * explanation.
 *
 * **It is drawn as a stylesheet rather than by a script**, for the reason the
 * runtime gives for never wrapping a node: the mark must not change what the
 * page is. A rule keyed on `data-loom-node` — the attribute edit mode already
 * puts on every primitive's own root — decorates without restructuring, works
 * before React hydrates, and disappears completely when there is nothing to say.
 * The one thing that genuinely needs a script is scrolling to it.
 */

/** Green for a change that landed, amber for one waiting on an answer. */
export type SpotTone = "applied" | "awaiting"

/**
 * The mark's two colours, and they are `globals.css`'s outcome tints rather than
 * two colours picked here — `spotlight.test.ts` holds them against that file, so
 * a run that retunes the badge on the card cannot leave the ring on the page
 * wearing last month's green.
 *
 * Literals rather than `var(--outcome-applied-text)`, and this is the same rule
 * the stage itself follows: these rules are served *inside* the stage, where the
 * tree carries its own theme (0050) and a visitor can re-theme it with one click.
 * A mark that read a chrome variable would be a mark the demo's own first preset
 * could repaint.
 */
export const SPOT_COLOURS: Readonly<Record<SpotTone, { readonly edge: string; readonly fill: string; readonly ink: string }>> = {
  applied: { edge: "#1f985e", fill: "#72e3ad", ink: "#0a0a0a" },
  awaiting: { edge: "#a97b16", fill: "#f0c674", ink: "#0a0a0a" },
}

/**
 * Whether the chip belongs on the marked band or beside it.
 *
 * `inside` is a mark *on a thing* — the band the chip names is the band the
 * change is about, so the chip sits in its corner. `above` and `below` are marks
 * on a *place*: the node the change is about is not in this tree at all, the
 * band carrying the mark is only its neighbour, and what the chip is pointing at
 * is the seam between them.
 *
 * The distinction is not decoration. A chip drawn in the corner of a band that
 * did not change lands on that band's own words — on the specimen page it lands
 * squarely on the second line of the testimonial — and says "something was
 * removed here" over a sentence that is plainly still there.
 */
export type SpotPlacement = "inside" | "above" | "below"

/**
 * What the mark is *about*, which is not the same as where it is drawn.
 *
 * `node` is a mark on a thing: the band carrying it is the band that changed, so
 * the mark may say *this*, and a ring around it is true. `place` is a mark on a
 * space: the node the change is about is not in this tree at all, the band
 * carrying the mark is only the nearest thing the DOM gives us to hang it on,
 * and the mark may only say *here*.
 *
 * `placed` inside `spotFor` has drawn this distinction in the label since the
 * first version of this file — *"This was removed"* against *"Something was
 * removed here"*. It is a field because the **geometry** needs it too, and for
 * one run it did not have it: a `place` mark drew the same ring as a `node` one,
 * so the demo's payoff — press *Take the numbers off*, say yes, get carried to
 * the change — ended on a green ring around a patient's testimonial, which is
 * plainly still there, over a chip reading *Something was removed here*. The
 * chip pointed at the gap and the ring pointed at a bystander.
 *
 * The rule this establishes, and it is the one a future run should not have to
 * rediscover: **a ring is a claim about the thing inside it.** Only a mark whose
 * subject is a node may draw one.
 */
export type SpotSubject = "node" | "place"

export type Spotlight = {
  /** A node that is in the tree on the stage, so the DOM has somewhere to draw. */
  readonly nodeId: NodeId
  readonly tone: SpotTone
  readonly label: string
  readonly placement: SpotPlacement
  readonly subject: SpotSubject
}

/**
 * How many marks one change may draw.
 *
 * A delta of nine configures would otherwise ring nine bands at once, which says
 * "everything changed" — the one thing a mark exists to disprove. Past this the
 * change is broad enough that the page itself is the evidence.
 */
export const MAX_SPOTS = 3

/**
 * What to call it when the change is putting something back.
 *
 * **This is the demo's own claim, and the page was contradicting it.** An undo
 * is a change of its own (0032) and its operations are ordinary ones — the
 * inverse of a `remove` is an `insert` — so every label below was reached
 * through the `added` branch and the restored numbers band was marked **New —
 * just added**. Three inches away, on the card that produced it, the record said
 * the opposite in two places: *"the 4 pieces it takes off the page are kept, so
 * the exact opposite of this change already exists"*, and the interpreter's own
 * rationale, *"undoing this restores every node with the id it had"*.
 *
 * That is not a wording nit. *The same nodes come back, not new ones* is the
 * single thing that distinguishes Loom's undo from a rewind, it is the last
 * thing a visitor is shown before they leave, and the chip on the band was
 * telling them a fresh one had been inserted.
 *
 * So a restoring change says **back** wherever an ordinary one says *new*. The
 * two tables are separate rather than one table with a prefix, because the
 * sentences are not the same sentence: an undo of an *insert* takes something
 * off, and calling that "removed" would lose the half that matters — that what
 * went is the thing this visitor had just added.
 */
const restoringLabel = (kind: TouchKind, tone: SpotTone, placed: "node" | "near"): string => {
  if (tone === "awaiting") {
    switch (kind) {
      case "added":
        return placed === "near" ? "What was here would come back" : "This would come back"
      case "removed":
        return placed === "near" ? "What was added here would go" : "This would go back off"
      case "moved":
        return "This would move back"
      case "changed":
        return "This would change back"
    }
  }

  switch (kind) {
    case "added":
      return placed === "near" ? "What was here is back" : "Back — exactly as it was"
    case "removed":
      return placed === "near" ? "What was added here has gone" : "Taken back off"
    case "moved":
      return "Moved back"
    case "changed":
      return "Changed back"
  }
}

/**
 * What to call it, in the fewest words that survive being read at a glance.
 *
 * `placed` is the difference between pointing at the thing and pointing at where
 * the thing is not. A removed node has left the tree and an added one has not
 * arrived yet, so both are marked on a neighbour — and a chip reading "Removed"
 * on a band that is still there would be a lie the size of the whole surface.
 *
 * `restoring` is the difference between a thing arriving and a thing coming
 * back, and it cannot be read off the operation: both are an `insert`. It is the
 * runtime's `REVERT_INTERPRETER` stamp, read through `undo.ts`, which is the
 * same source the card's own quotation uses.
 *
 * `quoting` is what the gap is missing, and it is read only when `placed` is
 * `near`. `quote` below says why it is a suffix on these sentences rather than
 * eight sentences of its own, and why a mark on a node never takes one.
 *
 * Exported so the share card can draw the chip the page draws rather than a
 * sentence somebody typed into a picture. A shared link is the one place this
 * surface's words are read by people who have not seen the surface, so a chip
 * invented there would be the only copy on this project nothing could correct.
 */
export const labelFor = (
  kind: TouchKind,
  tone: SpotTone,
  placed: "node" | "near",
  restoring: boolean,
  quoting?: Pick<PlainChange, "words" | "more">
): string => quote(stem(kind, tone, placed, restoring), placed, quoting)

/**
 * The words the gap is missing, joined onto the sentence that names the event.
 *
 * **The sentence is not rewritten and could not be.** *"Something was removed
 * here"* is the only thing true of a change with no words in it — an image, a
 * divider, a band whose every string is a setting — so it stays the stem and
 * the quotation is what is added when there is one. A table of eight
 * alternative sentences with the words folded into each would have two ways of
 * saying one thing and a silent wrong answer waiting in whichever a run forgot
 * to update.
 *
 * **Only a mark on a gap quotes anything**, and that is the point rather than a
 * limit. A mark on a node is drawn round the thing it is about, with every word
 * of it on the screen inside the ring; quoting there would be this surface
 * reading a band aloud to somebody looking straight at it. A mark on a gap has
 * nothing in it, and until now said so.
 *
 * The quotation is the card's, to the character: same three words, same cut,
 * same *and N more*, because `wordsOfNode` is the function the card's own line
 * is built with. A stranger sees the two within one glance of each other.
 */
const quote = (
  sentence: string,
  placed: "node" | "near",
  quoting: Pick<PlainChange, "words" | "more"> | undefined
): string => {
  if (placed === "node" || quoting === undefined || quoting.words.length === 0) return sentence

  const said = quoting.words.map((word) => `“${word}”`).join(" ")
  const rest = quoting.more > 0 ? ` and ${quoting.more} more` : ""

  return `${sentence}: ${said}${rest}`
}

const stem = (
  kind: TouchKind,
  tone: SpotTone,
  placed: "node" | "near",
  restoring: boolean
): string => {
  if (restoring) return restoringLabel(kind, tone, placed)

  if (tone === "awaiting") {
    switch (kind) {
      case "added":
        return placed === "near" ? "Something new would go here" : "This would be added"
      case "removed":
        return placed === "near" ? "Something here would go" : "This would be removed"
      case "moved":
        return "This would move"
      case "changed":
        return "This would change"
    }
  }

  switch (kind) {
    case "added":
      return placed === "near" ? "Something was added here" : "New — just added"
    case "removed":
      return placed === "near" ? "Something was removed here" : "This was removed"
    case "moved":
      return "Moved here"
    case "changed":
      return "Just changed"
  }
}

/** Only an element carries `data-loom-node`; a slot and a text node render as nothing of their own. */
const elementInTree = (tree: LoomTree, nodeId: NodeId | undefined): LoomNode | undefined => {
  if (nodeId === undefined) return undefined
  const found = findNode(tree.root, nodeId)

  return found?.kind === "element" ? found : undefined
}

/**
 * The band beside the gap, and **which side of it the chip goes**.
 *
 * A node that is not in this tree has one thing left: a position among its
 * parent's children. That position has a band on either side of it, and the two
 * of them name the same seam from opposite sides — so the answer is a band to
 * carry the mark plus the side of it the missing node's space is on. A chip put
 * on the wrong side is pointing at a stretch of page where nothing happened, by
 * the height of a whole band.
 *
 * Where there is a band on both sides there is a seam *between* them, which is
 * space the page has already set aside and the chip can be drawn in. Where there
 * is only one — the position is the top of the parent, or its end — there is no
 * such space: above the first band is the edge of the stage, which cannot be
 * scrolled to and which a clipping primitive would cut off anyway. There the
 * chip goes back in the corner, which is imprecise and legible rather than exact
 * and invisible.
 *
 * The walk is over every child rather than over the elements alone, because
 * `index` counts a parent's children and a slot or a text node is one of them.
 * Only an element can carry the mark, so the search steps outward from the
 * position to the first element on each side.
 */
const neighbourOf = (
  tree: LoomTree,
  touched: TouchedNode
): { readonly node: LoomNode; readonly placement: SpotPlacement } | undefined => {
  const parent = elementInTree(tree, touched.parentId)
  if (parent === undefined) return undefined

  const children = childrenOf(parent)
  const at = Math.max(touched.index ?? children.length, 0)

  const under = children.slice(at).find((child) => child.kind === "element")
  const over = children
    .slice(0, at)
    .reverse()
    .find((child) => child.kind === "element")

  if (under) return { node: under, placement: over ? "above" : "inside" }

  /*
   * Nothing stands at the position any more, so the band before it is the
   * nearest thing to the gap and the gap is under it. A parent whose children
   * have all gone has neither, and marking the parent would ring a container
   * rather than a place.
   */
  return over ? { node: over, placement: "below" } : undefined
}

const spotFor = (
  tree: LoomTree,
  touched: TouchedNode,
  tone: SpotTone,
  restoring: boolean
): Spotlight | undefined => {
  /*
   * The root is never marked. A change to the page node is a change to
   * everything on the page — the re-theme is exactly this — and a ring around
   * the whole stage points at nothing. What answers "did anything happen?" for
   * that change is the page itself turning over.
   */
  const own = touched.nodeId === tree.root.id ? undefined : elementInTree(tree, touched.nodeId)

  if (own) {
    return {
      nodeId: own.id,
      tone,
      label: labelFor(touched.kind, tone, "node", restoring),
      placement: "inside",
      subject: "node",
    }
  }

  const near = neighbourOf(tree, touched)
  if (near === undefined || near.node.id === tree.root.id) return undefined

  return {
    nodeId: near.node.id,
    tone,
    /*
     * The words travel from the operation that left the gap, not from the
     * change. A change with two operations in it takes two different things off
     * two different parts of the page, and a mark quoting the change's whole
     * list would be naming, in one gap, words that went from another.
     */
    label: labelFor(touched.kind, tone, "near", restoring, touched.words),
    placement: near.placement,
    subject: "place",
  }
}

/** One change to be marked: what it touched, in what colour, and which way round. */
export type SpotlightRequest = {
  readonly touched: readonly TouchedNode[]
  readonly tone: SpotTone
  /** Whether this change is putting something back rather than doing it. */
  readonly restoring: boolean
}

/**
 * The marks for several changes at once, **and the budget is the page's rather
 * than each change's**.
 *
 * A visitor may have two questions open at the same time — five buttons and
 * nothing telling them to answer one at a time — and until now the page marked
 * one of them. The newest won, silently, so a stranger who pressed *Take the
 * numbers off* and then *Add the opening hours* was looking at a page marked for
 * the second while the first sat unmarked underneath it, both cards reading
 * *Waiting on you*, and one line above them saying *"the page is marked where
 * **this** would happen"* about neither in particular.
 *
 * `MAX_SPOTS` is why this cannot be a loop over `spotlightsFor`. Three is the
 * point past which a marked page stops saying *this changed* and starts saying
 * *everything changed*, and that is a fact about **the page**, not about one
 * delta: two changes drawing three marks each is the quiz the cap exists to
 * prevent, however well each of them behaved on its own.
 *
 * So the rounds are the rule: **every change gets its first mark before any
 * change gets a second**. A page with two open questions marks both, and the
 * change with nine configures in it cannot take the whole budget and leave the
 * other one invisible.
 *
 * One list per request, in the order asked, so a caller can tell which marks
 * belong to which change — a change whose only node is already marked by an
 * earlier one gets an empty list, which is the truthful answer and the thing a
 * card must not contradict.
 */
export const spotlightsAcross = (
  tree: LoomTree,
  requests: readonly SpotlightRequest[]
): readonly (readonly Spotlight[])[] => {
  /** Everything each change could mark, in the order its operations named it. */
  const queues = requests.map((request) =>
    request.touched.flatMap((one) => spotFor(tree, one, request.tone, request.restoring) ?? [])
  )

  const taken = new Set<string>()
  const drawn: Spotlight[][] = requests.map(() => [])

  for (let round = 0; round < MAX_SPOTS; round += 1) {
    for (const [index, queue] of queues.entries()) {
      if (taken.size >= MAX_SPOTS) return drawn

      const into = drawn[index]
      if (into === undefined) continue

      /*
       * Past every node already marked — by an earlier round of this change,
       * which is what keeps one node from wearing two chips, or by a change
       * earlier in this one, which is what keeps two changes from claiming the
       * same band and lets the second fall through to its next.
       */
      let spot = queue.shift()
      while (spot !== undefined && taken.has(spot.nodeId)) spot = queue.shift()
      if (spot === undefined) continue

      taken.add(spot.nodeId)
      into.push(spot)
    }
  }

  return drawn
}

/**
 * Which nodes on this tree to mark for one change.
 *
 * Read against the tree the visitor is looking at, which is what makes one
 * function serve both halves: for a change that applied, the tree is the result
 * and the marks land on what moved; for one still waiting, the tree is what it
 * would move and the marks land on what it is asking about.
 *
 * `restoring` is a fact about the *change*, not about any one operation, which
 * is why it is a parameter here rather than something `touched.ts` could put on
 * a `TouchedNode`: the delta of an undo is indistinguishable from the delta of
 * any other change, and the only thing that knows otherwise is the record's
 * provenance. Defaulted, because a caller with no record in hand is describing
 * an ordinary change and should not have to say so.
 */
export const spotlightsFor = (
  tree: LoomTree,
  touched: readonly TouchedNode[],
  tone: SpotTone,
  restoring = false
): readonly Spotlight[] => spotlightsAcross(tree, [{ touched, tone, restoring }])[0] ?? []

export type SpotlitChange = { readonly record: ChangeRecord; readonly tone: SpotTone }

/**
 * Which of a visitor's changes the page is currently about.
 *
 * **Every question still waiting on an answer**, newest first, because each of
 * them is asking the visitor for something and a page that marks one of two open
 * questions has silently chosen for them. It used to return exactly one, and the
 * reason given was that *"two marks in two colours on one page is a quiz rather
 * than an explanation"*. That reasoning is about two **colours** — a green mark
 * saying *this landed* beside an amber one saying *this is waiting* asks a
 * stranger to hold two ideas at once — and it still stands. Two marks in the
 * same colour, both amber, both saying *this would happen if you say yes*, are
 * not a quiz: they are two questions, marked, which is what the rail says there
 * are.
 *
 * So the tones never mix. Either the page is asking, and every open question is
 * marked in amber; or it is not, and the one change that produced *the revision
 * now on the stage* is marked in green — a stricter test than "the most recent
 * record", and deliberately: answering a hold completes that record where it was
 * asked, so a rail read newest-first would mark the wrong one at exactly the
 * moment a visitor is watching.
 *
 * Everything else — refused, discarded, never interpreted — marks nothing,
 * because nothing on the page moved.
 *
 * **`movedOn` is the exception to "a hold is marked", and it is not a
 * preference.** A hold whose page has moved under it can never apply
 * (`_lib/moved.ts`), so ringing the page amber and labelling it *This would be
 * removed* promises a visitor something that will not happen — on the very band
 * they are looking at, in the tone this surface reserves for a question it is
 * still asking them. It is not asking. Those fall out here, and where they were
 * the only holds the mark falls through to the change actually on the stage.
 *
 * Passed in rather than read here, because a record does not carry the revision
 * its hold was judged against — `HeldProposal.baseRevision` does, and only the
 * page has the holds and the tree in hand together.
 */
export const spotlitChanges = (
  records: readonly ChangeRecord[],
  tree: LoomTree,
  movedOn: ReadonlySet<string> = new Set()
): readonly SpotlitChange[] => {
  const waiting = records.filter(
    (record) => record.outcome === "awaiting-you" && !movedOn.has(record.recordId)
  )
  if (waiting.length > 0) return waiting.map((record) => ({ record, tone: "awaiting" }))

  const onTheStage = records.find(
    (record) => record.outcome === "applied" && record.revision?.produced === tree.revision
  )

  return onTheStage ? [{ record: onTheStage, tone: "applied" }] : []
}

const cssString = (value: string): string => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`

/**
 * Whether this mark has a gap of its own to be drawn in.
 *
 * A `place` mark normally has one on the side its `placement` names. The one
 * exception is the position at the very top of a parent, which `neighbourOf`
 * reports as `inside`: above the first band is the edge of the stage, which
 * cannot be scrolled to and which a clipping primitive would cut off anyway. A
 * mark there goes back in the corner — imprecise and legible, rather than exact
 * and invisible — and it still draws no ring, because the band under it did not
 * change either way.
 */
const inTheGap = (spot: Spotlight): boolean =>
  spot.subject === "place" && spot.placement !== "inside"

/**
 * Where the mark is drawn, given what it is about.
 *
 * **A mark on a band sits wholly inside its top-right corner**, and both halves
 * of that are corrections rather than preferences. *Inside*, because a primitive
 * may clip its own overflow — `loom.hero` does, for its backdrop — so anything
 * drawn outside the box is cut in half on exactly the band a visitor was just
 * carried to. *Right*, because a band's first words are at its left: on the stat
 * grid a left chip lands on the first figure, and a mark that covers what it is
 * pointing at has undone itself.
 *
 * **A mark on a gap is drawn across the whole gap**, outside the neighbour's
 * box. The thing being pointed at is the empty space where a band was or is
 * about to be, and that space is as wide as the page's content column, so the
 * mark is too: a bar the width of the seam, with its words in it.
 *
 * That width is what lets the ring go. A corner chip needs something ringed to
 * say *which* band it is beside; a bar lying across the seam is already lying
 * where the change is, and the band under it is left alone.
 *
 * **The 10px is the difference between a mark on the gap and a header on the
 * band below it.** The chip that preceded the bar sat 5px off the band, which
 * was right for something an inch wide in a corner and wrong the moment it ran
 * the whole width: flush against the band's top edge, the two read as one
 * object, and a bar saying *something was removed here* that looks like part of
 * the testimonial is the defect this unit exists to remove, said more quietly.
 * The two seams the demo's own changes mark measure about 90px and 120px, so ten
 * is air rather than risk — and it is `margin` rather than `inset` alone so the
 * bar and the band never touch at any zoom.
 */
const markPosition = (spot: Spotlight): string => {
  if (!inTheGap(spot)) return "inset: 6px 6px auto auto;\n  margin: 0;"

  return spot.placement === "above"
    ? "inset: auto 0 100% 0;\n  margin: 0 0 10px 0;"
    : "inset: 100% 0 auto 0;\n  margin: 10px 0 0 0;"
}

/**
 * A band carrying a bar in the gap *below* it overlaps the band that follows,
 * which paints later and would cover the bar if it has a ground of its own.
 * Raising the marked band one step fixes the order without moving anything: it
 * is already `position: relative` for the bar's sake, and a page whose bands do
 * not overlap cannot tell the difference.
 *
 * Only where it is needed. A bar in the gap *above* overlaps the band before it,
 * which has already painted.
 */
const stackingFor = (spot: Spotlight): string =>
  inTheGap(spot) && spot.placement === "below" ? "\n  z-index: 1;" : ""

/**
 * Whether the mark's words may take a second line.
 *
 * **A chip in a corner may not and a bar in a gap must.** The chip is sized by
 * its own text and positioned against a corner, so wrapping it would grow a
 * floating box inward over the band it is sitting on; `nowrap` is what keeps it
 * an inch wide in the corner it was put in.
 *
 * The bar is the opposite object: its width is the page's content column,
 * decided by the band under it rather than by what it says, and it is now
 * carrying a quotation whose length is whatever three of the page's own words
 * happen to be. Held at `nowrap` a long one runs off the end of the column and
 * takes the document's scroll width with it — a mark describing the page by
 * widening it, which is the one thing every rule in this file is written to
 * avoid. Allowed to wrap it grows *upward* into a seam the page had already set
 * aside: the two the demo's own changes mark measure about 90px and 120px, and
 * two lines of an 11px mark is about 34.
 */
const wrappingFor = (spot: Spotlight): string =>
  inTheGap(spot) ? "normal" : "nowrap"

/**
 * The ring, and **only for a mark whose subject is the node it is drawn on.**
 *
 * `outline` rather than `border`, because an outline takes no space and a border
 * would move the page it is describing.
 *
 * `border-radius` travels with the ring for the same reason it is here at all:
 * it exists to round the outline, and on an unringed band it would round corners
 * the page did not ask to have rounded — the mark changing the page it is
 * describing, in the one property `outline` was chosen to avoid.
 */
const ringFor = (spot: Spotlight, colour: (typeof SPOT_COLOURS)[SpotTone]): string =>
  spot.subject === "node"
    ? `\n  outline: 2px solid ${colour.edge};\n  outline-offset: -1px;\n  border-radius: 4px;`
    : ""

/**
 * The mark, as rules.
 *
 * It names its own font, because it is Loom speaking inside a page wearing
 * somebody else's typeface — and `border-radius` is set on the mark itself
 * rather than inherited, because the bar in a gap and the chip in a corner are
 * the same object seen at two widths.
 */
export const spotlightCss = (spots: readonly Spotlight[]): string =>
  spots
    .map((spot) => {
      const colour = SPOT_COLOURS[spot.tone]
      const selector = `[${LOOM_NODE_ATTRIBUTE}=${cssString(spot.nodeId)}]`

      return `
${selector} {
  position: relative;${ringFor(spot, colour)}
  scroll-margin: 4rem;${stackingFor(spot)}
}
${selector}::after {
  content: ${cssString(spot.label)};
  position: absolute;
  ${markPosition(spot)}
  transform: none;
  z-index: 5;
  padding: 4px 8px;
  border-radius: 4px;
  background: ${colour.fill};
  color: ${colour.ink};
  font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  font-size: 11px;
  font-weight: 500;
  font-style: normal;
  line-height: 1.2;
  letter-spacing: 0;
  text-align: left;
  text-transform: none;
  white-space: ${wrappingFor(spot)};
  pointer-events: none;
}`.trim()
    })
    .join("\n")
