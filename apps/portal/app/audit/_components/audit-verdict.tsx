import { describeDifference, toneOfAudit, type AuditReport } from "@/lib/audit-view"
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
 */
export const AuditVerdict = ({ report }: { readonly report: AuditReport }) => (
  <div className="flex flex-col gap-4">
    <div className="border-edge-subtle bg-surface-base flex flex-col gap-2 rounded-md border p-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className={`text-2xs rounded-sm px-2 py-1 ${toneClasses(toneOfAudit(report.tone))}`}>
          {report.tone}
        </span>
        <p className="text-sm">{report.headline}</p>
      </div>
      <p className="text-ink-muted text-xs">{report.detail}</p>
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
  </div>
)
