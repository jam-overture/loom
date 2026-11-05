import {
  applyDelta,
  assessChange,
  buildElement,
  createTree,
  gate,
  gatePolicySchema,
  sequentialIdFactory,
  type Disposition,
  type IdFactory,
  type ElementNode,
  type GatePolicy,
  type LoomNode,
  type LoomTree,
  type ProposedChange,
  type TreeDelta,
} from "@jam-overture/loom"
import { interactiveTypesFor, registeredTypesFor } from "@jam-overture/loom/sdk"

import { ARRANGEMENTS, arrangementScreen, type Arrangement } from "./example"
import { partNameOf } from "./library"
import { siteRegistry } from "./registry"

/**
 * The change the band above made, run through the thing that decides it.
 *
 * ## The gap this closes, which is the fifth link of the chain
 *
 * `chain.ts` holds the maintainer's six links as data and says, for each one,
 * where a visitor can watch it being true. The fifth is his *AI reacting to
 * signals and redesigning page*, and this site renders it as two sentences:
 *
 * > *"It reads what your page saw and proposes a different arrangement. Loom
 * > checks that against your rules before anything moves."*
 *
 * `example.ts`' comparison band is where that rung lands, and it shows the
 * first sentence. **Nothing on this site has ever shown the second.** A reader
 * met two frames side by side and had to take on trust that anything at all
 * stood between them — which, on the one surface arguing that Loom can say
 * what really happened, is the weakest place for a claim to be unevidenced.
 *
 * So this is the same change, as the product saw it: three edits, a verdict,
 * and the way back. Nothing here is typed. The edits are
 * {@link ARRANGEMENTS}' two arrangements read as operations, applied by
 * `applyDelta`; the verdict is `gate`'s; the way back is the one the framework
 * worked out while it was deciding.
 *
 * ## Where this sits against `docs/positioning.md`, which matters
 *
 * The maintainer's instruction of 24 October is that the governance is **under
 * the hood** and is not the pitch: *"Don't worry about the controls. That is
 * the stuff under the hood. The building part and why this build is better
 * than traditional methods is preferred."* `positioning.md`' own reading of it
 * keeps the record *"worth saying on a page somebody reads **after** they want
 * the product"*.
 *
 * This band is that page and that position: the last band of `/why-use-it`,
 * under a frame the reader has just watched rearrange itself. It is not an
 * audit pitch and it does not open on one. It answers the question the band
 * above it creates — *the model just rewrote my page?* — which is the only
 * moment on this site where a stranger wants the rules.
 *
 * ## Why the verdict is computed and the words are written
 *
 * `reported.ts` argues this at length for the report panel and the same split
 * holds here, with the halves the other way round. There the lines are
 * authored and every claim about them is an assertion; here the **facts** are
 * computed — how many edits, which parts, allowed or held, how many edits
 * back — and the **sentences** are this lane's, because the framework's own
 * words for them cannot go on a marketing page.
 *
 * Two of them say so plainly. The acceptance reads *"reversible, within the
 * stakes ceiling, and confidently interpreted"*, and the hold reads *"removes
 * 3 nodes"* — which carries a word `copy.ts`' `RESERVED_VOCABULARY` keeps off
 * this site, correctly, because a junior developer meeting it cold has met a
 * word this site promised not to say. So the band prints neither string. It
 * prints the number and the decision, in its own register, and
 * `allowed.test.ts` holds each sentence to the fact underneath it.
 *
 * ## It is one policy and two changes, which is the whole point
 *
 * A band showing only the acceptance would be showing a check with no teeth: a
 * rule that has never refused anything is indistinguishable from no rule. So
 * the same policy judges a second, larger change — the one that clears the row
 * of tiles instead of swapping one — and holds it for a human. Neither verdict
 * is chosen here. Both come back from `gate`, and the test fails if either
 * stops being what the band says it is.
 */

/** A page within a page, which is the level `example.ts` renders at. */
const HEADING_LEVEL = 3

/**
 * One edit, as a reader meets it: what happened, and the words it happened to.
 *
 * Two fields rather than a sentence because the band is a table and a table is
 * scanned. `SCANNED_PROPS` in `voice.test.ts` holds both of these to 35 words,
 * which neither will ever approach — the point of the shape is that the verb
 * and the copy are in separate columns, so three edits read as three of one
 * kind of thing rather than as three sentences a reader has to parse.
 */
export type Edit = {
  /** What the product did, named with the part it did it to. */
  readonly did: string
  /** The words that arrived or left, which is the half a reader recognises. */
  readonly words: string
}

const childrenOf = (node: LoomNode): readonly LoomNode[] =>
  node.kind === "text" ? [] : node.children

const walk = (node: LoomNode, visit: (node: LoomNode) => void): void => {
  visit(node)
  for (const child of childrenOf(node)) walk(child, visit)
}

const firstOfType = (root: LoomNode, type: string): ElementNode => {
  let found: ElementNode | undefined
  walk(root, (node) => {
    if (found === undefined && node.kind === "element" && node.type === type) found = node
  })

  if (found === undefined) {
    throw new Error(`loom: the example page has no ${type}, so the change band cannot be built`)
  }

  return found
}

const wordsNodeOf = (heading: ElementNode): LoomNode => {
  const [words] = heading.children

  if (words === undefined || words.kind !== "text") {
    throw new Error("loom: the example's heading carries no words to change")
  }

  return words
}

const tilesOf = (grid: ElementNode): readonly ElementNode[] =>
  grid.children.filter((node): node is ElementNode => node.kind === "element")

/** The example page as its author built it, as a tree of its own. */
const pageOf = (arrangement: Arrangement, namespace: string): LoomTree => {
  const ids = sequentialIdFactory(namespace)

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      children: [...arrangementScreen(ids, arrangement, HEADING_LEVEL)],
    }),
    ids
  )
}

/**
 * The id namespace, which is the same family the report panel names.
 *
 * `reported.ts` prints one report from this page and the parts it names are
 * this tree's. Sharing the namespace is what makes the two bands one story
 * rather than two examples: the fourth link reports on these parts and the
 * fifth link edits them, and a reader who looks closely finds the same names
 * in both panels. `reported.test.ts` holds the report's to this tree.
 */
export const EXAMPLE_NAMESPACE = "fern"

/** The page the left-hand frame shows. */
export const AS_BUILT_PAGE: LoomTree = pageOf(ARRANGEMENTS.asBuilt, EXAMPLE_NAMESPACE)

/** The page the right-hand frame shows, built rather than derived. */
export const FOR_A_GIFT_PAGE: LoomTree = pageOf(ARRANGEMENTS.forAGift, EXAMPLE_NAMESPACE)

/**
 * What the second arrangement is, stated as a relationship to the first.
 *
 * The three operations below are only the right three if the gift arrangement
 * really is *the as-built one with a tile on the front and the last one off*.
 * That holds today and it is a property of two lists in `example.ts` that
 * nothing was holding: an editor adding a fourth offer, or reordering them,
 * would leave this module authoring a change that no longer describes the
 * frames beside it — and the band would go on saying three edits over a pair
 * it had stopped describing.
 *
 * So it is checked here rather than asserted in a test, on `registry.ts`'
 * pattern: a build that cannot make this claim refuses to build at all, which
 * is the only failure mode cheap enough to be worth having.
 */
const arrival = (): Arrangement["offers"][number] => {
  const { asBuilt, forAGift } = ARRANGEMENTS
  const [arrived, ...kept] = forAGift.offers
  const expected = asBuilt.offers.slice(0, -1)

  if (
    arrived === undefined ||
    kept.length !== expected.length ||
    kept.some((offer, index) => {
      const against = expected[index]

      return against === undefined || offer.title !== against.title || offer.body !== against.body
    })
  ) {
    throw new Error(
      "loom: the gift arrangement is no longer the built one with a tile added and the last removed, so the change band cannot describe it"
    )
  }

  if (forAGift.heading === asBuilt.heading) {
    throw new Error("loom: the two arrangements share a heading, so there is no first edit to show")
  }

  return arrived
}

const HEADING_WORDS = wordsNodeOf(firstOfType(AS_BUILT_PAGE.root, "loom.heading"))
const GRID = firstOfType(AS_BUILT_PAGE.root, "loom.feature-grid")
const TILES = tilesOf(GRID)
const ARRIVING = arrival()

const departing = (): ElementNode => {
  const last = TILES[TILES.length - 1]

  if (last === undefined) {
    throw new Error("loom: the example's grid has no tiles, so nothing can come off it")
  }

  return last
}

const DEPARTING = departing()

/**
 * The names this change mints, in a namespace of their own.
 *
 * **Not the page's**, and the reason is a refusal this band met twice while it
 * was being written: `applyDelta` rejects a change that inserts a name the
 * page already carries, which is the framework doing exactly what it is for.
 * A name picked by hand out of the page's own sequence is a name that collides
 * the next time the example grows a part, and it would collide in a module
 * nobody would think to look in.
 *
 * A separate namespace cannot collide with the page's at all, which turns the
 * question from one somebody has to get right into one that cannot be asked.
 */
const changeIds = sequentialIdFactory("gift")
const heldIds = sequentialIdFactory("clear")

/**
 * The change, as the framework's own operations.
 *
 * Three of the four kinds there are, which is a fact about this example rather
 * than a thing arranged for the band: swapping one offer for another and
 * rewriting the line above them is a `configure`, an `insert` and a `remove`,
 * and nothing moves. `allowed.test.ts` holds the shape to what the band says
 * about it.
 */
export const THE_EDITS: TreeDelta = {
  deltaId: changeIds.deltaId(),
  treeId: AS_BUILT_PAGE.treeId,
  baseRevision: AS_BUILT_PAGE.revision,
  operations: [
    {
      op: "configure",
      nodeId: HEADING_WORDS.id,
      set: { value: ARRANGEMENTS.forAGift.heading },
      unset: [],
    },
    {
      op: "insert",
      parentId: GRID.id,
      index: 0,
      node: {
        kind: "element",
        id: changeIds.nodeId(),
        type: DEPARTING.type,
        props: { title: ARRIVING.title, body: ARRIVING.body, surface: "card" },
        children: [],
      },
    },
    { op: "remove", nodeId: DEPARTING.id },
  ],
}

/**
 * A larger change from the same reader, for the same page, under one policy.
 *
 * It clears the row rather than swapping one of it. Nothing about it is tuned:
 * it is the obvious greedy version of the same idea — *this reader came for a
 * gift, so lose the subscription offers* — and the policy below holds it
 * because three removals at once is more than a page may do unasked.
 */
export const TOO_MUCH: TreeDelta = {
  deltaId: heldIds.deltaId(),
  treeId: AS_BUILT_PAGE.treeId,
  baseRevision: AS_BUILT_PAGE.revision,
  operations: [
    {
      op: "configure",
      nodeId: HEADING_WORDS.id,
      set: { value: ARRANGEMENTS.forAGift.heading },
      unset: [],
    },
    ...TILES.map((tile) => ({ op: "remove", nodeId: tile.id }) as const),
  ],
}

/**
 * The rules the fictional product runs, and **two thirds of it is read off the
 * library rather than written here.**
 *
 * `registeredPrimitiveTypes` and `interactiveTypes` come from the same
 * registry this site is built with, through the SDK readers a host is told to
 * use. So the policy judging the example is a policy a real deployment of this
 * library would have, and the band is not standing on numbers invented to make
 * a verdict come out.
 *
 * Everything else is the framework's default. That is the honest setting for a
 * band claiming *your rules*: a reader installing this tomorrow, writing no
 * policy at all, gets these thresholds and therefore gets these two verdicts.
 * A policy tuned here would make the page a claim about a configuration
 * nobody has.
 */
export const COFFEE_POLICY: GatePolicy = gatePolicySchema.parse({
  policyId: "fernhill-coffee",
  registeredPrimitiveTypes: registeredTypesFor(siteRegistry),
  interactiveTypes: interactiveTypesFor(siteRegistry),
})

/**
 * Who asked, which on this rung is nobody.
 *
 * `origin: "system-signal"` is the whole reason the second verdict comes back
 * held. The framework's ceilings are per origin — an instruction somebody
 * typed earns more latitude than an adaptation nobody requested — and the
 * fifth link of the chain is explicitly the second kind: the page reported,
 * the model proposed, and no human was in it. A band that quietly judged this
 * as a developer's own edit would be showing a reader the easy case.
 */
const asked = (ids: IdFactory, delta: TreeDelta, rationale: string): ProposedChange => ({
  proposalId: ids.proposalId(),
  intentId: ids.intentId(),
  delta,
  rationale,
  provenance: {
    origin: "system-signal",
    interpreter: "fernhill-coffee",
    authoredBy: "model",
    confidence: 0.86,
    interpretedAt: "2026-11-05T09:00:00.000Z",
  },
})

/** What the framework decided, and the two facts the band reads off it. */
export type Judgement = {
  readonly verdict: Disposition
  /** How many parts the change takes off the page. */
  readonly removed: number
  /** How many edits putting it back takes, or nothing where it cannot be. */
  readonly undoEdits: number | undefined
}

const judge = (ids: IdFactory, delta: TreeDelta, rationale: string): Judgement => {
  const assessed = assessChange(
    AS_BUILT_PAGE,
    asked(ids, delta, rationale),
    COFFEE_POLICY,
    ids.deltaId()
  )

  if (!assessed.ok) {
    throw new Error(`loom: the example change could not be assessed — ${assessed.error.code}`)
  }

  const { analysis, reversibility } = assessed.value

  return {
    verdict: gate(assessed.value, COFFEE_POLICY),
    removed: analysis.removedNodeCount,
    undoEdits: reversibility.reversible ? reversibility.inverse.operations.length : undefined,
  }
}

/** The change the band above shows, judged. */
export const ALLOWED: Judgement = judge(
  changeIds,
  THE_EDITS,
  "A reader arrived from a gift guide and read the offers."
)

/** The larger one, judged by the same rules. */
export const HELD: Judgement = judge(heldIds, TOO_MUCH, "A reader arrived from a gift guide.")

/**
 * The page the three edits actually produce, which is the claim the band makes.
 *
 * Built here rather than in the test so that a build whose edits no longer
 * reach the arrangement beside them fails at the same place every other
 * impossible claim on this page fails: before anything is served.
 * `allowed.test.ts` is what compares it, word for word, against
 * {@link FOR_A_GIFT_PAGE}.
 */
export const EDITED_PAGE: LoomTree = (() => {
  const applied = applyDelta(AS_BUILT_PAGE, THE_EDITS)

  if (!applied.ok) {
    throw new Error(`loom: the example change does not apply — ${applied.error.code}`)
  }

  return applied.value
})()

/**
 * The three edits in a reader's words, with the verb derived from the operation
 * and the part named exactly as the chips band above names it.
 *
 * `partNameOf` is the same function the row of 107 chips uses, so a part
 * renamed in the library renames it here and the two bands cannot drift. That
 * is also why the parts are named at all rather than called *tiles*: a reader
 * three bands above has just been shown the set these came from, and saying
 * `Feature` is what connects the change to the list it was allowed to draw
 * from.
 */
export const EDITS: readonly Edit[] = [
  {
    did: `The ${partNameOf("loom.heading").toLowerCase()} was rewritten`,
    words: ARRANGEMENTS.forAGift.heading,
  },
  { did: `A ${partNameOf(DEPARTING.type)} was added`, words: ARRIVING.title },
  { did: `A ${partNameOf(DEPARTING.type)} came off`, words: DEPARTING.props["title"] as string },
]

/**
 * A small count as a word, because the band is prose and prose spells them.
 *
 * It exists so that **no sentence in this band contains a number somebody
 * typed.** Three edits, three back, three taken away: every one of those is a
 * count off the operations the framework actually produced, and the day the
 * example grows a tile the sentences move with it rather than going quietly
 * wrong under a photograph of the right answer.
 *
 * Nine is the ceiling because a band that needed *fourteen* of anything would
 * be the wrong band, and a throw is better than a digit arriving mid-sentence
 * on a page whose whole argument is that its numbers are checked.
 */
const WORDS: readonly string[] = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
]

export const inWords = (count: number): string => {
  const word = WORDS[count]

  if (word === undefined) {
    throw new Error(`loom: ${String(count)} is more than this band can spell`)
  }

  return word
}

/** How many edits the change is, which is the number the band opens on. */
export const EDIT_COUNT = THE_EDITS.operations.length

/**
 * The claim, and it is the one sentence here a reader has to believe.
 *
 * It points back at the frames above rather than describing them, on the same
 * reasoning the band above uses for its own opening line: a reader shown a
 * second thing has to be told it is the first thing again, or the band reads
 * as two examples.
 *
 * **It said *the page on the right* until the phone shot was looked at.**
 * `loom.split` stacks on a narrow screen with the order kept, which is the
 * right rendering and the reason the band above works at 390 at all — and it
 * means there is no right-hand side to point at. A sentence naming a position
 * the layout does not have is the worst kind of wrong here, because it is
 * correct in the photograph somebody takes and wrong on the device most
 * readers are holding.
 *
 * *The first* and *the second* are true at every width, which is what a
 * sentence about a stacking pair has to be.
 */
export const THE_CLAIM = `The two pages above are one page. Loom turned the first into the second with ${inWords(EDIT_COUNT)} edits.`

/** What the table is, announced for anybody who meets it before the prose. */
export const EDITS_CAPTION = `The ${inWords(EDIT_COUNT)} edits, as Loom wrote them down`

/** The table's two columns. What happened, and the words it happened to. */
export const EDIT_COLUMNS: readonly string[] = ["What happened", "The words"]

/**
 * The verdict, in this site's register rather than the framework's.
 *
 * The framework's own sentence for it is *"reversible, within the stakes
 * ceiling, and confidently interpreted"*, which is the right sentence for an
 * operator reading a log and the wrong one for a stranger. What a reader needs
 * is the consequence: nobody was asked, because the rules already said yes.
 * `allowed.test.ts` holds this to `ALLOWED.verdict.kind` being the acceptance,
 * so the sentence cannot outlive the decision it reports.
 */
export const WHAT_ALLOWED_IT =
  "Your rules allowed all three, so your page changed without waiting for you."

/**
 * The way back, which is the half that is worth the band.
 *
 * `undoEdits` is the length of the way back the framework computed **while it
 * was deciding**, not on request, and that is the fact the second sentence is
 * about. A product that works out the undo when you ask for it is a product
 * that can discover it cannot.
 */
export const THE_WAY_BACK = `Putting it back is ${inWords(ALLOWED.undoEdits ?? 0)} more edits. Loom works them out while it is deciding rather than when somebody asks.`

/**
 * The refusal, which is what makes the acceptance mean anything.
 *
 * Both numbers are `HELD`'s: how many the larger change takes off the page,
 * and that it came back needing a person. A reader who is only ever shown a
 * change going through has been shown a rule that may as well not exist.
 */
export const WHEN_IT_ASKS: readonly string[] = [
  "A bigger version of the same change does not go through.",
  `Taking all ${inWords(HELD.removed)} away at once is more than your rules let a page do unasked, so Loom stops and asks you.`,
]
