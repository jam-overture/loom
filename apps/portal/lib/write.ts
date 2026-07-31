import { defaultGatePolicy, randomIdFactory, systemClock } from "@loom/runtime"
import { collectTelemetry } from "@loom/runtime/telemetry"
import { memoryHoldStore, type HoldStore, type WritePath } from "@loom/runtime/write"

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

/** One per server process, like the store, so a hold survives the request that made it. */
export const portalHolds: HoldStore = (carrier[CARRIER_KEY] ??= memoryHoldStore())

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
        policy: defaultGatePolicy,
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
