import { Fragment } from "react"

import type { PolicyCalibration } from "@jam-overture/loom/telemetry"

import {
  describePolicy,
  formatRate,
  readGap,
  readRuleset,
  readWritePath,
} from "@/app/(portal)/_lib/calibration-view"
import { toneClasses } from "@/app/(portal)/_lib/outcome"

const COLUMN_COUNT = 5

/**
 * One gate's numbers, and — when there is something to say — what the policy
 * behind them was doing while it judged.
 *
 * The notes are rows rather than a sixth column because they are the exception.
 * A column would reserve width on every page for a sentence that is absent from
 * most of them, and would have to be filled with something on the rows that have
 * nothing to report.
 *
 * **Two notes and not one**, since 0248. The ruleset note says whether the
 * *rules* held under this name; the write-path note says whether the checks the
 * deployment hands over did. They are independent — an edited policy moves the
 * fingerprint and leaves the checks alone, a wired registry moves the checks and
 * leaves the fingerprint byte-identical — so a row can honestly need either, or
 * both, and stacking them is the only arrangement that does not make one hide
 * the other. The rules come first, because they are the half a person wrote.
 */
export const PolicyRow = ({ segment }: { readonly segment: PolicyCalibration }) => {
  const reading = readGap(segment.overall)
  /*
   * Keyed by which question the note answers rather than by its own words. Two
   * of these readings can honestly print the same badge — a row may be partly
   * recorded on both halves — and a key taken from the label would make React
   * treat them as one row and drop the second.
   */
  const notes = (
    [
      ["rules", readRuleset(segment)],
      ["checks", readWritePath(segment)],
    ] as const
  ).flatMap(([about, note]) => (note === null ? [] : [{ about, note }]))

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

      {notes.map(({ about, note }) => (
        <tr key={about}>
          <td colSpan={COLUMN_COUNT} className="pb-2">
            <span className={"rounded-sm px-2 py-0.5 text-2xs " + toneClasses(note.tone)}>
              {note.label}
            </span>
            <span className="text-ink-muted ml-2 text-2xs">{note.detail}</span>
          </td>
        </tr>
      ))}
    </Fragment>
  )
}
