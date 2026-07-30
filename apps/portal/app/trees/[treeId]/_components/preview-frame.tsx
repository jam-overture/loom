import type { ReactNode } from "react"

import { describeRenderDiagnostic, type RenderDiagnostic } from "@loom/runtime/react"

/**
 * The chrome around a rendered tree: what it is, what revision it came from, and
 * anything the renderer could not honour.
 *
 * Diagnostics are shown rather than logged because 0008 made the renderer total —
 * it degrades instead of throwing — which only helps if the degradation is
 * visible to the person who can fix it.
 */
export const PreviewFrame = ({
  treeId,
  revision,
  diagnostics,
  children,
}: {
  readonly treeId: string
  readonly revision: number
  readonly diagnostics: readonly RenderDiagnostic[]
  readonly children: ReactNode
}) => (
  <div className="flex flex-col gap-4 p-8">
    <div className="flex items-baseline gap-3">
      <h1 className="text-2xl tracking-tight">preview</h1>
      <span className="text-ink-muted font-mono text-xs">
        {treeId} · revision {revision}
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
