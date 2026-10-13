import { memoryTelemetryJournal, type TelemetryJournal } from "@jam-overture/loom/telemetry"
import { postgresTelemetryJournal } from "@jam-overture/loom/telemetry/postgres"

import { boundedTelemetryJournal } from "@/app/_lib/app/bounded-store"

import { portalDatabase } from "./database"

/**
 * Where this portal's runtime narration goes.
 *
 * Postgres when one is configured, memory when not — the same two supported
 * states as the store, on the same handle. Memory is honest for `pnpm dev`,
 * where a session's episodes last as long as you are looking at them, and wrong
 * for serverless, where an instance keeps what it saw and no two instances agree.
 *
 * Nothing reads this yet, and that is the point of §6 being built now: the
 * refusals, the holds and the discards are only recordable while they are
 * happening, so a pipeline that starts capturing the day a consumer wants it
 * starts with no history to consume.
 */
const CARRIER_KEY = Symbol.for("loom.portal.telemetry")

type Carrier = { [CARRIER_KEY]?: TelemetryJournal }

const carrier = globalThis as unknown as Carrier

/** Unbounded, for the runtime narrating itself inside a write. */
export const telemetryForWriting: TelemetryJournal = (carrier[CARRIER_KEY] ??=
  portalDatabase === undefined
    ? memoryTelemetryJournal()
    : postgresTelemetryJournal(portalDatabase))

/**
 * The same journal, read with a budget, for the six screens that print it.
 *
 * `/portal/activity`, both rules screens, `/portal/trust` and the application
 * screen each `await portalTelemetry.read(…)` and then draw a notice if it
 * refused. Until 13 October a journal that did not answer meant none of those
 * notices was reachable and the screen was a 504 instead.
 * `_lib/app/bounded-store.ts` has the argument.
 */
export const portalTelemetry: TelemetryJournal = boundedTelemetryJournal(telemetryForWriting)
