import { sequentialIdFactory, type LoomTree, type ProposalId } from "@jam-overture/loom"
import { treesAt, type TreeStore } from "@jam-overture/loom/store"

import { compareTrees, type Comparison } from "./compare"
import { currentCopyOf, type PageCopy } from "./proposing/copies"
import { acceptedOn, standsOn } from "./proposing/following"

/**
 * The two pages *Compare* draws for a Loom change on a page's history: the
 * page just before the change and just after it, rebuilt from the record of
 * the page's current copy (0358 clause 5).
 *
 * **Loom keeps a copy's changes and its newest page, not the page it began
 * as.** The page it began as is the version the site last published, so the
 * record is folded from that version, and only while the copy still stands on
 * it (`standsOn`), as *Propose reverting* plans from it. A change dropped when
 * the site published a newer version is on an older copy whose start Loom no
 * longer has, so it is not drawn, and the drawer says why rather than drawing
 * a guess.
 */
export type Compared =
  | { readonly kind: "drawn"; readonly comparison: Comparison }
  | { readonly kind: "not-drawn"; readonly why: NotDrawn }
  /** The record could not be read. Nothing is wrong with the page. */
  | { readonly kind: "unreadable" }

export type NotDrawn =
  /** Not on the live page's record: it no longer fitted the site's newer version. */
  | "off-the-page"
  /** The site's page is not the one Loom's copy started from, so the copy's start is not known. */
  | "site-moved"
  /** The record would not fold back to the change. */
  | "not-rebuilt"

export type CompareReading = {
  readonly trees: Pick<TreeStore, "head" | "revisions">
  /** Every copy the application has started, as `PageCopyStore.list` answers. */
  readonly copies: readonly PageCopy[]
  /** The page as the site last published it. */
  readonly published: LoomTree
}

const notDrawn = (why: NotDrawn): Compared => ({ kind: "not-drawn", why })

const UNREADABLE: Compared = { kind: "unreadable" }

/** The page before one accepted change and after it, or why it cannot be drawn. */
export const compareChange = async (
  given: CompareReading,
  proposalId: ProposalId
): Promise<Compared> => {
  const { trees, published } = given
  const copyId = currentCopyOf(given.copies, published.treeId).copyId
  const onCopy = await acceptedOn(trees, copyId)

  if (!onCopy.ok) return onCopy.error.code === "not-found" ? notDrawn("off-the-page") : UNREADABLE

  const target = onCopy.value.find((revision) => revision.proposalId === proposalId)

  if (target === undefined) return notDrawn("off-the-page")

  const head = await trees.head(copyId)

  if (!head.ok) return UNREADABLE

  /** Delta ids minted to check a replay are thrown away with it, so any factory will do. */
  if (!standsOn(head.value, onCopy.value, published, sequentialIdFactory("compare"))) {
    return notDrawn("site-moved")
  }

  const rebuilt = await treesAt(trees, {
    treeId: copyId,
    revisions: [target.revision - 1, target.revision],
    seed: { ...published, treeId: copyId },
  })

  if (!rebuilt.ok) return UNREADABLE

  const before = rebuilt.value.get(target.revision - 1)
  const after = rebuilt.value.get(target.revision)

  return before?.outcome === "replayed" && after?.outcome === "replayed"
    ? { kind: "drawn", comparison: compareTrees(before.replayed.tree, after.replayed.tree) }
    : notDrawn("not-rebuilt")
}

/** Why a change is not drawn, as the drawer says it. */
export const NOT_DRAWN_WORDS: Readonly<Record<NotDrawn, string>> = {
  "off-the-page":
    "This change is no longer on the page, because it did not fit your site's newer version. Loom keeps only the version your site last published, so the page as it was around this change cannot be drawn.",
  "site-moved":
    "Your site has published a newer version of this page that Loom has not followed yet, so Loom cannot rebuild the page as it was around this change. Compare after Loom's next look.",
  "not-rebuilt":
    "Loom could not rebuild the page as it was around this change from its record. The change itself is one click away on its timeline.",
}
