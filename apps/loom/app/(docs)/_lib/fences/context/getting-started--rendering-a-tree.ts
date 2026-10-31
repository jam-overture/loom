import type { LoomTree } from "@jam-overture/loom"
import type { RenderOptions, RenderRequest, TreeSource } from "@jam-overture/loom/react"

/**
 * Rendering a tree.
 *
 * Two of the three blocks here are written from inside a request handler, which
 * is the honest place to explain one from: a tree arrived, the options were
 * assembled at startup, and `notFound` is the framework's. All of those are the
 * story's.
 *
 * `renderRequest` is not the story's and is **not lent**. It was, until the
 * excuse for lending it turned out to be false: a `function-body` fence can
 * carry an import, because `program.ts` lifts one out before it puts the wrapper
 * back on, and the first block on this page has opened with three of them since
 * the page existed. So the handler shows its own door, which is what a reader
 * copying it needs, and this file holds only what a reader is meant to
 * substitute.
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
