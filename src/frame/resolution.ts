import type { JsonValue } from "../json.js"

import type { FrameOrigin, FrameOriginRegistry } from "./origin.js"

/**
 * The verdict on a URL a page means to put inside a frame, and the shape a
 * primitive reads it in.
 *
 * Nothing here knows about React, and nothing here reaches the network. The
 * whole seam is a URL parse against a list somebody wrote down, which is what
 * lets it happen inside a render rather than before one.
 */

/**
 * What a primitive is told about a URL it means to frame.
 *
 * Two states, and deliberately not three. A submission has `ready` and
 * `unavailable` and a third state expressed by absence — a form that was never
 * given a target at all — because "the tree said nothing" is a different fault
 * from "the deployment could not answer". A frame has no equivalent: the URL is
 * in the props, so a node either carries one or renders no frame, and there is
 * nothing for a primitive to distinguish. Either it may be framed or it may not,
 * and when it may not the refusal says why.
 */
export type FrameOutcome =
  | {
      readonly status: "allowed"
      /**
       * The URL to place, normalised through `URL`. Normalised rather than
       * echoed so that what the browser resolves is what this seam checked —
       * a `src` that differed from the string the allowlist was matched against
       * would make the check advisory.
       */
      readonly url: string
      readonly origin: FrameOrigin
      /**
       * The framed document is this deployment's own, so the primitive's
       * `sandbox` grants it nothing: `allow-scripts` with `allow-same-origin`
       * is only a boundary between two origins. Permitted — a host that
       * registered its own origin meant to — and said out loud, in the render's
       * diagnostics and here, because it is the one thing about a frame that
       * looks safe and is not.
       */
      readonly sameOrigin: boolean
    }
  | { readonly status: "refused"; readonly refusal: FrameRefusal }

/**
 * Why a URL will not be framed. Each is something a primitive may be told about
 * and a diagnostic says out loud; none of them is an exception anybody catches.
 */
export type FrameRefusal = {
  readonly reason:
    | /** No allowlist was wired, so this deployment frames nothing. */ "no-registry"
    | /** Parsed, and nobody registered its origin. */ "unlisted-origin"
    | /** Not an absolute http(s) URL at all — so it has no origin to check. */ "unframeable"
  readonly detail: string
}

export const describeFrameRefusal = (refusal: FrameRefusal): string => {
  switch (refusal.reason) {
    case "no-registry":
      return `this render was given no framable origins — ${refusal.detail}`
    case "unlisted-origin":
      return `no registered origin covers it — ${refusal.detail}`
    case "unframeable":
      return `it is not an absolute http(s) URL — ${refusal.detail}`
  }
}

/**
 * The whole check, as a pure function of a registry and a value.
 *
 * Total, like every other reading of something a model wrote: a prop that is
 * not a string, or is a string that is not a URL, is refused with a reason
 * rather than thrown over. The tree is AI-authored and the renderer is a total
 * projection (0008) — a page cannot be lost because a proposal put a number
 * where a URL goes.
 *
 * A missing registry refuses rather than permits, which is the same way the
 * submission seam fails and for the same reason: the registry *is* the
 * allowlist, so a deployment that has not written one has not decided to frame
 * anybody, and defaulting to "frame it" would make the seam a formality that
 * every host has to remember to switch on.
 */
export const resolveFrame = (
  declared: JsonValue | undefined,
  registry: FrameOriginRegistry | undefined
): FrameOutcome => {
  if (typeof declared !== "string") {
    return {
      status: "refused",
      refusal: {
        reason: "unframeable",
        detail: declared === undefined ? "no value was given" : `got ${typeof declared}`,
      },
    }
  }

  let url: URL
  try {
    url = new URL(declared)
  } catch {
    return {
      status: "refused",
      refusal: { reason: "unframeable", detail: `"${declared}" does not parse as a URL` },
    }
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return {
      status: "refused",
      refusal: { reason: "unframeable", detail: `"${url.protocol}" is not an http(s) scheme` },
    }
  }

  /**
   * Checked after parsing rather than before, so a `javascript:` src is refused
   * as unframeable on every deployment — including one that wired no allowlist
   * — rather than being lumped in with the ordinary video nobody has permitted
   * yet. The two are the same outcome and very different faults.
   */
  if (!registry) {
    return {
      status: "refused",
      refusal: { reason: "no-registry", detail: `"${url.origin}" was not checked against anything` },
    }
  }

  const registered = registry.origin(url)

  if (!registered) {
    return {
      status: "refused",
      refusal: { reason: "unlisted-origin", detail: `"${url.origin}" is not registered` },
    }
  }

  return {
    status: "allowed",
    url: url.href,
    origin: registered.origin,
    sameOrigin: registered.self,
  }
}

/**
 * A node's frames, by the prop name that carried each one.
 *
 * Keyed by prop name rather than by anything this seam invented, because the
 * prop is what the primitive already reads and what its schema already names.
 * A primitive that declared `src` reads `loom.frames.src` and gets an outcome
 * whenever the node carries that prop at all — including when what it carries
 * is nonsense, which is the case a refusal exists for.
 *
 * The map has a null prototype, for the reason `NO_SLOTS` gives: a prop may be
 * named `constructor`, and an ordinary object would answer that with a function
 * off `Object.prototype`.
 */
export type NodeFrames = Readonly<Record<string, FrameOutcome | undefined>>

export const NO_FRAMES: NodeFrames = Object.freeze(
  Object.create(null) as Record<string, FrameOutcome>
)
