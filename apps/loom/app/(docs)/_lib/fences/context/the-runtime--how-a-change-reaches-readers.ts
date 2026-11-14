import type { LoomTree } from "@jam-overture/loom"
import type { PrimitiveRegistry } from "@jam-overture/loom/sdk"

/**
 * How a change reaches readers.
 *
 * The page is written from inside a deployment that already exists. It starts
 * the pull loop in the first block, and renders in the second — which is a
 * different file in every real application, so the second block reaches for
 * three things the page has not shown and should not: the request being served,
 * the page this route was built with, and the resolver that was assembled at
 * start-up.
 *
 * `log` is the narrator's too. Every page on this site that has somewhere to put
 * a warning has one, and no runtime module publishes a logger: where a sentence
 * goes is the host's decision, which is why the runtime's half is a function
 * that returns the sentence.
 *
 * `live` is **not** lent, and that is the one thing worth noticing here. The
 * page starts the loop itself, in the section above the render, so the name is
 * the page's own and a reader can see where it came from.
 */

/** The request being served, for the block that builds a context out of it. */
export declare const request: { readonly cookies: { readonly has: (name: string) => boolean } }

/** The page this route was built with, loaded wherever your pages come from. */
export declare const builtTree: LoomTree

/** Your registry, assembled at start-up, several sections before the render. */
export declare const registry: PrimitiveRegistry

/** Wherever your application puts a warning. */
export declare const log: { readonly warn: (message: string) => void }
