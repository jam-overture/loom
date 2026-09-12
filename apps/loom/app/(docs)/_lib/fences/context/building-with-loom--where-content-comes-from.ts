import type { LoomTree } from "@loom/runtime"
import type { PrimitiveRegistry } from "@loom/runtime/sdk"

/**
 * Where the content comes from.
 *
 * The page is written from inside a request that has already happened: a `page`
 * has been loaded from a store and the deployment's `primitives` were registered
 * at start-up, two sections before a block needs either. Both are the narrator's.
 *
 * `db` is the shop's own database, which is the one thing on the page that is
 * nobody's but the reader's — a source's adapter is the place their query goes,
 * and a page that invented a query builder to avoid saying so would be teaching
 * the wrong thing.
 */

export declare const page: LoomTree
export declare const primitives: PrimitiveRegistry
export declare const db: {
  readonly services: (
    tag: string,
    limit: number
  ) => Promise<{ name: string; price: string }[]>
}
