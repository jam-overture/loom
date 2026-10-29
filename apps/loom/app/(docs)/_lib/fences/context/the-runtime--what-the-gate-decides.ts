import type { PrimitiveRegistry } from "@jam-overture/loom/sdk"

/**
 * What the Gate decides.
 *
 * The registry this site built is the story's, and it is the only thing here.
 *
 * `gatePolicySchema` and `interactiveTypesFor` used to be re-exported from this
 * file, because the page introduced them in prose rather than in an import. The
 * blocks compiled and a reader who copied either one got
 * `gatePolicySchema is not defined` — this is the last stop on the arrival
 * route, and that name is what the route promises a reader will have typed by
 * the end of it. Both imports are on the page now. `lent.ts` is why nothing can
 * go back.
 */

export declare const docsRegistry: PrimitiveRegistry
