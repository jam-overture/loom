import type { ReactNode } from "react"

import type { TreeId } from "@loom/runtime"
import { describeRenderDiagnostic, type RenderDiagnostic } from "@loom/runtime/react"

import { RevisionLink } from "@/app/_components/revision-link"

/**
 * The chrome around a rendered tree: what it is, what revision it came from, and
 * anything the renderer could not honour.
 *
 * Diagnostics are shown rather than logged because 0008 made the renderer total —
 * it degrades instead of throwing — which only helps if the degradation is
 * visible to the person who can fix it.
 *
 * The revision is the last one this preview was folded from, and it was the last
 * revision the portal named as plain text. "What did the change I am looking at
 * actually do" is the obvious next question from here, and the answer was a trip
 * to `/history` and a descent through the log to find a number already on screen.
 */
export const PreviewFrame = ({
  treeId,
  revision,
  diagnostics,
  children,
}: {
  readonly treeId: TreeId
  readonly revision: number
  readonly diagnostics: readonly RenderDiagnostic[]
  readonly children: ReactNode
}) => (
  <div className="flex flex-col gap-4">
    <div className="flex items-baseline gap-3">
      <h1 className="text-2xl tracking-tight">preview</h1>
      <span className="text-ink-muted font-mono text-xs">
        {treeId} · <RevisionLink treeId={treeId} revision={revision} />
      </span>
    </div>

    {diagnostics.length > 0 && (
      <ul className="bg-awaiting text-awaiting-ink rounded-md p-3 text-xs">
        {diagnostics.map((diagnostic, index) => (
          <li key={index} className="font-mono">
            {describeRenderDiagnostic(diagnostic)}
          </li>
        ))}
      </ul>
    )}

    <div className="bg-surface-preview border-edge-subtle rounded-md border p-6">{children}</div>
  </div>
)
