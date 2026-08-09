import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema } from "@loom/runtime"
import { renderRequest } from "@loom/runtime/react"
import { attributeTree, treeSourceFromStore } from "@loom/runtime/store"

import { portalDecoration } from "@/lib/addressing"
import { nodeCredits } from "@/lib/attribution-view"
import { requireActor } from "@/lib/auth/identity"
import { isInterpreterConfigured } from "@/lib/interpreter"
import { outlineRows } from "@/lib/outline"
import { portalRegistry } from "@/lib/registry"
import { ensureSeeded, portalStore } from "@/lib/store"
import { portalHolds } from "@/lib/write"

import { PreviewFrame } from "./_components/preview-frame"
import { PreviewSurface } from "./_components/preview-surface"
import { PromptBox } from "./_components/prompt-box"
import { ReviewQueue } from "./_components/review-queue"
import { SelectedNode } from "./_components/selected-node"
import { SelectionProvider } from "./_components/selection-context"
import { TreeOutline } from "./_components/tree-outline"

/**
 * The preview pane, and the outline that addresses into it.
 *
 * Both are derived from one `renderRequest` rather than from two reads, so the
 * outline cannot describe a revision the preview is not showing. `editMode` is on,
 * so every element carries `data-loom-node` — which is what makes the outline's
 * rows addresses rather than labels.
 */
const TreePage = async ({ params }: { params: Promise<{ treeId: string }> }) => {
  const { treeId } = await params
  const parsed = treeIdSchema.safeParse(treeId)

  if (!parsed.success) notFound()

  await requireActor(`/trees/${parsed.data}`)
  await ensureSeeded()

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

  const rows = outlineRows(rendered.value.tree, portalDecoration)
  const holds = await portalHolds.forTree(parsed.data)

  /**
   * Attributed from the tree that was rendered, not from a fresh `head` read: a
   * revision that landed in between would credit nodes this page is not showing.
   * A read failure costs the credits and nothing else — a reviewer who cannot be
   * told who placed a node can still see the node.
   */
  const attribution = await attributeTree(portalStore, rendered.value.tree)
  const credits = attribution.ok ? nodeCredits(attribution.value) : {}

  return (
    <SelectionProvider rows={rows}>
      <div className="flex flex-col gap-6 p-8 lg:flex-row-reverse lg:items-start">
        <div className="flex w-full flex-col gap-4 lg:w-72 lg:shrink-0">
          <TreeOutline />
          <SelectedNode credits={credits} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <PreviewFrame
            treeId={rendered.value.tree.treeId}
            revision={rendered.value.tree.revision}
            diagnostics={rendered.value.diagnostics}
          >
            <PreviewSurface>{rendered.value.element}</PreviewSurface>
          </PreviewFrame>

          <PromptBox
            treeId={rendered.value.tree.treeId}
            revision={rendered.value.tree.revision}
            configured={isInterpreterConfigured}
          />

          <ReviewQueue held={holds.ok ? holds.value : []} />

          <Link href={`/activity?tree=${encodeURIComponent(rendered.value.tree.treeId)}`} className="text-xs">
            what has been asked of this tree →
          </Link>
        </div>
      </div>
    </SelectionProvider>
  )
}

export default TreePage
