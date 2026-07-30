import { defaultGatePolicy, noopEventSink, randomIdFactory, systemClock } from "@loom/runtime"
import { memoryHoldStore, type HoldStore, type WritePath } from "@loom/runtime/write"

import { portalInterpreter, portalRepairer } from "./interpreter"
import { portalStore } from "./store"

/**
 * The portal's one write path (0017).
 *
 * Assembled here and nowhere else, so `portalStore.append` has exactly one
 * caller in the app. That is the convention 0017 admitted it could not make
 * structural: `TreeStore` is a public interface and nothing stops another module
 * calling it, so the enforcement is that no other module is handed the store for
 * writing.
 *
 * The event sink is a no-op, which is the honest state of §6: the runtime
 * narrates every stage and nothing consumes it yet. The provenance of applied
 * changes is not lost by this — it is in the store's log — but the refusals and
 * the discards are, and that is exactly what the telemetry pipeline is for.
 */

const CARRIER_KEY = Symbol.for("loom.portal.holds")

type Carrier = { [CARRIER_KEY]?: HoldStore }

const carrier = globalThis as unknown as Carrier

/** One per server process, like the store, so a hold survives the request that made it. */
export const portalHolds: HoldStore = (carrier[CARRIER_KEY] ??= memoryHoldStore())

export const portalWritePath: WritePath = {
  store: portalStore,
  holds: portalHolds,
  runtime: {
    interpreter: portalInterpreter,
    policy: defaultGatePolicy,
    events: noopEventSink,
    clock: systemClock,
    idFactory: randomIdFactory,
    ...(portalRepairer ? { repairer: portalRepairer } : {}),
  },
}
