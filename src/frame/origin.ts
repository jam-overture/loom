import { z } from "zod"

import { err, ok, type Result } from "../result.js"

/**
 * The host's half of the framing seam: whose documents this deployment is
 * willing to put inside an `iframe`.
 *
 * [0053](../../decisions/0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md)
 * holds every AI-authored URL in the library to a scheme allowlist, and for an
 * `href` or an `img src` that has been enough — the worst a bad `https:` link
 * does is disappoint whoever clicks it. A frame is different in kind: it is a
 * whole document with a script host in it, running inside the page, named by a
 * model. `https:` says nothing at all about who is on the other end.
 *
 * So this seam is shaped unlike the submission seam it is modelled on, in one
 * way that matters. A form's address never appears in the tree at all (0065),
 * because nothing about *where* a visitor's data goes is a content decision. A
 * frame's URL is entirely a content decision — which video, which map, which
 * prototype — and a registry of whole URLs would be a deployment registering
 * every video it might ever show. What a deployment can say once, and mean
 * forever, is **whose documents it will frame**. So the tree keeps the URL and
 * the registry holds the origins.
 */

/**
 * A host-authored origin — scheme, host and port, and nothing else.
 *
 * Normalised through `URL` rather than compared as text, so `HTTPS://Example.com`
 * and `https://example.com:443/` are the one registration they obviously are.
 * A path is refused rather than ignored: `https://example.com/embed` looks like
 * it narrows the allowlist to a directory and would not, and an allowlist that
 * silently permits more than it appears to is worse than no allowlist.
 */
export const frameOriginSchema = z
  .string()
  .superRefine((value, context) => {
    const parsed = parseOrigin(value)

    if (!parsed.ok) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: parsed.error })
    }
  })
  .transform((value) => {
    const parsed = parseOrigin(value)

    /**
     * `superRefine` has already refused everything this cannot parse, so the
     * fallback is unreachable. It is written rather than asserted away because
     * a non-null assertion here would be a claim about two functions staying in
     * step, and the whole point of this module is not making claims like that.
     */
    return parsed.ok ? parsed.value : value
  })
  .brand<"FrameOrigin">()

export type FrameOrigin = z.infer<typeof frameOriginSchema>

const parseOrigin = (value: string): Result<string, string> => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return err("must be an absolute http(s) origin, like \"https://player.vimeo.com\"")
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return err(`must be an http(s) origin; "${url.protocol}" is not one`)
  }

  if (url.pathname !== "/" || url.search !== "" || url.hash !== "") {
    return err("must be an origin and nothing else — no path, query or fragment")
  }

  /**
   * `new URL("https://user:secret@example.com")` parses, and its `origin` drops
   * the credentials silently. Registering one would be a deployment believing
   * it had scoped an allowlist to an authenticated host when it had not.
   */
  if (url.username !== "" || url.password !== "") {
    return err("must carry no credentials")
  }

  return ok(url.origin)
}

/**
 * What a deployment says about one origin it will frame.
 *
 * The description is here for the same reason an endpoint's is: it reaches the
 * catalogue a model reads. A model asked to put a product video on a page can
 * only sensibly name a URL on an origin it was told about, and being told is
 * cheaper for everyone than being refused afterwards.
 */
export type FrameOriginDefinition = {
  readonly origin: string
  /** One line, for the catalogue — "Vimeo player embeds". */
  readonly description: string
  /**
   * Whether this origin is the deployment's own.
   *
   * It changes nothing about whether a frame is permitted and everything about
   * what the frame is worth. A primitive's `sandbox` is only a sandbox at all
   * *because* the framed document is cross-origin: `allow-scripts` beside
   * `allow-same-origin` on a document from this very origin re-grants the
   * document full access to the page that framed it. Nothing in a render could
   * previously tell — this is the one place that can, because it is the only
   * place that knows what "own" means for this deployment.
   */
  readonly self?: boolean
}

export type RegisteredFrameOrigin = {
  readonly origin: FrameOrigin
  readonly description: string
  readonly self: boolean
}

export type FrameOriginRegistryError =
  | { readonly code: "invalid-frame-origin"; readonly origin: string; readonly detail: string }
  | { readonly code: "duplicate-frame-origin"; readonly origin: string }

export const describeFrameOriginRegistryError = (error: FrameOriginRegistryError): string =>
  error.code === "invalid-frame-origin"
    ? `"${error.origin}" is not a framable origin — ${error.detail}`
    : `"${error.origin}" is registered twice; the second registration could only disagree with the first about whether it is this deployment's own`

export interface FrameOriginRegistry {
  /** `undefined` when nothing registered covers the URL's origin. */
  readonly origin: (url: URL) => RegisteredFrameOrigin | undefined
  /** In registration order, so a catalogue reads predictably. */
  readonly origins: readonly RegisteredFrameOrigin[]
}

const firstIssue = (error: z.ZodError): string =>
  error.issues[0]?.message ?? "was refused, without saying why"

/**
 * Building the registry is pure and reaches nothing. An allowlist is a static
 * fact about a deployment — it does not vary by visitor, it is not minted per
 * request, and there is nothing to await — which is why this seam has no plan
 * and no resolve step, unlike the submission seam whose shape it otherwise
 * borrows (0094).
 */
export const createFrameOriginRegistry = (
  definitions: readonly FrameOriginDefinition[]
): Result<FrameOriginRegistry, FrameOriginRegistryError> => {
  const origins: RegisteredFrameOrigin[] = []
  const byOrigin = new Map<string, RegisteredFrameOrigin>()

  for (const definition of definitions) {
    const parsed = frameOriginSchema.safeParse(definition.origin)

    if (!parsed.success) {
      return err({
        code: "invalid-frame-origin",
        origin: definition.origin,
        detail: firstIssue(parsed.error),
      })
    }

    if (byOrigin.has(parsed.data)) {
      return err({ code: "duplicate-frame-origin", origin: definition.origin })
    }

    const registered: RegisteredFrameOrigin = {
      origin: parsed.data,
      description: definition.description,
      self: definition.self ?? false,
    }

    byOrigin.set(parsed.data, registered)
    origins.push(registered)
  }

  return ok({
    origin: (url) => byOrigin.get(url.origin),
    origins: Object.freeze(origins),
  })
}
