import { outlineTree, textOf, type LoomTree, type TreeId } from "@loom/runtime"
import type { TreeReader } from "@loom/runtime/store"

/**
 * What to call a page, in words a person recognises — and the id, kept beside it.
 *
 * ## The problem this is the cheap half of
 *
 * The portal's most-read heading was a machine identifier. `/portal/pages/[treeId]`
 * rendered `<h1>{treeId}</h1>` — `t_seed1`, the largest text on the busiest
 * screen — and every list of pages in the portal led its rows with the same
 * string. Vercel puts the project's name there. Loom had nothing to put, because
 * **a tree has no name**: the schema carries an id, a revision and a root, and
 * nothing a person chose.
 *
 * Giving a tree a name *field* is a tree-schema change and therefore
 * architectural, and it is not what this module does. This is the half a portal
 * run can take on its own: **a page already says what it is called, in its own
 * leading heading**, and reading that is a derivation over content the portal has
 * already read. It is the same move 0041 made for authorship — derived from what
 * is there, not carried on a node.
 *
 * ## Why the derived name is worth having
 *
 * It is not a label somebody typed into a settings screen. It is what the page
 * currently calls itself at its head revision — so when the AI rewrites the
 * heading, the page's name in the portal changes with it, and the name in the
 * list is always the name a visitor is being served. `git log` cannot tell you
 * that: the tree lives in a store, and the heading was never written as markup.
 *
 * ## What it never does
 *
 * **It never replaces the id.** Every caller shows both — the name to know which
 * page this is, the id to say which page this is to anything else. 22 August
 * settled that identity is not technical detail, and a reviewer who cannot see
 * which tree they are on cannot act. The rule this module is written under is the
 * portal's governing one: plain language leads, the technical record stays, and
 * nothing is ever removed.
 */

export type PageName = {
  /** What a person reads first. Never an identifier. */
  readonly name: string
  /**
   * The runtime's own name for the same page. Shown beside the name, never
   * instead of it.
   *
   * A plain `string` rather than a `TreeId`, for the same reason `WaitingChange`
   * types it that way: this is a value on its way to a screen, and the brand is
   * a constraint on what may be *read*, not on what may be printed. Every one is
   * a real id — they come from a store read or from a caller that already held
   * one — and nothing downstream may use one to read with.
   */
  readonly treeId: string
  /**
   * Whether the page told us what it is called.
   *
   * A screen may want to set an underived name differently — it is the portal
   * speaking rather than the page — and a test can tell the two apart without
   * comparing against the fallback string.
   */
  readonly derived: boolean
}

/**
 * What a page with no heading is called.
 *
 * Not the id, and not blank. "Untitled" is what every editor a person has used
 * calls a document that has not been named, and it is honest: the page has not
 * said what it is, which is a different fact from the portal not knowing.
 */
export const UNTITLED = "Untitled page"

/**
 * Which primitives carry a page's title, as far as this deployment is concerned.
 *
 * Hard-coded, and it is the portal's business rather than the framework's: this
 * list is a fact about the four primitives `_lib/registry.ts` registers, and a
 * host that registered `acme.hero` would have its own list. It is a constant
 * rather than a lookup because **a primitive has no way to declare that it
 * carries a page's title** — filed as a finding, since the framework is the only
 * place that could offer one, and until it does every host deriving a page name
 * writes this array again.
 */
const TITLE_TYPES: readonly string[] = ["loom.heading"]

/** Long enough for a real headline, short enough to sit in a row without wrapping. */
const NAME_LIMIT = 60

const tidy = (value: string): string => value.replace(/\s+/gu, " ").trim()

const shorten = (value: string): string =>
  value.length > NAME_LIMIT ? `${value.slice(0, NAME_LIMIT).trimEnd()}…` : value

/**
 * The page's own leading heading, in document order.
 *
 * The *first* heading rather than the highest level. A page whose first heading
 * is a level 3 inside a card is a page whose author put that text at the top,
 * and reading order is what a visitor meets — picking the level-1 further down
 * would name the page after something nobody sees first. `outlineTree` walks in
 * exactly the order the renderer emits, which is why it is the walk used here
 * rather than a bespoke one.
 */
export const pageNameOf = (tree: LoomTree): PageName => {
  const heading = outlineTree(tree.root).find(
    (entry) => entry.node.kind === "element" && TITLE_TYPES.includes(entry.node.type)
  )

  const text = heading === undefined ? "" : tidy(textOf(heading.node))

  return text === ""
    ? { name: UNTITLED, treeId: tree.treeId, derived: false }
    : { name: shorten(text), treeId: tree.treeId, derived: true }
}

/** A page whose name could not be derived, because the page itself could not be read. */
export const unnamed = (treeId: string): PageName => ({
  name: UNTITLED,
  treeId,
  derived: false,
})

/**
 * How a named page reads, as one string.
 *
 * The `PageName` component renders the two halves as two elements — the words,
 * then the id in monospace — and a sentence that contains a page needs the same
 * pair as text a test can assert whole. Written once here so the sentence and
 * the component cannot disagree about the space between them, which is exactly
 * the join that produced three defects on 24 August.
 */
export const nameReading = (page: PageName): string => `${page.name} ${page.treeId}`

/**
 * The name of one page, for a screen that already knows which page it is on.
 *
 * The scoped screens each hold one id from their `tree=` parameter rather than a
 * listing, so `namesOf` over a single-element array is the wrong shape for them
 * and the map it returns is a lookup with one key.
 *
 * A read that fails costs the name and nothing else, for the same reason it does
 * in a listing: a screen that cannot name the page it is scoped to still knows
 * which page it is scoped to, and refusing to draw is a worse answer than
 * "Untitled page" beside the id the reader typed.
 */
export const nameFor = async (reader: TreeReader, treeId: TreeId): Promise<PageName> => {
  const head = await reader.head(treeId)

  return head.ok ? pageNameOf(head.value) : unnamed(treeId)
}

/**
 * Names for a listed page of trees, one bounded read each.
 *
 * The same trade every list in this portal already makes: `/portal/pages` reads
 * the held proposals per row, and 0041 reads attribution per tree. A listing is
 * clamped by the store, so this is a bounded fan-out over a bounded list rather
 * than a scan.
 *
 * **A read that fails costs the name and nothing else.** The row still lists,
 * still links, and still shows its id — a page the portal cannot name is not a
 * page the portal should hide, and dropping it would turn a transient store
 * error into a missing page, which is the one failure a reader cannot tell from
 * data loss. So every id asked for is in the map that comes back.
 */
export const namesOf = async (
  reader: TreeReader,
  treeIds: readonly TreeId[]
): Promise<ReadonlyMap<string, PageName>> => {
  const named = await Promise.all(
    treeIds.map(async (treeId) => [treeId, await nameFor(reader, treeId)] as const)
  )

  return new Map(named)
}

/**
 * The name for one id out of a map, for a caller that cannot prove the id is in
 * it.
 *
 * Every caller is in that position and none of them should have to branch on it:
 * the front door looks up by the id on a waiting change, and a change can be
 * held against a page that has since dropped off the listing this map was built
 * from. The answer is the same one a failed read gets — untitled, with the id.
 */
export const nameFrom = (names: ReadonlyMap<string, PageName>, treeId: string): PageName =>
  names.get(treeId) ?? unnamed(treeId)
