import type { PrimitiveEntry } from "../sdk/definition.js"
import { createPrimitiveRegistry, type PrimitiveRegistry, type RegistryError } from "../sdk/registry.js"
import type { Result } from "../result.js"

import { loomAction } from "./loom.action.js"
import { loomArticle } from "./loom.article.js"
import { loomArticleGrid } from "./loom.article-grid.js"
import { loomBadge } from "./loom.badge.js"
import { loomCard } from "./loom.card.js"
import { loomDivider } from "./loom.divider.js"
import { loomFaq } from "./loom.faq.js"
import { loomFaqList } from "./loom.faq-list.js"
import { loomFeature } from "./loom.feature.js"
import { loomFeatureGrid } from "./loom.feature-grid.js"
import { loomGrid } from "./loom.grid.js"
import { loomHeading } from "./loom.heading.js"
import { loomHero } from "./loom.hero.js"
import { loomIcon } from "./loom.icon.js"
import { loomLogo } from "./loom.logo.js"
import { loomLogoCloud } from "./loom.logo-cloud.js"
import { loomMedia } from "./loom.media.js"
import { loomMilestone } from "./loom.milestone.js"
import { loomMilestoneList } from "./loom.milestone-list.js"
import { loomPage } from "./loom.page.js"
import { loomPerk } from "./loom.perk.js"
import { loomPerson } from "./loom.person.js"
import { loomPersonGrid } from "./loom.person-grid.js"
import { loomPerkList } from "./loom.perk-list.js"
import { loomPerkListItem } from "./loom.perk-list-item.js"
import { loomProduct } from "./loom.product.js"
import { loomProductGrid } from "./loom.product-grid.js"
import { loomProse } from "./loom.prose.js"
import { loomQuote } from "./loom.quote.js"
import { loomQuoteGrid } from "./loom.quote-grid.js"
import { loomSection } from "./loom.section.js"
import { loomSplit } from "./loom.split.js"
import { loomStack } from "./loom.stack.js"
import { loomStat } from "./loom.stat.js"
import { loomStatGrid } from "./loom.stat-grid.js"
import { loomTier } from "./loom.tier.js"
import { loomTierTable } from "./loom.tier-table.js"

/**
 * The starter primitive library, in three layers.
 *
 * **The structural ten** came first and were chosen to cover the *contract*
 * rather than the catalogue: four that compose, two of them through named
 * slots; five leaves; one rich schema with a cross-field rule (`media`); one
 * enum that changes what is rendered (`divider`); and one pair showing the
 * decomposition every Hermes list block follows (`stat-grid` over `stat`).
 *
 * **The composed eight** are the vocabulary a marketing page is actually built
 * from — hero, features, proof, questions. They exist because a library that
 * can express any structure and no *page* proves the contract and sells
 * nothing, and because §4d's marketing site is built from this list rather than
 * beside it: the demo vocabulary and the marketing vocabulary are one list.
 *
 * **The decision seven** are the two bands that close a sale and that the first
 * eighteen could not build: the pricing table, and a wall of proof rather than
 * a single pull quote. Three pairs and two leaves — `tier-table` over `tier`,
 * `perk-list` over `perk-list-item`, `quote-grid` over the `quote` that was
 * already there, the `badge` a featured tier needs so that "Most popular" is a
 * node someone placed rather than a boolean somebody set, and `perk`, which is
 * a perk-list-item's content in a `<div>` for the lines that stand alone
 * ([0061](../../decisions/0061-a-suffix-that-names-the-markup-earns-its-place.md)).
 *
 * **The compose-and-arrange four** are the general layer the first
 * twenty-five did without: `stack` and `grid` arrange whatever they are given,
 * `card` is a surface holding whatever is put on it, and `icon` is the glyph
 * that until now existed only inside a feature. Every container before them is
 * a *named band* — excellent at the section it was named for, and unable to say
 * "these two things, side by side". They are the basic end of the range, and
 * they are what the bands nobody has ported yet can be assembled from in the
 * meantime ([0062](../../decisions/0062-a-general-arranger-is-named-for-the-arrangement-alone.md)).
 *
 * **The sequence pair and the people pair** are the port resuming against the
 * remaining Hermes blocks now that there is something to assemble them from.
 * `milestone-list` over `milestone` is seven Hermes blocks at once — timeline,
 * journey, roadmap, changelog, process-steps, course-modules, event-agenda —
 * which are one content model wearing seven sets of words; `person-grid` over
 * `person` is two more. See `docs/hermes-port-map.md` for what the other
 * fifty-odd are and which of them need no primitive at all.
 *
 * **The catalogue pairs** are the two bands a page uses to list things that
 * exist elsewhere. `article-grid` over `article` is five Hermes blocks —
 * articles, press, case-studies, tutorials, recipes — which are one written
 * piece wearing five sets of words; `product-grid` over `product` is four more.
 * They are the pair of pairs that shows where a card's *target* goes, which is
 * the only thing separating them
 * ([0064](../../decisions/0064-a-card-is-the-target-when-it-is-read-and-the-control-is-the-target-when-it-is-bought.md)).
 *
 * The ordering is registration order, which is what a model reads first in the
 * catalogue, so the thing a page starts with is at the top: page structure,
 * then the bands in the order a page uses them, then the leaves that go
 * anywhere — which is where `loom.perk` sits and `loom.perk-list-item` does
 * not, since one of them has exactly one legal parent.
 *
 * The general arrangers sit with page structure rather than at the top, and
 * that placement is the one nudge this file gives: a model reading down the
 * catalogue meets `loom.feature-grid` before it has any reason to reach for
 * `loom.grid`, which is the order 0062 wants those two considered in.
 */

export const STARTER_PRIMITIVES: readonly PrimitiveEntry[] = [
  loomPage,
  loomSection,
  loomSplit,
  loomStack,
  loomGrid,
  loomCard,
  loomHero,
  loomFeatureGrid,
  loomFeature,
  loomMilestoneList,
  loomMilestone,
  loomStatGrid,
  loomStat,
  loomTierTable,
  loomTier,
  loomPerkList,
  loomPerkListItem,
  loomProductGrid,
  loomProduct,
  loomQuoteGrid,
  loomQuote,
  loomPersonGrid,
  loomPerson,
  loomArticleGrid,
  loomArticle,
  loomLogoCloud,
  loomLogo,
  loomFaqList,
  loomFaq,
  loomHeading,
  loomProse,
  loomBadge,
  loomIcon,
  loomPerk,
  loomDivider,
  loomMedia,
  loomAction,
]

/**
 * A registry over the starter library, as a `Result` like any other — building
 * one is the same operation for this library as for a host's own, and a helper
 * that threw where the general function returns would be a second contract to
 * learn.
 */
export const createStarterPrimitiveRegistry = (
  additional: readonly PrimitiveEntry[] = []
): Result<PrimitiveRegistry, RegistryError> =>
  createPrimitiveRegistry([...STARTER_PRIMITIVES, ...additional])

export * from "./tokens.js"
export * from "./stylesheet.js"
export * from "./layout.js"
export {
  loomAction,
  loomArticle,
  loomArticleGrid,
  loomBadge,
  loomCard,
  loomDivider,
  loomFaq,
  loomFaqList,
  loomFeature,
  loomFeatureGrid,
  loomGrid,
  loomHeading,
  loomHero,
  loomIcon,
  loomLogo,
  loomLogoCloud,
  loomMedia,
  loomMilestone,
  loomMilestoneList,
  loomPage,
  loomPerk,
  loomPerkList,
  loomPerkListItem,
  loomPerson,
  loomPersonGrid,
  loomProduct,
  loomProductGrid,
  loomProse,
  loomQuote,
  loomQuoteGrid,
  loomSection,
  loomSplit,
  loomStack,
  loomStat,
  loomStatGrid,
  loomTier,
  loomTierTable,
}
