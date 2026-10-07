import type { PrimitiveEntry } from "../sdk/definition.js"
import { createPrimitiveRegistry, type PrimitiveRegistry, type RegistryError } from "../sdk/registry.js"
import type { Result } from "../result.js"

import { loomAction } from "./loom.action.js"
import { loomArticle } from "./loom.article.js"
import { loomArticleGrid } from "./loom.article-grid.js"
import { loomAvatar } from "./loom.avatar.js"
import { loomAvatarRow } from "./loom.avatar-row.js"
import { loomBackdrop } from "./loom.backdrop.js"
import { loomBadge } from "./loom.badge.js"
import { loomBanner } from "./loom.banner.js"
import { loomBeforeAfter } from "./loom.before-after.js"
import { loomBook } from "./loom.book.js"
import { loomBookGrid } from "./loom.book-grid.js"
import { loomBrand } from "./loom.brand.js"
import { loomButton } from "./loom.button.js"
import { loomCallout } from "./loom.callout.js"
import { loomCard } from "./loom.card.js"
import { loomCarousel } from "./loom.carousel.js"
import { loomCode } from "./loom.code.js"
import { loomComparison } from "./loom.comparison.js"
import { loomComparisonRow } from "./loom.comparison-row.js"
import { loomComparisonTable } from "./loom.comparison-table.js"
import { loomCodeSpan } from "./loom.code-span.js"
import { loomCredential } from "./loom.credential.js"
import { loomCredentialGrid } from "./loom.credential-grid.js"
import { loomDialog } from "./loom.dialog.js"
import { loomDivider } from "./loom.divider.js"
import { loomEmbed } from "./loom.embed.js"
import { loomEmptyState } from "./loom.empty-state.js"
import { loomEmphasis } from "./loom.emphasis.js"
import { loomEvent } from "./loom.event.js"
import { loomEventGrid } from "./loom.event-grid.js"
import { loomFaq } from "./loom.faq.js"
import { loomFaqList } from "./loom.faq-list.js"
import { loomFeature } from "./loom.feature.js"
import { loomFeed } from "./loom.feed.js"
import { loomFeatureGrid } from "./loom.feature-grid.js"
import { loomField } from "./loom.field.js"
import { loomFooter } from "./loom.footer.js"
import { loomFrame } from "./loom.frame.js"
import { loomForm } from "./loom.form.js"
import { loomGrid } from "./loom.grid.js"
import { loomHalo } from "./loom.halo.js"
import { loomHeading } from "./loom.heading.js"
import { loomHero } from "./loom.hero.js"
import { loomIcon } from "./loom.icon.js"
import { loomKbd } from "./loom.kbd.js"
import { loomLightbox } from "./loom.lightbox.js"
import { loomInlineLink } from "./loom.inline-link.js"
import { loomLink } from "./loom.link.js"
import { loomLinkList } from "./loom.link-list.js"
import { loomLinkPager } from "./loom.link-pager.js"
import { loomLinkTrail } from "./loom.link-trail.js"
import { loomListing } from "./loom.listing.js"
import { loomListingGrid } from "./loom.listing-grid.js"
import { loomList } from "./loom.list.js"
import { loomListItem } from "./loom.list-item.js"
import { loomLogo } from "./loom.logo.js"
import { loomLogoCloud } from "./loom.logo-cloud.js"
import { loomMarquee } from "./loom.marquee.js"
import { loomMedia } from "./loom.media.js"
import { loomPlate } from "./loom.plate.js"
import { loomMenu } from "./loom.menu.js"
import { loomMessage } from "./loom.message.js"
import { loomMessageList } from "./loom.message-list.js"
import { loomMeter } from "./loom.meter.js"
import { loomMilestone } from "./loom.milestone.js"
import { loomMilestoneList } from "./loom.milestone-list.js"
import { loomMilestoneRow } from "./loom.milestone-row.js"
import { loomMosaic } from "./loom.mosaic.js"
import { loomNav } from "./loom.nav.js"
import { loomOrbit } from "./loom.orbit.js"
import { loomOverlay } from "./loom.overlay.js"
import { loomOffering } from "./loom.offering.js"
import { loomOfferingGrid } from "./loom.offering-grid.js"
import { loomOption } from "./loom.option.js"
import { loomWaitingState } from "./loom.waiting-state.js"
import { loomPage } from "./loom.page.js"
import { loomPerk } from "./loom.perk.js"
import { loomPerson } from "./loom.person.js"
import { loomPersonGrid } from "./loom.person-grid.js"
import { loomPin } from "./loom.pin.js"
import { loomPopover } from "./loom.popover.js"
import { loomPerkList } from "./loom.perk-list.js"
import { loomPerkListItem } from "./loom.perk-list-item.js"
import { loomProduct } from "./loom.product.js"
import { loomProductGrid } from "./loom.product-grid.js"
import { loomProse } from "./loom.prose.js"
import { loomReveal } from "./loom.reveal.js"
import { loomQuote } from "./loom.quote.js"
import { loomVoices } from "./loom.voices.js"
import { loomRating } from "./loom.rating.js"
import { loomRecording } from "./loom.recording.js"
import { loomRecordingGrid } from "./loom.recording-grid.js"
import { loomQuoteGrid } from "./loom.quote-grid.js"
import { loomSection } from "./loom.section.js"
import { loomSpec } from "./loom.spec.js"
import { loomSplit } from "./loom.split.js"
import { loomStack } from "./loom.stack.js"
import { loomStat } from "./loom.stat.js"
import { loomTally } from "./loom.tally.js"
import { loomTrend } from "./loom.trend.js"
import { loomStatChart } from "./loom.stat-chart.js"
import { loomStatGrid } from "./loom.stat-grid.js"
import { loomTable } from "./loom.table.js"
import { loomTableCell } from "./loom.table-cell.js"
import { loomTableRow } from "./loom.table-row.js"
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
 * **The comparison three** are the band that answers *how is this different
 * from what I already use*, and the only two-dimensional structure in the
 * library. `comparison-table` holds a region of subjects and a row per
 * criterion; `comparison-row` is that criterion and its answers; `comparison`
 * itself is one answer — one subject measured against one criterion, which is
 * what the word means — as a verdict, a value, or both. Two arrangements over
 * one singular, which is 0054's rule read at the depth this band actually has:
 * a row of comparisons, and a table of them. They
 * are a real `<table>` where `loom.tier-table` is deliberately a row of cards,
 * because a matrix a reader enters from either edge is the one band whose
 * value *is* its markup. `feature` names a column by position rather than by
 * id, which is the whole of
 * [0084](../../decisions/0084-in-a-two-dimensional-band-rows-are-nodes-and-columns-are-positions.md).
 *
 * **The table three** are the general case of that band, and they are
 * registered after it on purpose: a model reading down this list meets
 * `loom.tier-table` and `loom.comparison-table` before it has any reason to
 * reach for `loom.table`, which is the order 0062 wants a named band and its
 * general arranger considered in. What separates them is what a cell may hold —
 * a tier is a plan and a comparison is one of three verdicts, and a
 * `loom.table-cell` is whatever the tree puts in it. That is the table a course,
 * a changelog or a spec sheet is written with, and `Loom lessons` filed its
 * absence on 22 August after degrading thirteen lessons' tables into one card
 * per row. Rows are still nodes and columns are still positions (0084); the
 * heading of a *row* is a cell with `role` set rather than a prop on the row,
 * because a general table may have two heading columns or none.
 *
 * **The prose five** are the layer under all of it: what a page is *written*
 * in, as opposed to what it is built from. Fifty primitives could sell a plan
 * and prove it with a wall of quotes, and none of them could write three
 * bullet points or put one word of a sentence in bold — because Hermes had no
 * such block to port, its lists being fields inside other blocks and its prose
 * being a string. `loom.list` and `loom.list-item` are the run of points with
 * no marker meaning attached, which is what separates them from the three
 * list pairs that came before. `loom.emphasis` and `loom.code-span` are the
 * two spans a sentence can hold, and together they close the finding `Loom
 * lessons` filed on 19 August: a course about a codebase names a symbol in
 * almost every sentence, and until now the surface stripped the markers and
 * lost the distinction each question turned on. `loom.callout` is the aside a
 * page steps out of its flow to make — an `<aside>` rather than a `loom.card`,
 * for reasons about the document outline that its own comment gives. What to
 * call a pair whose child has no noun of its own is settled by 0062 and 0061
 * composing, and argued in `loom.list-item`'s comment rather than in a record,
 * for the numbering reason that comment ends on.
 *
 * **The two bands that ask for the sale** are the largest collapse left in the
 * Hermes port and the two halves of one question: *what can I book*, and *why
 * should I believe you*. `offering-grid` over `offering` is seven blocks —
 * services, coaching packages, mentorship tracks, donation tiers, a class
 * schedule, volunteer roles and a restaurant menu — which are one record wearing
 * seven sets of words; `credential-grid` over `credential` is four more, and a
 * favourite tool turns out to be a certification with the words changed. They
 * are the second pair of pairs to sit on either side of 0066: an offering is
 * acted on, so the control is the target and the card carries no overlay; a
 * credential is read, so the whole surface is. What is new in them is
 * [0094](../../decisions/0094-a-cards-prose-is-a-child-when-the-card-has-a-flow.md),
 * which is why one of the two holds its sentence as a node and the other holds
 * it as a prop, and a `loom.offering` that reads as a menu row when it is given
 * the width and as a card when it is not — one `@container` rule rather than two
 * primitives or a prop nobody should have to set twice.
 *
 * **The two bands that explain rather than sell** are the pair a page reaches
 * for after it has made its claim: *how it works*, and *what it works with*.
 * `loom.milestone-row` is the second arrangement of a child that already
 * existed — the same entries a rail runs down, laid across as numbered steps —
 * which is 0054's rule producing a container rather than the `loom.step` a
 * fourth set of words would have argued for. It cost four declarations moving
 * out of `loom.milestone` and into the stylesheet, because a child that lays
 * itself out inline cannot be rearranged by whatever it is in. `loom.orbit` is
 * the fourth general arranger and the second primitive here whose motion is the
 * point: children circling a mark it places in the middle, which is the claim a
 * logo wall cannot make. Landing either of them from a menu is what the same
 * run's `anchor` is for: `loom.section`, `loom.hero` and `loom.callout` now
 * take one, which is the first `id` this library renders and the reason a Loom
 * page can link to its own second screen (`anchor.ts`).
 *
 * **The exchange, and the way a band arrives** are what a page about a tool
 * that *answers you* needs and Hermes never had a block for. `message-list`
 * over `message` is the conversation itself, shown rather than described: an
 * `<ol>` because the order is the content, a turn whose body is a flow of
 * nodes ([0094](../../decisions/0094-a-cards-prose-is-a-child-when-the-card-has-a-flow.md))
 * and whose side, name, time and portrait are one record's worth of props, and
 * the first primitive here to draw a face outside a person's own card.
 * `loom.reveal` is the trigger the library was missing rather than the
 * animation: `.loom-rise` has fired on load since 0055, which means every band
 * below the fold finished arriving before anybody scrolled to it. It wraps
 * anything, says one word about which entrance it wants, and cannot hide what
 * is inside it — every rule that starts at `opacity: 0` sits inside
 * `@supports (animation-timeline: view())`, so a browser that cannot run the
 * animation never gets the starting state either
 * ([0110](../../decisions/0110-an-entrance-the-reader-drives-is-a-wrapper-not-a-prop-on-every-band.md)).
 *
 * **The product three** are the band a page about *software* is built on, and
 * the largest gap left that Hermes could not have had: it sold a person, and a
 * photograph of a person needs no chrome around it. `loom.frame` is a browser,
 * an app window or a phone drawn around whatever the tree puts on its screen —
 * a screenshot, a code panel, or a composition of primitives standing in for
 * one — and it is the difference between a picture on a page and a running
 * interface. `loom.pin` is the numbered mark over it, which is the field
 * `hotspots: Hotspot[]` would have been and is instead a node per mark, so a
 * label moves with a `move` and not with a rewrite of an array. `loom.rating`
 * is the proof this library could not show: a quote says one person liked it,
 * a logo wall says companies use it, and neither is the score a reader looks
 * for first.
 *
 * The pair is the third instance of `loom.orbit`'s shape — the repeated thing
 * in `children`, the singular thing it is arranged around in a slot — and the
 * first where the two arrangements of the children are *different layouts of
 * the same nodes*: marks over the screen where the frame is wide enough, and a
 * numbered legend under it where it is not, chosen by a `@container` query on
 * the frame rather than on the window, because a screenshot in one column of a
 * `loom.split` is narrow on the widest screen there is.
 * **The four between the bands** are what a page does that none of its bands
 * do: announce, orient, run past the edge, and show a proportion.
 * `loom.banner` is the strip above everything — the third primitive here whose
 * absence was Hermes' app shell owning the top of the window, after `loom.nav`
 * and `loom.footer`. `loom.link-trail` is the way back out, and it is
 * `loom.link` arranged a second way rather than a `loom.crumb`, because 0054's
 * own consequence is that one link primitive must not become two that differ by
 * the element they render. `loom.carousel` is the fifth general arranger and the
 * first that admits the reader has a phone: a row that scrolls and snaps, with
 * no state in the tree, because which item somebody is looking at is theirs and
 * not the page's (0008). `loom.meter` is the proportion `loom.stat` cannot
 * typeset — a stat states a figure and a meter draws it against its whole, which
 * is the only reason to draw one at all.
 *
 * **The two bands that cost a reader time rather than money** are the pairs
 * either side of a clock. `recording-grid` over `recording` is four Hermes
 * blocks — `video`, `video-playlist`, `playlist` and `podcast-episodes` — which
 * are one record wearing four sets of words, and it is the first card in the
 * library whose artwork is a *surface you press* rather than a picture of the
 * thing: the play mark and the runtime in the artwork's corner are what separate
 * it from the `loom.article` it otherwise resembles. `event-grid` over `event`
 * is the last of the four pairs `docs/hermes-port-map.md` had left, and the one
 * whose case had to be made against `loom.offering` rather than against the
 * milestone the map named — same fields, opposite reading order, because a
 * reader scanning a what's-on band is scanning *dates* and an offering's price
 * is a trailing detail. Both cards take 0094's answer rather than
 * `loom.offering`'s: neither turns a field into a children flow, so both hold
 * their sentence as a prop, and both are leaves. Both are also the third and
 * fourth callers of the containment trick `loom.offering` opened — one card that
 * reads as a queue row or a dated row when it is given the width, and as a card
 * when it is not.
 *
 * **The product three** are the band a page about *software* is built on, and
 * the largest gap left that Hermes could not have had: it sold a person, and a
 * photograph of a person needs no chrome around it. `loom.frame` is a browser,
 * an app window or a phone drawn around whatever the tree puts on its screen —
 * a screenshot, a code panel, or a composition of primitives standing in for
 * one — and it is the difference between a picture on a page and a running
 * interface. `loom.pin` is the numbered mark over it, which is the field
 * `hotspots: Hotspot[]` would have been and is instead a node per mark, so a
 * label moves with a `move` and not with a rewrite of an array. `loom.rating`
 * is the proof this library could not show: a quote says one person liked it,
 * a logo wall says companies use it, and neither is the score a reader looks
 * for first.
 *
 * The pair is the third instance of `loom.orbit`'s shape — the repeated thing
 * in `children`, the singular thing it is arranged around in a slot — and the
 * first where the two arrangements of the children are *different layouts of
 * the same nodes*: marks over the screen where the frame is wide enough, and a
 * numbered legend under it where it is not, chosen by a `@container` query on
 * the frame rather than on the window, because a screenshot in one column of a
 * `loom.split` is narrow on the widest screen there is.
 *
 * **The last two pairs close the Hermes ledger**, and between them they are
 * 0052 argued from both ends. `loom.book-grid` over `loom.book` is the *read*
 * card the port map had left — `book-list` and `currently-reading` are one
 * content model whose `year` and `status` are one label, and the two bands they
 * want are one card asking how much room it was given rather than two
 * primitives or a prop. `loom.listing-grid` over `loom.listing` is the
 * *acted-on* one, and the reason `loom.spec` exists: Hermes' listing holds
 * `beds`, `baths` and `sqft` as three fixed fields, which is one shape three
 * times — repeated content that never got to be a list, exactly as
 * `hours-of-operation`'s seven weekdays are. As nodes they take a fourth,
 * and a listing for a plot of land can drop the bedrooms it does not have.
 *
 * `loom.spec` is the only one of the five with no Hermes ancestor and the one
 * most likely to be used away from the band it was written for: a figure and
 * the unit it counts, at reading size, run together behind a middot. It is not
 * `loom.stat` for the reason `loom.meter` is not — same content model, different
 * markup, and a specification set at a headline's size shouts down the price it
 * belongs to.
 *
 * The general arrangers sit with page structure rather than at the top, and
 * that placement is the one nudge this file gives: a model reading down the
 * catalogue meets `loom.feature-grid` before it has any reason to reach for
 * `loom.grid`, which is the order 0062 wants those two considered in.
 */

export const STARTER_PRIMITIVES: readonly PrimitiveEntry[] = [
  loomPage,
  loomNav,
  loomMenu,
  loomBanner,
  loomSection,
  loomSplit,
  loomStack,
  loomGrid,
  loomMosaic,
  loomMarquee,
  loomCarousel,
  loomOrbit,
  loomReveal,
  loomBackdrop,
  loomOverlay,
  loomLightbox,
  loomPopover,
  loomDialog,
  loomHalo,
  loomCard,
  loomFrame,
  loomPin,
  loomHero,
  loomFeatureGrid,
  loomFeature,
  loomMilestoneList,
  loomMilestoneRow,
  loomMilestone,
  loomStatGrid,
  loomStatChart,
  loomTrend,
  loomStat,
  loomTally,
  loomMeter,
  loomTierTable,
  loomTier,
  loomPerkList,
  loomPerkListItem,
  loomOfferingGrid,
  loomOffering,
  loomComparisonTable,
  loomComparisonRow,
  loomComparison,
  loomTable,
  loomTableRow,
  loomTableCell,
  loomProductGrid,
  loomProduct,
  loomListingGrid,
  loomListing,
  loomSpec,
  loomQuoteGrid,
  loomQuote,
  loomVoices,
  loomPersonGrid,
  loomPerson,
  loomAvatarRow,
  loomArticleGrid,
  loomArticle,
  loomBookGrid,
  loomBook,
  loomRecordingGrid,
  loomRecording,
  loomEventGrid,
  loomEvent,
  loomLogoCloud,
  loomLogo,
  loomBrand,
  loomCredentialGrid,
  loomCredential,
  loomFaqList,
  loomFaq,
  loomMessageList,
  loomMessage,
  loomForm,
  loomField,
  loomOption,
  loomFooter,
  loomLinkList,
  loomLinkTrail,
  loomLinkPager,
  loomFeed,
  loomEmptyState,
  loomWaitingState,
  loomHeading,
  loomProse,
  loomList,
  loomListItem,
  loomCallout,
  loomCode,
  loomCodeSpan,
  loomEmphasis,
  loomBadge,
  loomRating,
  loomIcon,
  loomAvatar,
  loomKbd,
  loomPerk,
  loomDivider,
  loomMedia,
  loomPlate,
  loomEmbed,
  loomBeforeAfter,
  loomAction,
  loomButton,
  loomLink,
  loomInlineLink,
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
/**
 * The bands a page starts from, as subtrees rather than as primitives.
 *
 * Exported beside the library because a composition is knowledge *about* this
 * library — which of these ninety types go together, in what order, with what
 * in their slots — and it has no meaning apart from it. It registers nothing
 * and adds no type: everything it builds is in `STARTER_PRIMITIVES` above, and
 * `compositions.test.ts` fails if that stops being true.
 */
export type { Composition, CompositionPart, CompositionPlan, CompositionTarget } from "./compositions/index.js"
export {
  CATALOGUE_TYPES,
  COMPOSITION_INTERPRETER,
  COMPOSITION_PARTS,
  compositionById,
  compositionInterpreter,
  compositionsForPart,
  PAGE_SEQUENCE,
  planComposition,
  STARTER_COMPOSITIONS,
} from "./compositions/index.js"
export {
}
