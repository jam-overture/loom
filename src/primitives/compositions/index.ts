import type { Composition, CompositionPart } from "./composition.js"
import { COMPOSITION_PARTS } from "./composition.js"
import { articlesBand } from "./articles-band.js"
import { bentoBand } from "./bento-band.js"
import { changelogBand } from "./changelog-band.js"
import { comparisonBand } from "./comparison-band.js"
import { contactBand } from "./contact-band.js"
import { credentialsBand } from "./credentials-band.js"
import { ctaBand } from "./cta-band.js"
import { faqBand } from "./faq-band.js"
import { featuresBand } from "./features-band.js"
import { featuresAlternatingBand } from "./features-alternating-band.js"
import { footerBand } from "./footer-band.js"
import { heroBand } from "./hero-band.js"
import { heroSplitBand } from "./hero-split-band.js"
import { integrationsBand } from "./integrations-band.js"
import { metricsBand } from "./metrics-band.js"
import { navBand } from "./nav-band.js"
import { pricingBand } from "./pricing-band.js"
import { pricingMatrixBand } from "./pricing-matrix-band.js"
import { proofBand } from "./proof-band.js"
import { stepsBand } from "./steps-band.js"
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
  bentoBand,
  changelogBand,
  comparisonBand,
  contactBand,
  credentialsBand,
  ctaBand,
  faqBand,
  featuresBand,
  featuresAlternatingBand,
  footerBand,
  heroBand,
  heroSplitBand,
  integrationsBand,
  metricsBand,
  navBand,
  pricingBand,
  pricingMatrixBand,
  proofBand,
  stepsBand,
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
  navBand,
  heroBand,
  heroSplitBand,
  proofBand,
  featuresBand,
  featuresAlternatingBand,
  bentoBand,
  stepsBand,
  integrationsBand,
  metricsBand,
  pricingBand,
  pricingMatrixBand,
  comparisonBand,
  testimonialsBand,
  testimonialsWallBand,
  credentialsBand,
  teamBand,
  articlesBand,
  changelogBand,
  faqBand,
  contactBand,
  ctaBand,
  footerBand,
]

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
