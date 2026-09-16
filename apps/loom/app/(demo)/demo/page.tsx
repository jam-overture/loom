import { randomIdFactory } from "@loom/runtime"
import { renderLoomTree } from "@loom/runtime/react"
import Link from "next/link"

import { DOCS } from "@/app/(marketing)/_lib/site"

import { partInQuestion } from "@/app/(demo)/_lib/in-question"
import { isDemoModelConfigured } from "@/app/(demo)/_lib/interpreter"
import { markedPage } from "@/app/(demo)/_lib/marked"
import { movedOn, type MovedNote } from "@/app/(demo)/_lib/moved"
import { demoPageTree } from "@/app/(demo)/_lib/page-tree"
import { plainChange, settingsOf, type PlainChange } from "@/app/(demo)/_lib/plain-change"
import { availablePresets } from "@/app/(demo)/_lib/presets"
import { demoRegistry, demoThemes } from "@/app/(demo)/_lib/registry"
import { demoPolicy, demoSession } from "@/app/(demo)/_lib/session"
import { spotlightsAcross, spotlitChanges } from "@/app/(demo)/_lib/spotlight"
import { isUndo } from "@/app/(demo)/_lib/undo"
import { readVisitorId } from "@/app/(demo)/_lib/visitor"
import { describeProposalEffect, type ProposalEffect } from "@/app/(portal)/_lib/proposal-effect"

import { AskPanel } from "./_components/ask-panel"
import { BackToTheRecord } from "./_components/back-to-the-record"
import { ChangeSpotlight } from "./_components/change-spotlight"
import { DemoBar } from "./_components/demo-bar"
import { PartInQuestionView } from "./_components/part-in-question"
import { TheRecord, type HeldReading } from "./_components/the-record"
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
   * What each waiting proposal would replace, read against the tree on the
   * stage.
   *
   * Only the held ones. A record whose change already applied describes a tree
   * that no longer exists, so resolving its delta against the current one would
   * produce a confident and wrong "before".
   */
  const holds = session === undefined ? undefined : await session.holds.forTree(tree.treeId)
  const held = holds?.ok ? holds.value : []

  /**
   * The holds the page has moved past, by the record they belong to.
   *
   * A visitor may hold two changes at once — five buttons and nothing telling
   * them to answer one at a time — and answering either moves the revision,
   * which kills the other where it stands. `HeldProposal.baseRevision` is the
   * runtime's field for noticing, put there in its own words *"so a reader can
   * tell a hold is stale without parsing the delta"*, and this is the reader.
   *
   * Computed once, here, because it decides three separate things that must not
   * be allowed to disagree: whether the page is marked for this change, whether
   * the rail scrolls to it, and what its card says and offers.
   */
  const movedNotes = new Map<string, MovedNote>(
    held.flatMap((one) => {
      const note = movedOn(one.baseRevision, tree.revision)
      const record = records.find((each) => each.heldProposalId === one.proposalId)

      return note === undefined || record === undefined ? [] : [[record.recordId, note] as const]
    })
  )

  /**
   * The changes the page is currently about, and where to mark each of them.
   *
   * Read against the tree on the stage rather than against the record's own
   * account of itself: a held proposal describes nodes that are still there, and
   * an applied one describes the tree that is there now, so the same resolution
   * serves both and neither can point at a node that no longer exists.
   *
   * `isUndo` travels with each, because a mark reading "New — just added" over a
   * band the visitor has just watched come *back* is the one claim this surface
   * exists to make, said backwards. The delta cannot supply it — an undo's
   * operations are ordinary inserts and removes (0032) — so the record's own
   * provenance does.
   *
   * And the holds the page has moved past travel with them too, which is why
   * this had to move below them: a mark in the waiting colour over a change that
   * can never happen is the same failure in the other direction.
   *
   * **Plural, and the whole page's marks are drawn in one call.** Two open
   * questions used to draw one mark between them, and the newest silently won
   * it. `spotlightsAcross` spends the page's budget in rounds so that every
   * question gets marked before any question gets marked twice — which is a
   * property of the *page*, and so is not something a loop over one change at a
   * time could have.
   */
  const spotlit = spotlitChanges(records, tree, new Set(movedNotes.keys()))
  const drawn = spotlightsAcross(
    tree,
    spotlit.map((one) => ({
      touched: one.record.touched,
      tone: one.tone,
      restoring: isUndo(one.record),
    }))
  )
  const spots = drawn.flat()

  /**
   * What the rail says about those marks, and which card wears which words.
   *
   * Built from the marks that were actually drawn rather than from the changes
   * that asked for them: a change can be worth marking and draw nothing — the
   * re-theme configures the page root, and a ring around the whole stage points
   * at nothing — and a rail promising a mark the page is not carrying is the
   * same defect this fixes, pointed the other way.
   */
  const marked = markedPage(
    spotlit.map((one, index) => ({ recordId: one.record.recordId, spots: drawn[index] ?? [] }))
  )

  /**
   * Both readings are computed for a hold that can still land, and neither for
   * one the page has moved past.
   *
   * Not a tidying: `describeProposalEffect` and `plainChange` both resolve a
   * delta against the tree in front of them, and a dead hold's delta was planned
   * against a tree that is gone. What they would return is a confident account of
   * a change that cannot happen, printed above the words saying it cannot. The
   * record itself loses nothing — the delta, the inverse and the whole weighing
   * are on the card's disclosure, off the record rather than off the tree.
   */
  const answerable = held.filter((one) => movedOn(one.baseRevision, tree.revision) === undefined)

  const effects = new Map<string, ProposalEffect>(
    answerable.map((one) => [
      one.proposalId,
      /**
       * The registry is the third half of the reading: which of a part's
       * settings a reader reads is declared by whoever wrote the component, so
       * the words a deletion takes away can only be read against the primitives
       * this surface registered.
       */
      describeProposalEffect(tree, one.proposal.delta, demoRegistry),
    ])
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
    answerable.map((one) => [
      one.proposalId,
      plainChange(tree, one.proposal.delta, settings, restoring(one.proposalId)),
    ])
  )

  /**
   * And the part of the page each waiting proposal is about, rendered.
   *
   * The same two conditions as the effect above and for the same reason — a
   * change that has already landed describes a tree that is gone — plus one of
   * this one's own: it is built here, in a Server Component, because rendering a
   * `LoomTree` needs the registry and the registry is not something to drag
   * across a client boundary. The card is a client component and receives it as
   * an element, which is the boundary working as intended rather than around it.
   */
  const parts = new Map<string, React.ReactNode>(
    (holds?.ok ? holds.value : []).flatMap((held) => {
      const part = partInQuestion(tree, held.proposal.delta)

      return part === undefined
        ? []
        : [[held.proposalId, <PartInQuestionView key={held.proposalId} part={part} {...(rendered.theme ? { theme: rendered.theme } : {})} />] as const]
    })
  )

  /**
   * The four readings of a waiting change, gathered by the record they belong
   * to, which is the key the list renders by.
   *
   * A map rather than a function the list calls, because the list is a component
   * now (`TheRecord`) and this is the whole of what it cannot work out for
   * itself: three of these need the held proposal, which lives in the store, and
   * the fourth needs the revision that proposal was judged against.
   *
   * Absent rather than `undefined` inside each entry: the card's props are
   * optional, not nullable.
   */
  const heldReadings = new Map<string, HeldReading>(
    records.flatMap((record) => {
      const id = record.heldProposalId
      if (id === undefined) return []

      const effect = effects.get(id)
      const part = parts.get(id)
      const plain = plains.get(id)
      const moved = movedNotes.get(record.recordId)

      return [
        [
          record.recordId,
          {
            ...(effect === undefined ? {} : { effect }),
            ...(part === undefined ? {} : { inQuestion: part }),
            ...(plain === undefined ? {} : { plain }),
            ...(moved === undefined ? {} : { moved }),
          },
        ] as const,
      ]
    })
  )

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
            marked={marked}
            held={heldReadings}
            revision={tree.revision}
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
            /*
             * The newest marked change, which is the one the visitor has just
             * asked about — so a second ask scrolls the stage to *its* mark
             * rather than sitting still because an older question is still open.
             */
            token={`${tree.revision}:${spotlit[0]?.record.recordId ?? ""}`}
          />
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
      {spotlit[0] && (
        <BackToTheRecord recordId={spotlit[0].record.recordId} tone={spotlit[0].tone} />
      )}
    </div>
  )
}

export default DemoPage
