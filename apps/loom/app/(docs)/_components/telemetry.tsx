import type {
  EpisodeResolutionKind,
  IntentEpisode,
  RecordedTelemetry,
} from "@loom/runtime/telemetry"

import { docsTelemetry, DOCS_RETENTION } from "@/app/(docs)/_lib/telemetry/corpus"
import {
  countedEventTypes,
  endingRows,
  recordSummary,
  retentionRows,
  traceEpisode,
  type EndingRow,
} from "@/app/(docs)/_lib/telemetry/reading"

/**
 * Five views of one journal, and none of them holds a number of its own.
 *
 * Every component here awaits `docsTelemetry()` — the corpus built by running
 * ten real asks through the write path with a real collector behind the runtime
 * — and arranges what comes back. The arithmetic that is not the runtime's own
 * lives in `reading.ts` so it can be tested without React; these files decide
 * only what a reader sees first.
 *
 * They are **async server components**, because the write path is asynchronous
 * and a block that runs it has to be. The page still prerenders: the clock is
 * fixed, so the corpus is the same on every build.
 */

const Frame = ({
  label,
  children,
}: {
  readonly label: string
  readonly children: React.ReactNode
}) => (
  <figure className="not-prose border-edge my-8 overflow-hidden rounded-lg border">
    <figcaption className="border-edge bg-surface-sunken text-ink-faint border-b px-4 py-2 text-xs font-semibold tracking-wide uppercase">
      {label}
    </figcaption>
    {children}
  </figure>
)

/**
 * One record, printed whole.
 *
 * The `intent-received` record for the first ask in the corpus, because it is
 * the one where what is *missing* is the lesson. A reader who has been told the
 * utterance is not kept will look for it, and a paraphrase of the record would
 * let them wonder whether it was trimmed for the page.
 */
export const RecordedIntent = async () => {
  const { records } = await docsTelemetry()
  const first = records.find((record) => record.event.type === "intent-received")

  if (first === undefined) throw new Error("loom: the corpus received no intent")

  return (
    <Frame label="One record, exactly as the journal holds it">
      <pre className="bg-code-surface text-code-ink overflow-x-auto px-4 py-3 text-xs leading-relaxed">
        <code>{JSON.stringify(first, null, 2)}</code>
      </pre>
    </Frame>
  )
}

const RecordRow = ({ record }: { readonly record: RecordedTelemetry }) => {
  const summary = recordSummary(record)

  return (
    <div className="border-edge flex flex-col gap-1 border-b px-4 py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="text-ink-faint shrink-0 font-mono text-xs sm:w-14">#{record.seq}</span>
      <span className="text-ink shrink-0 font-mono text-xs sm:w-44">{record.event.type}</span>
      <span className="text-ink-muted text-sm leading-relaxed">{summary}</span>
    </div>
  )
}

/**
 * One ask, twice: as the records the journal holds, and as the story the fold
 * makes of them.
 *
 * The ask chosen is the one that was held and then confirmed, because it is the
 * only shape where the two halves are visibly different — seven records spread
 * over two requests and two actors, folded into one episode with one ending.
 */
export const EpisodeTrace = async () => {
  const { records, fold } = await docsTelemetry()
  const trace = traceEpisode(fold, records)

  return (
    <>
      <Frame label={`${trace.records.length} records, in the order they were written`}>
        <div className="divide-edge">
          {trace.records.map((record) => (
            <RecordRow key={record.seq} record={record} />
          ))}
        </div>
      </Frame>

      <Frame label={`The same ${trace.records.length} records, folded into one episode`}>
        <EpisodeCard episode={trace.episode} />
      </Frame>
    </>
  )
}

const Field = ({ name, value }: { readonly name: string; readonly value: string }) => (
  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
    <dt className="text-ink-faint shrink-0 font-mono text-xs sm:w-40 sm:pt-0.5">{name}</dt>
    <dd className="text-ink text-sm">{value}</dd>
  </div>
)

const EpisodeCard = ({ episode }: { readonly episode: IntentEpisode }) => {
  const proposal = episode.proposals[0]

  return (
    <dl className="space-y-1.5 px-4 py-3">
      <Field name="resolution.kind" value={episode.resolution.kind} />
      <Field name="policyId" value={episode.policyId ?? "—"} />
      <Field
        name="intent.utteranceLength"
        value={
          episode.intent === undefined ? "—" : `${episode.intent.utteranceLength} characters`
        }
      />
      {proposal === undefined ? null : (
        <>
          <Field name="assessment.stakes" value={proposal.assessment?.stakes ?? "—"} />
          <Field name="disposition.kind" value={proposal.disposition?.kind ?? "—"} />
          <Field name="held" value={proposal.held ? "true" : "false"} />
          <Field name="answeredBy" value={proposal.answeredBy ?? "—"} />
          <Field
            name="committedRevision"
            value={proposal.committedRevision === undefined ? "—" : String(proposal.committedRevision)}
          />
        </>
      )}
    </dl>
  )
}

const ENDING_TONE: Record<EpisodeResolutionKind, string> = {
  committed: "border-verdict-accepted-edge bg-verdict-accepted-surface text-verdict-accepted-ink",
  refused: "border-verdict-refused-edge bg-verdict-refused-surface text-verdict-refused-ink",
  "awaiting-answer": "border-verdict-held-edge bg-verdict-held-surface text-verdict-held-ink",
  discarded: "border-verdict-refused-edge bg-verdict-refused-surface text-verdict-refused-ink",
  "not-interpreted": "border-edge bg-surface-muted text-ink-muted",
  "not-writable": "border-edge bg-surface-muted text-ink-muted",
  failed: "border-edge bg-surface-muted text-ink-muted",
  open: "border-edge bg-surface-muted text-ink-muted",
}

const EndingCard = ({ row }: { readonly row: EndingRow }) => (
  <div className="border-edge flex flex-col gap-2 border-b px-4 py-3 last:border-b-0 sm:flex-row sm:items-start sm:gap-4">
    <span
      className={`shrink-0 self-start rounded border px-2 py-1 font-mono text-xs ${ENDING_TONE[row.kind]}`}
    >
      {row.kind}
    </span>
    <span className="text-ink-muted grow text-sm leading-relaxed">{row.meaning}</span>
    <span className="text-ink shrink-0 self-start font-mono text-sm tabular-nums sm:w-16 sm:text-right">
      {row.count}
    </span>
  </div>
)

/**
 * Every ending, including the ones that did not happen.
 *
 * `EPISODE_RESOLUTION_KINDS` is the runtime's own list, so an ending added
 * there appears here without anybody editing this file, and `reading.ts` fails
 * to compile if it has no sentence for one. Printing only the endings with a
 * count above zero would let a reader take six for the whole vocabulary —
 * the same rule the reference pages follow about exports nothing names.
 */
export const AskEndings = async () => {
  const { tally } = await docsTelemetry()

  return (
    <Frame label={`${tally.episodes} asks over four weeks, by how they ended`}>
      <div>
        {endingRows(tally).map((row) => (
          <EndingCard key={row.kind} row={row} />
        ))}
      </div>
      <div className="border-edge bg-surface-sunken text-ink-muted border-t px-4 py-3 text-sm">
        {tally.proposals} proposals across {tally.episodes} asks — {tally.held} of them held for a
        person, {tally.repairs} of them a second attempt at something refused. The two numbers
        differ because an ask that was turned away, or that nothing could be planned from, never
        produced a proposal at all. A refusal does: the Gate has to see a change before it can say
        no to one, and this journal is where that change is kept.
      </div>
    </Frame>
  )
}

const Stat = ({
  name,
  value,
  note,
}: {
  readonly name: string
  readonly value: string
  readonly note: string
}) => (
  <div className="border-edge grow basis-40 border-b px-4 py-3 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0">
    <p className="text-ink-faint font-mono text-xs">{name}</p>
    <p className="text-ink mt-1 font-mono text-2xl tabular-nums">{value}</p>
    <p className="text-ink-muted mt-1 text-xs leading-relaxed">{note}</p>
  </div>
)

/**
 * The report this site's own record produces, which is the empty one.
 *
 * It is the most useful thing on the page and it took no arranging: every
 * proposal in the corpus was authored by a deterministic interpreter, so
 * `calibrationOf` scores none of them and says how many it set aside. A page
 * that wanted a filled-in table here would have had to invent the confidences,
 * and inventing them is the exact error the function exists to refuse.
 */
export const ConfidenceCalibration = async () => {
  const { calibration } = await docsTelemetry()

  return (
    <Frame label="Calibration over this site's own journal">
      <div className="flex flex-col sm:flex-row">
        <Stat
          name="overall.judged"
          value={String(calibration.overall.judged)}
          note="Claims with a verdict to score them against."
        />
        <Stat
          name="runtimeAuthored"
          value={String(calibration.runtimeAuthored)}
          note="Proposals set aside because nobody graded them."
        />
        <Stat
          name="overall.gap"
          value={calibration.overall.gap === null ? "null" : calibration.overall.gap.toFixed(2)}
          note="No claims, so no distance between claimed and observed."
        />
      </div>
      <div className="border-edge bg-surface-sunken text-ink-muted border-t px-4 py-3 text-sm leading-relaxed">
        Zero out of zero is <code className="font-mono text-xs">null</code>, not{" "}
        <code className="font-mono text-xs">0</code>. A report that rounded an absent measurement
        down to a perfect one would be the single most misleading number this package could
        produce.
      </div>
    </Frame>
  )
}

/**
 * What a fortnight's policy would forget, and what it may not.
 *
 * All four numbers matter and only one of them is the interesting one:
 * `keptBehind` is the price of the prefix rule, and it is large here because
 * the third ask in the corpus is still waiting on somebody.
 */
export const ForgettingPlan = async () => {
  const { retention, horizon, now, records } = await docsTelemetry()

  return (
    <Frame
      label={`${records.length} records, ${DOCS_RETENTION.maxAgeMs / (24 * 60 * 60 * 1000)}-day policy, planned on ${now.slice(0, 10)}`}
    >
      <dl className="px-4 py-3">
        {retentionRows(retention, horizon).map((row) => (
          <div
            key={row.name}
            className="border-edge flex flex-col gap-1 border-b py-2.5 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-4"
          >
            <dt className="text-ink shrink-0 font-mono text-xs sm:w-40">{row.name}</dt>
            <dd className="text-ink-muted text-sm leading-relaxed">
              <span className="text-ink font-mono tabular-nums">{row.value}</span> — {row.meaning}
            </dd>
          </div>
        ))}
      </dl>
    </Frame>
  )
}

/**
 * How many of the eighteen event types this corpus actually produced.
 *
 * A count rather than a list, in the run of the prose: the interesting claim is
 * that ten ordinary asks exercise two thirds of the vocabulary, and the
 * eighteen names themselves are in the reference where they belong.
 */
export const EventTypeCount = async () => {
  const { records } = await docsTelemetry()
  const counted = countedEventTypes(records)

  return (
    <span className="font-mono text-sm">
      {counted.seen} of {counted.total}
    </span>
  )
}
