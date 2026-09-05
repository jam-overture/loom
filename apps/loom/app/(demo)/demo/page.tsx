import { randomIdFactory } from "@loom/runtime"
import { renderLoomTree } from "@loom/runtime/react"
import Link from "next/link"

import { DOCS } from "@/app/(marketing)/_lib/site"

import { isDemoModelConfigured } from "@/app/(demo)/_lib/interpreter"
import { demoPageTree } from "@/app/(demo)/_lib/page-tree"
import { plainChange, settingsOf, type PlainChange } from "@/app/(demo)/_lib/plain-change"
import { availablePresets } from "@/app/(demo)/_lib/presets"
import { demoRegistry, demoThemes } from "@/app/(demo)/_lib/registry"
import { demoPolicy, demoSession } from "@/app/(demo)/_lib/session"
import { spotlightsFor, spotlitChange } from "@/app/(demo)/_lib/spotlight"
import { isUndo, undoOffer } from "@/app/(demo)/_lib/undo"
import { readVisitorId } from "@/app/(demo)/_lib/visitor"
import { describeProposalEffect, type ProposalEffect } from "@/app/(portal)/_lib/proposal-effect"

import { AnswerInView } from "./_components/answer-in-view"
import { AskPanel } from "./_components/ask-panel"
import { ChangeSpotlight } from "./_components/change-spotlight"
import { DemoBar } from "./_components/demo-bar"
import { RecordCard } from "./_components/record-card"
import { WhatHappens } from "./_components/what-happens"

/**
 * The demo: a page, and the record of how it got that way, side by side.
 *
 * Public, on a public path, in its own route group. It holds nothing worth
 * guarding — no portal store, no identity, no telemetry journal — and a
 * visitor's whole session is a tree in memory that expires with the instance.
 *
 * The page on the stage is not a screenshot, a video or a mock. It is a
 * `LoomTree` rendered through the runtime with the starter primitives resolving
 * it, and every change the rail records actually moved it.
 *
 * **The stage is light and the rail is dark**, and that is the load-bearing
 * decision of this layout rather than a taste. Both halves used to be white,
 * so the specimen page's own hero — 60px of "Your AI can change this page",
 * with a primary button going to GitHub — read as the demo's promise and the
 * demo's actual controls read as furniture beside it. A visitor could not tell
 * which words were Loom's. Now the rail is unmistakably the instrument and the
 * stage is unmistakably the thing being operated on, and the tree keeps its own
 * theme untouched, which it must: a visitor can re-theme it with one click.
 */
const DemoPage = async () => {
  const visitorId = await readVisitorId()
  const session = visitorId === undefined ? undefined : await demoSession(visitorId)
  const head = session === undefined ? undefined : await session.store.head(session.seed.treeId)

  /**
   * A visitor who has changed nothing has no session yet, and is shown the same
   * pristine tree a session would have been seeded with. Building it here rather
   * than creating a session on a read keeps a page view from allocating memory
   * on the instance — a crawler should cost nothing.
   */
  const tree = head?.ok ? head.value : demoPageTree()
  const rendered = renderLoomTree(tree, {
    resolver: demoRegistry,
    validator: demoRegistry,
    themes: demoThemes,
    /**
     * On, so every primitive's own root element carries its node id.
     *
     * The demo is not an editor and nothing here writes through the DOM — the
     * attributes exist so the *change* can be marked where it happened. Edit
     * mode decorates and never restructures (`editable.ts`), so this adds two
     * attributes per element and moves nothing on the page.
     */
    editMode: true,
  })

  const records = session?.records ?? []

  /**
   * The one change the page is currently about, and where to mark it.
   *
   * Read against the tree on the stage rather than against the record's own
   * account of itself: a held proposal describes nodes that are still there, and
   * an applied one describes the tree that is there now, so the same resolution
   * serves both and neither can point at a node that no longer exists.
   */
  /*
   * `isUndo` travels with it, because a mark reading "New — just added" over a
   * band the visitor has just watched come *back* is the one claim this surface
   * exists to make, said backwards. The delta cannot supply it — an undo's
   * operations are ordinary inserts and removes (0032) — so the record's own
   * provenance does.
   */
  const spotlit = spotlitChange(records, tree)
  const spots = spotlit
    ? spotlightsFor(tree, spotlit.record.touched, spotlit.tone, isUndo(spotlit.record))
    : []

  /**
   * The one record, if any, that has asked the visitor something and is waiting
   * for the answer. Newest first, so this is the question in front of them
   * rather than one they have already dealt with.
   */
  const awaiting = records.find((record) => record.heldProposalId !== undefined)

  /**
   * What each waiting proposal would replace, read against the tree on the
   * stage.
   *
   * Only the held ones. A record whose change already applied describes a tree
   * that no longer exists, so resolving its delta against the current one would
   * produce a confident and wrong "before".
   */
  const holds = session === undefined ? undefined : await session.holds.forTree(tree.treeId)
  const held = holds?.ok ? holds.value : []

  const effects = new Map<string, ProposalEffect>(
    held.map((one) => [one.proposalId, describeProposalEffect(tree, one.proposal.delta)])
  )

  /**
   * And the same proposals in the words on the page.
   *
   * Two readings of one delta, both computed here, because the card shows one
   * of them unasked and the other one click down — the plain half above the two
   * buttons, the review tool's half inside the disclosure. Which is which is
   * `record-card`'s to place; that both exist is this page's, because the tree
   * and the held delta are only in hand together here.
   *
   * The settings are read from the registry once per render rather than per
   * proposal: which props are a closed choice is a fact about the registry, and
   * it cannot change between two cards on one page.
   */
  const settings = settingsOf(demoRegistry)

  /**
   * Whether the change waiting on this proposal is one putting something back.
   *
   * The join is here rather than in `plainChange` because a held proposal and
   * the record of the ask that raised it are two different things — the store
   * holds the first, `session.ts` writes the second — and this page is the one
   * place both are in hand. A hold with no record of its own is described as an
   * ordinary change, which is the safe reading: it is what the delta says.
   */
  const restoring = (proposalId: string): boolean => {
    const record = records.find((one) => one.heldProposalId === proposalId)

    return record !== undefined && isUndo(record)
  }

  const plains = new Map<string, readonly PlainChange[]>(
    held.map((one) => [
      one.proposalId,
      plainChange(tree, one.proposal.delta, settings, restoring(one.proposalId)),
    ])
  )

  /** Absent rather than `undefined`: the props are optional, not nullable. */
  const heldProps = (
    record: (typeof records)[number]
  ): { readonly effect?: ProposalEffect; readonly plain?: readonly PlainChange[] } => {
    const id = record.heldProposalId
    if (id === undefined) return {}

    const effect = effects.get(id)
    const plain = plains.get(id)

    return {
      ...(effect === undefined ? {} : { effect }),
      ...(plain === undefined ? {} : { plain }),
    }
  }

  return (
    /* On a wide screen the demo is one viewport: the bar is fixed, and the
     * stage and the rail scroll independently, so a visitor reading a record
     * never loses sight of the page it is about. On a narrow one the two stack
     * and the document scrolls, because two nested scrollers on a phone is a
     * trap rather than a layout.
     */
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">
      <DemoBar revision={tree.revision} policyId={demoPolicy.policyId} />

      {/*
        * The rail comes first in the document and is moved to the right on a
        * wide screen, rather than the other way round.
        *
        * On a phone the two panes stack, and stage-first put the controls below
        * a full-length marketing page: a visitor on a phone met the specimen,
        * scrolled it to the end, and never found out the demo had anything to
        * press. Reading order follows the same logic — the sentence saying what
        * this is, then the button, then the page they act on — which is the
        * order a screen reader wants too.
        */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="border-edge bg-surface-page order-1 flex w-full shrink-0 flex-col gap-6 border-b p-5 lg:order-2 lg:w-[27rem] lg:overflow-y-auto lg:border-b-0 lg:border-l">
          {/*
            * The claim, at the size of a claim.
            *
            * The old rail's heading was "ask this page to change" at 18px — set
            * smaller than the specimen page's body copy, in a rail with no
            * visual weight, so the sentence that says what this surface is for
            * was the least prominent sentence on the screen.
            */}
          <header className="flex flex-col gap-2">
            <p className="text-accent text-2xs tracking-wide uppercase">Live demo</p>
            {/*
              * "Ask *that* page", not "ask this page to change itself".
              *
              * The old heading was written when the specimen was Loom's own
              * marketing page, so "this page" and "itself" had one referent and
              * the sentence read. The specimen is now a clinic's page and the
              * rail is Loom's, which makes "this page" the one question a
              * stranger must never have to ask. The heading points instead.
              */}
            <h1 className="text-2xl leading-tight tracking-tight text-balance">
              Ask that page for a change.
            </h1>
            {/*
              * Whose page, and what it is. Nothing else.
              *
              * It used to carry a third clause — *"and every rewrite arrives
              * with a record of what was asked, what Loom decided, and how to
              * put it back"* — which is the demo's whole claim and was in the
              * wrong place twice over. It was abstract, describing a record
              * rather than being one, which is the failure `WhatHappens` was
              * written to fix in the empty state; and it was four inches above
              * the button, so a stranger read it before it could mean anything
              * and had forgotten it by the time a card appeared.
              *
              * The claim now sits directly above the controls (`AskPanel`),
              * where it is about to become true.
              *
              * The first clause went for a different reason: *"It belongs to a
              * clinic that doesn't exist"* is what the bar says forty pixels
              * above, in almost the same words. What is left is the half the
              * bar does not cover and a stranger can otherwise get wrong — that
              * the thing on the stage is data rather than a picture of a page.
              */}
            <p className="text-ink-secondary text-sm">
              It isn’t a picture. It’s data, and an AI can rewrite it.
            </p>
            {/*
              * "That page" is only pointing at something on a wide screen. On a
              * phone the page is underneath, and a visitor who presses a button
              * without knowing that watches nothing happen — the one failure
              * this whole surface exists to avoid.
              */}
            <p className="text-ink-muted text-xs lg:hidden">
              It’s the page below. Press something, then look for the mark Loom leaves on it.
            </p>
          </header>

          <AskPanel
            revision={tree.revision}
            available={availablePresets(tree, randomIdFactory)}
            modelConfigured={isDemoModelConfigured}
          />

          {rendered.diagnostics.length > 0 && (
            <p className="bg-inapplicable text-inapplicable-ink rounded-md p-2 text-2xs">
              {rendered.diagnostics.length} render diagnostic
              {rendered.diagnostics.length === 1 ? "" : "s"} — the tree named something this surface
              could not honour.
            </p>
          )}

          {/*
            * The record goes directly under the controls that produced it, so
            * the newest card is the first thing under the button a visitor just
            * pressed rather than the last thing on a rail they have to scroll.
            */}
          {records.length > 0 && (
            <section aria-labelledby="the-record" className="flex flex-col gap-2">
              <h2 id="the-record" className="text-ink-muted text-2xs tracking-wide uppercase">
                the record
              </h2>

              {/*
                * The sentence that joins the two halves of the screen.
                *
                * The dot is the same colour as the ring on the page and as the
                * badge on the card underneath, and that is the whole teaching:
                * a visitor is never told "the marks mean X", they are shown one
                * colour in three places at once and read it in a glance. It
                * appears only when there is a mark to explain, so it is never a
                * legend for something that is not on screen.
                */}
              {spotlit && spots.length > 0 && (
                <p className="text-ink-secondary flex items-start gap-2 text-xs">
                  <span
                    aria-hidden="true"
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      spotlit.tone === "applied" ? "bg-applied-ink" : "bg-awaiting-ink"
                    }`}
                  />
                  {spotlit.tone === "applied"
                    ? "The page is marked where this happened."
                    : "The page is marked where this would happen, if you say yes."}
                </p>
              )}

              <ul className="flex flex-col gap-2">
                {records.map((record) => (
                  <RecordCard
                    key={record.recordId}
                    record={record}
                    offer={undoOffer(record, records)}
                    {...heldProps(record)}
                  />
                ))}
              </ul>

              {/*
                * The rail's own scroll, and only when the demo has asked the
                * visitor a question it cannot proceed without.
                *
                * The stage scrolls itself (`ChangeSpotlight`); on a wide screen
                * that is a different scroller, so a marked band arriving in view
                * says nothing about whether the two buttons deciding its fate
                * are on screen. Measured at 1440×800 they were not — sixty-nine
                * pixels under the fold, on the first press of the primary ask.
                * Stacked, it is further still: the whole panel of secondary
                * asks sits between the button and the question it raised.
                */}
              {awaiting && (
                <AnswerInView recordId={awaiting.recordId} token={`${tree.revision}`} />
              )}
            </section>
          )}

          {/*
            * The sequence stays whether or not there are records, because it is
            * the frame the cards are read through. Before the first ask it is
            * the answer to "what will pressing that do"; after it, it is the
            * answer to "what am I looking at".
            */}
          <WhatHappens />

          {/*
            * The way out, and it is the end of the rail rather than the top of
            * it on purpose.
            *
            * `Loom marketing` filed on 22 August that this route group had
            * exactly one `<a>` and it was the skip link, while the front door
            * had just begun offering `/demo` from six places — every one of
            * them a one-way door walked through by the visitor most likely to
            * be interested. Its own recommendation was two links and this is
            * the second: the wordmark goes home (`DemoBar`), and the foot of
            * the record answers the question a visitor has only *after* they
            * have watched a few changes land, which is how they would do this
            * to a page of their own.
            *
            * `/docs` is the honest destination for that and it needs no
            * account. The portal would be the dishonest one — it is a review
            * queue behind a sign-in (0019), and sending somebody who has just
            * been told "no account, nothing kept" to a sign-in page is the
            * dead end the front door was filed for last week.
            */}
          <footer className="border-edge-subtle text-ink-muted mt-auto flex flex-col gap-3 border-t pt-4 text-2xs">
            <Link
              href={DOCS.path}
              className="text-ink-secondary hover:text-ink group inline-flex items-center gap-1.5 text-xs transition-colors"
            >
              Want this on a page of your own? Read the docs
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
            <p>
              Your copy of this page lives in memory for as long as you are here, and belongs to
              nobody else. No account, no sign-in, nothing kept.
            </p>
          </footer>
        </aside>

        {/*
          * The stage. `loom-stage` gives the tree its own ground and its own
          * stacking context, so nothing about the dark chrome leaks into a page
          * that is carrying a registered theme of its own (0050).
          */}
        <div className="loom-stage order-2 min-w-0 flex-1 lg:order-1 lg:overflow-y-auto">
          <ChangeSpotlight
            spots={spots}
            token={`${tree.revision}:${spotlit?.record.recordId ?? ""}`}
          />
          {rendered.element}
        </div>
      </div>
    </div>
  )
}

export default DemoPage
