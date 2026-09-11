import { walkTree, type LoomNode, type LoomTree, type TreeDelta } from "@loom/runtime"

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
 * What a part says, as one line — **its text runs joined by a space**, not
 * concatenated.
 *
 * The runtime's `textOf` concatenates, which is right for what it is for: the
 * exact characters under a node, with nothing invented between them. It is
 * wrong for a name. A card holding a heading *"Every change is a delta"* and a
 * paragraph *"Nothing here was written by hand"* has no whitespace between the
 * two runs in the tree, because the gap between them is a box in the layout
 * rather than a character in the content — so `textOf` says
 * `Every change is a deltaNothing here was written by hand` and a name built
 * from it reads as a typo.
 *
 * Found by a test on this module's first run, against the seeded card the demo
 * ships. Nothing else in the portal had asked a *container* what it says; the
 * page name reads a heading, which is a single run and never shows this.
 */
export const saidBy = (node: LoomNode): string => {
  const runs: string[] = []

  for (const found of walkTree(node)) {
    if (found.kind !== "text") continue

    const run = tidy(found.value)
    if (run !== "") runs.push(run)
  }

  return runs.join(" ")
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
  const said = shorten(saidBy(node))

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
