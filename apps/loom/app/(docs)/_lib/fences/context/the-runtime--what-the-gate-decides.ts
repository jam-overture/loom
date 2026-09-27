import type { PrimitiveRegistry } from "@jam-overture/loom/sdk"

/**
 * What the Gate decides.
 *
 * Both policies on this page are parsed through `gatePolicySchema`, which is the
 * runtime's and is re-exported here because the page introduces it in prose
 * rather than in an import. So is `interactiveTypesFor`: the page's point is
 * that the list it produces should never be typed by hand, and a stand-in that
 * produced a list of strings would quietly prove the opposite.
 *
 * The registry this site built is the story's.
 */

export declare const docsRegistry: PrimitiveRegistry

export { gatePolicySchema } from "@jam-overture/loom"
export { interactiveTypesFor } from "@jam-overture/loom/sdk"
