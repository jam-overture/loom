import type { IdFactory, NodeId } from "../../ids.js"
import { err, ok, type Result } from "../../result.js"
import type { Clock } from "../../runtime/events.js"
import type { EditIntent } from "../../runtime/intent.js"
import type { ChangeInterpreter, InterpretationError } from "../../runtime/interpreter.js"
import type { ProposedChange } from "../../runtime/proposal.js"
import type { ElementNode, LoomNode } from "../../tree/node.js"
import { findNode } from "../../tree/navigation.js"
import type { LoomTree } from "../../tree/tree.js"
import type { InsertOperation, TreeOperation } from "../../tree/delta.js"

/**
 * The bands a page is made of, in the order a page uses them.
 *
 * This tuple is doing two jobs and it is worth separating them, because the
 * second is the one that was not here before.
 *
 * **It is the page order.** That was previously carried by the order of
 * `STARTER_COMPOSITIONS` itself, which worked exactly as long as the catalogue
 * held one design of each band — and the catalogue's own doc comment said so on
 * 13 September: *"this list stops being a page before it stops being useful."*
 * A second hero is a legitimate thing to offer and is not insertable into a
 * sequence meant to read as one document, and the repository already had the
 * measurement: `compositions.test.ts` asserts the assembled page has exactly
 * one level-one heading, and two heroes give it two.
 *
 * **It is the vocabulary a design declares itself against.** `hero-split` is
 * not a twentieth band, it is a second design of the band a page opens with,
 * and the thing that says so is `part: "hero"`. This is
 * [0114](../../../decisions/0114-a-primitive-declares-what-part-it-plays-and-the-registry-is-asked.md)'s
 * shape one level up — a member declares what part it plays and the catalogue
 * is asked, rather than a caller matching on ids it has to know in advance.
 *
 * The order is the whole of the extra information this carries, and it is the
 * part somebody who has not assembled a landing page before does not know.
 *
 * ## What may be added here, settled on 19 September
 *
 * This tuple was closed at nineteen from the day it was written, and three
 * consecutive runs named the closure as the thing stopping a band from landing
 * without opening it — which was the right caution and the wrong resting
 * place. A vocabulary that cannot grow decides in advance what a page is
 * allowed to be, and the catalogue had reached the point where the parts it
 * could not name were ordinary: a strip above the navigation, a band that
 * shows code.
 *
 * [0171](../../../decisions/0171-a-page-part-is-earned-by-the-region-it-occupies.md)
 * states the bar, and it is deliberately not *is this content different*. It
 * is **the region**: a part earns a place when there is somewhere on a page it
 * goes that nothing already in the tuple occupies, and the test that it is a
 * region rather than a taste is that the two cannot stand in for each other.
 * A candidate another part could be swapped in for is a design of that part
 * (0162), and belongs in the catalogue without touching this list.
 *
 * Adding a member here is not free and the cost is the thing to weigh: every
 * part is a band on the canonical page, so the document {@link PAGE_SEQUENCE}
 * assembles gets one longer, and a part with no canonical design is a red
 * build rather than a page with a hole in it.
 *
 * `specs` is the twenty-second, admitted on 21 September by
 * [0177](../../../decisions/0177-the-specification-is-a-page-part-and-it-sits-between-the-figure-and-the-price.md)
 * and the first time 0171's test has been run by a routine that did not write
 * it. Its region is the one between the figures that persuade and the price:
 * `metrics` is four rounded numbers at display size, to be believed; `specs` is
 * the same kind of fact unrounded, at reading size, to be checked. Neither can
 * stand in for the other, which is why it is here rather than a design of one
 * of them — and the record works the swap in all four directions, including
 * the two against `comparison`, because that is the neighbour it looks most
 * like from a distance.
 */
export const COMPOSITION_PARTS = [
  "banner",
  "nav",
  "hero",
  "proof",
  "features",
  "bento",
  "steps",
  "code",
  "integrations",
  "metrics",
  "specs",
  "pricing",
  "comparison",
  "testimonials",
  "credentials",
  "team",
  "articles",
  "changelog",
  "faq",
  "contact",
  "cta",
  "footer",
] as const

export type CompositionPart = (typeof COMPOSITION_PARTS)[number]

/**
 * A band of a page, dropped in whole as one operation.
 *
 * ## Why this exists
 *
 * This library is decomposed on purpose. `docs/primitive-granularity.md` argues
 * it at length and 0052 rules on it: repeated content is child nodes, so a
 * pricing band is a `loom.tier-table` holding three `loom.tier` nodes, each
 * holding a `loom.perk-list` holding five rows. The reason is reachability —
 * "move the second plan's button above its perks" is a `move` against a tree
 * and is *unreachable* against a prop bag nobody predicted.
 *
 * That argument has a second half, and until now the library had only paid the
 * first. The granularity doc's own answer to *"does every pricing band start as
 * thirty operations?"* is:
 *
 * > No — because `insert` carries a whole subtree, not a single node. So a
 * > starting composition is **one `insert` operation** carrying a six-node
 * > hero. Drop in the whole thing in a single reviewable step, then rearrange
 * > it freely afterwards because it is structure rather than configuration.
 *
 * Nothing built it. Eighty-nine primitives shipped and the convenience they
 * were promised against did not, so *add a pricing band* has been thirty
 * separate operations for every one of them. This is that half.
 *
 * ## What a composition is, and what it is emphatically not
 *
 * It is **a pure function from an `IdFactory` to a subtree**, and everything
 * else here is the small amount of plumbing that gets that subtree into a tree
 * through the front door. It registers nothing, renders nothing, and adds no
 * primitive: every node it builds is a type already in the registry, and a test
 * in `compositions.test.ts` fails if that ever stops being true.
 *
 * It is **not a fat primitive wearing a different hat**. A `loom.pricing-band`
 * with `tierNames: string[]` would render the same pixels and would put the
 * whole band back behind a prop bag. The difference is what exists afterwards:
 * a composition leaves thirty addressable nodes behind it and then has no
 * further opinion about them, because *it is not in the tree at all*. Nothing
 * records which composition a band came from and nothing can: what landed is
 * ordinary nodes, indistinguishable from nodes a model wrote one at a time.
 * That is the property that keeps this a convenience over the delta model
 * rather than a second way to author one.
 *
 * ## Why it is an interpreter and not a function a surface calls
 *
 * 0057 settled this for the demo's chips and the reasoning transfers without a
 * change of a word: the interpretation seam exists because interpretation is
 * the *non-deterministic step* (0005), not because it is always a model. A
 * composition is handed to `commitIntent` like anything else, so it is
 * assessed, gated, held for a person when the policy says so, logged, and
 * revertable — and its inverse is a `remove` of one node, which is the cheapest
 * undo in the system.
 *
 * The alternative a page builder would reach for — a surface that builds the
 * subtree and writes it to the store — is the one thing the brief for this
 * library forbids by name: *a catalogue of them must never become a parallel
 * channel into the tree.* A band that arrived without passing the Gate would be
 * the only change on the page nobody judged.
 *
 * ## The one thing it re-plans
 *
 * `build` mints fresh ids from the factory it is handed on every call, and the
 * insertion point is resolved **against the tree the interpreter is given**,
 * never against the tree the button was drawn from. A composition planned
 * against a page that has since grown two bands appends after them. One that
 * names a parent since removed declines rather than proposing an operation the
 * runtime would refuse — 0057's first honesty property, and the reason this is
 * a plan rather than a recording.
 */
export type Composition = {
  /**
   * Lower-case words joined by hyphens, the way an anchor or a slot name is.
   *
   * **A part's canonical design has the part's own name as its id**, and every
   * other design of that part is the part name plus what makes it different —
   * `hero` and `hero-split`. That convention is not cosmetic: it is what lets
   * the page sequence be *derived* rather than maintained as a second hand-kept
   * list that could disagree with the first. There is a test on it.
   */
  readonly id: string
  /** Which band of a page this is a design of. */
  readonly part: CompositionPart
  /** What a person choosing it from a list reads. */
  readonly label: string
  /**
   * What lands on the page, in one clause, said before it happens.
   *
   * About the page and never about the verdict, for the reason the demo's
   * presets give: whether the Gate applies a band or holds it is computed from
   * the tree at assessment time, so a promise about the outcome would be a
   * surface predicting a decision it does not make.
   */
  readonly promise: string
  /** The interpreter's own words about why this subtree answers that ask. */
  readonly rationale: string
  /** Every primitive type the subtree uses, for the catalogue and the audit. */
  readonly uses: readonly string[]
  readonly build: (ids: IdFactory) => ElementNode
}

/**
 * A band of some page kind, which is all that planning one needs to know.
 *
 * {@link planComposition} and {@link compositionInterpreter} read `build` and an
 * insertion point and have never read `part` — where a band goes *in a page* is
 * a fact about a catalogue, not about the one `insert` that lands it. So both
 * take this rather than {@link Composition}, and a band of the document sequence
 * ([0245](../../../decisions/0245-a-second-page-sequence-is-earned-by-regions-in-a-different-order-and-the-sites-own-regions-are-shared.md))
 * goes through the same Gate, the same policy and the same log as every other
 * without a cast and without a second channel into the tree.
 *
 * `Composition` is assignable to it, so the widening is invisible to every
 * existing caller.
 */
export type Band = Omit<Composition, "part"> & { readonly part: string }

/** What produced the delta, for `Provenance.interpreter`. Not a model. */
export const COMPOSITION_INTERPRETER = "loom/composition"

/**
 * Where the band goes.
 *
 * Both fields are optional and the defaults are the ones a page wants: bands
 * are the root's own children, and a new band goes at the end. A caller that
 * knows better — a portal dropping a band between two others — says so.
 */
export type CompositionTarget = {
  readonly parentId?: NodeId
  /** Clamped to the parent's current child count, never trusted as an index. */
  readonly index?: number
}

export type CompositionPlan =
  | { readonly outcome: "planned"; readonly operations: readonly TreeOperation[] }
  /**
   * The named parent is not in this tree, so there is nowhere to put the band.
   *
   * A distinct outcome rather than a silent append at the root: a band that
   * quietly landed somewhere other than where it was asked for is worse than
   * one that did not land, because the second is visible.
   */
  | { readonly outcome: "no-such-parent"; readonly parentId: NodeId }

const childrenOf = (node: LoomNode): readonly LoomNode[] => (node.kind === "text" ? [] : node.children)

/**
 * One `insert`, computed against the tree as it stands.
 *
 * The index is clamped rather than validated, and that is the right severity
 * for what it is: an index past the end of a list that has since shrunk is a
 * stale *position*, and a band appended at the end is what the caller asked for
 * to within the only thing that changed. A missing parent is different in kind
 * — the caller named a place that no longer exists — so it refuses.
 */
export const planComposition = (
  composition: Band,
  tree: LoomTree,
  ids: IdFactory,
  target: CompositionTarget = {}
): CompositionPlan => {
  const parentId = target.parentId ?? tree.root.id
  const parent = findNode(tree.root, parentId)

  if (parent === null) return { outcome: "no-such-parent", parentId }

  const count = childrenOf(parent).length
  const index = target.index === undefined ? count : Math.min(Math.max(target.index, 0), count)

  const operation: InsertOperation = {
    op: "insert",
    parentId,
    index,
    node: composition.build(ids),
  }

  return { outcome: "planned", operations: [operation] }
}

/**
 * A composition as an ordinary `ChangeInterpreter`.
 *
 * Everything downstream of this is unable to tell that no model was involved,
 * which is exactly the point: a band arriving from a catalogue is judged on the
 * same terms as a band a model proposed, by the same rules, under the same
 * policy, into the same log.
 *
 * `confidence` is 1 and `authoredBy` is `runtime` for 0031's reason, not for
 * modesty: a self-grade only means something when something graded itself, and
 * a computed subtree has no opinion to be right or wrong about. Calibration
 * segments these out rather than letting a catalogue of bands walk a model's
 * record to a perfect score it never earned.
 */
export const compositionInterpreter = (
  composition: Band,
  idFactory: IdFactory,
  clock: Clock,
  target: CompositionTarget = {}
): ChangeInterpreter => ({
  interpret: (intent: EditIntent, tree: LoomTree): Promise<Result<ProposedChange, InterpretationError>> => {
    const plan = planComposition(composition, tree, idFactory, target)

    if (plan.outcome === "no-such-parent") {
      return Promise.resolve(
        err({
          code: "not-understood",
          detail: `the band was to be added under node ${plan.parentId}, which is not in this tree`,
        })
      )
    }

    return Promise.resolve(
      ok({
        proposalId: idFactory.proposalId(),
        intentId: intent.intentId,
        delta: {
          deltaId: idFactory.deltaId(),
          treeId: tree.treeId,
          baseRevision: tree.revision,
          operations: plan.operations,
        },
        rationale: composition.rationale,
        provenance: {
          origin: intent.origin,
          ...(intent.actor === undefined ? {} : { actor: intent.actor }),
          interpreter: COMPOSITION_INTERPRETER,
          /** Computed, not guessed — so calibration leaves it out (0031). */
          authoredBy: "runtime" as const,
          confidence: 1,
          interpretedAt: clock.now(),
        },
      })
    )
  },
})
