import type { TreeId } from "@loom/runtime"

import { RevisionLink } from "@/app/(portal)/_components/revision-link"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import {
  describeDifference,
  describeRecycling,
  explainDifference,
  readCheckup,
  toneOfAudit,
  type AuditReport,
} from "@/app/(portal)/_lib/audit-view"
import { toneClasses } from "@/app/(portal)/_lib/outcome"
import { readCoverage, type SeedCoverage } from "@/app/(portal)/_lib/seed-coverage"

/**
 * The answer, then what it rests on, then the runtime's own account of it.
 *
 * What this component used to lead with was a badge reading `diverged` beside
 * *"The log no longer produces the tree being served."* Both are exactly right
 * and neither is what somebody opening this page is asking. So the order is
 * inverted rather than the content cut: the plain verdict and its next move are
 * the surface, and `describeAudit`'s three sentences — the tone word, the
 * headline, the fold's own count of accepted changes — sit one disclosure down,
 * unaltered. Nothing that was on this screen has left it.
 *
 * Colour is still a second channel and never the only one: the verdict says
 * which of the three outcomes this is in words, so a reader who cannot tell the
 * palette apart reads the same result.
 *
 * A difference is a part of the page, so it leads with what that part is called
 * and says what is wrong underneath, in a sentence somebody can act on. The
 * runtime's own phrasing of the same difference — *"in the served tree, but
 * replaying the log does not produce it"* — is under the disclosure beside it,
 * because a reviewer chasing this down wants the vocabulary that matches the
 * record.
 *
 * Every revision this page names is a link (0043). A checkup is the one page
 * that is read *because* something is wrong, so the change it points at is the
 * change a reviewer most needs to open.
 */
export const CheckupVerdictPanel = ({
  report,
  treeId,
  coverage,
}: {
  readonly report: AuditReport
  readonly treeId: TreeId
  /**
   * How much of the original shape the fold actually compared, or `null` when
   * this run could not establish it — a diverged or unreplayable verdict, or a
   * head that moved between the audit and the count.
   *
   * Omitted rather than guessed. A coverage figure over a tree other than the
   * one the verdict describes is worse than none, and it is the same rule the
   * verdict itself follows: a checkup that could not run is not one that passed.
   */
  readonly coverage: SeedCoverage | null
}) => {
  const verdict = readCheckup(report)

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3">
        <div className={"flex flex-col gap-1 rounded-md px-4 py-3 " + toneClasses(verdict.tone)}>
          <span className="text-base">{verdict.label}</span>
          <span className="text-xs opacity-90">{verdict.meaning}</span>
          <span className="mt-1 text-xs opacity-80">{verdict.next}</span>
        </div>

        {/*
         * How much the verdict covers, and what it cannot, in one block directly
         * under the verdict it qualifies.
         *
         * The number is on the surface and the mechanism is behind the click,
         * which is the argument this unit makes: a green verdict is the one a
         * reader stops at, so a limit on it that needs a click is a limit nobody
         * meets — while *why* an end-state comparison has that hole in it is
         * genuinely detail.
         *
         * The first build had the sentence as a bare paragraph with the
         * disclosure floating below it, and a screenshot is what killed that: a
         * line reading "5 parts of the 10 this page started with have been
         * removed since" rendered as unweighted grey text under a green box
         * saying "Nothing to do.", so the eye took the reassurance and skipped
         * the limit. `notice` is the tone written for exactly this — a condition
         * worth knowing that is not a failure, quiet enough not to compete with
         * the verdict.
         *
         * Both readings live in the block rather than only the limiting one. A
         * caveat that appears only when there is something to caveat teaches a
         * reader to read its absence as nothing having been checked.
         */}
        {report.tone === "agrees" && (
          <StateNotice tone="notice">
            {coverage !== null && (
              <p className="text-ink-secondary text-sm">{readCoverage(coverage)}</p>
            )}
            <TechnicalDetail summary="What a checkup cannot tell you">
              <p>
                A checkup compares two <em>end results</em> — the page being served, and the page
                you get by replaying the record from the shape on file. It does not compare two
                histories, and nothing here can.
              </p>
              <p>
                So there is one way a page can pass that is worth knowing about. If the shape on
                file is wrong about some part, and a later change removed that part, there is
                nothing left for the two to disagree about — and the checkup says the page adds
                up. It is not lying: it is reporting that everything it could compare, matched.
              </p>
              <p>
                That is not hypothetical on a deployment like this one.{" "}
                <span className="font-mono">seedFor</span> rebuilds the starting shape from source
                rather than reading a stored copy, so editing{" "}
                <span className="font-mono">seed.ts</span> after a page already exists changes
                what a checkup starts from without changing the page. With a database attached,
                that is a checkup whose starting point drifted and whose verdict never said so.
              </p>
              <p className="text-ink-muted">
                0016 makes the log the truth and the snapshot a view of it, and 0028 is why the
                seed is a parameter rather than something the store keeps. Neither is a defect —
                folding a seed and a log and comparing to the snapshot is exactly what{" "}
                <span className="font-mono">auditSnapshot</span> claims to do. What was wrong was
                this screen promising the thing a reader wants (the history is intact) over the
                thing that was checked.
              </p>
            </TechnicalDetail>
          </StateNotice>
        )}

        {report.stoppedAt !== null && (
          <p className="text-ink-secondary text-sm">
            It stopped at <RevisionLink treeId={treeId} revision={report.stoppedAt} />.
          </p>
        )}

        <TechnicalDetail summary="The finding in the runtime's own words">
          <p>
            <span className={"rounded-sm px-2 py-0.5 " + toneClasses(toneOfAudit(report.tone))}>
              {report.tone}
            </span>{" "}
            <span className="text-ink-muted">{report.headline}</span>
          </p>
          <p className="text-ink-muted">{report.detail}</p>
        </TechnicalDetail>
      </section>

      {report.differences.length === 0 ? null : (
        <section className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {report.differences.map((difference) => (
              <li key={difference.nodeId} className="border-edge-subtle border-l-2 pl-3 text-xs">
                <span className="font-mono">{difference.label}</span>{" "}
                <span className="text-ink-muted font-mono">{difference.nodeId}</span>
                <span className="text-ink-secondary mt-1 block">
                  {explainDifference(difference)}
                </span>
              </li>
            ))}
          </ul>

          {/*
           * One disclosure for the list rather than one per row.
           *
           * The first build of this put each row's runtime phrasing behind its
           * own `<details>`, and a screenshot of four `missing` differences is
           * what killed it: the plain sentence for a code is the same sentence
           * every time, so the surface read as one line repeated four times with
           * the part's name — the only thing that told them apart — hidden
           * behind four separate clicks. Which part is *identity*, not technical
           * detail, and it belongs on the surface however runtime-ish it looks.
           *
           * So the list leads with the name, and the runtime's own phrasing of
           * every row is under one disclosure that reads on its own.
           */}
          <TechnicalDetail summary="The same list in the runtime's words">
            <ul className="flex flex-col gap-2">
              {report.differences.map((difference) => (
                <li key={difference.nodeId}>
                  <span className="font-mono">{difference.label}</span>{" "}
                  <span className="text-ink-muted font-mono">{difference.nodeId}</span>
                  <span className="text-ink-muted mt-1 block">
                    {describeDifference(difference)}
                  </span>
                </li>
              ))}
            </ul>
          </TechnicalDetail>
        </section>
      )}

      {report.omitted === 0 ? null : (
        <p className="text-ink-muted text-xs">
          {report.omitted} further {report.omitted === 1 ? "part differs" : "parts differ"} and{" "}
          {report.omitted === 1 ? "is" : "are"} not listed here.
        </p>
      )}

      {report.recycled.length === 0 ? null : (
        <div className="border-edge-subtle bg-surface-base flex flex-col gap-2 rounded-md border p-4">
          <p className="text-sm">
            {report.recycled.length === 1
              ? "One name is used for more than one part of this page."
              : "Some names are used for more than one part of this page."}
          </p>
          <p className="text-ink-muted text-xs">
            This does not change what people see, and it is a separate question from the verdict
            above. A name is how everything else — the history, an undo, who wrote what — joins a
            part of the page to its past. From the change named below, anything following one of
            these names is following two different parts without being able to tell.
          </p>
          <ul className="flex flex-col gap-2">
            {report.recycled.map((found) => {
              const account = describeRecycling(found)

              return (
                <li key={`${found.nodeId}-${found.returnedAt}`} className="text-xs">
                  <span className="text-ink-muted font-mono">{found.nodeId}</span>
                  <span className="text-ink-muted mt-1 block">
                    {account.opening} <RevisionLink treeId={treeId} revision={account.leftAt} />
                    {account.middle}{" "}
                    <RevisionLink treeId={treeId} revision={account.returnedAt} />
                  </span>
                </li>
              )
            })}
          </ul>
          {report.recyclingOmitted === 0 ? null : (
            <p className="text-ink-muted text-xs">
              {report.recyclingOmitted} further{" "}
              {report.recyclingOmitted === 1 ? "name is" : "names are"} not listed here.
            </p>
          )}
          <TechnicalDetail summary="What this is called, and why it is not the verdict">
            <p>
              <span className={"rounded-sm px-2 py-0.5 " + toneClasses("rejected")}>
                recycled ids
              </span>{" "}
              <span className="text-ink-muted">
                A node id that left the tree and came back naming something else (0038).
              </span>
            </p>
            <p className="text-ink-muted">
              The verdict above answers whether the log still produces the snapshot. This answers
              whether the log can be read by id, and a tree can pass the first and fail the
              second — so it is reported even under &ldquo;agrees&rdquo; rather than treated as a
              milder divergence.
            </p>
          </TechnicalDetail>
        </div>
      )}

      {report.restored === 0 ? null : (
        <p className="text-ink-muted text-xs">
          {report.restored} {report.restored === 1 ? "part was" : "parts were"} removed and put
          back unchanged, which is what taking a removal back looks like and is not a fault.
        </p>
      )}
    </div>
  )
}
