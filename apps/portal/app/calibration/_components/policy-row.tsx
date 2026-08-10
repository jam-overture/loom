import { Fragment } from "react"

import type { PolicyCalibration } from "@loom/runtime/telemetry"

import { describePolicy, formatRate, readGap, readRuleset } from "@/lib/calibration-view"
import { toneClasses } from "@/lib/outcome"

const COLUMN_COUNT = 5

/**
 * One gate's numbers, and — when there is something to say — what the policy
 * behind them was doing while it judged.
 *
 * The note is a second row rather than a sixth column because it is the
 * exception. A column would reserve width on every page for a sentence that is
 * absent from most of them, and would have to be filled with something on the
 * rows that have nothing to report.
 */
export const PolicyRow = ({ segment }: { readonly segment: PolicyCalibration }) => {
  const reading = readGap(segment.overall)
  const ruleset = readRuleset(segment)

  return (
    <Fragment>
      <tr className="border-edge-subtle border-t">
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

      {ruleset && (
        <tr>
          <td colSpan={COLUMN_COUNT} className="pb-2">
            <span className={"rounded-sm px-2 py-0.5 text-2xs " + toneClasses(ruleset.tone)}>
              {ruleset.label}
            </span>
            <span className="text-ink-muted ml-2 text-2xs">{ruleset.detail}</span>
          </td>
        </tr>
      )}
    </Fragment>
  )
}
