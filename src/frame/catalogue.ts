import type { FrameOrigin, FrameOriginRegistry } from "./origin.js"

/**
 * Whose documents this deployment will frame, as a model is told it.
 *
 * The same projection `submissionCatalogue` makes for endpoints, and it exists
 * for the same reason turned around. An endpoint catalogue lists the *only*
 * things a model may name, because an address never appears in a tree. A frame
 * URL does appear in a tree — a model picks which video — so this catalogue is
 * not the whole of what may be written. It is the difference between a model
 * proposing a video that renders and a model proposing one that renders a
 * refusal, which is the difference between a good page and a wasted turn.
 *
 * `self` is deliberately not projected. Whether an origin is the deployment's
 * own changes what a frame is worth to whoever runs the deployment, and nothing
 * at all about which video belongs on the page.
 */

export type CataloguedFrameOrigin = {
  readonly origin: FrameOrigin
  /** One line, written by whoever runs the deployment. */
  readonly description: string
}

export type FrameCatalogue = readonly CataloguedFrameOrigin[]

export const frameCatalogue = (registry: FrameOriginRegistry): FrameCatalogue =>
  registry.origins.map((origin) => ({
    origin: origin.origin,
    description: origin.description,
  }))
