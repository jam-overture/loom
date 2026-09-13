import type { Composition } from "./composition.js"
import { articlesBand } from "./articles-band.js"
import { bentoBand } from "./bento-band.js"
import { comparisonBand } from "./comparison-band.js"
import { contactBand } from "./contact-band.js"
import { ctaBand } from "./cta-band.js"
import { faqBand } from "./faq-band.js"
import { featuresBand } from "./features-band.js"
import { footerBand } from "./footer-band.js"
import { heroBand } from "./hero-band.js"
import { integrationsBand } from "./integrations-band.js"
import { metricsBand } from "./metrics-band.js"
import { navBand } from "./nav-band.js"
import { pricingBand } from "./pricing-band.js"
import { proofBand } from "./proof-band.js"
import { stepsBand } from "./steps-band.js"
import { teamBand } from "./team-band.js"
import { testimonialsBand } from "./testimonials-band.js"

export type { Composition, CompositionPlan, CompositionTarget } from "./composition.js"
export { COMPOSITION_INTERPRETER, compositionInterpreter, planComposition } from "./composition.js"

export {
  articlesBand,
  bentoBand,
  comparisonBand,
  contactBand,
  ctaBand,
  faqBand,
  featuresBand,
  footerBand,
  heroBand,
  integrationsBand,
  metricsBand,
  navBand,
  pricingBand,
  proofBand,
  stepsBand,
  teamBand,
  testimonialsBand,
}

/**
 * The bands, in the order a landing page uses them.
 *
 * The order is the whole of the extra information this list carries over the
 * nine modules, and it is worth having: taken in sequence these are a page, and
 * taken at random they are nine bands. Nothing enforces it — they are ordinary
 * compositions and any of them can be inserted anywhere — but a surface
 * offering a menu should offer it in this order, because the sequence is the
 * part somebody who has not assembled a landing page before does not know.
 *
 * Nine was not a target and not a ceiling, and it is now thirteen. The property
 * that made nine worth having is the one being preserved rather than the number:
 * **taken in sequence these are one complete page, with nothing missing and
 * nothing repeated.** The four added on 13 September each close a gap in that
 * sequence rather than offering a second way to do something already in it — a
 * page could not open (`nav`), could not say what happens next (`steps`), could
 * not argue against the thing a reader already uses (`comparison`), and could
 * not say who is behind it (`team`).
 *
 * **This list stops being a page before it stops being useful**, and that is the
 * thing for the next run to watch. A second hero, a two-tier pricing band, a
 * testimonial wall as a marquee — all legitimate, none of them insertable into a
 * sequence that is meant to read as one document. At that point the catalogue is
 * a phrasebook rather than a page and wants two lists: everything on offer, and
 * the ordered subset that assembles a page. It is not split here because
 * thirteen still assembles one, and splitting it before it breaks would be
 * inventing a structure ahead of its reader.
 */
export const STARTER_COMPOSITIONS: readonly Composition[] = [
  navBand,
  heroBand,
  proofBand,
  featuresBand,
  bentoBand,
  stepsBand,
  integrationsBand,
  metricsBand,
  pricingBand,
  comparisonBand,
  testimonialsBand,
  teamBand,
  articlesBand,
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
