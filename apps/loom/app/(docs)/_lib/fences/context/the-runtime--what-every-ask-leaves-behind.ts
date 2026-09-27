import type { ChangeInterpreter, Clock, EditIntent, IdFactory, PolicySource } from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"
import type { TreeStore } from "@jam-overture/loom/store"
import type { TelemetryJournal } from "@jam-overture/loom/telemetry"
import type { HoldStore } from "@jam-overture/loom/write"

/**
 * What every ask leaves behind.
 *
 * The page is about the account a runtime keeps of itself, so everything the
 * runtime is *made of* is scenery here: a connection, two stores, an
 * interpreter, a policy source, a clock, an id factory, and the ask that
 * arrived. A reader has met all of them on earlier pages and is meant to
 * substitute their own.
 *
 * `collectTelemetry`, `applyRetention`, `postgresTelemetryJournal` and
 * `commitIntent` are the runtime's, and the page imports all four.
 */

/** The connection a deployment opened at startup. */
export declare const db: LoomDatabase

/** The two stores a write goes through. */
export declare const store: TreeStore
export declare const holds: HoldStore

/** The four the deployment assembled once. */
export declare const interpreter: ChangeInterpreter
export declare const policySource: PolicySource
export declare const clock: Clock
export declare const idFactory: IdFactory

/** What somebody asked for, already interpreted. */
export declare const intent: EditIntent

/** The journal a retention run is asked to shorten. */
export declare const journal: TelemetryJournal
