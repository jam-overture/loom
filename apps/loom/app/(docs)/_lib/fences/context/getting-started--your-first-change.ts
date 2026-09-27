import type { EditIntent, ProposalId } from "@jam-overture/loom"
import type { WritePath } from "@jam-overture/loom/write"

/**
 * Your first change.
 *
 * The page's last section is *the same thing, in your own app*, and it is written
 * from inside the request a reader would be writing: something has already
 * assembled the write path, and something has already turned what the person
 * typed into an intent. Both are the story's, and both are covered by their own
 * pages — this one is about what comes back.
 *
 * `commitIntent` and `confirmHeld` are the runtime's, and the page imports both.
 */

/** The three stores and the runtime, assembled once when the app started. */
export declare const path: WritePath

/** What the person asked for, already interpreted. */
export declare const intent: EditIntent

/** A held proposal, and whoever is answering it. */
export declare const proposalId: ProposalId
export declare const reviewer: { readonly id: string }
