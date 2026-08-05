import type { SignInPressure } from "@/lib/auth/pressure"
import { describeWait } from "@/lib/auth/throttle"
import { toneClasses } from "@/lib/outcome"
import { describeLocked, describePressure, describeSince, toneOfPressure } from "@/lib/signin-view"

/**
 * What the throttle is currently absorbing.
 *
 * Colour is a second channel and never the only one, the same rule `/audit`
 * follows: the badge names the state in words and the headline says it again in
 * a sentence, so nothing here depends on telling the palette apart.
 *
 * The numbers sit under the sentence rather than above it. An operator opening
 * this page is asking "is something happening", and the count of failures is the
 * answer to a second question they only have if the first one said yes.
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
      <div className={"flex flex-col gap-1 rounded-sm px-3 py-2 " + toneClasses(toneOfPressure(reading.tone))}>
        <span className="text-sm">{reading.headline}</span>
        <span className="text-2xs opacity-80">{reading.detail}</span>
      </div>

      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-2xs">
        <div className="flex gap-1">
          <dt className="text-ink-muted">callers counted</dt>
          <dd className="font-mono">{pressure.subjects}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">failures held</dt>
          <dd className="font-mono">{pressure.failures}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">locked now</dt>
          <dd className="font-mono">{describeLocked(pressure)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">longest wait</dt>
          <dd className="font-mono">
            {pressure.longestWaitMs === 0 ? "—" : describeWait(pressure.longestWaitMs)}
          </dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">most recent</dt>
          <dd className="font-mono">
            {pressure.latestFailureAt === null ? "—" : describeSince(now - pressure.latestFailureAt)}
          </dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">oldest held</dt>
          <dd className="font-mono">
            {pressure.earliestFailureAt === null
              ? "—"
              : describeSince(now - pressure.earliestFailureAt)}
          </dd>
        </div>
      </dl>
    </section>
  )
}
