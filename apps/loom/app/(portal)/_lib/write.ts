import {
  fixedPolicy,
  randomIdFactory,
  systemClock,
  type EventSink,
  type StakeFactor,
} from "@jam-overture/loom"
import { postgresHoldStore, postgresTreeStore } from "@jam-overture/loom/postgres"
import { memoryTreeStore, type ApplicationId, type TreeStore } from "@jam-overture/loom/store"
import { collectTelemetry } from "@jam-overture/loom/telemetry"
import { memoryHoldStore, type HoldStore, type WritePath } from "@jam-overture/loom/write"

import { boundedHoldStore, boundedTreeStore } from "@/app/_lib/app/bounded-store"

import { portalDatabase } from "./database"
import { noInterpreter, type ProjectModel } from "./interpreter"
import { portalPolicy, portalPropsVocabulary } from "./policy"
import { telemetryForWriting } from "./telemetry"

/**
 * The portal's one write path (0017).
 *
 * Assembled here and nowhere else, so `append` has exactly one caller in the
 * app. That is the convention 0017 admitted it could not make structural:
 * `TreeStore` is a public interface and nothing stops another module calling
 * it, so the enforcement is that no other module is handed the store for
 * writing.
 *
 * It takes the unbounded handles rather than the ones the screens read
 * through: the screens' handles answer a read within a budget and that is
 * exactly wrong inside a write. `_lib/app/bounded-store.ts` has the argument.
 *
 * A write is now begun rather than referenced, because the event sink is the one
 * part of it that cannot be process-wide: telemetry is collected while the change
 * is composed and written once, at the end, by a caller who can await it (0024).
 *
 * **A write is begun for one project's application** (0329 clause 3). The tree
 * store and the hold store it writes through are scoped to that application at
 * construction, so a proposal about one project's page cannot read, hold or
 * append against another's by naming the wrong tree id.
 */

const CARRIER_KEY = Symbol.for("loom.portal.governed")

/** One application's governed pages and the changes waiting on them. */
type Governed = {
  readonly trees: TreeStore
  readonly holds: HoldStore
}

type Carrier = { [CARRIER_KEY]?: Map<ApplicationId, Governed> }

const carrier = globalThis as unknown as Carrier

const governed = (carrier[CARRIER_KEY] ??= new Map())

/**
 * One application's pages and the changes the Gate would not make alone:
 * Postgres when one is configured, memory when not. Memoised per application
 * for memory's sake, where a second construction is a second, empty map.
 *
 * A `Map` keeps a hold for exactly as long as the process that made it. That is
 * true durability under `pnpm dev` and a fiction on a serverless host, where the
 * instance that judged a change is usually gone before the reviewer opens the
 * queue: the confirmation arrives at an instance that has never heard of the
 * proposal, and the reviewer is told `not-held` — whose own comment admits it
 * means "never held, already answered, or expired" and has no fourth reading for
 * *the machine that was holding this went away*, which is the true one. Choosing
 * the store is a deployment decision the surface makes and not one the runtime
 * should make for it (0088). No schema step: `db:push` already creates
 * `loom_trees`, `loom_revisions` and `loom_holds`, each with its application.
 *
 * One consequence is worth stating rather than discovering. `release` is a take,
 * and with Postgres behind it that is enforced by the statement rather than by
 * the process happening to be single-threaded. Two reviewers pressing *apply* at
 * the same moment now produce exactly one success and one `not-held`, and the
 * loser is correct rather than faulty — which is what "Already answered" on the
 * card is for, and why it is worded as somebody having answered rather than as
 * something having gone wrong.
 */
const governedFor = (application: ApplicationId): Governed => {
  const known = governed.get(application)

  if (known !== undefined) return known

  const made: Governed =
    portalDatabase === undefined
      ? { trees: memoryTreeStore(), holds: memoryHoldStore() }
      : {
          trees: postgresTreeStore(portalDatabase, { application }),
          holds: postgresHoldStore(portalDatabase, { application }),
        }

  governed.set(application, made)

  return made
}

/** One project's governed pages, read with a budget, for the screens that draw them. */
export const governedPagesFor = (application: ApplicationId): TreeStore =>
  boundedTreeStore(governedFor(application).trees)

/**
 * One project's held changes, read with a budget, for the screens that draw the
 * queue.
 *
 * The write path takes the unbounded handle and this is what a screen imports
 * — the split `_lib/app/bounded-store.ts` argues for, and the hold store is
 * where it matters most: giving up on `get` inside a `release` would tell a
 * reviewer their change was not held when it was, which is the one sentence on
 * that screen that must never be wrong.
 */
export const holdsFor = (application: ApplicationId): HoldStore =>
  boundedHoldStore(governedFor(application).holds)

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

/**
 * Begin a write for one project's application.
 *
 * `model` is that project's own (0332), handed in by the caller that read its
 * key. A write that composes nothing — answering a held change — is begun
 * without one and spends nobody's key.
 */
export const beginWrite = (application: ApplicationId, model?: ProjectModel): PortalWrite => {
  const { trees, holds } = governedFor(application)
  const collector = collectTelemetry(telemetryForWriting)

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
      store: trees,
      holds,
      runtime: {
        interpreter: model?.interpreter ?? noInterpreter,
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
        ...(model ? { repairer: model.repairer } : {}),
      },
    },
    finish: async () => {
      await collector.flush()
    },
    weighedAgainst: (proposalId) => weighed.get(proposalId) ?? [],
  }
}
