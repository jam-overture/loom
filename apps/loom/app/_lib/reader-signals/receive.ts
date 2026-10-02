import {
  describeIngestError,
  ingestReaderSignals,
  readerRegionOf,
  type IntakeGate,
  type ReaderRegionStore,
  type ReaderSignalJournal,
  type RegionIntake,
} from "@jam-overture/loom/signals"

import { describeIntakeSwitch, describeRegionSettings, type IntakeSettings } from "./settings"

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

export type Intake = {
  readonly settings: IntakeSettings
  readonly journal: ReaderSignalJournal
  /**
   * Where the buckets are kept. Written here rather than by the rollup, because
   * the request is the only place a region was ever knowable, and gone by the
   * time a window is folded.
   */
  readonly regions: ReaderRegionStore
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
 * The body, up to the ceiling and one byte past it.
 *
 * Measured off the bytes rather than off `content-length`, because the header is
 * a number the caller wrote and this is the one endpoint in Loom whose callers
 * are strangers. Reading one byte past the limit is what distinguishes *exactly
 * at the ceiling* from *over it* without reading any more of an over-large body
 * than it takes to know.
 *
 * A caller who sends nothing gets an empty string, which the parser refuses
 * like any other malformed delivery.
 */
const readAtMost = async (
  request: Request,
  limit: number
): Promise<{ readonly text: string; readonly bytes: number }> => {
  const body = request.body

  if (body === null) return { text: "", bytes: 0 }

  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value === undefined) continue

      chunks.push(value)
      bytes += value.byteLength

      if (bytes > limit) break
    }
  } finally {
    await reader.cancel().catch(() => undefined)
  }

  const joined = new Uint8Array(bytes)
  let at = 0
  for (const chunk of chunks) {
    joined.set(chunk, at)
    at += chunk.byteLength
  }

  return { text: new TextDecoder().decode(joined), bytes }
}

/**
 * Where this delivery came from, when the deployment counts that.
 *
 * The region is read from a header the platform wrote and used once, here. It is
 * never put on the batch, never joined to the view key the batch carries, and
 * the address it was derived from is not read at all — the only thing this
 * handler ever looks at an address for is the rate limit, and that digest is
 * minted per process and shared with nothing.
 *
 * A deployment that switched regions off, or misspelled the switch, counts
 * nothing: a region is the one part of an intake that is worth having and never
 * worth guessing at.
 */
const whereFrom = (request: Request, intake: Intake): RegionIntake | undefined =>
  intake.settings.region.chosen.state === "on"
    ? {
        store: intake.regions,
        region: readerRegionOf(request.headers.get(intake.settings.region.header)),
        at: new Date(intake.now()).toISOString(),
      }
    : undefined

/**
 * Receive a delivery.
 *
 * The order is the order of what each refusal costs the deployment. Whether
 * this deployment collects signals at all is a constant; the window is a map
 * lookup; the size is a bounded read; the parse is the expensive part and is
 * reached only by a caller who is within their budget and under the ceiling.
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

  let delivery: unknown

  try {
    delivery = JSON.parse(text)
  } catch {
    return refuse(400, "a delivery is JSON")
  }

  const kept = await ingestReaderSignals(intake.journal, delivery, whereFrom(request, intake))

  if (!kept.ok) {
    /**
     * A journal that cannot answer is this deployment's problem and not the
     * sender's, so it is the one refusal here that is a 5xx. Everything else a
     * caller could have avoided.
     */
    const status = kept.error.code === "unavailable" ? 503 : 400

    return refuse(status, describeIngestError(kept.error))
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
    detail:
      intake.settings.chosen.state === "on" && !intake.durable
        ? "reader signals are being collected into memory, which a serverless deployment forgets; " +
          "set DATABASE_URL to keep them"
        : describeIntakeSwitch(intake.settings.chosen),
  }
}

export const readerSignalStatus = (intake: Intake): Response =>
  Response.json(describeIntake(intake), { headers: NO_STORE })
