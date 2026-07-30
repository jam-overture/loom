import { notFound } from "next/navigation"

import { treeIdSchema } from "@loom/runtime"
import { renderRequest } from "@loom/runtime/react"
import { treeSourceFromStore } from "@loom/runtime/store"

import { portalRegistry } from "@/lib/registry"
import { portalStore } from "@/lib/store"

import { PreviewFrame } from "./_components/preview-frame"

/**
 * The preview pane, and the first place §3 renders something a user stored rather
 * than something a fixture supplied.
 *
 * `editMode` is on, so every element carries `data-loom-node` — which is what
 * addressing will read once the write path lands (0010). It costs one boolean
 * test per element when off, so there is no reason to serve an undecorated
 * version of a page nobody is looking at without the portal.
 */
const TreePage = async ({ params }: { params: Promise<{ treeId: string }> }) => {
  const { treeId } = await params
  const parsed = treeIdSchema.safeParse(treeId)

  if (!parsed.success) notFound()

  const rendered = await renderRequest(
    { treeId: parsed.data, editMode: true },
    {
      source: treeSourceFromStore(portalStore),
      resolver: portalRegistry,
      validator: portalRegistry,
    }
  )

  if (!rendered.ok) {
    if (rendered.error.code === "source-failed" && rendered.error.error.code === "not-found") {
      notFound()
    }

    return (
      <div className="p-8">
        <h1 className="text-2xl tracking-tight">could not render</h1>
        <p className="text-ink-muted mt-2 font-mono text-xs">{rendered.error.code}</p>
      </div>
    )
  }

  return (
    <PreviewFrame
      treeId={rendered.value.tree.treeId}
      revision={rendered.value.tree.revision}
      diagnostics={rendered.value.diagnostics}
    >
      {rendered.value.element}
    </PreviewFrame>
  )
}

export default TreePage
