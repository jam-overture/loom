import type { SignInPressure } from "@/app/(portal)/_lib/auth/pressure"
import { describeWait } from "@/app/(portal)/_lib/auth/throttle"
import { toneClasses } from "@/app/(portal)/_lib/outcome"
import {
  describeLocked,
  describePressure,
  describeSince,
  toneOfPressure,
} from "@/app/(portal)/_lib/signin-view"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"

/**
 * Whether anybody is being turned away, and what to do about it.
 *
 * Colour is a second channel and never the only one, the same rule
 * `/portal/checkup` follows: the badge names the state in words and the
 * headline says it again in a sentence, so nothing here depends on telling the
 * palette apart.
 *
 * The numbers sit under the sentence rather than above it. Somebody opening
 * this page is asking "is something happening", and the count of failures is
 * the answer to a second question they only have if the first one said yes.
 *
 * **The six numbers used to be the whole screen and they were labelled like
 * fields**: `callers counted`, `failures held`, `locked now`, `longest wait`,
 * `most recent`, `oldest held` — lower-case, in a `dl`, with the values in
 * monospace beside them. That is the same shape the history row was fixed for
 * on 25 August, and it has the same defect: a label like `failures held` is a
 * name for a variable, and a reader has to work out from the value which
 * question it answers. Each one now says what it counts.
 *
 * Two facts the old table dropped are down in the disclosure: how many records
 * the numbers were computed over, and whether the locked count is a total or a
 * floor. The second was already carried in the plain reading through
 * `describeLocked`'s "at least", but nothing said why it sometimes appears.
 */
export const PressureSummary = ({
  pressure,
  now,
}: {
  readonly pressure: SignInPressure
  readonly now: number
}) => {
  const reading = describePressure(pressure, now)

  return (
    <section className="flex flex-col gap-3">
      <div
        className={
          "flex flex-col gap-1 rounded-sm px-3 py-2 " + toneClasses(toneOfPressure(reading.tone))
        }
      >
        <span className="text-sm">{reading.headline}</span>
        <span className="text-2xs opacity-80">{reading.detail}</span>
      </div>

      <p className="text-ink-secondary text-sm">{reading.next}</p>

      {/*
       * Label above value, not beside it — and this is the third defect a
       * screenshot has caught in this lane that a passing test could not.
       *
       * The row was a `flex flex-wrap` of label-value pairs, which worked while
       * the labels were terse and lower-case: `locked now 0` looks like a
       * field. The moment they became questions a person would ask, the same
       * layout ran them together into `Different callers 1 Failed attempts 5
       * Locked out now 0 Longest wait left —`, which parses as a sentence
       * rather than as six facts. Plain language changed what the layout had to
       * carry, and nothing in the change said so.
       */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-ink-muted text-xs">Different callers</dt>
          <dd className="font-mono text-sm">{pressure.subjects}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-ink-muted text-xs">Failed attempts</dt>
          <dd className="font-mono text-sm">{pressure.failures}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-ink-muted text-xs">Locked out now</dt>
          <dd className="font-mono text-sm">{describeLocked(pressure)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-ink-muted text-xs">Longest wait left</dt>
          <dd className="font-mono text-sm">
            {pressure.longestWaitMs === 0 ? "—" : describeWait(pressure.longestWaitMs)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-ink-muted text-xs">Most recent failure</dt>
          <dd className="font-mono text-sm">
            {pressure.latestFailureAt === null ? "—" : describeSince(now - pressure.latestFailureAt)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-ink-muted text-xs">Oldest one still counted</dt>
          <dd className="font-mono text-sm">
            {pressure.earliestFailureAt === null
              ? "—"
              : describeSince(now - pressure.earliestFailureAt)}
          </dd>
        </div>
      </dl>

      <TechnicalDetail summary="How these numbers were worked out">
        <dl className="flex flex-wrap gap-x-5 gap-y-1">
          <div className="flex gap-1">
            <dt className="text-ink-muted">subjects</dt>
            <dd className="font-mono">{pressure.subjects}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted">failures</dt>
            <dd className="font-mono">{pressure.failures}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted">locked</dt>
            <dd className="font-mono">{pressure.locked}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted">lockedIsExact</dt>
            <dd className="font-mono">{pressure.lockedIsExact ? "true" : "false"}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted">counted</dt>
            <dd className="font-mono">{pressure.counted}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted">longestWaitMs</dt>
            <dd className="font-mono">{pressure.longestWaitMs}</dd>
          </div>
        </dl>

        {/*
         * `lockedIsExact` is the one field here that changes what a number
         * means rather than only how it was reached, so it gets a sentence
         * rather than a row on its own. The plain reading already says "at
         * least" when it is false; this is where a reader finds out why it
         * ever would be.
         */}
        <p>
          {pressure.lockedIsExact
            ? "Every counted record was read, so the locked-out count is a total rather than a floor."
            : "More records were held than could be read in one pass, and some that were not read could still be serving a lockout. The locked-out count is therefore a floor."}
        </p>
      </TechnicalDetail>
    </section>
  )
}
