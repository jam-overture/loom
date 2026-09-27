import { UNJUDGED_REASONS, type CalibrationReport } from "@jam-overture/loom/telemetry"

import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import {
  formatRate,
  plainScoreline,
  readGap,
  readTrust,
  UNJUDGED_LABELS,
} from "@/app/(portal)/_lib/calibration-view"
import { toneClasses } from "@/app/(portal)/_lib/outcome"

/**
 * The answer to the question the page is named after, and then the arithmetic
 * behind it.
 *
 * What this component used to lead with was `readGap`'s label — *"claimed more
 * than it delivered"* — over a row of six monospace figures: judged, survived,
 * mean claim, undos, and three kinds of unjudged. Every one of those is worth
 * having and none of them is what a person opening this page wants first.
 *
 * So the order is inverted rather than the content cut. The verdict and its next
 * move are the surface; the counts sit one disclosure down, all six of them,
 * plus the technical reading they were labelled with. Nothing that was on this
 * screen has left it.
 *
 * The unjudged are still listed together with the judged, for the reason they
 * always were: a survival rate over four claims when ninety are still waiting on
 * a human is a different statement from the same rate over ninety-four. Undos
 * are in that list because a revert is proposed with a confidence of 1 by an
 * interpreter that cannot be wrong (0032), so it is segmented out of the score —
 * and a reader who could not see how many were removed would be trusting a
 * denominator that changed without saying so.
 */
export const TrustSummary = ({ report }: { readonly report: CalibrationReport }) => {
  const verdict = readTrust(report.overall)
  const reading = readGap(report.overall)
  const scoreline = plainScoreline(report.overall)

  return (
    <section className="flex flex-col gap-3">
      <div className={"flex flex-col gap-1 rounded-md px-4 py-3 " + toneClasses(verdict.tone)}>
        <span className="text-base">{verdict.label}</span>
        <span className="text-xs opacity-90">{verdict.meaning}</span>
        <span className="mt-1 text-xs opacity-80">{verdict.next}</span>
      </div>

      {scoreline !== null && <p className="text-ink-secondary text-sm">{scoreline}</p>}

      <TechnicalDetail summary="The exact numbers, and what is left out of them">
        <p>
          <span className={"rounded-sm px-2 py-0.5 " + toneClasses(reading.tone)}>
            {reading.label}
          </span>{" "}
          <span className="text-ink-muted">{reading.detail}</span>
        </p>

        <dl className="flex flex-wrap gap-x-5 gap-y-1">
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
      </TechnicalDetail>
    </section>
  )
}
