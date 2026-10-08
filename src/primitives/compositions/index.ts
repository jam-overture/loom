import type { Composition, CompositionPart } from "./composition.js"
import { COMPOSITION_PARTS } from "./composition.js"
import { articlesBand } from "./articles-band.js"
import { articlesIndexBand } from "./articles-index-band.js"
import { bannerBand } from "./banner-band.js"
import { bannerInlineBand } from "./banner-inline-band.js"
import { bentoBand } from "./bento-band.js"
import { bentoMixedBand } from "./bento-mixed-band.js"
import { catalogueBand } from "./catalogue-band.js"
import { changelogBand } from "./changelog-band.js"
import { changelogNotesBand } from "./changelog-notes-band.js"
import { codeBand } from "./code-band.js"
import { codeSessionBand } from "./code-session-band.js"
import { comparisonBand } from "./comparison-band.js"
import { comparisonWaysBand } from "./comparison-ways-band.js"
import { conversationBand } from "./conversation-band.js"
import { contactBand } from "./contact-band.js"
import { contactDetailsBand } from "./contact-details-band.js"
import { credentialsBand } from "./credentials-band.js"
import { credentialsPostureBand } from "./credentials-posture-band.js"
import { ctaBand } from "./cta-band.js"
import { ctaBookingBand } from "./cta-booking-band.js"
import { ctaSignupBand } from "./cta-signup-band.js"
import { faqBand } from "./faq-band.js"
import { episodesBand } from "./episodes-band.js"
import { faqGridBand } from "./faq-grid-band.js"
import { featuresBand } from "./features-band.js"
import { feedBand } from "./feed-band.js"
import { featuresAlternatingBand } from "./features-alternating-band.js"
import { footerBand } from "./footer-band.js"
import { footerSignupBand } from "./footer-signup-band.js"
import { heroBand } from "./hero-band.js"
import { heroShotBand } from "./hero-shot-band.js"
import { heroSplitBand } from "./hero-split-band.js"
import { integrationsBand } from "./integrations-band.js"
import { integrationsGridBand } from "./integrations-grid-band.js"
import { listingsBand } from "./listings-band.js"
import { metricsBand } from "./metrics-band.js"
import { metricsChartBand } from "./metrics-chart-band.js"
import { metricsLiveBand } from "./metrics-live-band.js"
import { metricsTrendBand } from "./metrics-trend-band.js"
import { navBand } from "./nav-band.js"
import { navCentredBand } from "./nav-centred-band.js"
import { navMenusBand } from "./nav-menus-band.js"
import { navDocsBand } from "./nav-docs-band.js"
import { offeringsBand } from "./offerings-band.js"
import { pricingBand } from "./pricing-band.js"
import { pricingMatrixBand } from "./pricing-matrix-band.js"
import { proofBand } from "./proof-band.js"
import { proofFacesBand } from "./proof-faces-band.js"
import { proofStoryBand } from "./proof-story-band.js"
import { shelfBand } from "./shelf-band.js"
import { specsBand } from "./specs-band.js"
import { specsSheetBand } from "./specs-sheet-band.js"
import { stepsBand } from "./steps-band.js"
import { stepsCardsBand } from "./steps-cards-band.js"
import { teamBand } from "./team-band.js"
import { teamLeadsBand } from "./team-leads-band.js"
import { testimonialsBand } from "./testimonials-band.js"
import { testimonialsCollectedBand } from "./testimonials-collected-band.js"
import { testimonialsWallBand } from "./testimonials-wall-band.js"
import { whatsOnBand } from "./whats-on-band.js"
import { trailBand } from "./trail-band.js"
import { documentBand } from "./document-band.js"
import { onwardBand } from "./onward-band.js"
import { DOCUMENT_PARTS, type DocumentComposition, type DocumentPart } from "./document.js"

export type { Band, Composition, CompositionPart, CompositionPlan, CompositionTarget } from "./composition.js"
export type { DocumentComposition, DocumentPart } from "./document.js"
export {
  COMPOSITION_INTERPRETER,
  COMPOSITION_PARTS,
  compositionInterpreter,
  planComposition,
} from "./composition.js"

export {
  articlesBand,
  articlesIndexBand,
  bannerBand,
  bannerInlineBand,
  bentoBand,
  bentoMixedBand,
  catalogueBand,
  changelogBand,
  changelogNotesBand,
  codeBand,
  codeSessionBand,
  comparisonBand,
  comparisonWaysBand,
  contactBand,
  conversationBand,
  contactDetailsBand,
  credentialsBand,
  credentialsPostureBand,
  ctaBand,
  ctaBookingBand,
  ctaSignupBand,
  episodesBand,
  faqBand,
  faqGridBand,
  featuresBand,
  featuresAlternatingBand,
  feedBand,
  footerBand,
  footerSignupBand,
  heroBand,
  heroShotBand,
  heroSplitBand,
  integrationsBand,
  integrationsGridBand,
  listingsBand,
  metricsBand,
  metricsChartBand,
  metricsLiveBand,
  metricsTrendBand,
  navBand,
  navCentredBand,
  navDocsBand,
  navMenusBand,
  offeringsBand,
  pricingBand,
  pricingMatrixBand,
  proofBand,
  proofFacesBand,
  proofStoryBand,
  shelfBand,
  specsBand,
  specsSheetBand,
  stepsBand,
  stepsCardsBand,
  teamBand,
  teamLeadsBand,
  testimonialsBand,
  testimonialsCollectedBand,
  testimonialsWallBand,
  whatsOnBand,
  trailBand,
  documentBand,
  onwardBand,
}

/**
 * Every band on offer — the phrasebook, not the page.
 *
 * ## What changed here, and why the old shape had to go
 *
 * Until 16 September this list was *both* the catalogue and the page: nineteen
 * bands, one of each, and taking them in order gave you a complete landing page
 * with nothing missing and nothing repeated. Its own doc comment named the day
 * that would stop working:
 *
 * > **This list stops being a page before it stops being useful**, and that is
 * > the thing for the next run to watch. A second hero, a two-tier pricing
 * > band, a testimonial wall as a marquee — all legitimate, none of them
 * > insertable into a sequence that is meant to read as one document.
 *
 * That day is this one, and the repository had already written down how it
 * would fail rather than leaving it to be noticed. `compositions.test.ts`
 * asserts the assembled page carries **exactly one level-one heading**, because
 * a second `level: 1` is the defect a hand-built page acquires by copying a
 * hero and is invisible under every palette. Add a second hero to a list that
 * is also the page and that test goes red — correctly. It is not in the way; it
 * is the measurement saying the two jobs have come apart.
 *
 * So they are two lists now. **This one is everything on offer** and grows
 * without limit, because a phrasebook of designs is what the range mandate
 * actually asks for and is what 21st.dev's numbers count — 1152 heroes there
 * are one block drawn 1152 ways, not 1152 blocks.
 * {@link PAGE_SEQUENCE} is the ordered subset that still assembles one
 * document, and it is **derived** rather than hand-kept, so the two cannot
 * drift apart.
 *
 * ## What may be added here, which is narrower than it looks
 *
 * A design earns a place only if it differs from the part's other designs in
 * **the set of nodes it builds**. That is
 * [0052](../../../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)'s
 * own test lifted one level: a band that differs from another only in its props
 * is not a second design, it is a `configure` of the first, and shipping it
 * would put a catalogue entry where a one-operation edit belongs. A centred
 * hero and a left-aligned hero are one band. A hero with an empty media region
 * and a hero holding a framed product shot are two, because one of them has a
 * subtree the other does not.
 */
export const STARTER_COMPOSITIONS: readonly Composition[] = [
  bannerBand,
  bannerInlineBand,
  navBand,
  navCentredBand,
  navMenusBand,
  navDocsBand,
  heroBand,
  heroSplitBand,
  heroShotBand,
  proofBand,
  proofFacesBand,
  proofStoryBand,
  featuresBand,
  featuresAlternatingBand,
  catalogueBand,
  shelfBand,
  listingsBand,
  bentoBand,
  bentoMixedBand,
  stepsBand,
  stepsCardsBand,
  codeBand,
  codeSessionBand,
  conversationBand,
  integrationsBand,
  integrationsGridBand,
  metricsBand,
  metricsChartBand,
  metricsLiveBand,
  metricsTrendBand,
  specsBand,
  specsSheetBand,
  pricingBand,
  pricingMatrixBand,
  offeringsBand,
  comparisonBand,
  comparisonWaysBand,
  testimonialsBand,
  testimonialsWallBand,
  testimonialsCollectedBand,
  credentialsBand,
  credentialsPostureBand,
  teamBand,
  teamLeadsBand,
  articlesBand,
  articlesIndexBand,
  feedBand,
  episodesBand,
  whatsOnBand,
  changelogBand,
  changelogNotesBand,
  faqBand,
  faqGridBand,
  contactBand,
  contactDetailsBand,
  ctaBand,
  ctaSignupBand,
  ctaBookingBand,
  footerBand,
  footerSignupBand,
]

/**
 * Every primitive type some band in the phrasebook builds, sorted.
 *
 * ## Why a library needs to be able to answer this about itself
 *
 * On 19 September this was measured for the first time and the answer was
 * **fifty-two of ninety-six**. Forty-four registered primitives — tested,
 * documented, described in every interpretation request a deployment sends —
 * could not be reached by dropping in a band, because no band used them.
 *
 * That is not a defect and this is deliberately **not a ceiling**. A primitive
 * is registered before a band uses it, always, so a test demanding the two
 * lists match would fire on the ordinary order of work —
 * [0170](../../../decisions/0170-a-library-is-a-set-to-choose-from-and-a-vocabulary-is-priced-per-entry.md)
 * declined a character budget over the primitives block for exactly that
 * reason on the same day this was written: *a ceiling that fires on the growth
 * we asked for* becomes a number somebody raises without reading.
 *
 * ## What it is for, which 0170 landing the same day made concrete
 *
 * 0170's other half is `selectPrimitives(entries, types)` — a deployment
 * registers a **slice** of the starter library rather than all of it, because
 * the library is a set to choose from. That function needs a list of types and
 * says nothing about which list; this is the one a host wanting the catalogue
 * should pass:
 *
 * ```ts
 * selectPrimitives(STARTER_PRIMITIVES, CATALOGUE_TYPES)
 * ```
 *
 * is **the smallest registry that can build every band in the phrasebook**,
 * and it cannot refuse, because `compositions.test.ts` asserts every member of
 * this list is registered. Measured against 0170's own instrument on
 * 19 September, and re-taken after #338 reworked the prompt: **63 entries and
 * 10,432 characters, against 96 and 16,718 — 38% off every interpretation
 * request, with nothing lost that the catalogue could reach anyway.**
 *
 * Neither lane could have written that line alone, and it is the practical
 * answer to *why measure reach at all*: the gap is not only unreachable
 * surface, it is surface a deployment is paying for on every request.
 *
 * What it is instead is **the measurement made reproducible**. The number
 * above came from a script in a scratch directory, and a number arrived at
 * that way is a number the next run re-derives or trusts. Exported, the gap
 * is one `filter` from any registry, and a run can say which way it moved
 * rather than what it is.
 *
 * It is the union of the bands' own `uses` rather than a second walk of their
 * subtrees, because `uses` is already held against the subtree by
 * `compositions.test.ts` in both directions — a second derivation here would
 * be a second thing to keep in step.
 */
export const CATALOGUE_TYPES: readonly string[] = [
  ...new Set(STARTER_COMPOSITIONS.flatMap((composition) => composition.uses)),
].sort()

/**
 * The band with this id, or `undefined`.
 *
 * A lookup rather than a `Record` keyed by a union of the ids, because the id a
 * surface holds arrives from a URL or a click and is a `string` by the time it
 * gets here. A map typed on the ids would make every caller narrow first and
 * would be exactly as capable of returning nothing.
 */
export const compositionById = (id: string): Composition | undefined =>
  STARTER_COMPOSITIONS.find((composition) => composition.id === id)

/**
 * Every design of one band, in catalogue order, canonical design first.
 *
 * This is the question a surface actually has — *show me the heroes* — and
 * before `part` existed it could only be answered by knowing the ids in
 * advance, which is the thing
 * [0114](../../../decisions/0114-a-primitive-declares-what-part-it-plays-and-the-registry-is-asked.md)
 * refuses one level down. It returns an array rather than a non-empty one
 * because a part with no design is a coherent future state — a part named in
 * the sequence that nobody has drawn yet — and a caller that has to handle
 * `undefined` from {@link compositionById} can handle an empty list here.
 */
export const compositionsForPart = (part: CompositionPart): readonly Composition[] =>
  STARTER_COMPOSITIONS.filter((composition) => composition.part === part)

/**
 * One design of each band, in the order a page uses them.
 *
 * **Derived, and that is the point.** The canonical design of a part is the one
 * whose id *is* the part's name, so this is `COMPOSITION_PARTS` looked up one
 * at a time and nothing has to keep a second list in step with the first. A
 * band added to the phrasebook cannot silently change the page, and a part left
 * with no canonical design is a red test rather than a page with a hole in it.
 *
 * What it is *for* is the thing nineteen bands in a fixed order were carrying
 * all along, and it is worth saying plainly because it is the part a person
 * assembling their first landing page does not know: **taken in sequence these
 * are one complete document**, with nothing missing and nothing repeated. A
 * surface offering a menu of bands should offer the phrasebook; a surface
 * offering to *start a page* should offer this.
 */
export const PAGE_SEQUENCE: readonly Composition[] = COMPOSITION_PARTS.flatMap((part) => {
  const canonical = compositionById(part)

  return canonical === undefined ? [] : [canonical]
})

/**
 * Every design of every region of an interior document.
 *
 * **A second list rather than an addition to {@link STARTER_COMPOSITIONS}**, and
 * that is deliberate while
 * [0241](../../../decisions/0241-a-second-page-sequence-is-earned-by-regions-in-a-different-order-and-the-sites-own-regions-are-shared.md)
 * is `Proposed`. `compositions.test.ts` asserts that **every band declares a
 * part the page sequence knows**, which is the guard whose class caught the
 * duplicate-anchor defect; appending document bands to the landing phrasebook
 * would have meant weakening it, and a routine does not weaken a test to make
 * room for its own work.
 *
 * What review has to settle is whether the phrasebook is one list or one per
 * page kind. From here both answers cost a rename: this becomes the union, or
 * it stays the second of two. The record argues the first is the more natural
 * reading of 0162 and declines to take it, because it changes a published
 * export that two other lanes read.
 *
 * `nav` and `footer` are **not** here. They are regions of the site rather than
 * of the page, so {@link DOCUMENT_SEQUENCE} resolves them out of the landing
 * catalogue and a deployment that changes its header changes it once.
 */
export const DOCUMENT_COMPOSITIONS: readonly DocumentComposition[] = [trailBand, documentBand, onwardBand]

/**
 * Which design each region of a document takes.
 *
 * **A page kind is a tuple of regions plus, for each, which design fills it** —
 * and the second half is not ceremony. `PAGE_SEQUENCE` can derive its designs
 * from the part names alone because a landing page takes every canonical; a
 * document does not, and the reason is a rule nobody had had to scope until a
 * test refused the simpler shape.
 *
 * [0168](../../../decisions/0168-a-band-links-into-the-page-it-is-assembled-into.md)
 * says a band links into the page it is assembled into, and `navBand` honours
 * it: its menu is four fragments of `PAGE_SEQUENCE` and its wordmark points at
 * the hero's `#top`. Shared onto a document those are five links into bands
 * that are not there. So **`footer` is shared and `nav` is not** — the footer's
 * nineteen links are all routes, and `nav-docs` is the design of the same
 * region whose links are too.
 *
 * Held as a mapping rather than by the id convention so that the choice is
 * *written down* where a reader can see which design a document takes and why
 * it is not always the canonical. `documents.test.ts` holds every entry against
 * a band that exists and is a design of that region, which is exactly the
 * strength the name convention had.
 */
export const DOCUMENT_DESIGNS: Readonly<Record<DocumentPart, string>> = {
  nav: "nav-docs",
  trail: "trail",
  document: "document",
  onward: "onward",
  footer: "footer",
}

/**
 * The band with this id from either catalogue, document first.
 *
 * A region whose design is this sequence's own finds it in
 * {@link DOCUMENT_COMPOSITIONS}; a region that takes a design of a landing part
 * — `nav-docs`, `footer` — falls through to the landing phrasebook and gets the
 * **same band** rather than a copy of it.
 */
const bandWithId = (id: string): Composition | DocumentComposition | undefined =>
  DOCUMENT_COMPOSITIONS.find((composition) => composition.id === id) ?? compositionById(id)

/**
 * One design of each region of an interior document, in the order a reader
 * meets them.
 *
 * Derived from {@link DOCUMENT_PARTS} exactly as {@link PAGE_SEQUENCE} is
 * derived from `COMPOSITION_PARTS`, and for the same reason: nothing has to keep
 * a second list in step with the first, a band added to the catalogue cannot
 * silently change the page, and a part left with no canonical design is a red
 * test rather than a page with a hole in it.
 *
 * **Taken in sequence these are one complete document** — a header, the reader's
 * position, the text with its contents beside it, the way on, and the footer.
 * There is no hero, which is the thing that makes it a second sequence rather
 * than a path through the first.
 */
export const DOCUMENT_SEQUENCE: readonly (Composition | DocumentComposition)[] = DOCUMENT_PARTS.flatMap((part) => {
  const chosen = bandWithId(DOCUMENT_DESIGNS[part])

  return chosen === undefined ? [] : [chosen]
})

/**
 * The primitive types the document sequence needs, which is the second half of
 * the registry a host building both kinds of page registers:
 *
 * ```ts
 * selectPrimitives(STARTER_PRIMITIVES, [...CATALOGUE_TYPES, ...DOCUMENT_TYPES])
 * ```
 *
 * Kept separate from {@link CATALOGUE_TYPES} for the reason
 * {@link DOCUMENT_COMPOSITIONS} is kept separate — that export is counted by a
 * surface in another lane, and widening what it means is the record's question
 * rather than this module's. The union is the honest reach measurement and
 * `documents.test.ts` is where it is taken.
 *
 * It is the union of the sequence's `uses` rather than a walk of its subtrees,
 * because `uses` is held against the subtree in both directions by
 * `documents.test.ts`.
 */
export const DOCUMENT_TYPES: readonly string[] = [
  ...new Set(DOCUMENT_SEQUENCE.flatMap((composition) => composition.uses)),
].sort()

export { DOCUMENT_PARTS } from "./document.js"
