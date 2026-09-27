import type { DataRegistry, EditIntent, LoomTree, ModelClient } from "@jam-overture/loom"

/**
 * When nothing comes back.
 *
 * The page is written from inside a deployment that is already running. By the
 * time anything here is waiting on somebody else's code there is a model client
 * the host configured at startup, a tree being served, a registry of the sources
 * this deployment is prepared to answer for, and — in the block about the abort
 * signal — the database connection the adapter is a query against.
 *
 * `intent` is the narrator's too: the last block interprets one, and what a
 * reader needs from it is that interpretation takes an ask and a tree, not how
 * the ask was built. *Proposing a change* is the page that shows that.
 *
 * `db` is the only one of the five that is not a runtime type. It is shaped as
 * the smallest thing the block actually calls, because a context file that grew
 * a plausible database would be scenery — and scenery is the thing a reader
 * mistakes for something they are supposed to have.
 */

export declare const client: ModelClient
export declare const tree: LoomTree
export declare const registry: DataRegistry
export declare const intent: EditIntent

export declare const db: {
  readonly deliveries: {
    readonly find: (
      order: string,
      options: { readonly signal: AbortSignal | undefined }
    ) => Promise<string[]>
  }
}
