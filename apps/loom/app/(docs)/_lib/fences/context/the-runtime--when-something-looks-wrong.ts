import type { LoomTree, TreeId } from "@jam-overture/loom"
import type { TreeStore } from "@jam-overture/loom/store"
import type { HoldStore } from "@jam-overture/loom/write"

/**
 * When something looks wrong.
 *
 * This page is written from inside a script somebody runs against a deployment
 * that already exists — a nightly audit, or the handler behind an admin screen.
 * It has a store, the two stores' handles, the page it is asking about and the
 * page as it was created. All four are the story's, and a reader substitutes
 * their own.
 *
 * `attributeTree` and `auditSnapshot` are the runtime's, and the page imports
 * both itself, in the same line a reader would paste.
 */

/** The two stores the deployment opened at startup. */
export declare const store: TreeStore
export declare const holds: HoldStore

/** The page being asked about, as it was loaded and as the reader is seeing it. */
export declare const page: LoomTree
export declare const treeId: TreeId

/** The same page at revision 0, which an audit has to be given. */
export declare const seed: LoomTree
