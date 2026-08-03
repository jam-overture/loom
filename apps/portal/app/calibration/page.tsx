import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema } from "@loom/runtime"
import { calibrationOf, describeTelemetryError, episodesOf } from "@loom/runtime/telemetry"

import { requireActor } from "@/lib/auth/identity"
import { portalTelemetry } from "@/lib/telemetry"
import { storeIsDurable } from "@/lib/store"

import { BucketRow } from "./_components/bucket-row"
import { CalibrationSummary } from "./_components/calibration-summary"

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
      <div className="flex max-w-3xl flex-col gap-3 p-8">
        <h1 className="text-2xl tracking-tight">calibration</h1>
        <p className="text-ink-muted text-sm">{describeTelemetryError(page.error)}</p>
      </div>
    )
  }

  const report = calibrationOf(episodesOf(page.value.records))
  const lastIndex = report.buckets.length - 1

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

      <CalibrationSummary report={report} />

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

      {report.unattributed > 0 && (
        <p className="text-ink-muted text-xs">
          {report.unattributed} {report.unattributed === 1 ? "record" : "records"} on this page
          belong to an ask that began before it, and are counted in nothing above.
        </p>
      )}

      {storeIsDurable ? null : (
        <p className="text-ink-muted text-xs">
          No database is configured, so this journal lives in the server process and holds only
          what this instance has seen. Set <span className="font-mono">DATABASE_URL</span> to make
          it durable.
        </p>
      )}
    </div>
  )
}

export default CalibrationPage
