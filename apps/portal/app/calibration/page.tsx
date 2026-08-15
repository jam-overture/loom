import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema } from "@loom/runtime"
import { calibrationOf, describeTelemetryError, episodesOf } from "@loom/runtime/telemetry"

import { StateNotice } from "@/app/_components/state-notice"
import { requireActor } from "@/lib/auth/identity"
import { portalTelemetry } from "@/lib/telemetry"
import { storeIsDurable } from "@/lib/store"

import { BucketRow } from "./_components/bucket-row"
import { CalibrationSummary } from "./_components/calibration-summary"
import { PolicyBreakdown } from "./_components/policy-breakdown"

/**
 * Whether a 0.9 is actually a 0.9.
 *
 * 0031 made this a reader and nothing more: the page shows the gap between what
 * the model claimed and what survived, and no part of the runtime consults it.
 * Moving a gate floor on the strength of what is here is a decision for a human
 * with this table in front of them.
 *
 * Like `/activity` it reads through the public telemetry exports, and for a
 * sharper reason — 0031 says calibration is the reference consumer. If this page
 * needed anything the package does not export, nobody outside could build the
 * adaptive behaviour this record is supposed to make possible.
 */
const CalibrationPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ tree?: string }>
}) => {
  const { tree } = await searchParams
  await requireActor("/calibration")

  const scope = tree === undefined ? undefined : treeIdSchema.safeParse(tree)
  if (scope && !scope.success) notFound()

  const page = await portalTelemetry.read({
    direction: "older",
    ...(scope?.success ? { treeId: scope.data } : {}),
  })

  if (!page.ok) {
    return (
      <div className="flex max-w-3xl flex-col gap-4 p-8">
        <h1 className="text-2xl tracking-tight">calibration</h1>
        <StateNotice tone="failure" title="The journal could not be read.">
          <p>{describeTelemetryError(page.error)}</p>
          <p>
            No table is shown rather than an empty one. A calibration table with nothing in it
            looks like a model that has made no claims; this is a page that could not find out.
          </p>
        </StateNotice>
      </div>
    )
  }

  const report = calibrationOf(episodesOf(page.value.records))
  const lastIndex = report.buckets.length - 1

  /*
   * Nothing scored is not the same as nothing happened, and the page used to
   * make them look identical: with no judged claims it still drew the summary,
   * the policy breakdown and ten bucket rows, every cell an em dash. A reader's
   * first calibration page was a grid of dashes, which reads as a broken table
   * rather than as an honest "not yet".
   *
   * The counts that survive a `judged` of zero are the interesting part. A
   * proposal the Gate held is waiting on a human, not missing — so the empty
   * state can say which of the two it is looking at instead of showing neither.
   */
  const waiting =
    report.unjudged["awaiting-answer"] + report.unjudged.failed + report.unjudged.unsettled
  const nothingScored = report.overall.judged === 0

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl tracking-tight">calibration</h1>
        {scope?.success && (
          <Link href="/calibration" className="text-xs">
            every tree →
          </Link>
        )}
      </div>

      <p className="text-ink-muted text-sm">
        The model grades its own confidence on every change it proposes. This is what became of
        those claims: a change that reached the log survived, one the Gate refused or a human
        discarded did not, and anything still in flight is counted separately rather than assumed.
      </p>

      {nothingScored ? (
        <StateNotice
          tone="empty"
          title="No claim on this page has been settled yet."
          action={<Link href="/activity">what has been asked →</Link>}
        >
          {waiting > 0 ? (
            <p>
              {waiting} {waiting === 1 ? "claim is" : "claims are"} in flight —{" "}
              {report.unjudged["awaiting-answer"]} held for a human to answer,{" "}
              {report.unjudged.failed} that failed, {report.unjudged.unsettled} still unsettled.
              A claim is scored only once something became of it, so a table drawn now would be
              a table of nothing rather than a table of zeroes.
            </p>
          ) : (
            <p>
              A score needs claims that were settled: proposed with a confidence, then either
              reaching the log or refused. Nothing on this page of the journal has been through
              that yet.
            </p>
          )}
          <p>
            Undos are never scored — a revert is proposed with a confidence of 1 by an
            interpreter that cannot be wrong (0032) — so a window of nothing but undos stays
            empty here on purpose.{" "}
            {report.runtimeAuthored > 0 &&
              `This one holds ${report.runtimeAuthored} of them. `}
            Rates over no claims are left blank rather than shown as zero.
          </p>
        </StateNotice>
      ) : (
        <>
          <CalibrationSummary report={report} />

          <PolicyBreakdown report={report} />

          <table className="w-full border-collapse">
            <thead>
              <tr className="text-ink-muted text-left text-2xs">
                <th className="pb-1 pr-4 font-normal">claimed</th>
                <th className="pb-1 pr-4 text-right font-normal">judged</th>
                <th className="pb-1 pr-4 text-right font-normal">survived</th>
                <th className="pb-1 font-normal">observed vs claimed</th>
              </tr>
            </thead>
            <tbody>
              {report.buckets.map((bucket, index) => (
                <BucketRow key={bucket.lower} bucket={bucket} isLast={index === lastIndex} />
              ))}
            </tbody>
          </table>

          {/*
           * The report is honest about small samples and the page must not smooth
           * that away. An empty band is empty, not a band with a zero in it.
           */}
          <p className="text-ink-muted text-xs">
            Read over the newest page of the journal, not its whole history, so this is a recent
            picture rather than a lifetime one. Bands with nothing in them are left blank — a rate
            over no claims is not zero.
          </p>
        </>
      )}

      {report.unattributed > 0 && (
        <p className="text-ink-muted text-xs">
          {report.unattributed} {report.unattributed === 1 ? "record" : "records"} on this page
          belong to an ask that began before it, and are counted in nothing above.
        </p>
      )}

      {storeIsDurable ? null : (
        <StateNotice tone="notice">
          <p>
            No database is configured, so this journal lives in the server process and holds only
            what this instance has seen. Set <span className="font-mono">DATABASE_URL</span> to make
            it durable.
          </p>
        </StateNotice>
      )}
    </div>
  )
}

export default CalibrationPage
