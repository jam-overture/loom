import type { LoomTree } from "@loom/runtime"
import type { RenderOptions, RenderRequest, TreeSource } from "@loom/runtime/react"

/**
 * Rendering a tree.
 *
 * Two of the three blocks here are written from inside a request handler, which
 * is the honest place to explain one from: a tree arrived, the options were
 * assembled at startup, and `notFound` is the framework's. All of those are the
 * story's.
 *
 * `renderRequest` is not, and the page does not import it — it is introduced in
 * prose as the thing that loads, parses and renders — so it comes from where it
 * really lives and the call is checked against its real signature.
 */

export declare const tree: LoomTree
export declare const options: RenderOptions

/** The three the deployment assembled once, at startup. */
export declare const source: TreeSource
export declare const resolver: RenderOptions["resolver"]
export declare const validator: NonNullable<RenderOptions["validator"]>
export declare const themes: NonNullable<RenderOptions["themes"]>

/** The request the framework handed the handler. */
export declare const request: RenderRequest

/** The framework's own. In Next it ends the request rather than returning. */
export declare const notFound: () => never

export { renderRequest } from "@loom/runtime/react"
