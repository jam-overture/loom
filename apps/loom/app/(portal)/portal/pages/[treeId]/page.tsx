import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema } from "@jam-overture/loom"
import { renderRequest } from "@jam-overture/loom/react"
import { attributeTree, treeSourceFromStore } from "@jam-overture/loom/store"

import { PageViews } from "@/app/(portal)/_components/page-views"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { portalDecoration } from "@/app/(portal)/_lib/addressing"
import { nodeCredits } from "@/app/(portal)/_lib/attribution-view"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { isInterpreterConfigured } from "@/app/(portal)/_lib/interpreter"
import { outlineRows } from "@/app/(portal)/_lib/outline"
import { pageNameOf } from "@/app/(portal)/_lib/page-name"
import { describeProposalEffect } from "@/app/(portal)/_lib/proposal-effect"
import { unreadableChangesIn } from "@/app/(portal)/_lib/unreadable-change"
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
        {/*
          * The heading names the failure rather than the page, and this is the
          * one screen in the portal where that is right. Everywhere else a page
          * is headed by what it is called — but a page that would not draw has
          * not told us what it is called, and heading it with an id was the
          * portal's largest text saying the least it could. What a reader needs
          * first here is what went wrong; which page it went wrong on is the
          * line under it, verbatim, as it is everywhere else.
          */}
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl tracking-tight">We couldn&rsquo;t draw this page.</h1>
          <p className="text-ink-muted truncate font-mono text-xs">{parsed.data}</p>
        </header>
        <StateNotice
          tone="failure"
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
  /**
   * Derived from the tree this screen has already rendered, so the name over the
   * page is the name *on* the page. A second read could name it after a revision
   * the reader is not looking at, which is the same class of mistake the holds
   * and the attribution below both avoid by using this tree rather than a fresh
   * one.
   */
  const page = pageNameOf(rendered.value.tree)
  const holds = await portalHolds.forTree(parsed.data)

  /**
   * Each hold, against the tree this page rendered rather than against a fresh
   * read. A proposal described against a revision the reviewer is not looking at
   * would show them a "before" that is not on their screen, which is a worse
   * failure than showing none.
   */
  /**
   * The rows on this page that this build could place and could not read.
   *
   * Dropped until now, along with the whole of 0175's second half. A page whose
   * only waiting change is one of these said **"Nothing is waiting for you."**
   * in a green box — the confident empty state, over a queue with something
   * stuck in it.
   */
  const unreadable = holds.ok ? unreadableChangesIn(parsed.data, holds.value) : []

  const changes = (holds.ok ? holds.value.held : []).map((held) => ({
    held,
    /**
     * The registry is the third half of the reading, and it is this
     * deployment's: which of a part's settings a reader reads is declared by
     * whoever wrote the component, so the only honest answer available here is
     * the one the primitives this host registered gave.
     */
    effect: describeProposalEffect(rendered.value.tree, held.proposal.delta, portalRegistry),
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
            page={page}
            treeId={rendered.value.tree.treeId}
            revision={rendered.value.tree.revision}
            diagnostics={rendered.value.diagnostics}
            views={<PageViews treeId={rendered.value.tree.treeId} current="page" />}
          >
            <PreviewSurface>{rendered.value.element}</PreviewSurface>
          </PreviewFrame>

          <PromptBox
            treeId={rendered.value.tree.treeId}
            revision={rendered.value.tree.revision}
            configured={isInterpreterConfigured}
          />

          <ReviewQueue changes={changes} unreadable={unreadable} />
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
