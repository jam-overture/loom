import { randomIdFactory } from "@loom/runtime"
import { renderLoomTree } from "@loom/runtime/react"

import { isDemoModelConfigured } from "@/app/(demo)/_lib/interpreter"
import { demoPageTree } from "@/app/(demo)/_lib/page-tree"
import { availablePresets } from "@/app/(demo)/_lib/presets"
import { demoRegistry, demoThemes } from "@/app/(demo)/_lib/registry"
import { demoPolicy, demoSession } from "@/app/(demo)/_lib/session"
import { spotlightsFor, spotlitChange } from "@/app/(demo)/_lib/spotlight"
import { readVisitorId } from "@/app/(demo)/_lib/visitor"
import { describeProposalEffect, type ProposalEffect } from "@/app/(portal)/_lib/proposal-effect"

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
  const spotlit = spotlitChange(records, tree)
  const spots = spotlit ? spotlightsFor(tree, spotlit.record.touched, spotlit.tone) : []

  /**
   * What each waiting proposal would replace, read against the tree on the
   * stage.
   *
   * Only the held ones. A record whose change already applied describes a tree
   * that no longer exists, so resolving its delta against the current one would
   * produce a confident and wrong "before".
   */
  const holds = session === undefined ? undefined : await session.holds.forTree(tree.treeId)
  const effects = new Map<string, ProposalEffect>(
    (holds?.ok ? holds.value : []).map((held) => [
      held.proposalId,
      describeProposalEffect(tree, held.proposal.delta),
    ])
  )

  /** Absent rather than `undefined`: the prop is optional, not nullable. */
  const effectProps = (record: (typeof records)[number]): { readonly effect?: ProposalEffect } => {
    const found = record.heldProposalId === undefined ? undefined : effects.get(record.heldProposalId)

    return found === undefined ? {} : { effect: found }
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
            <h1 className="text-2xl leading-tight tracking-tight text-balance">
              Ask this page to change itself.
            </h1>
            <p className="text-ink-secondary text-sm">
              The page beside you isn’t code — it’s data. An AI can rewrite it, and every rewrite
              arrives with a record of what was asked, what Loom decided, and how to put it back.
            </p>
            {/*
              * "Beside you" is only true on a wide screen. On a phone the page
              * is underneath, and a visitor who presses a button without knowing
              * that watches nothing happen — the one failure this whole surface
              * exists to avoid.
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
                  <RecordCard key={record.recordId} record={record} {...effectProps(record)} />
                ))}
              </ul>
            </section>
          )}

          {/*
            * The sequence stays whether or not there are records, because it is
            * the frame the cards are read through. Before the first ask it is
            * the answer to "what will pressing that do"; after it, it is the
            * answer to "what am I looking at".
            */}
          <WhatHappens />

          <footer className="border-edge-subtle text-ink-muted mt-auto border-t pt-4 text-2xs">
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
