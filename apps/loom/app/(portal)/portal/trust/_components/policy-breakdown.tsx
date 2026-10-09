import { WRITE_CHECKS } from "@jam-overture/loom"
import type { CalibrationReport } from "@jam-overture/loom/telemetry"

import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import {
  poolsMoreThanOneGate,
  poolsMoreThanOneWritePath,
} from "@/app/(portal)/_lib/calibration-view"
import { plainWriteCheck } from "@/app/(portal)/_lib/vocabulary"

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
 *
 * Behind a disclosure since the page became `/portal/trust`, with the caveat it
 * exists to raise moved onto the summary line so a closed disclosure still warns
 * the reader. The warning is the part a person needs unasked; the table is the
 * part they need once they have decided to look.
 *
 * **A third reason it opens, since 0248: the write path moved.** A policy proves
 * which rules were consulted and cannot reach the checks a deployment hands the
 * write path separately, so a window can pool two write paths with one unchanged
 * policy name and nothing above would have said so. That case gets its own
 * summary line, because a reader told their *rules* changed would go looking
 * through a configuration that never moved.
 */
export const PolicyBreakdown = ({ report }: { readonly report: CalibrationReport }) => {
  const pooledGates = poolsMoreThanOneGate(report)
  const pooledWritePaths = poolsMoreThanOneWritePath(report)

  if (!pooledGates && !pooledWritePaths) return null

  return (
    <TechnicalDetail
      summary={
        pooledGates
          ? "Careful: your rules changed while these were judged"
          : "Careful: what Loom was checking changed while these were judged"
      }
    >
      <p className="text-ink-muted">
        {!pooledGates
          ? "Your rules held still on this page. What your deployment hands Loom to check before a change goes on did not, and either of those checks can turn a change that would have gone through into one that was turned down — so the verdict above pools two write paths. Each row is the same measurement over one name."
          : report.byPolicy.length > 1
            ? "More than one set of rules judged the changes on this page, so the verdict above pools gates that did not agree. Each row is the same measurement over one of them."
            : "The rules on this page did not hold still, so the verdict above pools judgments made under different ones. Each row is the same measurement over one name."}
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

      {pooledWritePaths && <ChecksLegend />}
    </TechnicalDetail>
  )
}

/**
 * What each of the checks a row names actually checks.
 *
 * The rows above name them with the record's own spelling, which is what a host
 * matches against its own composition root — and which is a word nobody can act
 * on without being told what it means. So the translation sits under the table
 * it explains: plain name, one sentence, and the record's own word beside it so
 * the row above and this line are visibly the same thing.
 *
 * Every check this version of Loom has, rather than only the ones this report
 * mentions. A reader working out why two write paths differ is working out what
 * is *missing* from one of them, and a legend listing only what is present
 * cannot answer that. It is two lines today and it is generated from
 * `WRITE_CHECKS`, so a third arrives here without anybody remembering to come
 * back.
 */
const ChecksLegend = () => (
  <dl className="flex flex-col gap-1">
    {WRITE_CHECKS.map((check) => {
      const plain = plainWriteCheck(check)

      return (
        <div key={check} className="flex flex-col gap-0.5">
          {/*
           * A separator between the two names, because the photograph of the
           * first draft read "the settings check props" — the plain name and
           * the record's own running together as one phrase, which is the one
           * thing a legend must not do.
           */}
          <dt className="text-2xs">
            {plain.label}{" "}
            <span className="text-ink-muted font-mono">· {plain.technical}</span>
          </dt>
          <dd className="text-ink-muted text-2xs">{plain.meaning}</dd>
        </div>
      )
    })}
  </dl>
)
