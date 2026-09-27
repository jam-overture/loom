import type { ChangeInterpreter, EventSink, GatePolicy, LoomTree, ProposalId } from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"

/**
 * What your app has to do.
 *
 * This page is written from inside an application that already exists: it has a
 * database, a signed-in person, a page loaded from the store, and a policy it
 * chose. Every one of those is the story's, and a reader is meant to substitute
 * their own.
 *
 * What is not the story's is `commitIntent`, the write path and the seven ways a
 * write can end — and the page imports all of them itself.
 */

/** The connection a deployment opened at startup. */
export declare const db: LoomDatabase

/** The three things the deployment assembled once. */
export declare const interpreter: ChangeInterpreter
export declare const policy: GatePolicy
export declare const events: EventSink

/** The page being changed, as it was loaded. */
export declare const page: LoomTree

/** Whoever is asking, and whoever answers a held proposal. */
export declare const session: { readonly userId: string }
export declare const reviewer: { readonly id: string }

/** The proposal a person was asked about. */
export declare const proposalId: ProposalId

export type { EditIntent } from "@jam-overture/loom"
