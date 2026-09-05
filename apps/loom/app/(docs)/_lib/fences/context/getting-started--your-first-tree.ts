import type { TreeError } from "@loom/runtime"

/**
 * Your first tree.
 *
 * The page's last block is the inside of a route handler: a tree arrives in a
 * request body and is parsed at the boundary. The request and this application's
 * own way of refusing a bad one are the story's — every framework spells them
 * differently — while `parseTree`, which is what the block is teaching, the page
 * imports for itself.
 */

/** Whatever the framework hands a handler, as far as this page needs it. */
export declare const request: { readonly json: () => Promise<unknown> }

/** The application's own way of answering a request it will not accept. */
export declare const reject: (error: TreeError) => never
