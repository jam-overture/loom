import { defaultGatePolicy, fixedPolicy, randomIdFactory, systemClock } from "@loom/runtime"
import { postgresHoldStore } from "@loom/runtime/postgres"
import { collectTelemetry } from "@loom/runtime/telemetry"
import { memoryHoldStore, type HoldStore, type WritePath } from "@loom/runtime/write"

import { portalDatabase } from "./database"
import { portalInterpreter, portalRepairer } from "./interpreter"
import { portalStore } from "./store"
import { portalTelemetry } from "./telemetry"

/**
 * The portal's one write path (0017).
 *
 * Assembled here and nowhere else, so `portalStore.append` has exactly one
 * caller in the app. That is the convention 0017 admitted it could not make
 * structural: `TreeStore` is a public interface and nothing stops another module
 * calling it, so the enforcement is that no other module is handed the store for
 * writing.
 *
 * A write is now begun rather than referenced, because the event sink is the one
 * part of it that cannot be process-wide: telemetry is collected while the change
 * is composed and written once, at the end, by a caller who can await it (0024).
 * Everything else — the store, the holds, the interpreter — is still shared.
 */

const CARRIER_KEY = Symbol.for("loom.portal.holds")

type Carrier = { [CARRIER_KEY]?: HoldStore }

const carrier = globalThis as unknown as Carrier

/**
 * Postgres when one is configured, memory when not — the same shape as the tree
 * store, and for a sharper reason.
 *
 * `memoryHoldStore` unconditionally is what this line said, and it made one
 * promise the portal could not keep. A held change is the *only* thing in Loom
 * that is waiting on a human being: it has not been accepted into a log, so it
 * exists nowhere but here, and a deployment that had configured a database was
 * still dropping every waiting change whenever the process went away. On a
 * serverless host that is not a restart, it is the next request.
 *
 * `postgresHoldStore` and the table it wants have both existed since 0088, and
 * `scripts/db-push.ts` has been creating that table all along; the write path
 * simply never asked for it. So this is one branch rather than a feature, and
 * the two implementations answer to one contract suite in the runtime, which is
 * what makes swapping them at this seam safe.
 *
 * Memory stays the honest fallback rather than a failure: it is right for
 * `pnpm dev`, where one process holds a hold for as long as you are looking at
 * it, and `/portal` says out loud which of the two this deployment is running.
 */
export const portalHolds: HoldStore = (carrier[CARRIER_KEY] ??=
  portalDatabase === undefined ? memoryHoldStore() : postgresHoldStore(portalDatabase))

/** Whether a change waiting for an answer outlives this process. `/portal` states it. */
export const holdsAreDurable = portalDatabase !== undefined

export type PortalWrite = {
  readonly path: WritePath
  /**
   * Records what the runtime narrated. Awaited before the action returns,
   * because an un-awaited write on a serverless host is a promise the platform
   * cancels when the response ends — and it never fails the change it describes.
   */
  readonly finish: () => Promise<void>
}

export const beginWrite = (): PortalWrite => {
  const collector = collectTelemetry(portalTelemetry)

  return {
    path: {
      store: portalStore,
      holds: portalHolds,
      runtime: {
        interpreter: portalInterpreter,
        policySource: fixedPolicy(defaultGatePolicy),
        events: collector.sink,
        clock: systemClock,
        idFactory: randomIdFactory,
        ...(portalRepairer ? { repairer: portalRepairer } : {}),
      },
    },
    finish: async () => {
      await collector.flush()
    },
  }
}
