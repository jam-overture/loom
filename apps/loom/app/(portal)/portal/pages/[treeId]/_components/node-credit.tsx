import type { TreeId } from "@loom/runtime"

import { RevisionLink } from "@/app/(portal)/_components/revision-link"
import type { NodeCredit } from "@/app/(portal)/_lib/attribution-view"

/**
 * Who put the selected node here, and where to go to read the change itself.
 *
 * Its own component because the selection pane already had one job — saying what
 * a click addresses — and attribution is a second one. They share a selection
 * and nothing else.
 *
 * Every revision a credit names is a link. Attribution answers *who*, and the
 * next question is always *what did they do* — which is a page that already
 * exists and that a reviewer previously had to reach by reading the number,
 * opening `/portal/history`, and paging back until it appeared.
 *
 * A credit with no revision links nowhere, which is the honest rendering of both
 * cases that produce one: a node the seed carried was placed by nobody, and a
 * node the walk did not reach was placed by somebody this page cannot name.
 */

export const NodeCreditLine = ({
  credit,
  treeId,
}: {
  readonly credit: NodeCredit | undefined
  readonly treeId: TreeId
}) => {
  if (!credit) return null

  return (
    <div className="border-edge-subtle flex flex-col gap-1 border-t pt-2 text-xs">
      {/*
        * `added` and `here from the start — no change put it here` are both
        * answers, and they arrived with no question. A screenshot is what
        * showed it: the sentence sat under the pointing notice as an orphan
        * paragraph, and a reader had no way to know it was about authorship
        * rather than about the part.
        */}
      <p className="text-ink-muted text-2xs tracking-wide uppercase">Where it came from</p>
      <p className={credit.partial ? "text-ink-muted italic" : "text-ink-muted"}>
        {credit.placed}
        {credit.revision !== null && (
          <>
            {" at "}
            <RevisionLink treeId={treeId} revision={credit.revision} />
            {credit.by === null ? null : ` — ${credit.by}`}
          </>
        )}
      </p>

      {credit.since.length > 0 && (
        <p className="text-ink-muted">
          Since then:{" "}
          {credit.since.map((touch, index) => (
            <span key={touch.revision}>
              {index > 0 && ", "}
              {touch.text} at <RevisionLink treeId={treeId} revision={touch.revision} />
            </span>
          ))}
          {credit.omitted > 0 && ` (and ${credit.omitted} earlier)`}
        </p>
      )}
    </div>
  )
}
