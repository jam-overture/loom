import type { PrimitiveEntry } from "../sdk/definition.js"
import { createPrimitiveRegistry, type PrimitiveRegistry, type RegistryError } from "../sdk/registry.js"
import type { Result } from "../result.js"

import { loomAction } from "./loom.action.js"
import { loomBadge } from "./loom.badge.js"
import { loomDivider } from "./loom.divider.js"
import { loomFaq } from "./loom.faq.js"
import { loomFaqList } from "./loom.faq-list.js"
import { loomFeature } from "./loom.feature.js"
import { loomFeatureGrid } from "./loom.feature-grid.js"
import { loomHeading } from "./loom.heading.js"
import { loomHero } from "./loom.hero.js"
import { loomLogo } from "./loom.logo.js"
import { loomLogoCloud } from "./loom.logo-cloud.js"
import { loomMedia } from "./loom.media.js"
import { loomPage } from "./loom.page.js"
import { loomPerk } from "./loom.perk.js"
import { loomPerkList } from "./loom.perk-list.js"
import { loomPerkListItem } from "./loom.perk-list-item.js"
import { loomProse } from "./loom.prose.js"
import { loomQuote } from "./loom.quote.js"
import { loomQuoteGrid } from "./loom.quote-grid.js"
import { loomSection } from "./loom.section.js"
import { loomSplit } from "./loom.split.js"
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
 * ([0061](../../decisions/0061-a-suffix-that-names-the-markup-earns-its-place.md),
 * `Proposed`).
 *
 * The ordering is registration order, which is what a model reads first in the
 * catalogue, so the thing a page starts with is at the top: page structure,
 * then the bands in the order a page uses them, then the leaves that go
 * anywhere — which is where `loom.perk` sits and `loom.perk-list-item` does
 * not, since one of them has exactly one legal parent.
 */

export const STARTER_PRIMITIVES: readonly PrimitiveEntry[] = [
  loomPage,
  loomSection,
  loomSplit,
  loomHero,
  loomFeatureGrid,
  loomFeature,
  loomStatGrid,
  loomStat,
  loomTierTable,
  loomTier,
  loomPerkList,
  loomPerkListItem,
  loomQuoteGrid,
  loomQuote,
  loomLogoCloud,
  loomLogo,
  loomFaqList,
  loomFaq,
  loomHeading,
  loomProse,
  loomBadge,
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
export {
  loomAction,
  loomBadge,
  loomDivider,
  loomFaq,
  loomFaqList,
  loomFeature,
  loomFeatureGrid,
  loomHeading,
  loomHero,
  loomLogo,
  loomLogoCloud,
  loomMedia,
  loomPage,
  loomPerk,
  loomPerkList,
  loomPerkListItem,
  loomProse,
  loomQuote,
  loomQuoteGrid,
  loomSection,
  loomSplit,
  loomStat,
  loomStatGrid,
  loomTier,
  loomTierTable,
}
