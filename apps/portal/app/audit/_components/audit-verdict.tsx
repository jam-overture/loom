import type { TreeId } from "@loom/runtime"

import { RevisionLink } from "@/app/_components/revision-link"
import {
  describeDifference,
  describeRecycling,
  toneOfAudit,
  type AuditReport,
} from "@/lib/audit-view"
import { toneClasses } from "@/lib/outcome"

/**
 * The verdict, and what it rests on.
 *
 * Colour is a second channel and never the only one: the badge and the headline
 * both say which of the three outcomes this is, so a reader who cannot tell the
 * palette apart reads the same result.
 *
 * A difference is a node, so it leads with the node's own name and id — the two
 * things needed to go and look at it — and says what is wrong underneath.
 *
 * Every revision this page names is a link (0043). An audit is the one page that
 * is read *because* something is wrong, so the change it points at is the change
 * a reviewer most needs to open — and it was, until now, the one page that named
 * revisions and left the reader to find them.
 */
export const AuditVerdict = ({
  report,
  treeId,
}: {
  readonly report: AuditReport
  readonly treeId: TreeId
}) => (
  <div className="flex flex-col gap-4">
    <div className="border-edge-subtle bg-surface-base flex flex-col gap-2 rounded-md border p-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className={`text-2xs rounded-sm px-2 py-1 ${toneClasses(toneOfAudit(report.tone))}`}>
          {report.tone}
        </span>
        <p className="text-sm">{report.headline}</p>
      </div>
      <p className="text-ink-muted text-xs">{report.detail}</p>
      {report.stoppedAt !== null && (
        <p className="text-ink-muted text-xs">
          The fold stopped at <RevisionLink treeId={treeId} revision={report.stoppedAt} />.
        </p>
      )}
    </div>

    {report.differences.length === 0 ? null : (
      <ul className="flex flex-col gap-2">
        {report.differences.map((difference) => (
          <li key={difference.nodeId} className="border-edge-subtle border-l-2 pl-3 text-xs">
            <span className="font-mono">{difference.label}</span>{" "}
            <span className="text-ink-muted font-mono">{difference.nodeId}</span>
            <span className="text-ink-muted mt-1 block">{describeDifference(difference)}</span>
          </li>
        ))}
      </ul>
    )}

    {report.omitted === 0 ? null : (
      <p className="text-ink-muted text-xs">
        {report.omitted} further {report.omitted === 1 ? "node differs" : "nodes differ"} and{" "}
        {report.omitted === 1 ? "is" : "are"} not listed here.
      </p>
    )}

    {report.recycled.length === 0 ? null : (
      <div className="border-edge-subtle bg-surface-base flex flex-col gap-2 rounded-md border p-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className={`text-2xs rounded-sm px-2 py-1 ${toneClasses("rejected")}`}>
            recycled ids
          </span>
          <p className="text-sm">
            {report.recycled.length === 1 ? "An id names" : "Some ids name"} more than one node.
          </p>
        </div>
        <p className="text-ink-muted text-xs">
          The log still produces what is being served, and that is a separate question from this
          one. An id is how every other reading of this tree joins its history together, so from
          the revision named below, anything that follows one of these ids is following two
          different nodes without being able to tell.
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
            {report.recyclingOmitted === 1 ? "id is" : "ids are"} not listed here.
          </p>
        )}
      </div>
    )}

    {report.restored === 0 ? null : (
      <p className="text-ink-muted text-xs">
        {report.restored} {report.restored === 1 ? "node was" : "nodes were"} removed and put back
        unchanged, which is what taking a removal back looks like and is not a fault.
      </p>
    )}
  </div>
)
