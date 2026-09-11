import type { CompositionRuntime } from "@loom/runtime"
import type { HoldStore } from "@loom/runtime/write"
import type { LoomDatabase } from "@loom/runtime/postgres"

/**
 * The history of a page.
 *
 * The page's last block swaps one store for another and changes nothing else,
 * which is the claim being made and the whole reason the block is there. The
 * database connection and the other two thirds of the write path are the
 * deployment's; the two stores either side of the swap are the runtime's, and
 * the page imports those itself.
 */

/** The connection a deployment opened at startup. */
export declare const db: LoomDatabase

export declare const holds: HoldStore
export declare const runtime: CompositionRuntime
