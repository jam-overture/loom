import Link from "next/link"
import { notFound } from "next/navigation"

import { proposalIdSchema, treeIdSchema } from "@jam-overture/loom"
import { renderLoomTree, renderRequest } from "@jam-overture/loom/react"
import { treeSourceFromStore } from "@jam-overture/loom/store"

import { PageName } from "@/app/(portal)/_components/page-name"
import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { portalDecoration } from "@/app/(portal)/_lib/addressing"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { plainObstacle } from "@/app/(portal)/_lib/effect-view"
import { pageNameOf } from "@/app/(portal)/_lib/page-name"
import { pageViewHref, pageViewLabel } from "@/app/(portal)/_lib/page-views"
import { describeProposalEffect } from "@/app/(portal)/_lib/proposal-effect"
import { proposedDrawing } from "@/app/(portal)/_lib/proposed-view"
import { portalRegistry } from "@/app/(portal)/_lib/registry"
import { ensureSeeded, portalStore } from "@/app/(portal)/_lib/store"
import { portalHolds } from "@/app/(portal)/_lib/write"

import { HeldProposalCard } from "../../_components/held-proposal"
import { DrawnPage } from "./_components/drawn-page"
import { MarkLegendView } from "./_components/mark-legend"

/**
 * One change waiting on somebody, drawn.
 *
 * ## Why this is a screen of its own
 *
 * It is the third of the three questions `docs/portal.md` phase 3 asks about a
 * page, and the plan says where it goes: *"the review queue's most-asked
 * question, which has never been answerable by eye"*. The queue on
 * `/portal/pages/[treeId]` says what a change would do in sentences and says it
 * carefully — but a sentence and a picture are not the same evidence, and the
 * difference is not that one is friendlier. *"Deletes the card “Prices” n_h, and
 * the 12 pieces inside it"* is exactly true and cannot tell a reviewer that the
 * band above it then has a heading and nothing under it.
 *
 * So it is not a widening of the queue card: a card in a list cannot hold two
 * full-size pictures of a page, and a queue whose every row was a page and a half
 * tall would have stopped being a queue. One change, one address, reachable from
 * both places a change is listed.
 *
 * ## The buttons are here, and that is the point rather than a convenience
 *
 * `waiting-card.tsx` argues, correctly, that a card which cannot show you the
 * change should hand you to somewhere that can rather than carry the answer
 * itself — *"answering a change from a screen that cannot show you the change is
 * exactly the sort of quick approval this whole surface exists to prevent"*
 * (0019). That argument inverts here. This is the one screen in the portal that
 * can show a reviewer the change, so it is the one screen where pressing yes is
 * an informed act, and sending somebody back to a third screen to press it would
 * mean the decision is always made somewhere other than where the evidence was.
 *
 * It is the existing card that carries them, unchanged, sitting under the
 * pictures. Nothing about answering a proposal is reimplemented here: the same
 * component, the same two server actions, the same re-judgement on confirm
 * (0021), the same receipt afterwards. What this screen adds is above it.
 *
 * ## The order is look, then read, then decide
 *
 * The pictures come first because they are the thing this screen has that no
 * other has. The key to them is above them rather than below, because a reader
 * who meets an outlined band before they have been told what an outline means has
 * to scroll past the evidence to find out and then scroll back. The words — what
 * was asked, why Loom stopped, every step, the judgement — are the card's, in the
 * order the card already argues for, and they are underneath: a reviewer who
 * looked at the picture and wants the detail reads downwards, and a reviewer who
 * wants only the detail has `/portal/pages/[treeId]` where the card lives without
 * the pictures.
 */

/**
 * Both pictures are drawn with the page screen's own options, and that is a
 * correctness point rather than tidiness.
 *
 * `/portal/pages/[treeId]` renders with a resolver and a validator and nothing
 * else — no data sources, no submissions, no themes, no frame origins — so a band
 * that reads a data source draws empty there. The second picture has to be drawn
 * the same way or the two would differ for a reason that has nothing to do with
 * the change, which is the one failure a before and an after cannot survive.
 *
 * `editMode` is on for both, because that is what puts `data-loom-node` on the
 * elements, and the marking is one attribute beside it.
 */
const DRAWING = {
  resolver: portalRegistry,
  validator: portalRegistry,
  editMode: true,
} as const

const ProposedChangePage = async ({
  params,
}: {
  params: Promise<{ treeId: string; proposalId: string }>
}) => {
  const { treeId, proposalId } = await params
  const page = treeIdSchema.safeParse(treeId)
  const asked = proposalIdSchema.safeParse(proposalId)

  if (!page.success || !asked.success) notFound()

  const back = pageViewHref("page", page.data)

  await requireActor(`/portal/pages/${page.data}/proposed/${asked.data}`)
  await ensureSeeded()

  const held = await portalHolds.get(asked.data)

  /**
   * A change is answered exactly once, so this address stops resolving the moment
   * somebody presses either button — including the reviewer who pressed it, if
   * they come back to it. That is the ordinary case rather than an error, and it
   * is the reason this is a notice and not `notFound()`: a 404 tells a reader the
   * address was wrong, and the address was right yesterday.
   *
   * A change that belongs to a different page is refused the other way. There is
   * nothing to say about it that is not "that is not this page", and a screen that
   * drew it anyway would draw one page's change over another page's picture.
   */
  if (!held.ok || held.value.treeId !== page.data) {
    if (held.ok) notFound()

    return (
      <Screen>
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl tracking-tight">This one has already been answered.</h1>
        </header>
        <StateNotice
          tone="settled"
          action={<Link href={back} className="no-underline">← Back to your page</Link>}
        >
          <p>
            Somebody has said yes or no to this change, so there is nothing left to decide and
            nothing to show you. If it was accepted, your page has it now.
          </p>
        </StateNotice>
      </Screen>
    )
  }

  const rendered = await renderRequest(
    { treeId: page.data, editMode: true },
    { source: treeSourceFromStore(portalStore), ...DRAWING }
  )

  if (!rendered.ok) {
    return (
      <Screen>
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl tracking-tight">We couldn&rsquo;t draw this page.</h1>
        </header>
        <StateNotice
          tone="failure"
          action={<Link href={back} className="no-underline">← Back to your page</Link>}
        >
          <p>
            Nothing has been lost or changed — drawing a page only reads it, and the change is
            still waiting for your answer. You can still read what it would do on your page.
          </p>
          <TechnicalDetail>
            <p className="font-mono">{rendered.error.code}</p>
          </TechnicalDetail>
        </StateNotice>
      </Screen>
    )
  }

  const named = pageNameOf(rendered.value.tree)
  const { delta } = held.value.proposal
  /**
   * Both readings are taken against the tree that was just drawn rather than
   * against a fresh read, which is the rule every screen in this lane keeps: a
   * proposal described against a version the reviewer is not looking at would
   * show them an account of a page that is not the one on their screen.
   */
  const effect = describeProposalEffect(rendered.value.tree, delta, portalRegistry)
  const drawing = proposedDrawing(rendered.value.tree, delta, portalDecoration)
  const obstacle = plainObstacle(effect)

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl tracking-tight">What would this look like?</h1>
        <p className="text-ink-muted text-sm">
          A change is waiting on you. Here is <PageName page={named} layout="inline" /> as it is
          now, and as it would be if you said yes.
        </p>
        <p className="text-xs">
          <Link href={back}>← {pageViewLabel("page")}</Link>
        </p>
      </header>

      {drawing.kind === "cannot-draw" ? (
        /*
          * There is no second picture, and inventing one would be the worst thing
          * this screen could do. A change is applied whole or not at all (0001),
          * so a page built from the steps that happen to land is a page nobody
          * will ever be served under either answer — the same thing the
          * progression is forbidden from drawing between two versions, and for the
          * same reason.
          *
          * The words are `plainObstacle`'s, off the same reading the steps below
          * come from. `obstacle` is null only when the change would apply, which is
          * not this branch; the fallback is there because that is a fact about two
          * modules and not a promise the type system makes.
          */
        <StateNotice tone="notice" title={obstacle?.label ?? "This change can no longer be applied."}>
          <p>
            {obstacle?.meaning ??
              "Something this change refers to has moved or gone since it was written, so there is no page to draw. Turn it down and ask again."}
          </p>
          <p>
            You can still read every step of it below, and your page as it stands is on{" "}
            <Link href={back}>{pageViewLabel("page")}</Link>.
          </p>
          <TechnicalDetail>
            <p className="font-mono">{drawing.detail}</p>
            {obstacle !== null && <p className="font-mono">{obstacle.technical}</p>}
          </TechnicalDetail>
        </StateNotice>
      ) : (
        <>
          <MarkLegendView legend={drawing.legend} notOutlined={drawing.notOutlined} />

          <DrawnPage
            title="Your page now"
            note="Exactly what your readers are being served at this moment."
            marks={drawing.now}
          >
            {rendered.value.element}
          </DrawnPage>

          <DrawnPage
            title="If you say yes"
            note="Nobody has been served this. It exists only because you are looking at it."
            marks={drawing.would}
          >
            {renderLoomTree(drawing.after, DRAWING).element}
          </DrawnPage>
        </>
      )}

      {/*
        * The card, unchanged, under the pictures. It is a list item because it is
        * one of a queue everywhere else, and it stays one here rather than growing
        * a second shape that could word the same change differently.
        */}
      <ul className="flex max-w-3xl list-none flex-col gap-3 p-0">
        <HeldProposalCard held={held.value} effect={effect} />
      </ul>
    </div>
  )
}

export default ProposedChangePage
