import type { CalibrationReport } from "@loom/runtime/telemetry"

import { poolsMoreThanOneGate } from "@/app/(portal)/_lib/calibration-view"

import { PolicyRow } from "./policy-row"

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
 * Absent while the page pools nothing on purpose. With a single unchanged policy
 * in the window this table restates the headline in smaller type, and a
 * breakdown that is always there is a breakdown nobody reads on the day it
 * matters.
 *
 * "One policy" is a claim about a name, and a name is host-declared. So a single
 * segment whose rules changed mid-window is still a pooled page, and still gets
 * the table — with the row's own note saying why it is not the one gate it
 * appears to be (0048).
 */
export const PolicyBreakdown =({ report }: { readonly report: CalibrationReport }) => {
  if (!poolsMoreThanOneGate(report)) return null

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm tracking-tight">by the gate that judged</h2>
      <p className="text-ink-muted text-xs">
        {report.byPolicy.length > 1
          ? "More than one policy judged the claims on this page, so the headline above pools gates that did not agree. Each row is the same measurement over one of them."
          : "The policy on this page did not hold still, so the headline above pools judgments made under different rules. Each row is the same measurement over one name."}
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
          {report.byPolicy.map((segment) => (
            <PolicyRow key={segment.policyId ?? UNRECORDED_KEY} segment={segment} />
          ))}
        </tbody>
      </table>
    </section>
  )
}
