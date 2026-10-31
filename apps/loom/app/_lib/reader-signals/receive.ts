import {
  describeIngestError,
  ingestReaderSignals,
  readerRegionOf,
  type DoorCounters,
  type IntakeGate,
  type ReaderOpeningCounter,
  type ReaderRegionStore,
  type ReaderSignalJournal,
} from "@jam-overture/loom/signals"
import type { ApplicationId } from "@jam-overture/loom/store"

import { readAtMost } from "@/app/_lib/app/read-at-most"

import { attributeDelivery, type AttributionRefusal, type Senders } from "./attribution"
import { INGEST_KEY_PARAMETER } from "./keys"
import { keptOrigin, type RefusalCounter, type RefusalReason } from "./refusals"
import {
  describeCollectionWindow,
  describeIntakeSwitch,
  describeRegionSettings,
  describeSweepSchedule,
  type IntakeSettings,
} from "./settings"

/**
 * The mouth: what a browser's batches actually arrive at.
 *
 * Step 3 of `docs/signals.md` built a buffer, a rollup and a pair of counters,
 * published them, tested them, and left them unreachable — `ingestReaderSignals`
 * was called by its own test and by nothing else in the repository, so no
 * deployment could ever make a counter non-empty. Three findings say so from
 * three lanes. This is the piece they all name.
 *
 * **It is the application's, not a surface's.** The pages readers read on this
 * deployment are in `(demo)`, `(marketing)` and `(docs)`, and an endpoint owned
 * by one of them would be a route the other two post to. So it sits at the
 * application root, which is what "one application" (0067) is for.
 *
 * **Everything that decides lives here; the route file wires it.** The handler
 * takes its journal, its gate and its clock, so every refusal in it is testable
 * without a database, a network or a running Next.
 *
 * **Nothing it returns is read by the sender.** `sendBeacon` discards the
 * response, and the fallback discards it too — a page has no retry to attempt
 * and no reader to tell. The status codes are for an operator with `curl` and
 * for the tests below them, and the endpoint is designed so that a batch is
 * either kept or is not, with nothing in between for a browser to have to
 * understand.
 */

/**
 * Where one application's deliveries are kept: the buffer and the two counters
 * the door moves.
 *
 * One of these per application rather than one for the deployment, because the
 * stores are scoped at construction (`StoreScope`) — which is what makes
 * *filing one customer's batch under another* unexpressible below this line
 * rather than merely avoided.
 */
export type Filing = {
  readonly journal: ReaderSignalJournal
  /**
   * Where the buckets are kept. Written here rather than by the rollup, because
   * the request is the only place a region was ever knowable, and gone by the
   * time a window is folded.
   */
  readonly regions: ReaderRegionStore
  /**
   * How many page views there were, counted at the door for the region
   * counter's reason and kept whatever a deployment thinks of regions: a count
   * of page views of a revision names nowhere and nobody, and it is the
   * denominator every other number the portal shows is a rate against.
   */
  readonly openings: ReaderOpeningCounter
  /** The refusals that named this application (0311). Written, never read, by the door. */
  readonly refusals: Pick<RefusalCounter, "record">
}

export type Intake = {
  readonly settings: IntakeSettings
  /** Who may send, and which application each key names (0298). */
  readonly senders: Senders
  /** The stores a delivery attributed to this application is kept in. */
  readonly filingFor: (application: ApplicationId) => Filing
  readonly gate: IntakeGate
  /** Whether what is kept outlives this process. The status says it rather than implying it. */
  readonly durable: boolean
  readonly subjectOf: (request: Request) => Promise<string>
  readonly now: () => number
}

const NO_STORE = { "cache-control": "no-store" } as const

const refuse = (status: number, detail: string, headers: Record<string, string> = {}): Response =>
  new Response(`${detail}\n`, {
    status,
    headers: { ...NO_STORE, ...headers, "content-type": "text/plain; charset=utf-8" },
  })

/**
 * What this delivery is counted into, besides being buffered.
 *
 * Both counters are read from the request and both move once per page view
 * rather than once per delivery. The page-view count is unconditional and the
 * region is not: a region is read from a header the platform wrote, used once,
 * here — never put on the batch, never joined to the view key the batch
 * carries, and the address it was derived from is not read at all. The only
 * thing this handler ever looks at an address for is the rate limit, and that
 * digest is minted per process and shared with nothing.
 *
 * A deployment that switched regions off, or misspelled the switch, counts no
 * region and still counts its readers arriving: a region is the one part of an
 * intake that is worth having and never worth guessing at, and *how many*
 * carries no such question.
 */
const countersFor = (request: Request, intake: Intake, filing: Filing): DoorCounters => ({
  at: new Date(intake.now()).toISOString(),
  openings: filing.openings,
  ...(intake.settings.region.chosen.state === "on"
    ? {
        region: {
          store: filing.regions,
          region: readerRegionOf(request.headers.get(intake.settings.region.header)),
        },
      }
    : {}),
})

/**
 * What a sender is told when the door will not say whose readers these are.
 *
 * Every refusal but one is a 403 rather than a 401, because a 401 promises a
 * `WWW-Authenticate` challenge and there is no scheme to name: a key is a
 * query parameter a page was given, not a credential a browser can be asked
 * for. The exception is the lookup failing, which is this deployment's fault
 * and not the sender's.
 */
/**
 * Counting a refusal is best-effort: a counter that cannot answer must not
 * change what the sender is told, and the delivery is refused either way. So
 * the result is dropped rather than turned into a 503 that would read as the
 * refusal never having happened.
 */
const counted = async (
  intake: Intake,
  application: ApplicationId,
  reason: RefusalReason,
  request: Request,
  response: Response
): Promise<Response> => {
  await intake
    .filingFor(application)
    .refusals.record(reason, keptOrigin(request.headers.get("origin")), intake.now())

  return response
}

const refusalOf = (refusal: AttributionRefusal): Response => {
  switch (refusal.code) {
    case "no-key":
      return refuse(
        403,
        `a delivery names its project: post to this address with ?${INGEST_KEY_PARAMETER}= and the project's key`
      )
    case "unknown-key":
      return refuse(403, "that is not a key this deployment issued, or it has been replaced")
    case "closed":
      return refuse(403, "that project is closed, and a closed project takes no signals")
    case "wrong-origin":
      return refuse(
        403,
        refusal.origin === null
          ? "that project takes signals from its own site, and this delivery named no origin"
          : `that project does not take signals from ${refusal.origin}`
      )
    case "unavailable":
      return refuse(503, `reader signals are unavailable: ${refusal.detail}`)
  }
}

/**
 * Receive a delivery.
 *
 * The order is the order of what each refusal costs the deployment. Whether
 * this deployment collects signals at all is a constant; the window is a map
 * lookup; the size is a bounded read; whose readers these are is one indexed
 * read, reached only by a caller within their budget, so a stranger cannot
 * spend this deployment's database by guessing keys faster than the gate
 * allows; the parse is the expensive part and comes last.
 */
export const receiveReaderSignals = async (request: Request, intake: Intake): Promise<Response> => {
  const { chosen } = intake.settings

  /**
   * A deployment that never asked for reader signals does not have this
   * endpoint, and says so the way it would say it about any address it does not
   * serve. Its pages are not broadcasting either, so nobody is posting here —
   * and a 404 tells a stranger scanning for write endpoints nothing about what
   * this deployment is running.
   */
  if (chosen.state === "off") return new Response(null, { status: 404, headers: NO_STORE })

  /**
   * An operator who configured something and got silence is the failure nobody
   * notices. This one is loud, because it can only have been typed on purpose.
   */
  if (chosen.state === "unusable") return refuse(503, describeIntakeSwitch(chosen))

  const { policy } = intake.gate
  const subject = await intake.subjectOf(request)
  const { text, bytes } = await readAtMost(request, policy.maxBytes)
  const verdict = intake.gate.admit(subject, bytes, intake.now())

  if (verdict.code === "too-often") {
    /**
     * Seconds, rounded up and never zero: `Retry-After` is specified in whole
     * seconds, and a wait reported as elapsed invites the retry that is refused
     * again.
     */
    const seconds = Math.max(1, Math.ceil(verdict.retryAfterMs / 1000))

    return refuse(
      429,
      `this sender has delivered ${verdict.limit} batches inside the window; wait ${seconds}s`,
      { "retry-after": String(seconds) }
    )
  }

  if (verdict.code === "too-large") {
    return refuse(413, `a delivery may be ${verdict.limit} bytes`)
  }

  const attributed = await attributeDelivery(request, intake.senders)

  if (!attributed.ok) {
    const refusal = attributed.error

    switch (refusal.code) {
      case "closed":
        return counted(intake, refusal.application, "closed", request, refusalOf(refusal))
      case "wrong-origin":
        return counted(intake, refusal.application, "wrong-site", request, refusalOf(refusal))
      default:
        return refusalOf(refusal)
    }
  }

  const filing = intake.filingFor(attributed.value)

  let delivery: unknown

  try {
    delivery = JSON.parse(text)
  } catch {
    return counted(
      intake,
      attributed.value,
      "unreadable",
      request,
      refuse(400, "a delivery is JSON")
    )
  }

  const kept = await ingestReaderSignals(
    filing.journal,
    delivery,
    countersFor(request, intake, filing)
  )

  if (!kept.ok) {
    /**
     * A journal that cannot answer is this deployment's problem and not the
     * sender's, so it is the one refusal here that is a 5xx. Everything else a
     * caller could have avoided.
     */
    if (kept.error.code === "unavailable") return refuse(503, describeIngestError(kept.error))

    return counted(
      intake,
      attributed.value,
      "unreadable",
      request,
      refuse(400, describeIngestError(kept.error))
    )
  }

  return new Response(null, { status: 204, headers: NO_STORE })
}

export type IntakeStatus = {
  readonly intake: "on" | "off" | "unusable"
  /** Whether a kept batch outlives this process. False is a supported state, not a fault. */
  readonly durable: boolean
  readonly maxBytes: number
  readonly deliveries: number
  readonly windowMs: number
  /** Subjects the gate is currently counting on this instance. */
  readonly subjects: number
  readonly detail: string
  /** Whether where readers are is counted, and under what floor. One sentence, for an operator. */
  readonly regions: string
  /**
   * The window the sweep counts a delivery into the totals at, and whether the
   * value it was given could be read. One sentence, for an operator.
   *
   * It is the one setting here that is **not** about the door: nothing on this
   * endpoint reads it, and a window that cannot be read refuses the sweep and
   * admits every batch regardless (`settings.ts`). It is reported anyway,
   * because the status is the only way to ask a deployment what it is doing
   * with what it kept, and a buffer growing under a refused sweep looks from
   * outside exactly like a buffer growing under no sweep at all.
   *
   * `windowMs` above is the *rate limit's* window and not this one. They are
   * two different windows with one word for both, which this field says in a
   * sentence rather than renaming another lane's documented field.
   */
  readonly collection: string
  /**
   * How often this deployment says it sweeps, and what its readers are told as
   * a result. One sentence, for an operator.
   *
   * The only setting here whose whole effect is on somebody else's reading: no
   * batch is refused and no sweep is changed by it, and what it decides is
   * whether a notice can say when a delivery goes or only when it ripens
   * (0320). An operator cannot see that from anywhere else, because nothing
   * fails.
   */
  readonly sweep: string
}

/**
 * What an operator gets for a `GET`, and the only way to find out from outside
 * whether this deployment's mouth is open.
 *
 * It exists because the failure being fixed here was invisible: a portal screen
 * reading a table nothing writes to looks exactly like a portal screen nobody
 * has visited yet. A deployment can now be asked, and the answer distinguishes
 * *switched off*, *misconfigured*, and *on but in memory* — the three states
 * that all otherwise present as no numbers.
 *
 * It names limits and no secrets. The limits are measurable from outside by
 * anybody willing to spend a minute finding them, and an operator should not
 * have to.
 */
export const describeIntake = (intake: Intake): IntakeStatus => {
  const { policy } = intake.gate

  return {
    intake: intake.settings.chosen.state,
    durable: intake.durable,
    maxBytes: policy.maxBytes,
    deliveries: policy.deliveries,
    windowMs: policy.windowMs,
    subjects: intake.gate.subjects(),
    regions: describeRegionSettings(intake.settings.region),
    collection: describeCollectionWindow(intake.settings.window),
    sweep: describeSweepSchedule(intake.settings.sweep),
    detail:
      intake.settings.chosen.state === "on" && !intake.durable
        ? "reader signals are being collected into memory, which a serverless deployment forgets; " +
          "set DATABASE_URL to keep them"
        : describeIntakeSwitch(intake.settings.chosen),
  }
}

export const readerSignalStatus = (intake: Intake): Response =>
  Response.json(describeIntake(intake), { headers: NO_STORE })
