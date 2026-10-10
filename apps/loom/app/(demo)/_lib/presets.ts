import {
  buildElement,
  buildSlot,
  buildText,
  err,
  ok,
  type ChangeInterpreter,
  type Clock,
  type ElementNode,
  type IdFactory,
  type JsonObject,
  type LoomNode,
  type LoomTree,
  type TreeOperation,
} from "@jam-overture/loom"

import { DEMO_ALTERNATE_THEME, DEMO_STARTING_THEME, DEMO_THEME_NODE_PROP } from "./page-tree"
import type { ChangeRecord } from "./record"

/**
 * The changes the demo can make without a model.
 *
 * Every one of them is a real intent through the real pipeline: interpreted,
 * assessed, gated, applied, logged and revertable. What is missing is only the
 * guess — the operations are computed from the tree rather than produced by a
 * model, so they always apply and always mean what the button says.
 *
 * That is not a shortcut around the interesting part. The interesting part is
 * what happens *after* a delta exists, and a demo that could only show it when
 * a key was configured would show nothing on a deployment without one. It is
 * also the pattern `revertInterpreter` already established: interpretation is
 * the non-deterministic *seam* (0005), not necessarily a non-deterministic act,
 * and everything downstream cannot tell the difference.
 *
 * The provenance says so plainly. `authoredBy: "runtime"` and `confidence: 1`,
 * because these are computed rather than guessed, and a 1 nobody graded would
 * otherwise walk into calibration as a model's perfect record (0031).
 */

export const PRESET_INTERPRETER = "loom/demo-preset"

export type DemoPresetId = "palette" | "backdrop" | "band" | "trim" | "promote"

export type DemoPreset = {
  readonly id: DemoPresetId
  /** What a person would have typed. It is the intent's utterance, verbatim. */
  readonly utterance: string
  /** The chip's label — shorter than the utterance, and never a different claim. */
  readonly label: string
  /**
   * What a visitor will *see*, in one clause, before they press it.
   *
   * Deliberately about the page and never about the verdict. Whether the Gate
   * applies a change or holds it is computed from the tree at assessment time,
   * so a label promising "this one will be held" would be a surface predicting
   * a decision it does not make — and would be wrong the first time the policy
   * or the page moved. What is safe to promise is the movement itself, because
   * `plan` is what produces it and it is right here.
   */
  readonly promise: string
  /** The interpreter's own words about why these operations answer that. */
  readonly rationale: string
  /**
   * The operations, or `undefined` when this tree gives the preset nothing to
   * do. Absence is how the surface knows not to offer it, which is better than
   * offering a button whose only outcome is "nothing changed".
   */
  readonly plan: (tree: LoomTree, ids: IdFactory) => readonly TreeOperation[] | undefined
}

/**
 * Every element under a node, this one first.
 *
 * Exported because `share.ts` needs the same walk to read the page's own
 * headline off the tree, and a second copy of four lines is how two readings of
 * one page come to disagree about what is on it.
 */
export const elementsOf = (node: LoomNode): readonly ElementNode[] => {
  if (node.kind === "text") return []
  const here = node.kind === "element" ? [node] : []

  return [...here, ...node.children.flatMap(elementsOf)]
}

/** The first element of a type, in document order. */
export const firstOfType = (tree: LoomTree, type: string): ElementNode | undefined =>
  elementsOf(tree.root).find((element) => element.type === type)

/** Only the root's own children can be reordered as page bands. */
const bandIndexOf = (tree: LoomTree, type: string): number =>
  tree.root.children.findIndex((child) => child.kind === "element" && child.type === type)

const themeOf = (tree: LoomTree): JsonObject | undefined => {
  const value = tree.root.props[DEMO_THEME_NODE_PROP]

  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : undefined
}

/**
 * Three ids on the root, swapped for three others (0049). The whole page
 * changes and not one primitive is touched, which is the clearest thing the
 * theme model has to show — so it is the first chip.
 */
const palette: DemoPreset = {
  id: "palette",
  utterance: "Switch this page to the other palette.",
  label: "Re-theme the whole page",
  promise: "Every colour and typeface on the page changes at once.",
  rationale:
    "A theme is three registered ids on the root node, so switching palette is one configure against one node. Nothing below the root is touched, and no primitive names a colour.",
  plan: (tree) => {
    const current = themeOf(tree)
    const next = current?.["palette"] === DEMO_ALTERNATE_THEME["palette"] ? DEMO_STARTING_THEME : DEMO_ALTERNATE_THEME

    return [{ op: "configure", nodeId: tree.root.id, set: { [DEMO_THEME_NODE_PROP]: next }, unset: [] }]
  },
}

/**
 * An enum that changes what is painted, not a canvas the tree paints on. The
 * animation stays in the registered component either way (0055).
 */
const backdrop: DemoPreset = {
  id: "backdrop",
  utterance: "Repaint the band at the top.",
  label: "Repaint the top band",
  promise: "The band behind the headline repaints. Nothing else moves.",
  rationale:
    "The hero's backdrop is one enum prop. Changing it re-paints the band without replacing the hero or any of its copy, and the motion is not reachable from the tree at all.",
  plan: (tree) => {
    const hero = firstOfType(tree, "loom.hero")
    if (!hero) return undefined

    const next = hero.props["backdrop"] === "aurora" ? "panel" : "aurora"

    return [{ op: "configure", nodeId: hero.id, set: { backdrop: next }, unset: [] }]
  },
}

/**
 * What gets added, and it no longer talks about itself.
 *
 * It used to read *"This band did not exist a moment ago — it arrived as an
 * insert against the page root, was weighed by the Gate, and appended a
 * revision."* That was the page narrating the runtime, which is the one job on
 * this surface the page does not have: the rail records what happened and the
 * spotlight rings the new band in green and labels it *New — just added*, forty
 * pixels from the visitor's cursor. Saying it a third time, in the specimen's
 * own voice, cost the fiction and taught nothing the mark had not already
 * taught.
 *
 * So it is what a clinic would actually have asked for and be missing: the
 * address and the hours.
 */
const bandNode = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { tone: "surface", width: "readable", eyebrow: "Opening hours" },
    children: [
      buildSlot(ids, "heading", [
        buildElement(ids, {
          type: "loom.heading",
          props: { level: 2 },
          children: [buildText(ids, "Where to find us")],
        }),
      ]),
      buildElement(ids, {
        type: "loom.prose",
        props: { tone: "muted" },
        children: [
          buildText(
            ids,
            "14 Harbourline Walk, Southbank. Monday to Friday, 7am until 8pm; Saturdays, 8am until 2pm. Two minutes from the station, and there is parking behind the building."
          ),
        ],
      }),
    ],
  })

/** Structural, and near the root — which is exactly what the Gate escalates. */
const band: DemoPreset = {
  id: "band",
  utterance: "Add a section with our address and opening hours.",
  label: "Add the opening hours",
  promise: "A section with the address and the hours appears near the bottom.",
  rationale:
    "Adds one section, with its heading and a line of copy, as a child of the page root. Everything already on the page keeps its node id and its position relative to the others.",
  plan: (tree, ids) => {
    const children = tree.root.children.length

    return [{ op: "insert", parentId: tree.root.id, index: Math.max(children - 1, 0), node: bandNode(ids) }]
  },
}

/** The removal, so a visitor can watch the inverse put it back node for node. */
const trim: DemoPreset = {
  id: "trim",
  utterance: "Take the numbers band off the page.",
  label: "Take the numbers off",
  promise: "The appointments, the years and the waiting time come off the page.",
  rationale:
    "Removes the stat grid and the three figures inside it. The inverse delta carries the whole subtree, so undoing this restores every node with the id it had.",
  plan: (tree) => {
    const stats = firstOfType(tree, "loom.stat-grid")

    return stats ? [{ op: "remove", nodeId: stats.id }] : undefined
  },
}

/**
 * A move rather than a delete and an insert: the node keeps its id, so the
 * portal's attribution still knows who placed it and React reconciles it as a
 * move (0044).
 */
const promote: DemoPreset = {
  id: "promote",
  utterance: "Move the patient's words up, just under the top band.",
  label: "Move the testimonial up",
  promise: "The patient's words jump to just under the opening band.",
  rationale:
    "Relocates the quote to the second position on the page. It is a move, not a delete and a re-insert, so the node keeps its identity and its history.",
  plan: (tree) => {
    const quote = firstOfType(tree, "loom.quote")
    if (!quote) return undefined
    if (bandIndexOf(tree, "loom.quote") === 1) return undefined

    return [{ op: "move", nodeId: quote.id, parentId: tree.root.id, index: 1 }]
  },
}

export const DEMO_PRESETS: readonly DemoPreset[] = [palette, backdrop, band, trim, promote]

/**
 * The one a stranger is meant to press first, and it is the re-theme.
 *
 * **It was the removal until this run, and the argument for the removal was
 * right about everything except what the card had become.** That argument is
 * worth restating rather than deleting, because half of it still holds:
 *
 * > The demo's policy is tuned so that a re-theme lands on its own … which
 * > means the single control this panel was designed to be pressed first was
 * > the one preset the Gate is guaranteed to have nothing to say about. A
 * > stranger with sixty seconds pressed it, watched the page turn over, read a
 * > card saying it was done, and left having seen *an AI changed a page* — the
 * > one claim `docs/rollout.md` names as the least novel thing here.
 *
 * The clause that has expired is **"read a card saying it was done"**. When
 * that was written, a card for an applied change said little more than that.
 * It now carries the weighing panel with both questions answered in plain
 * words, the rule that read them (*"Nothing this project watches for was
 * involved, so it went ahead on its own"*), **Put it back** with the sentence
 * saying an undo is weighed like any other change, and the ending underneath
 * it. One press of this preset puts the change, the reasoning, the rule, the
 * inverse and the loop on one screen with nothing below the fold.
 *
 * **What the removal cost, measured rather than argued.** Its press moves
 * nothing — that is why it leads from the second press on — and the change it
 * eventually makes is a *deletion*, of a band that is below the fold at
 * 1280 × 900 and about four thousand pixels down at 390 × 844. So a stranger
 * on the invited path pressed twice, was carried to a part of the page they
 * had never seen, and the thing they were shown was an absence. Three runs of
 * copy have worked on making that first press read as the product working
 * rather than as a broken button, and all three were the right work; none of
 * them makes a press that moves nothing the better opening for a surface whose
 * claim is *the page really changes*.
 *
 * **The Gate is not traded away, it is sequenced.** It is claimed on the
 * arrival screen before any press — `how-many-wait-for-you.ts` counts it and
 * five chips are the evidence — it is one row down the list, and `leadingAsk`
 * hands it the green button the moment a change of the visitor's own is on the
 * page. A contrast needs both of its terms, and a stranger who has not yet
 * seen a press do anything cannot read the first one as a contrast.
 *
 * **Setting this to `DEMO_LEADING_PRESET` restores the old behaviour exactly**,
 * which is the shape this was built in: the nomination then answers the same
 * preset before and after the first change, and the sequence collapses to the
 * single lead it was.
 *
 * `pipeline.test.ts` asserts the property this depends on, and it is the
 * converse of the one `DEMO_LEADING_PRESET` depends on: that the demo's policy
 * **applies** this preset on its own. A retune that started holding it would
 * open the demo with a press that moves nothing, which is the state this run
 * exists to leave, and every other test would still pass.
 */
export const DEMO_OPENING_PRESET: DemoPresetId = "palette"

/**
 * The ask that leads once the visitor has a change of their own on the page,
 * and it is the one the Gate holds.
 *
 * **Being held is the whole of why it is here.** It is the change that produces
 * the sentence this surface exists for — *Loom will not make this change until
 * you say yes* — about a small business's proof that it can see you. And being
 * held is not the end of the sixty seconds, it is the middle: answering it
 * applies the change, moves the revision, and leaves an undo.
 *
 * It is the second beat rather than the first, and the second beat is where it
 * is strongest: a visitor who has just watched one press turn the whole page
 * over reads *pressing this raises a question, not a change* as Loom declining
 * to do what it has visibly just done, rather than as a button that did
 * nothing. `DEMO_OPENING_PRESET` carries the argument for the order.
 *
 * Named here rather than in the panel because it is a claim about the *table* —
 * which preset earns the primary slot — and because `pipeline.test.ts` asserts
 * the property it depends on: that this preset is one the demo's policy holds.
 * A policy retune that quietly let it through would otherwise take the demo's
 * best moment with it, and every test would still pass.
 */
export const DEMO_LEADING_PRESET: DemoPresetId = "trim"

/** The presets a tree can honour, in table order, as presets rather than ids. */
export const offeredPresets = (available: readonly DemoPresetId[]): readonly DemoPreset[] =>
  DEMO_PRESETS.filter((preset) => available.includes(preset.id))

/**
 * Which ask gets the green button, out of the ones this tree can honour.
 *
 * **Two nominations rather than one, and which of them answers is a fact about
 * the visitor rather than about the tree.** On a page nothing of theirs has
 * moved yet it is `DEMO_OPENING_PRESET`, a change that goes ahead on its own,
 * because the first press is where this surface has to prove the page really
 * changes. From the moment one of their changes is on the page it is
 * `DEMO_LEADING_PRESET`, the one the Gate holds, because that is the claim the
 * demo is actually making and a visitor is now in a position to read it as a
 * refusal rather than as a failure. Both records say why at length.
 *
 * Either falls through to the first of the table when the tree cannot honour
 * it — a page that has already lost its stat grid still has four asks and a
 * stranger still needs one of them to be the obvious first move.
 *
 * **`landed` is required and that is deliberate.** The one caller is
 * `rail.ts`, which holds the answer two lines above the call
 * (`landedOnYourPress`), and a defaulted parameter is a parameter a later run
 * can stop answering with the whole suite green — which is exactly how
 * `whatEachWillSay` lost its history for a commit. Required, the deletion is a
 * type error.
 *
 * **It moved here from `ask-panel.tsx` and the move is the point of the
 * function.** The nomination is a reading — *given what is on offer, which one
 * is primary* — and this lane has a five-row table in `rail.ts` about readings
 * that lived in a file no test could reach. This one was in a client component,
 * which a test *can* reach, and so it was tested; what it could not be was
 * *shared*. The part of the page the leading ask would touch has to be computed
 * beside the tree, on the server, and computing it needed the same answer to
 * the same question. Two copies of a nomination is how a panel comes to preview
 * one ask and offer another.
 */
export const leadingAsk = (
  available: readonly DemoPresetId[],
  /**
   * Whether a change the visitor pressed for is on the page — `rail.ts`'s
   * `landing`, as a boolean, and never a count of records: an ask that was
   * raised and is still waiting on an answer has moved nothing, and a visitor
   * looking at a page that has not moved is still on their first press.
   */
  landed: boolean
): DemoPreset | undefined => {
  const offered = offeredPresets(available)
  const wanted = landed ? DEMO_LEADING_PRESET : DEMO_OPENING_PRESET

  return offered.find((preset) => preset.id === wanted) ?? offered[0]
}

export const presetById = (id: string): DemoPreset | undefined =>
  DEMO_PRESETS.find((preset) => preset.id === id)

/**
 * Stamp a record as having come from one of the buttons above.
 *
 * The caller's own knowledge about its own request, in the shape `undoOf`
 * established. The runtime is handed `preset.utterance` and nothing else — that
 * is deliberate, it is what a person would have typed — so which button produced
 * it is a fact only the action that read the form has, and only until it stops
 * carrying it.
 *
 * It is what lets an ask the page has moved past offer the one honest way out:
 * the same request, weighed again against the page as it now stands.
 */
export const askedWith = (record: ChangeRecord, presetId: DemoPresetId): ChangeRecord => ({
  ...record,
  presetId,
})

/** Which chips this tree can honour, so the surface never offers a no-op. */
export const availablePresets = (tree: LoomTree, ids: IdFactory): readonly DemoPresetId[] =>
  DEMO_PRESETS.filter((preset) => preset.plan(tree, ids) !== undefined).map((preset) => preset.id)

/**
 * One preset, as an interpreter.
 *
 * It re-plans against the tree it is handed rather than closing over operations
 * computed earlier, for the same reason `revertInterpreter` checks the revision
 * it was planned at: the head may have moved between the click and the write,
 * and a delta computed against a tree nobody is looking at is the stale-proposal
 * failure the runtime exists to prevent.
 */
export const presetInterpreter = (
  preset: DemoPreset,
  idFactory: IdFactory,
  clock: Clock
): ChangeInterpreter => ({
  interpret: (intent, tree) => {
    const operations = preset.plan(tree, idFactory)

    return Promise.resolve(
      operations === undefined || operations.length === 0
        ? err({
            code: "refused",
            detail: `there is nothing on this page for "${preset.label}" to change`,
          })
        : ok({
            proposalId: idFactory.proposalId(),
            intentId: intent.intentId,
            delta: {
              deltaId: idFactory.deltaId(),
              treeId: tree.treeId,
              baseRevision: tree.revision,
              operations,
            },
            rationale: preset.rationale,
            provenance: {
              origin: intent.origin,
              ...(intent.actor === undefined ? {} : { actor: intent.actor }),
              interpreter: PRESET_INTERPRETER,
              authoredBy: "runtime" as const,
              confidence: 1,
              interpretedAt: clock.now(),
            },
          })
    )
  },
})
