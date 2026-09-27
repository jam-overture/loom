import type { ElementNode, LoomNode, LoomTree } from "@jam-overture/loom"

/**
 * The front door, band by band, and what a run of changes did to it.
 *
 * A record that only lists requests is half a record. The other half is the
 * thing itself: after four changes, what does the page actually read like now,
 * and which of its parts is the one that moved? This module answers that from
 * the page rather than from the requests — so the outline agrees with what a
 * visitor would see if they opened it, whatever the list above claims.
 *
 * **Bands are matched by identity, not by name.** A move keeps the band it
 * moves ([0044](../../../../../decisions/0044-a-move-relocates-a-subtree-and-the-analysis-measures-the-subtree.md)),
 * so the band that arrives under the headline *is* the one that was further
 * down, and saying so is only honest if the outline can tell the difference
 * between that and a copy. It can: the same band keeps the same id, and a band
 * that was inserted has one nothing has seen before. It also means the same
 * request made twice produces two rows rather than one confused one.
 */

/**
 * The bands named for what they are rather than for what they say.
 *
 * Three of them, and they are the three whose own words are a claim rather than
 * a label: the opening band's eyebrow is a tagline, and neither the menu nor
 * the foot of the page carries a heading at all. Two of the three are also what
 * this site's rules protect, so a reader who sees one of them move needs to
 * know which part of the page it is — and "For pages that AI is allowed to
 * change" does not tell them.
 *
 * Everything else is named by what it says, below.
 */
const NAMED_TYPES: Readonly<Record<string, string>> = {
  "loom.nav": "The menu",
  "loom.hero": "The opening",
  "loom.footer": "The foot of the page, and the way out",
}

/** What a band calls itself, in the order the words are preferred. */
const NAME_PROPS: readonly string[] = ["eyebrow", "label"]

/**
 * The bands that are not bands.
 *
 * A rule between two sections is punctuation. Listing it would pad the outline
 * with a row that says nothing about what the page contains, and a reader
 * counting rows against the page would be counting the wrong thing.
 */
const UNLISTED_TYPES: readonly string[] = ["loom.divider"]

const firstTextIn = (node: LoomNode): string | undefined =>
  node.kind === "text"
    ? node.value
    : node.children.reduce<string | undefined>((found, child) => found ?? firstTextIn(child), undefined)

/** A band's heading, when it has one and no shorter label of its own. */
const headingOf = (band: ElementNode): string | undefined => {
  const heading = band.children.find((child) => child.kind === "slot" && child.name === "heading")

  return heading === undefined ? undefined : firstTextIn(heading)
}

const nameOf = (band: ElementNode): string | undefined => {
  if (UNLISTED_TYPES.includes(band.type)) return undefined

  const written = NAME_PROPS.map((key) => band.props[key]).find(
    (value): value is string => typeof value === "string" && value.length > 0
  )

  return NAMED_TYPES[band.type] ?? written ?? headingOf(band)
}

/**
 * A band, as the two things anything outside this module wants to know about
 * one: which band it is, and what a reader would call it.
 *
 * **`what` is here as of 16 September and it is the same string a reader signal
 * carries.** A signal names a band by its id *and* by what kind of band it is,
 * so anything minting one off this page needs both — and going back to the page
 * for the second is a second walk that can disagree with the first. It is
 * `what` rather than `type` because this type is read by page builders, and
 * `type` is the word the machinery uses for it.
 */
export type Band = {
  readonly id: string
  readonly name: string
  /** The kind of band it is, as the library registered it. */
  readonly what: string
}

/** Every band of a page, in the order a reader meets them. */
export const bandsOf = (page: LoomTree): readonly Band[] =>
  page.root.children.flatMap((child) => {
    if (child.kind !== "element") return []

    const name = nameOf(child)

    return name === undefined ? [] : [{ id: child.id, name, what: child.type }]
  })

/** The outline as words, which is what the page prints when nothing has changed. */
export const outlineOf = (page: LoomTree): readonly string[] =>
  bandsOf(page).map((band) => band.name)

export type BandState = "kept" | "added" | "moved" | "taken-away"

export type OutlineRow = {
  readonly name: string
  readonly state: BandState
  /** What happened to it, when something did. Absent on a band nobody touched. */
  readonly note?: string
}

const rankIn = (order: readonly string[], id: string): number => order.indexOf(id)

/**
 * The outline of the changed page, with what each row has been through.
 *
 * Bands that were taken away come last rather than at the position they used to
 * hold. Showing an absence in place would be drawing a page that does not exist
 * — the rows above it are the page as it now reads, and a gap in the middle of
 * them would make a reader count wrong. Listed after, marked as gone, they are
 * an honest footnote to a correct list.
 */
export const outlineDiff = (start: LoomTree, page: LoomTree): readonly OutlineRow[] => {
  const before = bandsOf(start)
  const after = bandsOf(page)
  const beforeIds = new Set(before.map((band) => band.id))
  const afterIds = new Set(after.map((band) => band.id))

  /** The bands that survived, in each page's order, so a shift is a rank change. */
  const survivedBefore = before.filter((band) => afterIds.has(band.id)).map((band) => band.id)
  const survivedAfter = after.filter((band) => beforeIds.has(band.id)).map((band) => band.id)

  const present = after.map((band): OutlineRow => {
    if (!beforeIds.has(band.id)) {
      return { name: band.name, state: "added", note: "not here when you arrived" }
    }

    const was = rankIn(survivedBefore, band.id)
    const now = rankIn(survivedAfter, band.id)

    return was === now
      ? { name: band.name, state: "kept" }
      : {
          name: band.name,
          state: "moved",
          note: now < was ? "moved up the page" : "moved down the page",
        }
  })

  const gone = before
    .filter((band) => !afterIds.has(band.id))
    .map((band): OutlineRow => ({ name: band.name, state: "taken-away", note: "taken off the page" }))

  return [...present, ...gone]
}
