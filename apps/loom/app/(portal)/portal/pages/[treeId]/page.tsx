import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema } from "@loom/runtime"
import { renderRequest } from "@loom/runtime/react"
import { attributeTree, treeSourceFromStore } from "@loom/runtime/store"

import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { portalDecoration } from "@/app/(portal)/_lib/addressing"
import { nodeCredits } from "@/app/(portal)/_lib/attribution-view"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { isInterpreterConfigured } from "@/app/(portal)/_lib/interpreter"
import { outlineRows } from "@/app/(portal)/_lib/outline"
import { describeProposalEffect } from "@/app/(portal)/_lib/proposal-effect"
import { portalRegistry } from "@/app/(portal)/_lib/registry"
import { ensureSeeded, portalStore } from "@/app/(portal)/_lib/store"
import { portalHolds } from "@/app/(portal)/_lib/write"

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

  await requireActor(`/portal/pages/${parsed.data}`)
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

    /**
     * The failure a reader is most likely to meet, and the one that used to say
     * least: `could not render` over a bare error code. Both facts a reader
     * needs were missing — that nothing has been damaged, and that this is not
     * something they can fix by trying harder.
     */
    return (
      <div className="flex max-w-xl flex-col gap-4 p-8">
        <h1 className="truncate font-mono text-2xl tracking-tight">{parsed.data}</h1>
        <StateNotice
          tone="failure"
          title="We couldn't draw this page."
          action={
            <Link href="/portal/pages" className="no-underline">
              ← Back to your pages
            </Link>
          }
        >
          <p>
            Nothing has been lost or changed — drawing a page only reads it. This usually means
            the page asks for something this deployment doesn&rsquo;t have set up.
          </p>
          <TechnicalDetail>
            <p className="font-mono">{rendered.error.code}</p>
          </TechnicalDetail>
        </StateNotice>
      </div>
    )
  }

  const rows = outlineRows(rendered.value.tree, portalDecoration)
  const holds = await portalHolds.forTree(parsed.data)

  /**
   * Each hold, against the tree this page rendered rather than against a fresh
   * read. A proposal described against a revision the reviewer is not looking at
   * would show them a "before" that is not on their screen, which is a worse
   * failure than showing none.
   */
  const changes = (holds.ok ? holds.value : []).map((held) => ({
    held,
    effect: describeProposalEffect(rendered.value.tree, held.proposal.delta),
  }))

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
      {/*
        * The page comes first in the source, and the rail sits to its right on
        * a wide screen because it is second rather than because the row is
        * reversed.
        *
        * `lg:flex-row-reverse` put the outline first in the DOM to land it on
        * the right, which cost two things nobody saw until a phone screenshot.
        * A visitor on a narrow screen met `loom.page`, `loom.heading` and
        * "Nothing picked yet" before they met their own page or its name — an
        * address book for a thing they had not been shown. And on any screen,
        * tab order ran right-hand column first, which is the mismatch between
        * reading order and focus order that reversing a row always buys.
        */}
      <div className="flex flex-col gap-6 p-8 lg:flex-row lg:items-start">
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

          <ReviewQueue changes={changes} />

          <Link href={`/portal/activity?tree=${encodeURIComponent(rendered.value.tree.treeId)}`} className="text-xs">
            Everything ever asked of this page →
          </Link>
        </div>

        <div className="flex w-full flex-col gap-4 lg:w-72 lg:shrink-0">
          <TreeOutline />
          <SelectedNode credits={credits} treeId={rendered.value.tree.treeId} />
        </div>
      </div>
    </SelectionProvider>
  )
}

export default TreePage
