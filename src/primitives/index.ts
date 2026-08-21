import type { PrimitiveEntry } from "../sdk/definition.js"
import { createPrimitiveRegistry, type PrimitiveRegistry, type RegistryError } from "../sdk/registry.js"
import type { Result } from "../result.js"

import { loomAction } from "./loom.action.js"
import { loomArticle } from "./loom.article.js"
import { loomArticleGrid } from "./loom.article-grid.js"
import { loomAvatar } from "./loom.avatar.js"
import { loomAvatarRow } from "./loom.avatar-row.js"
import { loomBadge } from "./loom.badge.js"
import { loomButton } from "./loom.button.js"
import { loomCard } from "./loom.card.js"
import { loomCode } from "./loom.code.js"
import { loomDivider } from "./loom.divider.js"
import { loomFaq } from "./loom.faq.js"
import { loomFaqList } from "./loom.faq-list.js"
import { loomFeature } from "./loom.feature.js"
import { loomFeatureGrid } from "./loom.feature-grid.js"
import { loomField } from "./loom.field.js"
import { loomFooter } from "./loom.footer.js"
import { loomForm } from "./loom.form.js"
import { loomGrid } from "./loom.grid.js"
import { loomHeading } from "./loom.heading.js"
import { loomHero } from "./loom.hero.js"
import { loomIcon } from "./loom.icon.js"
import { loomKbd } from "./loom.kbd.js"
import { loomLink } from "./loom.link.js"
import { loomLinkList } from "./loom.link-list.js"
import { loomLogo } from "./loom.logo.js"
import { loomLogoCloud } from "./loom.logo-cloud.js"
import { loomMedia } from "./loom.media.js"
import { loomMilestone } from "./loom.milestone.js"
import { loomMilestoneList } from "./loom.milestone-list.js"
import { loomMosaic } from "./loom.mosaic.js"
import { loomNav } from "./loom.nav.js"
import { loomOption } from "./loom.option.js"
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
 * ([0066](../../decisions/0066-a-card-is-the-target-when-it-is-read-and-the-control-is-the-target-when-it-is-bought.md)).
 *
 * **The chrome four** are the top of the page and the bottom of it, which the
 * library went thirty-seven primitives without. `loom.link` is the plain text
 * link the catalogue never had — everything before it that wanted one had to
 * spend a `loom.action`, and a row of quiet buttons is not a menu; `loom.nav`
 * and `loom.footer` are the two bands that hold them, each with a region at
 * either end and the repeated part as children; `loom.link-list` is the named
 * column a footer is made of. They are the first primitives here with no Hermes
 * ancestor at all — a creator's profile got its chrome from the app shell, and
 * a marketing site has to say it in the tree
 * ([0068](../../decisions/0068-a-primitive-is-a-target-when-the-reader-aims-at-the-whole-of-it.md)
 * is the other half of this run and settles which of them is a target).
 *
 * **The form four** are the band where a page stops telling and starts asking,
 * and the first primitives here that post anywhere. `loom.form` is the first
 * caller of the submission seam
 * ([0065](../../decisions/0065-a-submission-names-a-destination-and-never-carries-one.md)),
 * which had shipped with nobody using it; `loom.field` is Hermes' twelve-shape
 * `fields` array turned into twelve nodes, with the options its `dropdown` type
 * never had; `loom.option` is one of those choices; and `loom.button` is the
 * control that sends the thing — an anchor's twin that goes nowhere, sharing
 * its paint through `control.ts` and carrying no destination of its own.
 *
 * The ordering is registration order, which is what a model reads first in the
 * catalogue, so the thing a page starts with is at the top: page structure,
 * then the bands in the order a page uses them, then the leaves that go
 * anywhere — which is where `loom.perk` sits and `loom.perk-list-item` does
 * not, since one of them has exactly one legal parent.
 *
 * **The technical five** are the vocabulary a page about a *tool* is written
 * in, which the library went forty-five primitives without. `loom.code` is the
 * snippet and the terminal — the one content model where whitespace is the
 * content, and the reason no arrangement of `loom.prose` could stand in for it;
 * `loom.kbd` is the key cap beside it. `loom.avatar` is the face that until now
 * could only be reached by claiming to be a `loom.person` or a `loom.quote`,
 * and `loom.avatar-row` is the cluster of them a page puts above a number.
 * `loom.mosaic` is the third general arranger and the first band here that is
 * not a table of identical rectangles — it answers the finding the marketing
 * lane filed against `loom.feature-grid` on 20 August, at the cost 0062 names
 * ([0079](../../decisions/0079-a-layout-css-alone-can-express-belongs-in-the-stylesheet.md)
 * is the width media query it needs).
 *
 * The general arrangers sit with page structure rather than at the top, and
 * that placement is the one nudge this file gives: a model reading down the
 * catalogue meets `loom.feature-grid` before it has any reason to reach for
 * `loom.grid`, which is the order 0062 wants those two considered in.
 */

export const STARTER_PRIMITIVES: readonly PrimitiveEntry[] = [
  loomPage,
  loomNav,
  loomSection,
  loomSplit,
  loomStack,
  loomGrid,
  loomMosaic,
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
  loomAvatarRow,
  loomArticleGrid,
  loomArticle,
  loomLogoCloud,
  loomLogo,
  loomFaqList,
  loomFaq,
  loomForm,
  loomField,
  loomOption,
  loomFooter,
  loomLinkList,
  loomHeading,
  loomProse,
  loomCode,
  loomBadge,
  loomIcon,
  loomAvatar,
  loomKbd,
  loomPerk,
  loomDivider,
  loomMedia,
  loomAction,
  loomButton,
  loomLink,
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
export * from "./control.js"
export * from "./stylesheet.js"
export * from "./layout.js"
export {
  loomAction,
  loomArticle,
  loomArticleGrid,
  loomAvatar,
  loomAvatarRow,
  loomBadge,
  loomButton,
  loomCard,
  loomCode,
  loomDivider,
  loomFaq,
  loomFaqList,
  loomFeature,
  loomFeatureGrid,
  loomField,
  loomFooter,
  loomForm,
  loomGrid,
  loomHeading,
  loomHero,
  loomIcon,
  loomKbd,
  loomLink,
  loomLinkList,
  loomLogo,
  loomLogoCloud,
  loomMedia,
  loomMilestone,
  loomMilestoneList,
  loomMosaic,
  loomNav,
  loomOption,
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
