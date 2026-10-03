import { randomIdFactory, systemClock } from "@jam-overture/loom"
import { renderLoomTree } from "@jam-overture/loom/react"

import { roomToLand } from "@/app/(demo)/_lib/arrival"
import { isDemoModelConfigured } from "@/app/(demo)/_lib/interpreter"
import { demoPageTree } from "@/app/(demo)/_lib/page-tree"
import { whatTheRailShows } from "@/app/(demo)/_lib/rail"
import { demoRegistry, demoThemes } from "@/app/(demo)/_lib/registry"
import { demoPolicy, demoSession } from "@/app/(demo)/_lib/session"
import { readVisitorId } from "@/app/(demo)/_lib/visitor"
import { whatEachWillSay } from "@/app/(demo)/_lib/what-it-will-say"

import { AskPanel } from "./_components/ask-panel"
import { BackToTheRecord } from "./_components/back-to-the-record"
import { ChangeSpotlight } from "./_components/change-spotlight"
import { DemoBar } from "./_components/demo-bar"
import { PartInQuestionView } from "./_components/part-in-question"
import { RailHeader } from "./_components/rail-header"
import { ReadTheDocs } from "./_components/read-the-docs"
import { TheRecord } from "./_components/the-record"
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
 *
 * **What is left in this file is the three things only this file can do**, and
 * that is the whole shape of it now: fetch what the request has (the cookie,
 * the session, the head and the holds), render what needs the registry (the
 * tree on the stage, and the part of it a question is about), and lay the two
 * halves out. Every *reading* — which asks are still worth offering, which
 * holds can still be answered, what the caution counts, which marks the page
 * carries and which of them the rail may claim, whether a mark says *back* —
 * is `_lib/rail.ts`'s, because this file is an `async` Server Component and no
 * `vitest` run can reach one. Eight readings lived here and five of them could
 * be unwired by deleting a single argument with the whole suite green; the
 * finding that counted them is closed by that move rather than by this comment.
 */
/** The rail, less the one class that depends on whether a question is open. */
const RAIL =
  "border-edge bg-surface-page order-1 flex w-full shrink-0 flex-col gap-6 border-b p-5" +
  " lg:order-2 lg:w-[27rem] lg:overflow-y-auto lg:border-b-0 lg:border-l"

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
   * What the store is still holding for this visitor, which is the one input
   * the rail's readings cannot be worked out without.
   *
   * A held proposal is offered rather than applied and lives beside the tree
   * rather than in it (0021), so nothing about the tree on the stage says a
   * question is open against it.
   */
  const holds = session === undefined ? undefined : await session.holds.forTree(tree.treeId)

  /**
   * And the whole rail, in one call.
   *
   * The preview is the one reading that cannot be finished here: rendering a
   * `LoomTree` needs the registry, and the registry is not something to drag
   * across a client boundary. So the part is chosen there and rendered here,
   * through a callback — which is the boundary working as intended rather than
   * around it, and is what lets a test assert the same map this page builds
   * rather than a copy of it.
   */
  const rail = whatTheRailShows({
    tree,
    records,
    held: holds?.ok ? holds.value.held : [],
    registry: demoRegistry,
    ids: randomIdFactory,
    showPart: (part, proposalId) => (
      <PartInQuestionView
        key={proposalId}
        part={part}
        {...(rendered.theme ? { theme: rendered.theme } : {})}
      />
    ),
    /**
     * And the same rendering one step earlier, for the ask nobody has pressed
     * yet. Same callback shape and the same reason it is a callback: the
     * registry stays on the server and what crosses the client boundary is an
     * element that has already been rendered with it.
     */
    showAsk: (part) => (
      <PartInQuestionView
        part={part}
        {...(rendered.theme ? { theme: rendered.theme } : {})}
      />
    ),
    /**
     * And the same rendering one step *later*, for a change that has already
     * happened — the part it took off the page, drawn from the inverse the
     * record is holding rather than from the tree, which no longer has it.
     */
    showKept: (part) => (
      <PartInQuestionView
        part={part}
        {...(rendered.theme ? { theme: rendered.theme } : {})}
      />
    ),
  })

  /**
   * And what the Gate will say about **every** ask the panel is about to offer,
   * reached by running each of them — interpreted, analysed, assessed and
   * gated, stopping at the verdict without writing (0021).
   *
   * **This page decides nothing by making the calls.** Which asks are on offer
   * is `rail.ts`'s reading, taken straight off the view above and handed
   * through; what comes back is a record of answers the runtime produced, keyed
   * by the ask they are about. Which of them leads, whose verdict goes under
   * the green button, and how the rest divide are all `ask-panel.tsx`'s —
   * deliberately, because this file is an `async` Server Component and no
   * `vitest` run can reach one. The only thing that has to happen here is the
   * `await`, which is the one thing a client component cannot do.
   *
   * **It was one call until 2 October and is now one per offered ask**, and it
   * is still a tree walk and no key: the presets are deterministic (0057). What
   * that buys is the arrival screen's claim — *you can ask for 5 changes here;
   * Loom will make 2 on its own and ask you first about 3* — which is a count
   * of these answers rather than a promise about them, and which no deployment
   * has to be configured to earn.
   */
  const willSay = await whatEachWillSay(tree, rail.available, randomIdFactory, systemClock)

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
        {/*
          * The trailing room the card needs to reach the top of this scroller,
          * and it is `arrival.ts`'s decision rather than a layout choice made
          * here — `roomToLand` says what it measured, and why it is given for
          * both moments a card has to reach this scroller's top: a question
          * waiting on an answer, and the change that answer landed.
          */}
        <aside className={`${RAIL} ${roomToLand(rail)}`}>
          {/*
            * The claim, at the size of a claim — and a component rather than
            * four paragraphs written here.
            *
            * Nothing in it reads the tree, the store or the revision, so it was
            * the largest piece of this page's markup with no reason to be in
            * the one file in this lane a test cannot reach. `rail-header.tsx`
            * carries the copy decisions and `rail-header.test.tsx` now asserts
            * them.
            */}
          <RailHeader />

          <AskPanel
            revision={tree.revision}
            available={rail.available}
            modelConfigured={isDemoModelConfigured}
            {...(rail.waiting === undefined ? {} : { waiting: rail.waiting })}
            {...(rail.leading === undefined ? {} : { leading: rail.leading })}
            willSay={willSay}
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
            *
            * It is a component rather than a list written here, and that is a
            * defect's doing: two `records.map` calls ended up inside the one
            * `<ul>` on 11 September and every card rendered twice, with two
            * **Apply this change** buttons under one question. `the-record.tsx`
            * says what that cost and holds the three assertions that would have
            * caught it.
            */}
          <TheRecord
            records={records}
            marked={rail.marked}
            held={rail.readings}
            revision={tree.revision}
            {...(rail.landing === undefined ? {} : { landing: rail.landing })}
          />

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
            *
            * It is a component rather than a link written here because it is
            * now the second of the demonstration's two doors out, and both of
            * them close when the demonstration is inside somebody else's page:
            * the frame's sandbox permits no navigation but the frame's own, so
            * the only thing this link can reach in a box is the box.
            * `read-the-docs.tsx` argues the trade and `_lib/framed.ts` has the
            * browser behaviour behind it.
            */}
          <footer className="border-edge-subtle text-ink-muted mt-auto flex flex-col gap-3 border-t pt-4 text-2xs">
            <ReadTheDocs />
            {/*
              * **The clause about accounts is gone from here and it was not
              * dropped.** `RailHeader` carries *No sign-in* and *Nothing kept*
              * as chips, three inches up and above the fold at both sizes, which
              * is where a visitor deciding whether to press anything actually
              * is. Saying it twice on one screen is how a footer stops being
              * read at all — and this half, what becomes of the page they
              * change, is the half the chips cannot fit.
              */}
            <p>
              Your copy of this page lives in memory for as long as you are here, and belongs to
              nobody else.
            </p>
          </footer>
        </aside>

        {/*
          * The stage. `loom-stage` gives the tree its own ground and its own
          * stacking context, so nothing about the dark chrome leaks into a page
          * that is carrying a registered theme of its own (0050).
          */}
        <div className="loom-stage order-2 min-w-0 flex-1 lg:order-1 lg:overflow-y-auto">
          <ChangeSpotlight spots={rail.spots} token={rail.spotlightToken} />
          {rendered.element}
        </div>
      </div>

      {/*
        * The way back, and only the stacked layout ever sees it.
        *
        * `ChangeSpotlight` carries a visitor to an applied change, which on a
        * phone means carrying them past the whole specimen page — measured at
        * 390×844, the record card ends up around four thousand pixels above the
        * mark they were brought to. What is on screen at the end of the demo's
        * best moment is then a page and a chip, with nothing saying what was
        * removed, who allowed it, or that it can be put back.
        *
        * It is rendered for the one change the page is currently about, which is
        * the same record the marks are about and the same one the rail's legend
        * names, so the dot on the bar, the ring on the band and the badge on the
        * card are one colour saying one thing. `spotlitChanges` prefers a held
        * change over an applied one, which is the right preference here too: a
        * question the visitor has not answered outranks a receipt.
        */}
      {rail.about && (
        <BackToTheRecord recordId={rail.about.record.recordId} tone={rail.about.tone} />
      )}
    </div>
  )
}

export default DemoPage
