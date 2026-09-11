import {
  fixedPolicy,
  sequentialIdFactory,
  type Clock,
  type CompositionRuntime,
  type EditIntent,
  type LoomTree,
} from "@loom/runtime"
import {
  calibrationOf,
  collectTelemetry,
  episodesOf,
  horizonOf,
  memoryTelemetryJournal,
  retentionPlanOf,
  tallyEpisodes,
  type CalibrationReport,
  type EpisodeFold,
  type EpisodeTally,
  type RecordedTelemetry,
  type RetentionPlan,
  type RetentionPolicy,
} from "@loom/runtime/telemetry"
import { commitIntent, confirmHeld, discardHeld } from "@loom/runtime/write"

import { docsExamples } from "../examples/catalogue"
import { docsGatePolicy } from "../propose/policy"
import { docsPresetById, docsPresetInterpreter, type DocsPresetId } from "../propose/presets"
import { openDocsSession, type DocsSession } from "../propose/session"

/**
 * A month of asks, actually asked.
 *
 * §6 is the half of the runtime a reader cannot see by clicking anything: the
 * Gate's verdict is on the screen a second after the click, and the *record* of
 * that verdict is what a deployment reads next Tuesday. A page about it could
 * be written from the type signatures, and it would then be describing a shape
 * rather than a thing that happened.
 *
 * So this file does the only honest alternative. It opens a session on the same
 * example the site has been rendering since *Your first tree*, asks it for ten
 * changes over forty days, and wires the runtime's event sink to a real
 * `TelemetryCollector` writing into a real `TelemetryJournal`. Everything the
 * page then shows — the records, the fold, the tally, the calibration, the
 * retention plan — is read back out of that journal by the runtime's own
 * functions. **Nothing on the page is a fixture.**
 *
 * It is the memory journal rather than the Postgres one, which is a real limit
 * and the page says so. What it is not is a different code path: both implement
 * `TelemetryJournal`, `memory.contract.test.ts` holds them to one contract, and
 * every function this module calls is handed the interface rather than either
 * implementation.
 */

/**
 * A clock that never repeats itself, so the corpus is byte-identical on every
 * build and the stages of one request read in the order they happened.
 *
 * A `systemClock` here would make the rendered records change on every deploy —
 * which is not merely untidy: the fold, the tally and the retention plan are
 * all functions of these instants, and a test asserting any of them would be
 * asserting the time the suite happened to run.
 *
 * Each step names the day it happens on; within a step the clock advances a
 * second per reading, because the six stages of one request really do occur in
 * an order and a record set that showed them simultaneous would be teaching
 * that `occurredAt` cannot be sorted by.
 */
const CORPUS_START = Date.UTC(2026, 6, 1, 9, 0, 0)

const DAY_MS = 24 * 60 * 60 * 1000

type SteppingClock = Clock & { readonly stepTo: (day: number) => void }

const steppingClock = (): SteppingClock => {
  let base = CORPUS_START
  let reading = 0

  return {
    now: () => new Date(base + reading++ * 1_000).toISOString(),
    stepTo: (day) => {
      base = CORPUS_START + day * DAY_MS
      reading = 0
    },
  }
}

/**
 * What the corpus asked for, in the site's words.
 *
 * A step is a day and a chip, plus what the reader did about a hold — which is
 * the only part of an ask that is not decided by the runtime. `undefined` means
 * nobody has answered yet, and one step deliberately ends that way: an episode
 * still waiting on a person is the state retention has to be careful about, and
 * a corpus with none of them could not show why.
 */
type CorpusStep = {
  readonly day: number
  readonly preset: DocsPresetId
  readonly answer?: "confirm" | "discard"
  /**
   * Aim the intent at revision 0 rather than at head. This is the ask that
   * arrives written against a page that has moved — a browser tab left open,
   * a queued job, a retry — and it never reaches an interpreter.
   */
  readonly stale?: boolean
}

/**
 * Ten asks, chosen so that every ending the runtime can reach is reached by
 * something a reader could have clicked, rather than by a stub.
 *
 * The four presets are the site's own chips and the Gate is the site's own
 * policy, which protects `loom.heading` (see `policy.ts`). That is what makes
 * the spread possible without inventing anything: *demote* reconfigures a
 * protected primitive and is held, *delete* destroys one and is refused, and
 * the other two are waved through. `link-the-card` has no card to link on this
 * tree, so the interpreter declines and the ask ends before the Gate sees it.
 */
const CORPUS: readonly CorpusStep[] = [
  { day: 0, preset: "add-a-sentence" },
  { day: 2, preset: "reorder-the-page" },
  /**
   * The one nobody answered, and it is early on purpose. An unsettled episode
   * is what the prefix rule is careful about, and putting it at the *back* of
   * the journal would make retention look like a rule with no consequences.
   */
  { day: 4, preset: "demote-the-heading" },
  { day: 6, preset: "remove-the-heading" },
  { day: 9, preset: "demote-the-heading", answer: "confirm" },
  { day: 13, preset: "retheme" },
  { day: 17, preset: "demote-the-heading", answer: "discard" },
  { day: 20, preset: "remove-the-heading" },
  { day: 24, preset: "add-a-sentence", stale: true },
  { day: 28, preset: "link-the-card" },
]

/** The example this corpus is a history of. */
const CORPUS_EXAMPLE = "first-tree"

/**
 * How long this corpus is kept. A fortnight is a choice a host makes and the
 * page treats it as one — `MIN_RETENTION_MS` is an hour, and everything above
 * that is the deployment's to argue about.
 */
export const DOCS_RETENTION: RetentionPolicy = { maxAgeMs: 14 * DAY_MS }

/** The instant the retention plan is computed against: three days after the last ask. */
const RETENTION_NOW = new Date(CORPUS_START + 31 * DAY_MS).toISOString()

/**
 * Ids that read as themselves and cannot collide.
 *
 * The day is in the namespace as well as the counter, so two asks for the same
 * chip mint different node ids — a corpus whose fourth and sixth episodes named
 * the same proposal would fold into one story that never happened.
 */
const namespaceFor = (step: CorpusStep): string =>
  `corpus${step.preset.replace(/[^0-9a-z]/g, "").slice(0, 12)}d${step.day}`

const intentFor = (
  tree: LoomTree,
  utterance: string,
  baseRevision: number,
  ids: ReturnType<typeof sequentialIdFactory>,
  clock: Clock
): EditIntent => ({
  intentId: ids.intentId(),
  treeId: tree.treeId,
  baseRevision,
  origin: "user-instruction",
  actor: "the reader",
  utterance,
  observedAt: clock.now(),
})

export type DocsTelemetry = {
  /** Everything the journal holds, oldest first. */
  readonly records: readonly RecordedTelemetry[]
  readonly fold: EpisodeFold
  readonly tally: EpisodeTally
  readonly calibration: CalibrationReport
  readonly retention: RetentionPlan
  /** The instant the retention plan was computed against, and the cut it implies. */
  readonly now: string
  readonly horizon: string
  /** Records the collector could not hold or could not write. Zero, and shown. */
  readonly dropped: number
}

const headRevisionOf = async (session: DocsSession): Promise<number> => {
  const head = await session.store.head(session.treeId)

  if (!head.ok) throw new Error(`loom: the corpus lost its own tree — ${head.error.code}`)

  return head.value.revision
}

/**
 * Builds the corpus, once.
 *
 * The wiring below is the whole of what a host does about telemetry, and it is
 * the same six lines the page prints in its first code block: make a journal,
 * wrap it in a collector, hand the collector's sink to the runtime, and flush
 * when the request is decided. There is no second integration point.
 *
 * **A flush per ask, not one at the end.** A host flushes where a request ends,
 * so the corpus does too — which is also what gives each batch its own
 * `recordedAt` and makes the retention plan a statement about ten requests
 * rather than about one write.
 */
const build = async (): Promise<DocsTelemetry> => {
  const example = docsExamples.get(CORPUS_EXAMPLE)

  if (example === undefined) throw new Error(`loom: no example called ${CORPUS_EXAMPLE}`)

  const clock = steppingClock()
  const journal = memoryTelemetryJournal(clock)
  const telemetry = collectTelemetry(journal)
  const session = await openDocsSession(example.build())

  for (const step of CORPUS) {
    clock.stepTo(step.day)

    const preset = docsPresetById(step.preset)

    if (preset === undefined) throw new Error(`loom: no preset called ${step.preset}`)

    const ids = sequentialIdFactory(namespaceFor(step))
    const runtime: CompositionRuntime = {
      interpreter: docsPresetInterpreter(preset, ids, clock),
      policySource: fixedPolicy(docsGatePolicy),
      events: telemetry.sink,
      clock,
      idFactory: ids,
    }
    const path = { store: session.store, holds: session.holds, runtime }
    const baseRevision = step.stale === true ? 0 : await headRevisionOf(session)
    const outcome = await commitIntent(
      path,
      intentFor(session.seed, preset.utterance, baseRevision, ids, clock)
    )

    if (outcome.kind === "held" && step.answer === "confirm") {
      await confirmHeld(path, { proposalId: outcome.held.proposalId, actor: "the maintainer" })
    }

    if (outcome.kind === "held" && step.answer === "discard") {
      await discardHeld(path, { proposalId: outcome.held.proposalId, actor: "the maintainer" })
    }

    const flushed = await telemetry.flush()

    if (!flushed.ok) throw new Error(`loom: the corpus could not be written — ${flushed.error.code}`)
  }

  const page = await journal.read({ limit: 1000 })

  if (!page.ok) throw new Error(`loom: the corpus could not be read — ${page.error.code}`)

  const records = page.value.records
  const fold = episodesOf(records)
  const horizon = horizonOf(DOCS_RETENTION, RETENTION_NOW)

  if (horizon === null) throw new Error("loom: the corpus retention policy has no horizon")

  return {
    records,
    fold,
    tally: tallyEpisodes(fold.episodes),
    calibration: calibrationOf(fold),
    retention: retentionPlanOf(records, horizon),
    now: RETENTION_NOW,
    horizon,
    dropped: telemetry.dropped(),
  }
}

/**
 * One corpus per process, shared by every component on the page.
 *
 * Five components ask for this and building it ten times would be ten different
 * journals — identical, because the clock is fixed, and still ten. The memo is
 * the promise rather than the value, so concurrent server components awaiting
 * it during one render all get the same build rather than racing to start
 * their own.
 */
let pending: Promise<DocsTelemetry> | undefined

export const docsTelemetry = (): Promise<DocsTelemetry> => (pending ??= build())
