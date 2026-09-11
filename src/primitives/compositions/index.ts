import type { Composition } from "./composition.js"
import { ctaBand } from "./cta-band.js"
import { faqBand } from "./faq-band.js"
import { featuresBand } from "./features-band.js"
import { footerBand } from "./footer-band.js"
import { heroBand } from "./hero-band.js"
import { metricsBand } from "./metrics-band.js"
import { pricingBand } from "./pricing-band.js"
import { proofBand } from "./proof-band.js"
import { testimonialsBand } from "./testimonials-band.js"

export type { Composition, CompositionPlan, CompositionTarget } from "./composition.js"
export { COMPOSITION_INTERPRETER, compositionInterpreter, planComposition } from "./composition.js"

export {
  ctaBand,
  faqBand,
  featuresBand,
  footerBand,
  heroBand,
  metricsBand,
  pricingBand,
  proofBand,
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
 * Nine is not a target and not a ceiling. It is the set that assembles one
 * complete page with nothing missing and nothing repeated, which is the only
 * size that demonstrates what the catalogue claims.
 */
export const STARTER_COMPOSITIONS: readonly Composition[] = [
  heroBand,
  proofBand,
  featuresBand,
  metricsBand,
  pricingBand,
  testimonialsBand,
  faqBand,
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
