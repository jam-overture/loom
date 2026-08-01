import type { StoredRevision } from "@loom/runtime/store"

import { describeOperation } from "@/lib/delta-summary"

/**
 * One accepted change: what it did to the tree, and who it came from.
 *
 * The revision leads because it is the entry's identity — `revision - 1` is what
 * it applied to, so a log read this way is a chain rather than a list of events
 * that happen to be sorted.
 *
 * Provenance is shown in full rather than summarised. 0016 said the log is what
 * makes 0001's claim real: a stored tree can say what it is, but only a log can
 * say who changed it, when, and why — and a view that dropped the interpreter or
 * the confidence would be keeping the record without showing it.
 */
export const RevisionRow = ({ stored }: { readonly stored: StoredRevision }) => (
  <li className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-md border p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <span className="font-mono text-sm">revision {stored.revision}</span>
      <time className="text-ink-muted font-mono text-2xs" dateTime={stored.appliedAt}>
        {stored.appliedAt}
      </time>
    </div>

    <ul className="flex flex-col gap-1">
      {stored.delta.operations.map((operation, index) => {
        const described = describeOperation(operation)

        return (
          <li
            key={`${described.subject}-${index}`}
            className="border-edge-subtle border-l-2 pl-3 text-xs"
          >
            {described.verb} <span className="font-mono">{described.subject}</span>{" "}
            <span className="text-ink-muted">{described.detail}</span>
          </li>
        )
      })}
    </ul>

    <dl className="text-2xs flex flex-wrap gap-x-4 gap-y-1">
      <div className="flex gap-1">
        <dt className="text-ink-muted">asked by</dt>
        <dd className="font-mono">{stored.provenance.actor ?? stored.provenance.origin}</dd>
      </div>
      <div className="flex gap-1">
        <dt className="text-ink-muted">interpreted by</dt>
        <dd className="font-mono">{stored.provenance.interpreter}</dd>
      </div>
      <div className="flex gap-1">
        <dt className="text-ink-muted">confidence</dt>
        <dd className="font-mono">{stored.provenance.confidence.toFixed(2)}</dd>
      </div>
      <div className="flex gap-1">
        <dt className="text-ink-muted">proposal</dt>
        <dd className="font-mono">{stored.proposalId}</dd>
      </div>
    </dl>
  </li>
)
