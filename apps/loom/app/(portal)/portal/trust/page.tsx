import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema } from "@loom/runtime"
import { calibrationOf, describeTelemetryError, episodesOf } from "@loom/runtime/telemetry"

import { PageViews } from "@/app/(portal)/_components/page-views"
import { ScopedLead } from "@/app/(portal)/_components/scoped-lead"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { nameFor } from "@/app/(portal)/_lib/page-name"
import { portalTelemetry } from "@/app/(portal)/_lib/telemetry"
import { portalStore, storeIsDurable } from "@/app/(portal)/_lib/store"

import { contradictedBands, groupMisses, missesOf } from "@/app/(portal)/_lib/calibration-misses"
import { isOnTheMark } from "@/app/(portal)/_lib/calibration-view"

import { BucketRow } from "./_components/bucket-row"
import { MissedClaims } from "./_components/missed-claims"
import { PolicyBreakdown } from "./_components/policy-breakdown"
import { TrustSummary } from "./_components/trust-summary"

/**
 * Whether a 0.9 is actually a 0.9 — asked the way a person asks it.
 *
 * This was `/portal/calibration`, and calibration is a statistical property. What
 * somebody wants from it is whether the thing proposing changes to their pages
 * can be believed when it says it is sure, so that is what the route, the nav
 * label and the heading now say. The measurement underneath is identical: one
 * fold, `calibrationOf`, no second reading of the journal.
 *
 * The page's shape follows the portal's rule rather than the report's structure.
 * A verdict and a next move first, in a sentence; the misses after it, because a
 * class of change the model keeps being wrong about is the only thing here
 * anybody can act on; then the bands, the gates and the caveats behind
 * disclosures. Nothing that was on the screen has left it — the confidence table
 * is one click down rather than gone, which is the distinction the whole
 * redirection turns on.
 *
 * 0031 made this a reader and nothing more: the page shows the gap between what
 * the model claimed and what survived, and no part of the runtime consults it.
 * Moving a gate floor on the strength of what is here is a decision for a human
 * with this page in front of them — which is why the verdict names a next move
 * and never takes one.
 *
 * Like `/portal/activity` it reads through the public telemetry exports, and for
 * a sharper reason — 0031 says calibration is the reference consumer. If this
 * page needed anything the package does not export, nobody outside could build
 * the adaptive behaviour this record is supposed to make possible.
 */
const TrustPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ tree?: string }>
}) => {
  const { tree } = await searchParams
  await requireActor("/portal/trust")

  const scope = tree === undefined ? undefined : treeIdSchema.safeParse(tree)
  if (scope && !scope.success) notFound()

  const page = await portalTelemetry.read({
    direction: "older",
    ...(scope?.success ? { treeId: scope.data } : {}),
  })

  if (!page.ok) {
    return (
      <div className="flex max-w-3xl flex-col gap-4 p-8">
        <h1 className="text-2xl tracking-tight">Can you trust the AI?</h1>
        <StateNotice tone="failure" title="We couldn't check the AI's track record.">
          <p>
            Nothing is wrong with your pages — this reads the record of everything the AI has
            proposed, and that read didn&rsquo;t come back. Try again in a moment.
          </p>
          <p>
            No table is shown rather than an empty one. A page of zeroes looks like an AI that
            has never claimed anything; this is a page that could not find out.
          </p>
          <TechnicalDetail>
            <p className="font-mono">{describeTelemetryError(page.error)}</p>
          </TechnicalDetail>
        </StateNotice>
      </div>
    )
  }

  /*
   * One fold, read twice. `calibrationOf` answers "is a 0.9 actually a 0.9" and
   * discards the claims to do it; `missesOf` keeps the ones the answer is made
   * of. Folding the records once and passing the result to both is what makes
   * the two views incapable of describing different windows.
   */
  const fold = episodesOf(page.value.records)
  const report = calibrationOf(fold)
  const misses = missesOf(fold)
  const lastIndex = report.buckets.length - 1

  /**
   * What this page is called, and — because a name is only read when there is
   * one page in view — whether this screen is scoped at all.
   *
   * One bounded head read on a screen that is already reading the record. A
   * failed read costs the name and nothing else: the sentence still says which
   * page, by id, which is the same fallback a page with no heading of its own
   * gets.
   */
  const pageName = scope?.success ? await nameFor(portalStore, scope.data) : undefined

  /*
   * Nothing scored is not the same as nothing happened, and the page used to
   * make them look identical: with no judged claims it still drew the summary,
   * the policy breakdown and ten bucket rows, every cell an em dash. A reader's
   * first view of this page was a grid of dashes, which reads as a broken table
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
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl tracking-tight">Can you trust the AI?</h1>

        {/*
         * This screen has read a `tree` parameter since it was written and
         * nothing in the portal had ever linked to it, so the scoped view was
         * reachable only by typing a URL — and when somebody did, the page
         * said nothing about being scoped. Both halves are fixed by the same
         * strip: it is what links here, and the sentence beside it is what says
         * so on arrival.
         */}
        <p className="text-ink-muted text-sm">
          {pageName === undefined ? (
            <>
              Every time the AI proposes a change it says how sure it is. This page checks those
              claims against what actually happened, so you can tell whether &ldquo;I&rsquo;m
              sure&rdquo; from this AI is worth anything on your project.
            </>
          ) : (
            <ScopedLead view="trust" page={pageName} />
          )}
        </p>
      </header>

      {scope?.success && <PageViews treeId={scope.data} current="trust" />}

      {nothingScored ? (
        <StateNotice
          tone="empty"
          title="Nothing has been answered yet, so there is nothing to check."
          action={<Link href="/portal/activity">See what has been asked →</Link>}
        >
          {waiting > 0 ? (
            <p>
              {waiting} {waiting === 1 ? "change is" : "changes are"} still open —{" "}
              {report.unjudged["awaiting-answer"]} waiting on you,{" "}
              {report.unjudged.failed} that went wrong partway, {report.unjudged.unsettled} not
              finished. A claim counts here only once something became of it, so a table drawn
              now would be a table of nothing rather than a table of zeroes.
            </p>
          ) : (
            <p>
              To score itself the AI needs changes that were settled: proposed with a
              confidence, then either applied or turned down. Nothing here has been through
              that yet.
            </p>
          )}
          <TechnicalDetail summary="Why an undo never counts">
            <p>
              Undos are never scored — a revert is proposed with a confidence of 1 by an
              interpreter that cannot be wrong (0032) — so a window of nothing but undos stays
              empty here on purpose.{" "}
              {report.runtimeAuthored > 0 &&
                `This one holds ${report.runtimeAuthored} of them. `}
              Rates over no claims are left blank rather than shown as zero.
            </p>
          </TechnicalDetail>
        </StateNotice>
      ) : (
        <>
          <TrustSummary report={report} />

          {/*
           * Nothing missed is a real result and worth saying, rather than a
           * section that silently disappears. A page whose misses vanish when
           * there are none is indistinguishable from a page that never had the
           * section, and the reader cannot tell "I checked" from "nothing
           * checked".
           *
           * It sits above the tables now rather than below them. The misses are
           * the only thing on this page naming a class of change a reader can do
           * something about; the bands are how the verdict was computed, which
           * is a different question and one nobody asks first.
           */}
          {misses.length > 0 ? (
            <MissedClaims
              groups={groupMisses(misses)}
              contradicted={contradictedBands(report.buckets, misses, isOnTheMark)}
              total={misses.length}
            />
          ) : (
            <StateNotice tone="settled" title="It was never wrong by more than a coin flip.">
              <p>
                Every settled change landed on the side the AI&rsquo;s own confidence predicted:
                nothing it called likely was turned down, and nothing it hedged on sailed
                through. With {report.overall.judged}{" "}
                {report.overall.judged === 1 ? "change" : "changes"} answered it is a small
                sample, so read it as a good sign rather than as a guarantee.
              </p>
            </StateNotice>
          )}

          <TechnicalDetail summary="How sure it said it was, band by band">
            <p className="text-ink-muted">
              Each row is a band of confidence. The bar is how often changes in that band
              actually went through; the tick is where the AI&rsquo;s average claim for the band
              sat. A band the AI read correctly has its tick at the end of its bar.
            </p>

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
             * The report is honest about small samples and the page must not
             * smooth that away. An empty band is empty, not a band with a zero
             * in it.
             */}
            <p className="text-ink-muted">
              Read over the newest page of the journal, not its whole history, so this is a
              recent picture rather than a lifetime one. Bands with nothing in them are left
              blank — a rate over no claims is not zero.
            </p>

            {report.unattributed > 0 && (
              <p className="text-ink-muted">
                {report.unattributed} {report.unattributed === 1 ? "record" : "records"} here
                belong to an ask that began before this window, and are counted in nothing
                above.
              </p>
            )}
          </TechnicalDetail>

          <PolicyBreakdown report={report} />
        </>
      )}

      {storeIsDurable ? null : (
        <StateNotice tone="notice">
          <p>
            <strong className="font-medium">This record won&rsquo;t be kept.</strong>{" "}
            No database
            is set up, so the AI&rsquo;s track record lives in the server process and holds only
            what this instance has seen.
          </p>
          <TechnicalDetail summary="What to set">
            <p>
              Set <span className="font-mono">DATABASE_URL</span> to make the journal durable.
              Until then a restart is a fresh start, and a verdict on this page is a verdict
              over whatever this instance happens to have watched.
            </p>
          </TechnicalDetail>
        </StateNotice>
      )}
    </div>
  )
}

export default TrustPage
