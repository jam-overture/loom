import type { LoomTree, ThemeRegistry } from "@jam-overture/loom"
import type { ReaderSignalBatch } from "@jam-overture/loom/signals"
import type { PrimitiveRegistry } from "@jam-overture/loom/sdk"

/**
 * What your readers do.
 *
 * The page is written from inside a deployment that already exists: a `tree` has
 * been loaded, and the `registry` and `themes` were built at start-up — several
 * sections before the block that renders with them. Both are the narrator's, and
 * saying so is how you explain a render without re-teaching registration.
 *
 * `store` is the one name here that is genuinely the reader's. Where a batch
 * goes is explicitly not decided by the runtime (0136), so the endpoint on this
 * page hands it to a function nobody has written yet — which is the honest shape
 * of that paragraph. A context file that invented a `storeReaderSignals` would
 * be documenting a seam that does not exist.
 */

export declare const tree: LoomTree
export declare const registry: PrimitiveRegistry
export declare const themes: ThemeRegistry
export declare const store: (batch: ReaderSignalBatch) => Promise<void>
