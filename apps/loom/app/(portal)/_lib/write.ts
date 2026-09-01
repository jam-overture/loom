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
 * Custody of the changes the Gate would not make alone: Postgres when one is
 * configured, memory when not — the same choice, on the same handle, as the tree
 * store.
 *
 * A `Map` keeps a hold for exactly as long as the process that made it. That is
 * true durability under `pnpm dev` and a fiction on a serverless host, where the
 * instance that judged a change is usually gone before the reviewer opens the
 * queue: the confirmation arrives at an instance that has never heard of the
 * proposal, and the reviewer is told `not-held` — whose own comment admits it
 * means "never held, already answered, or expired" and has no fourth reading for
 * *the machine that was holding this went away*, which is the true one.
 *
 * So the review queue — the one thing this portal shows that no repository, log
 * or build output has ever seen — was empty by construction on the deployment
 * anybody actually looks at. Filed by the framework routine on 23 August, owned
 * here because choosing a store is a deployment decision the surface makes and
 * not one the runtime should make for it (0088). No schema step: `db:push`
 * already creates `loom_holds`.
 *
 * One consequence is worth stating rather than discovering. `release` is a take,
 * and with Postgres behind it that is enforced by the statement rather than by
 * the process happening to be single-threaded. Two reviewers pressing *apply* at
 * the same moment now produce exactly one success and one `not-held`, and the
 * loser is correct rather than faulty — which is what "Already answered" on the
 * card is for, and why it is worded as somebody having answered rather than as
 * something having gone wrong.
 */
export const portalHolds: HoldStore = (carrier[CARRIER_KEY] ??=
  portalDatabase === undefined ? memoryHoldStore() : postgresHoldStore(portalDatabase))

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
