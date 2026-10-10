import type { LoomTree } from "@jam-overture/loom"
import type { RenderOptions, RenderOutput } from "@jam-overture/loom/react"

/**
 * What a render reports.
 *
 * Two blocks, and both are written from inside something that has already
 * happened: a tree arrived and the options were assembled at startup, which is
 * the same story *Rendering a tree* is told from. The second block is the
 * inside of a test, so it is lent the render it is asserting about and `expect`
 * itself.
 *
 * `renderLoomTree` is the runtime's and is imported as such, so the call on the
 * page is checked against its real signature.
 */

export declare const tree: LoomTree
export declare const options: RenderOptions

/** The render the test block is asserting about. */
export declare const rendered: RenderOutput

/** The test runner's. Narrow on purpose: the page asserts one thing with it. */
export declare const expect: (value: unknown) => { readonly toEqual: (other: unknown) => void }

export { renderLoomTree } from "@jam-overture/loom/react"
