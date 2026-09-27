import { memoryTelemetryJournal, type TelemetryJournal } from "@jam-overture/loom/telemetry"
import { postgresTelemetryJournal } from "@jam-overture/loom/telemetry/postgres"

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

export const portalTelemetry: TelemetryJournal = (carrier[CARRIER_KEY] ??=
  portalDatabase === undefined
    ? memoryTelemetryJournal()
    : postgresTelemetryJournal(portalDatabase))
