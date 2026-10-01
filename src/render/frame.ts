import { resolveFrame, NO_FRAMES, type FrameOutcome, type NodeFrames } from "../frame/resolution.js"
import type { FrameOriginRegistry } from "../frame/origin.js"
import type { JsonObject } from "../json.js"
import type { PrimitiveType } from "../primitive-type.js"

/**
 * Holding a node's framable props against the origins a deployment permits.
 *
 * The check happens here, inside the walk, rather than in a pass before it —
 * which is the one structural difference between this seam and the two it is
 * modelled on. A binding is answered by a host's adapter and a form's target is
 * minted per request, so both may do IO and neither can happen inside a
 * synchronous render. An allowlist is a static host-authored list and a URL
 * parse; there is nothing to await, so there is no plan, no resolve, and no
 * second walk that could disagree with the first.
 *
 * Which props are framable is the primitive author's declaration, because it is
 * the one thing the runtime cannot work out for itself: a `src` reaching an
 * `iframe` and a `src` reaching an `img` are the same JSON string and very
 * different documents.
 */

/**
 * Which of a primitive's props reach a frame, read off whatever registered it.
 *
 * Structural, and detected the way `BehaviorResolver` is: a registry built by
 * the SDK satisfies it, and a host resolving from a plain map has registered
 * nothing that could declare a framable prop in the first place — so there is
 * nothing here to wire and nothing that can go missing.
 */
export interface FrameResolver {
  readonly framePropsFor: (type: PrimitiveType) => readonly string[]
}

export const isFrameResolver = (value: object): value is FrameResolver =>
  typeof (value as Partial<FrameResolver>).framePropsFor === "function"

/**
 * Every declared framable prop the node carries, checked, with each outcome
 * reported to the caller as it is decided.
 *
 * Reporting through a callback rather than returning a list keeps this pure of
 * the renderer's diagnostic vocabulary: what a refused frame is *called* is the
 * render's business, and what it *is* is this function's.
 */
export const resolveNodeFrames = (
  props: JsonObject,
  declared: readonly string[],
  registry: FrameOriginRegistry | undefined,
  report: (prop: string, outcome: FrameOutcome) => void
): NodeFrames => {
  if (declared.length === 0) return NO_FRAMES

  let frames: Record<string, FrameOutcome> | undefined

  for (const prop of declared) {
    /**
     * A declared frame prop the node does not carry is not a frame. An optional
     * `src` left out is a primitive rendering no frame at all, which is neither
     * a refusal nor something to report — so the entry is absent rather than
     * present and refused.
     */
    if (!Object.hasOwn(props, prop)) continue

    const outcome = resolveFrame(props[prop], registry)

    frames ??= Object.create(null) as Record<string, FrameOutcome>
    frames[prop] = outcome

    report(prop, outcome)
  }

  return frames ? Object.freeze(frames) : NO_FRAMES
}
