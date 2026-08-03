import { UNJUDGED_REASONS, type CalibrationReport } from "@loom/runtime/telemetry"

import { formatRate, readGap, UNJUDGED_LABELS } from "@/lib/calibration-view"
import { toneClasses } from "@/lib/outcome"

/**
 * The headline: how many claims this window could score, how often they
 * survived, and whether that matched what the model said.
 *
 * The unjudged are listed beside the judged rather than under a fold. A survival
 * rate over four claims when ninety are still waiting on a human is a different
 * statement from the same rate over ninety-four, and only showing both makes the
 * difference visible.
 *
 * Undos are in that list for the same reason. A revert is proposed with a
 * confidence of 1 by an interpreter that cannot be wrong (0032), so it is
 * segmented out of the score — and a reader who could not see how many were
 * removed would be trusting a denominator that changed without saying so.
 */
export const CalibrationSummary = ({ report }: { readonly report: CalibrationReport }) => {
  const reading = readGap(report.overall)

  return (
    <section className="flex flex-col gap-3">
      <div className={"flex flex-col gap-1 rounded-sm px-3 py-2 " + toneClasses(reading.tone)}>
        <span className="text-sm">{reading.label}</span>
        <span className="text-2xs opacity-80">{reading.detail}</span>
      </div>

      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-2xs">
        <div className="flex gap-1">
          <dt className="text-ink-muted">judged</dt>
          <dd className="font-mono">{report.overall.judged}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">survived</dt>
          <dd className="font-mono">{formatRate(report.overall.observedRate)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">mean claim</dt>
          <dd className="font-mono">{formatRate(report.overall.meanConfidence)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">undos (not scored)</dt>
          <dd className="font-mono">{report.runtimeAuthored}</dd>
        </div>
        {UNJUDGED_REASONS.map((reason) => (
          <div key={reason} className="flex gap-1">
            <dt className="text-ink-muted">{UNJUDGED_LABELS[reason]}</dt>
            <dd className="font-mono">{report.unjudged[reason]}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
