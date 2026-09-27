import type { JsonObject, LoomTree } from "@jam-overture/loom"
import type { RenderOptions } from "@jam-overture/loom/react"

/**
 * What a form posts to.
 *
 * The page is written from inside a deployment that is already serving
 * something: there is a tree, and there are the three things assembled at
 * startup that every render on this site takes — the registry that resolves a
 * primitive, the one that validates its props, and the themes.
 *
 * `tokens` is the narrator's, and it is the only name here that is not a runtime
 * type. It stands for whatever mints a CSRF token on this deployment — a session
 * store, a signing key, a call to something else — and it is shaped as the
 * smallest thing the block actually calls, because a context file that grew a
 * plausible token service would be scenery, and scenery is what a reader
 * mistakes for something they are supposed to have.
 *
 * Its signature is the point of the block that uses it: it takes the request's
 * host `context`, it takes the `signal`, and it is `async`. Those three are why
 * resolving a submission is a step of its own rather than part of the walk.
 */

export declare const tree: LoomTree

/** The three the deployment assembled once, at startup. */
export declare const resolver: RenderOptions["resolver"]
export declare const validator: NonNullable<RenderOptions["validator"]>
export declare const themes: NonNullable<RenderOptions["themes"]>

/** Whatever this deployment mints a per-request token against. */
export declare const tokens: {
  readonly mint: (
    context: JsonObject | undefined,
    options: { readonly signal: AbortSignal | undefined }
  ) => Promise<string>
}
