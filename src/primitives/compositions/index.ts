import type { Composition, CompositionPart } from "./composition.js"
import { COMPOSITION_PARTS } from "./composition.js"
import { articlesBand } from "./articles-band.js"
import { bannerBand } from "./banner-band.js"
import { bentoBand } from "./bento-band.js"
import { catalogueBand } from "./catalogue-band.js"
import { changelogBand } from "./changelog-band.js"
import { codeBand } from "./code-band.js"
import { codeSessionBand } from "./code-session-band.js"
import { comparisonBand } from "./comparison-band.js"
import { conversationBand } from "./conversation-band.js"
import { contactBand } from "./contact-band.js"
import { contactDetailsBand } from "./contact-details-band.js"
import { credentialsBand } from "./credentials-band.js"
import { ctaBand } from "./cta-band.js"
import { ctaSignupBand } from "./cta-signup-band.js"
import { faqBand } from "./faq-band.js"
import { episodesBand } from "./episodes-band.js"
import { faqGridBand } from "./faq-grid-band.js"
import { featuresBand } from "./features-band.js"
import { feedBand } from "./feed-band.js"
import { featuresAlternatingBand } from "./features-alternating-band.js"
import { footerBand } from "./footer-band.js"
import { heroBand } from "./hero-band.js"
import { heroSplitBand } from "./hero-split-band.js"
import { integrationsBand } from "./integrations-band.js"
import { integrationsGridBand } from "./integrations-grid-band.js"
import { metricsBand } from "./metrics-band.js"
import { metricsChartBand } from "./metrics-chart-band.js"
import { navBand } from "./nav-band.js"
import { offeringsBand } from "./offerings-band.js"
import { pricingBand } from "./pricing-band.js"
import { pricingMatrixBand } from "./pricing-matrix-band.js"
import { proofBand } from "./proof-band.js"
import { proofFacesBand } from "./proof-faces-band.js"
import { proofStoryBand } from "./proof-story-band.js"
import { specsBand } from "./specs-band.js"
import { stepsBand } from "./steps-band.js"
import { stepsCardsBand } from "./steps-cards-band.js"
import { teamBand } from "./team-band.js"
import { testimonialsBand } from "./testimonials-band.js"
import { testimonialsWallBand } from "./testimonials-wall-band.js"

export type { Composition, CompositionPart, CompositionPlan, CompositionTarget } from "./composition.js"
export {
  COMPOSITION_INTERPRETER,
  COMPOSITION_PARTS,
  compositionInterpreter,
  planComposition,
} from "./composition.js"

export {
  articlesBand,
  bannerBand,
  bentoBand,
  catalogueBand,
  changelogBand,
  codeBand,
  codeSessionBand,
  comparisonBand,
  contactBand,
  conversationBand,
  contactDetailsBand,
  credentialsBand,
  ctaBand,
  ctaSignupBand,
  episodesBand,
  faqBand,
  faqGridBand,
  featuresBand,
  featuresAlternatingBand,
  feedBand,
  footerBand,
  heroBand,
  heroSplitBand,
  integrationsBand,
  integrationsGridBand,
  metricsBand,
  metricsChartBand,
  navBand,
  offeringsBand,
  pricingBand,
  pricingMatrixBand,
  proofBand,
  proofFacesBand,
  proofStoryBand,
  specsBand,
  stepsBand,
  stepsCardsBand,
  teamBand,
  testimonialsBand,
  testimonialsWallBand,
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
  navBand,
  heroBand,
  heroSplitBand,
  proofBand,
  proofFacesBand,
  proofStoryBand,
  featuresBand,
  featuresAlternatingBand,
  catalogueBand,
  bentoBand,
  stepsBand,
  stepsCardsBand,
  codeBand,
  codeSessionBand,
  conversationBand,
  integrationsBand,
  integrationsGridBand,
  metricsBand,
  metricsChartBand,
  specsBand,
  pricingBand,
  pricingMatrixBand,
  offeringsBand,
  comparisonBand,
  testimonialsBand,
  testimonialsWallBand,
  credentialsBand,
  teamBand,
  articlesBand,
  feedBand,
  episodesBand,
  changelogBand,
  faqBand,
  faqGridBand,
  contactBand,
  contactDetailsBand,
  ctaBand,
  ctaSignupBand,
  footerBand,
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
