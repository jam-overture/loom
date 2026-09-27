import { walkTree, type LoomNode, type LoomTree, type TreeDelta } from "@jam-overture/loom"

/**
 * What to call one part of a page, in words a person recognises — and the id,
 * kept beside it.
 *
 * ## The problem
 *
 * `page-name.ts` closed this one level up: the portal's headings said `t_seed1`
 * and now say what the page calls itself. The sentences *inside* those screens
 * still lead with a machine identifier, and they are the ones a reader came for.
 * The plain half of every row on `/portal/history` reads
 *
 * > **Deleted `n_seed9` and everything inside it.**
 *
 * and the inverse under it reads *"Puts `n_seed9`, a loom.card, … back inside
 * `n_seed2`."* Three identifiers, in the two sentences the screen exists to
 * show. A reader who has never opened the tree cannot tell from either of them
 * whether what went missing was the page's headline or a spacer.
 *
 * ## Where a name comes from, given a part has none
 *
 * A node carries no name, exactly as a tree carries none, and adding one is a
 * schema change (still architectural, still not taken). So the name is derived
 * from what is already there — the same move as 0041 for authorship and
 * `page-name.ts` for a page:
 *
 * - **What it is** — the type's own local name, with the namespace dropped.
 *   `loom.card` is *the card*; a host's `acme.buy-button` is *the buy button*.
 *   A table mapping type to noun would have to be rewritten by every host that
 *   registers a primitive; this is the registry's own word, read rather than
 *   translated, and it is why no list of types appears in this file.
 * - **What it says** — its own text, where it has any. *the heading “Autumn
 *   arrivals”* is the part a reader can point at on the page in front of them,
 *   and it is the whole difference between a name and a category.
 *
 * ## The one thing this can say that nothing else can
 *
 * **A deleted part's name survives only in the inverse.** Once a removal is
 * applied the node is gone from the tree, and the forward delta records the id
 * it deleted and nothing else (0016). The subtree — its type, its words, what
 * was inside it — is recoverable only by replaying the log backwards, which is
 * what the history screen already does for every row to say what undoing would
 * put back. `namesInOperations` reads that plan for the name as well as the
 * restoration. No diff, no build log and no `git log` holds it: the tree was
 * never markup in a repository.
 *
 * ## What it never does
 *
 * **It never replaces the id**, for the reason `page-name.ts` gives: an id a
 * reader cannot see is one they cannot paste into a URL or match against a log
 * line. Every caller renders both, and `PartName` is the component that makes
 * that structural rather than remembered.
 */

export type PartName = {
  /** What a person reads first. Never an identifier. */
  readonly name: string
  /**
   * The runtime's own name for the same part. Shown beside the name, never
   * instead of it.
   *
   * A plain `string` rather than a `NodeId` for the reason `PageName` gives:
   * this is a value on its way to a screen, and the brand constrains what may
   * be *read*, not what may be printed.
   */
  readonly nodeId: string
}

/** Long enough to recognise a headline, short enough to sit inside a sentence. */
const QUOTE_LIMIT = 40

const tidy = (value: string): string => value.replace(/\s+/gu, " ").trim()

const shorten = (value: string): string =>
  value.length > QUOTE_LIMIT ? `${value.slice(0, QUOTE_LIMIT).trimEnd()}…` : value

/**
 * What a part **leads with** — the first thing it says, rather than everything
 * underneath it.
 *
 * ## Two nodes, two questions, one answer each
 *
 * This module's first version asked every node the same question — *what text
 * is under you?* — and joined the answer. That is right for a paragraph and
 * wrong for a card, and the wrongness is what a reader meets first. The seeded
 * card holds a heading *"Every change is a delta"* and a paragraph *"Nothing
 * here was written as markup. A proposal produced it."*, and joining them
 * inside a 40-character quote named it
 *
 * > the card “Every change is a delta Nothing here wa…”
 *
 * The one word that identifies the card — its heading — is followed by a
 * run-on that reads as a transcription error, and the budget a name has is
 * spent on the half that identifies nothing. Three of the five rows on the live
 * review queue looked like this on 11 September.
 *
 * So the question is asked of the node's own shape rather than of its subtree:
 *
 * > **A part that says something itself is named by everything it says. A part
 * > that says nothing itself is named by the first thing inside it that does.**
 *
 * A paragraph has text of its own — possibly several runs, possibly with an
 * inline link between them — and all of it is one sentence a reader reads
 * straight through, so all of it is the name. A card has no text of its own;
 * what it *is* is the things inside it, and the first of those is what a reader
 * sees at the top of it. The recursion is what makes that work at any depth: a
 * page leads with its card, which leads with its heading, which says *Loom*.
 *
 * **The join stays, and it is still load-bearing.** The runtime's `textOf`
 * concatenates, which is right for what it is for — the exact characters under
 * a node, with nothing invented between them — and wrong for a name: the gap
 * between two runs is a box in the layout rather than a character in the
 * content, so `textOf` says `Autumn arrivalsFree returns` and a name built from
 * it reads as a typo. That was found the hard way on 10 September and the rule
 * below keeps it, for the passage case where it is the whole answer.
 *
 * ## Nothing is hidden by naming less
 *
 * A name was always a 40-character quote, so no reader ever saw a card's body
 * here — what changed is *which* 40 characters they get. What a part says in
 * full is on the page itself, and on `/portal/pages/[treeId]` it is in the rail
 * beside it, where every text run under a container is its own row. The id is
 * untouched, on the surface, exactly as 22 August settled.
 */
export const leadOf = (node: LoomNode): string => {
  if (node.kind === "text") return tidy(node.value)

  /*
   * Its own runs, in order. A direct text child makes this a passage whatever
   * else it holds — a paragraph with an inline link has both, and the link's
   * words are part of the sentence rather than a thing inside it.
   */
  const runs: string[] = []
  for (const child of node.children) {
    if (child.kind !== "text") continue

    const run = tidy(child.value)
    if (run !== "") runs.push(run)
  }

  if (runs.length > 0) return runs.join(" ")

  /*
   * A container: the first child that says anything at all. Not the first child
   * — a card whose first child is an image says nothing until the heading under
   * it, and skipping the silent ones is what stops a name coming back empty for
   * a part that plainly says something.
   */
  for (const child of node.children) {
    const said = leadOf(child)
    if (said !== "") return said
  }

  return ""
}

/**
 * The noun in a primitive's type, as a person would say it.
 *
 * The last dot-separated segment, because a registered type is
 * `namespace.name` (0013) and the namespace says who registered it rather than
 * what it is. Hyphens become spaces for the same reason: `acme.buy-button` is
 * one thing with a two-word name, and nobody says "buy-button" out loud.
 *
 * Deliberately not a lookup table. The four primitives this deployment
 * registers would be easy to name by hand and every other deployment's would
 * not, and a portal that could only speak plainly about its own primitives
 * would be speaking plainly by coincidence.
 */
export const nounOf = (type: string): string => {
  const local = type.slice(type.lastIndexOf(".") + 1)

  return tidy(local.replace(/-/gu, " "))
}

/**
 * One part, named from itself.
 *
 * Words before category: a part that says something is named by what it says,
 * because that is what tells two cards apart, and the category is what tells a
 * card from a heading. Both are on the line when both are known.
 *
 * A slot keeps its own name — it is the one kind of node that already has one,
 * and `the body space` is what the runtime calls it and what a person would
 * too. Text has no name and never needed one: it *is* its words.
 */
export const partNameOf = (node: LoomNode): PartName => {
  const said = shorten(leadOf(node))

  switch (node.kind) {
    case "element":
      return {
        name: said === "" ? `the ${nounOf(node.type)}` : `the ${nounOf(node.type)} “${said}”`,
        nodeId: node.id,
      }
    case "slot":
      return { name: `the ${node.name} space`, nodeId: node.id }
    case "text":
      return { name: said === "" ? "the words" : `the words “${said}”`, nodeId: node.id }
  }
}

/**
 * One part named as a **place** rather than as a subject: what it is, without
 * what it says and without its id.
 *
 * The rule this file now holds two halves of:
 *
 * > **The subject of a sentence is named by what it says. A place is named by
 * > what it is.**
 *
 * A sentence on the review queue names two or three parts — *"Adds the card
 * “Autumn arrivals” `n_new` inside the band, just before the heading."* — and
 * only the first of them is the news. Putting the full name on all three costs
 * a reader the sentence and gains them nothing, because the other two are an
 * address.
 *
 * There is a harder reason than length, and it is why this is a separate
 * function rather than a shorter format of the same one. **A container's words
 * are its contents' words.** `leadOf` descends, which is exactly right for
 * naming a card by the heading inside it and exactly wrong for naming the page
 * a change lands in: *the page “Loom”* names what the page's first heading
 * happens to say while claiming to name the place a card was inserted into, and
 * it goes stale the moment that heading is re-authored. The noun on its own —
 * *the page*, *the band* — is the part of that reading which is true at every
 * depth and at every revision.
 *
 * An id is not carried for the same reason a place is not quoted: the
 * identifier that matters on a row is the one belonging to the part being
 * changed, and 22 August's rule is that a name stays on the surface, not that
 * every noun drags one along. The delta's own account — `into loom.band, before
 * loom.heading` — is a click away with every label in it.
 */
export const placeNameOf = (node: LoomNode): string => {
  switch (node.kind) {
    case "element":
      return `the ${nounOf(node.type)}`
    case "slot":
      return `the ${node.name} space`
    case "text":
      return "the words"
  }
}

/**
 * The same name, starting a line rather than sitting inside one.
 *
 * Every name above is written to be read mid-sentence — *"Deletes the card
 * “Starter…”"* — and the article is what makes that work. A list row is the
 * other case: it begins something, and a row beginning with a lowercase article
 * reads as a fragment of a sentence somebody cut.
 *
 * A capital rather than a fourth name. 12 September filed the three shapes a
 * part is named in and the argument for not consolidating them yet; this adds no
 * fourth, it shapes the one that already exists. `asSentence` in
 * `vocabulary.ts` capitalises through this too, so the portal has one answer to
 * "where does a capital come from" rather than two `slice(0, 1)` calls that
 * could drift.
 */
export const capitalised = (value: string): string =>
  `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`

/**
 * How a named part reads, as one string.
 *
 * The component renders the two halves as two elements — the words, then the id
 * in monospace — and a test asserting the sentence needs the same pair as text.
 * Written once so the sentence and the component cannot disagree about the
 * space between them, which is the join that produced three defects on
 * 24 August and one more on 9 September.
 */
export const partReading = (part: PartName): string => `${part.name} ${part.nodeId}`

/**
 * Every part of a tree, named, by id.
 *
 * One walk. The screens that want this have already read the tree for something
 * else, and walking it again per sentence would turn a page of rows into a
 * quadratic read of the same nodes.
 */
export const namesInTree = (tree: LoomTree): ReadonlyMap<string, PartName> =>
  new Map(Array.from(walkTree(tree.root), (node) => [node.id, partNameOf(node)] as const))

/**
 * Every part carried *inside* a set of operations, named, by id.
 *
 * An `insert` carries the node it places, and everything under it. Nothing else
 * carries a node at all — which is exactly why this is worth having on the
 * inverse of a removal rather than on the removal itself: the forward delta
 * holds the id of what went, and the inverse holds the thing.
 */
export const namesInOperations = (
  operations: TreeDelta["operations"]
): ReadonlyMap<string, PartName> => {
  const named = new Map<string, PartName>()

  for (const operation of operations) {
    if (operation.op !== "insert") continue

    for (const node of walkTree(operation.node)) named.set(node.id, partNameOf(node))
  }

  return named
}

/**
 * One map from several, later entries losing to earlier ones.
 *
 * The order matters and it is the caller's to choose. A history row merges the
 * tree as it stands now over the subtree its own inverse would restore, so a
 * part that still exists is named as it is *today* rather than as it was when
 * the change happened — which is the reading a person checking their page
 * against the log needs.
 */
export const firstNamed = (
  ...maps: readonly ReadonlyMap<string, PartName>[]
): ReadonlyMap<string, PartName> => {
  const merged = new Map<string, PartName>()

  for (const map of maps) {
    for (const [nodeId, part] of map) if (!merged.has(nodeId)) merged.set(nodeId, part)
  }

  return merged
}

/**
 * What a sentence should lead with for one id: the named part where the caller
 * could find one out, and the bare id where it could not.
 *
 * **The fallback is the id itself rather than a phrase standing in for it.** A
 * `configure` on a node some later revision removed is named by neither the
 * current tree nor this revision's own inverse, and *"this part `n_seed3`"* is
 * a worse sentence than *"`n_seed3`"* — it spends a reader's attention on a
 * word that adds nothing and then hands them the identifier anyway. So an
 * unnamed subject is exactly the string the sentence has always carried, which
 * is also why no screen in this portal reads worse than it did before names
 * existed: a name is added where one is known and nothing changes where it is
 * not.
 */
export const subjectFor = (
  names: ReadonlyMap<string, PartName>,
  nodeId: string
): string | PartName => names.get(nodeId) ?? nodeId
