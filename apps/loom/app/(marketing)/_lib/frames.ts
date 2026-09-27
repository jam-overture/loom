import {
  createFrameOriginRegistry,
  describeFrameOriginRegistryError,
  type FrameOriginRegistry,
  type FrameOriginRegistryError,
  type Result,
} from "@jam-overture/loom"
import type { RenderDiagnostic } from "@jam-overture/loom/react"

/**
 * The one origin this site is willing to put inside a frame: its own.
 *
 * A tree names a URL, because which document belongs on a page is a content
 * decision. A deployment names the origins it will frame, because who may run a
 * script inside its pages is not — that is the whole of
 * [0095](../../../../../decisions/0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md),
 * and this file is this surface's half of it.
 *
 * **The list has exactly one entry and it is deliberate.** §4d says the site
 * embeds the demonstration rather than describing it, which is the reason the
 * demonstration is public at all
 * ([0056](../../../../../decisions/0056-the-demo-is-public-and-shares-nothing-but-the-deployment.md)),
 * and `/demo` is a route of this very application. No third party is framed
 * anywhere on this site, so no third party is registered here — a registry that
 * listed a video host "for later" would be a permission granted before anything
 * needed it.
 *
 * `self: true` is the load-bearing word rather than a label. A frame the seam
 * resolves as the deployment's own is granted `allow-forms`
 * ([0135](../../../../../decisions/0135-a-same-origin-frame-is-granted-what-its-own-document-needs.md)),
 * and without it the band does not work: every control in `/demo` is a server
 * action reached through a form element with a server action on it, so a visitor would get the
 * demonstration rendered perfectly, press the large green button, and watch
 * nothing happen. That is precisely what was built on 4 September, measured, and
 * withdrawn rather than shipped.
 *
 * It is not a widening of anything. For a frame of this origin the sandbox is
 * already not a boundary — `allow-same-origin` beside `allow-scripts` hands the
 * framed document its real origin — so the grant removes an inconsistency rather
 * than a protection, and `allow-top-navigation` is still withheld from every
 * frame including this one.
 */

/** What the catalogue says about the only origin this site frames. */
export const OWN_ORIGIN_DESCRIPTION =
  "This deployment's own pages — the demonstration framed on the front door."

/**
 * The registry, as the seam returns it — a value or the reason there is none.
 *
 * One function builds it and the two readings below narrow it, rather than two
 * functions each calling `createFrameOriginRegistry` with a list they both have
 * to keep the same. The list is the decision; a second copy of it is a second
 * place for the decision to be made differently.
 *
 * Built per render rather than once at module scope, and that is the difference
 * between this working on the deployment and working only on a laptop: the
 * origin is `siteOrigin()`, which reads `VERCEL_URL` — a different host on every
 * preview — so a registry frozen at import time would be an allowlist for
 * whichever deployment happened to import the module first. Building it is a URL
 * parse against a one-element list and reaches nothing, which is what makes that
 * affordable.
 */
export const siteFrameRegistry = (
  origin: string
): Result<FrameOriginRegistry, FrameOriginRegistryError> =>
  createFrameOriginRegistry([{ origin, description: OWN_ORIGIN_DESCRIPTION, self: true }])

/**
 * The registry a render is handed, or nothing.
 *
 * **A malformed origin yields no registry rather than an exception**, and the
 * page still renders: the seam refuses a frame it was given no allowlist for, so
 * the band draws its box and says the content cannot be shown, which is a
 * failure a visitor can see and a diagnostic the deployment can read. A landing
 * page that threw because an environment variable was mistyped would be the
 * worse of the two by a wide margin.
 */
export const siteFrameOrigins = (origin: string): FrameOriginRegistry | undefined => {
  const registry = siteFrameRegistry(origin)

  return registry.ok ? registry.value : undefined
}

/**
 * Why there is none, for a caller that wants to say so.
 *
 * Nothing on the site prints it — a visitor is told the content cannot be shown,
 * and the reason belongs where the person who can fix it is looking. It is here
 * so that a test can assert the refusal is *explained* rather than merely
 * absent, which is the difference between failing closed and failing silently.
 */
export const whyNoFrameOrigins = (origin: string): string | undefined => {
  const registry = siteFrameRegistry(origin)

  return registry.ok ? undefined : describeFrameOriginRegistryError(registry.error)
}

/**
 * The one diagnostic this site produces on purpose.
 *
 * `frame-same-origin` is a **disclosure rather than a fault**: the runtime says
 * out loud that the frame's sandbox grants the framed document nothing, because
 * `allow-scripts` beside `allow-same-origin` is only a boundary between two
 * origins and between one and itself it is nothing. A host that registered its
 * own origin meant to, which is exactly what `siteFrameRegistry` does — so this
 * line is the seam working, not the seam complaining.
 *
 * It matters because every page test on this site asserts *nothing the runtime
 * could not honour*, and until 18 September that was spelled `diagnostics` is
 * empty. Those two sentences were the same sentence while the site framed
 * nothing, and the front door framing the demonstration is what pulled them
 * apart.
 *
 * The split is the strict reading rather than the lenient one. `unhonoured`
 * holds the original claim exactly — anything the render could not do is still a
 * failing test — and the disclosure is not merely tolerated but **required**:
 * `frames.test.ts` asserts the front door emits exactly one of these, naming the
 * node and the origin. A frame that stopped being same-origin, or a second frame
 * appearing on a page, is a failure in both directions rather than a line
 * nobody reads.
 */
const DISCLOSED_CODES: ReadonlySet<RenderDiagnostic["code"]> = new Set(["frame-same-origin"])

/** Everything the render could not do, which is what a page test asserts is empty. */
export const unhonoured = (
  diagnostics: readonly RenderDiagnostic[]
): readonly RenderDiagnostic[] =>
  diagnostics.filter((diagnostic) => !DISCLOSED_CODES.has(diagnostic.code))

/** The frames this render permitted from this deployment's own origin. */
export const sameOriginFrames = (
  diagnostics: readonly RenderDiagnostic[]
): readonly Extract<RenderDiagnostic, { code: "frame-same-origin" }>[] =>
  diagnostics.filter(
    (diagnostic): diagnostic is Extract<RenderDiagnostic, { code: "frame-same-origin" }> =>
      diagnostic.code === "frame-same-origin"
  )
