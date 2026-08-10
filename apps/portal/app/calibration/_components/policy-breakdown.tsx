import type { CalibrationReport } from "@loom/runtime/telemetry"

import { describePolicy, formatRate, readGap } from "@/lib/calibration-view"
import { toneClasses } from "@/lib/outcome"

/** A policy name is `z.string().min(1)`, so an empty one cannot collide with a real gate. */
const UNRECORDED_KEY = ""

/**
 * The same claims again, split by the gate that judged them.
 *
 * A survival rate is not a property of the model on its own — it is what the
 * Gate and the human between them allowed. So a window spanning a change of
 * policy produces one headline number that describes neither gate, and it moves
 * when a host edits its configuration, which is the moment a reader is most
 * likely to conclude the model got worse.
 *
 * Absent below one segment on purpose. With a single policy in the window this
 * table restates the headline in smaller type, and a breakdown that is always
 * there is a breakdown nobody reads on the day it matters.
 */
export const PolicyBreakdown =({ report }: { readonly report: CalibrationReport }) => {
  if (report.byPolicy.length < 2) return null

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm tracking-tight">by the gate that judged</h2>
      <p className="text-ink-muted text-xs">
        More than one policy judged the claims on this page, so the headline above pools gates that
        did not agree. Each row is the same measurement over one of them.
      </p>

      <table className="w-full border-collapse">
        <thead>
          <tr className="text-ink-muted text-left text-2xs">
            <th className="pb-1 pr-4 font-normal">policy</th>
            <th className="pb-1 pr-4 text-right font-normal">judged</th>
            <th className="pb-1 pr-4 text-right font-normal">survived</th>
            <th className="pb-1 pr-4 text-right font-normal">mean claim</th>
            <th className="pb-1 font-normal">reading</th>
          </tr>
        </thead>
        <tbody>
          {report.byPolicy.map((segment) => {
            const reading = readGap(segment.overall)

            return (
              <tr key={segment.policyId ?? UNRECORDED_KEY} className="border-edge-subtle border-t">
                <td className="py-2 pr-4 font-mono text-2xs">{describePolicy(segment.policyId)}</td>
                <td className="py-2 pr-4 text-right font-mono text-2xs">{segment.overall.judged}</td>
                <td className="py-2 pr-4 text-right font-mono text-2xs">
                  {formatRate(segment.overall.observedRate)}
                </td>
                <td className="py-2 pr-4 text-right font-mono text-2xs">
                  {formatRate(segment.overall.meanConfidence)}
                </td>
                <td className="py-2">
                  <span className={"rounded-sm px-2 py-0.5 text-2xs " + toneClasses(reading.tone)}>
                    {reading.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
