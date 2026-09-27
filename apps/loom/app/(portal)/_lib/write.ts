import {
  fixedPolicy,
  randomIdFactory,
  systemClock,
  type EventSink,
  type StakeFactor,
} from "@jam-overture/loom"
import { postgresHoldStore } from "@jam-overture/loom/postgres"
import { collectTelemetry } from "@jam-overture/loom/telemetry"
import { memoryHoldStore, type HoldStore, type WritePath } from "@jam-overture/loom/write"

import { portalDatabase } from "./database"
import { portalInterpreter, portalRepairer } from "./interpreter"
import { portalPolicy, portalPropsVocabulary } from "./policy"
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

/**
 * Whether a change waiting for an answer outlives the process holding it.
 *
 * The branch above is the deployment decision and this is the one fact about it
 * a reader of the queue is entitled to. It is not a duplicate of the condition:
 * the queue screen must not import `portalDatabase` to work out what kind of
 * deployment it is on — that is a handle to a database on a screen that only
 * reads holds — so the answer travels as a boolean and the decision stays here,
 * beside the branch it describes.
 */
export const holdsAreDurable = portalDatabase !== undefined

export type PortalWrite = {
  readonly path: WritePath
  /**
   * Records what the runtime narrated. Awaited before the action returns,
   * because an un-awaited write on a serverless host is a promise the platform
   * cancels when the response ends — and it never fails the change it describes.
   */
  readonly finish: () => Promise<void>
  /**
   * What the Gate weighed against one proposal, as it weighed it.
   *
   * The reason this exists is that a `WriteOutcome` carries the Gate's *verdict*
   * and not its *reasoning*. `disposition.reason` is a code and one prose string
   * — `stakes-at-refusal-floor`, then every factor's `detail` joined with
   * semicolons — so a screen wanting to say **which** of thirteen things was
   * wrong, in a person's words, has two options: parse that string, or ask the
   * runtime. This asks the runtime.
   *
   * `change-assessed` carries the whole `ChangeAssessment` because it is the
   * runtime narrating itself within one request (0023), and the narrowing that
   * survives to the journal drops the factor codes. So this is the only place
   * they can be read, and reading them here costs nothing: the event is emitted
   * whether or not anybody listens.
   *
   * Keyed by proposal rather than held as one value, because a refusal handed to
   * a repairer produces a second assessment of a second proposal in the same
   * write (0021) — and a reviewer told why a change was refused must be told
   * about the change that was refused, not about the smaller one offered
   * instead.
   *
   * Empty for a proposal the Gate never got to weigh: a request the model could
   * not interpret, or one whose delta would not apply. A caller reading an empty
   * list must not conclude the Gate objected to nothing.
   */
  readonly weighedAgainst: (proposalId: string) => readonly StakeFactor[]
}

export const beginWrite = (): PortalWrite => {
  const collector = collectTelemetry(portalTelemetry)

  /**
   * One request's assessments, kept for as long as the action that began the
   * write. Not on `globalThis` and deliberately not shared the way the store and
   * the holds are: this is what the Gate thought about *this* ask, and a
   * process-wide map of it would be a memory leak whose entries are the one
   * thing on this deployment that names what a person typed.
   */
  const weighed = new Map<string, readonly StakeFactor[]>()

  /**
   * The collector's sink with one ear on it.
   *
   * The recording happens **before** the delegation, which is the only ordering
   * that is safe in both directions. A `Map.set` cannot throw; a journal write
   * can, and `narrator` contains whatever `emit` throws (0042) — so delegating
   * first would mean a journal that failed took the reading down with it, and a
   * reviewer would be told a refusal had no reasons rather than that the record
   * could not be written.
   */
  const sink: EventSink = {
    emit: (envelope) => {
      if (envelope.event.type === "change-assessed") {
        const { assessment } = envelope.event

        weighed.set(assessment.proposal.proposalId, assessment.stakes.factors)
      }

      collector.sink.emit(envelope)
    },
  }

  return {
    path: {
      store: portalStore,
      holds: portalHolds,
      runtime: {
        interpreter: portalInterpreter,
        policySource: fixedPolicy(portalPolicy),
        events: sink,
        clock: systemClock,
        idFactory: randomIdFactory,
        /**
         * 0179's half of the pair `policy.ts` explains, spread rather than set
         * so that "this deployment does not check settings" is expressible in one
         * place and lands here as the runtime's own default rather than as an
         * `undefined` this module had to reason about.
         *
         * The registry behind it is the same object the renderer resolves
         * against, so a change this refuses to write is a change the renderer
         * would have refused to draw. The two seams cannot drift, because there
         * is one of them.
         */
        ...(portalPropsVocabulary ? { propsVocabulary: portalPropsVocabulary } : {}),
        ...(portalRepairer ? { repairer: portalRepairer } : {}),
      },
    },
    finish: async () => {
      await collector.flush()
    },
    weighedAgainst: (proposalId) => weighed.get(proposalId) ?? [],
  }
}
