import type { TreeId } from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"
import type { TreeStore } from "@jam-overture/loom/store"

/**
 * Answering a held change.
 *
 * Written from inside the handler behind a review screen: a request has already
 * happened, the deployment opened its database at startup, and the page being
 * reviewed is named by the route. All three are the story's, and a reader
 * substitutes their own.
 *
 * `postgresHoldStore` is the runtime's and the page imports it itself, in the
 * line a reader would paste. The store the page reads `head` from is the one
 * the deployment already has — *Going to production* is where it gets built,
 * two pages earlier.
 */

/** The connection the deployment opened at startup. */
export declare const db: LoomDatabase

/** The tree store that page was loaded from, already wired to `db`. */
export declare const store: TreeStore

/** Which page this screen is reviewing. */
export declare const treeId: TreeId
