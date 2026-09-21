import type { IdFactory, LoomTree } from "@loom/runtime"
import type { PrimitiveRegistry } from "@loom/runtime/sdk"
import type { HeldProposal } from "@loom/runtime/write"

import { describeProposalEffect, type ProposalEffect } from "@/app/(portal)/_lib/proposal-effect"

import { stillToAsk } from "./already-asked"
import { partInQuestion, type PartInQuestion } from "./in-question"
import { markedPage, type MarkedPage } from "./marked"
import { movedOn, type MovedNote } from "./moved"
import { plainChange, settingsOf, type PlainChange } from "./plain-change"
import { availablePresets, type DemoPresetId } from "./presets"
import type { ChangeRecord } from "./record"
import { setAside, type SetAside } from "./set-aside"
import { spotlightsAcross, spotlitChanges, type Spotlight, type SpotlitChange } from "./spotlight"
import { putsSomethingBack } from "./undo"

/**
 * Everything the rail says about the page beside it, worked out in one place a
 * test can call.
 *
 * **This file exists because of what its absence cost, five times.** Every
 * reading this surface shows used to be computed inline in `page.tsx`, which is
 * an `async` Server Component that reads a cookie and a store — a boundary a
 * `vitest` run cannot cross. So the lane tested the functions the page called
 * and never the *calling*, and the defect matrix every unit here ends with kept
 * turning up the same row: a reading unwired by deleting one argument, with the
 * whole suite green and the build passing.
 *
 * The five, in the order they were found and with the edit that undoes each:
 *
 * | reading | unwired by | suite |
 * | --- | --- | --- |
 * | which asks are still worth offering | dropping `stillToAsk` | 440 passed |
 * | which holds can still be answered | dropping the `movedOn` filter | green |
 * | what the caution counts | dropping `openQuestions` | green |
 * | which marks the rail may claim | building `marked` from the changes rather than the marks | green |
 * | whether a mark says *back* | `restoring: putsSomethingBack(…)` → `restoring: false` | 490 passed |
 *
 * The 17 September finding named the shape and asked for it four runs running:
 * one exported function holding the arithmetic, so a test can call the same
 * function the page calls rather than a copy of it. This is that function, and
 * `page.tsx` is the JSX left over.
 *
 * **What it is not is a mock of `cookies` and `next/cache`.** Nothing here
 * touches a request, a store or a cache. It is handed the three values the page
 * has already fetched — the tree on the stage, the records of this visitor's
 * asks, the holds the store is keeping — and it answers, purely, what the rail
 * is allowed to say about them. That purity is the point: every property below
 * is a claim about the *page as a whole*, and a page-wide claim is exactly what
 * a test of one helper cannot make.
 */

/**
 * The four readings of a waiting change, gathered by the record they belong to.
 *
 * Generic in the preview, and that is the whole of why the wiring is testable.
 * The part of the page a question is about has to be *rendered* — a `LoomTree`
 * needs the registry, and the registry is not something to drag across a client
 * boundary — so the page hands in a function that turns a `PartInQuestion` into
 * an element, and a test hands in one that returns the part itself. Both get the
 * same map out, built by the same code, which is what a parallel map keyed for
 * the caller to join would have quietly given up.
 *
 * Absent rather than `undefined` inside each entry: the card's props are
 * optional, not nullable.
 */
export type RailReading<TPart> = {
  readonly effect?: ProposalEffect
  readonly inQuestion?: TPart
  readonly plain?: readonly PlainChange[]
  readonly moved?: MovedNote
}

export type RailView<TPart> = {
  /** The presets worth offering: the tree has somewhere to put them, and the visitor is not already waiting on one. */
  readonly available: readonly DemoPresetId[]
  /** The marks the page is actually carrying, across every change worth marking. */
  readonly spots: readonly Spotlight[]
  /** What the rail may say about those marks — built from the marks drawn, never from the changes that asked. */
  readonly marked: MarkedPage
  /** The caution at the controls, when a question is still open. */
  readonly waiting?: SetAside
  /** Per record, the readings a card cannot work out for itself. */
  readonly readings: ReadonlyMap<string, RailReading<TPart>>
  /** The one change the page is currently about — the marks, the legend and the way back are all about this one. */
  readonly about?: SpotlitChange
  /** What makes the stage scroll again: a new revision, or a newer question at the same one. */
  readonly spotlightToken: string
}

export type RailInput<TPart> = {
  readonly tree: LoomTree
  readonly records: readonly ChangeRecord[]
  readonly held: readonly HeldProposal[]
  /** Which words a part puts on the page, and which of its settings are a closed choice. */
  readonly registry: PrimitiveRegistry
  /** Only ever reaches `availablePresets`, which plans against the tree to find out whether an ask has anything to do. */
  readonly ids: IdFactory
  /**
   * How to show the part of the page a question is about.
   *
   * Called only for a question that can still be answered — see `answerable`
   * below, which is the one behaviour change this extraction made rather than
   * preserved.
   */
  readonly showPart: (part: PartInQuestion, proposalId: string) => TPart
}

export const whatTheRailShows = <TPart>({
  tree,
  records,
  held,
  registry,
  ids,
  showPart,
}: RailInput<TPart>): RailView<TPart> => {
  /**
   * The holds the page has moved past, by the record they belong to.
   *
   * A visitor may hold two changes at once — five buttons and nothing telling
   * them to answer one at a time — and answering either moves the revision,
   * which kills the other where it stands. `HeldProposal.baseRevision` is the
   * runtime's field for noticing, put there in its own words *"so a reader can
   * tell a hold is stale without parsing the delta"*, and this is the reader.
   *
   * Computed first because it decides four separate things that must not be
   * allowed to disagree: whether the page is marked for this change, whether
   * the rail scrolls to it, what its card says and offers, and — since this
   * unit — whether the card shows a preview of it at all.
   */
  const movedNotes = new Map<string, MovedNote>(
    held.flatMap((one) => {
      const note = movedOn(one.baseRevision, tree.revision)
      const record = records.find((each) => each.heldProposalId === one.proposalId)

      return note === undefined || record === undefined ? [] : [[record.recordId, note] as const]
    })
  )

  /**
   * The questions a visitor could still answer, and the only holds any reading
   * below is computed for.
   *
   * Not a tidying: every reading here resolves a delta against the tree in
   * front of it, and a dead hold's delta was planned against a tree that is
   * gone. What they would return is a confident account of a change that cannot
   * happen, printed above the words saying it cannot. The record itself loses
   * nothing — the delta, the inverse and the whole weighing are on the card's
   * disclosure, off the record rather than off the tree.
   */
  const answerable = held.filter((one) => movedOn(one.baseRevision, tree.revision) === undefined)

  /**
   * The same list as the ids the readings below join on.
   *
   * One set, built once, because two of those readings are halves of one claim:
   * the caution counts the open questions, and the panel withdraws the buttons
   * that make them. Computed separately they could disagree, and the way they
   * would disagree is the defect the pair was built for — the rail saying *2
   * questions are still waiting on you* over a page carrying one mark.
   */
  const openQuestions = new Set(answerable.map((one) => one.proposalId))

  /**
   * The changes the page is currently about, and where to mark each of them.
   *
   * Read against the tree on the stage rather than against the record's own
   * account of itself: a held proposal describes nodes that are still there, and
   * an applied one describes the tree that is there now, so the same resolution
   * serves both and neither can point at a node that no longer exists.
   *
   * `putsSomethingBack` travels with each, because a mark reading "New — just
   * added" over a band the visitor has just watched come *back* is the one claim
   * this surface exists to make, said backwards. The delta cannot supply it — an
   * undo's operations are ordinary inserts and removes (0032) — so the record
   * does, from its provenance when a control asked for the undo and from its
   * frozen settings when a second press of a toggle simply went back
   * (`put-back.ts`).
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
      restoring: putsSomethingBack(one.record),
    }))
  )

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
   * The settings are read from the registry once rather than per proposal:
   * which props are a closed choice is a fact about the registry, and it cannot
   * change between two cards on one page.
   */
  const settings = settingsOf(registry)

  /**
   * Whether the change waiting on this proposal is one putting something back.
   *
   * The join is here rather than in `plainChange` because a held proposal and
   * the record of the ask that raised it are two different things — the store
   * holds the first, `session.ts` writes the second. A hold with no record of
   * its own is described as an ordinary change, which is the safe reading: it is
   * what the delta says.
   *
   * The same predicate the marks are drawn from, and it has to be: this is the
   * sentence saying what the change *would* do and that one is the sentence
   * saying what it *did*, about one change. A hold described as an ordinary
   * change and then applied as a restoration would be the record contradicting
   * itself across one press.
   */
  const restoring = (proposalId: string): boolean => {
    const record = records.find((one) => one.heldProposalId === proposalId)

    return record !== undefined && putsSomethingBack(record)
  }

  const readings = new Map<string, RailReading<TPart>>(
    answerable.flatMap((one) => {
      const record = records.find((each) => each.heldProposalId === one.proposalId)
      if (record === undefined) return []

      /**
       * The registry is the third half of the effect: which of a part's
       * settings a reader reads is declared by whoever wrote the component, so
       * the words a deletion takes away can only be read against the primitives
       * this surface registered.
       */
      const effect = describeProposalEffect(tree, one.proposal.delta, registry)
      const plain = plainChange(tree, one.proposal.delta, settings, restoring(one.proposalId))
      const part = partInQuestion(tree, one.proposal.delta)

      return [
        [
          record.recordId,
          {
            effect,
            plain,
            ...(part === undefined ? {} : { inQuestion: showPart(part, one.proposalId) }),
          },
        ] as const,
      ]
    })
  )

  /**
   * And the note, for the cards `answerable` just excluded.
   *
   * A card the page has moved past gets exactly one reading and it is this one.
   * That is the whole of what the note means: there is nothing true left to say
   * about this change except that it can no longer happen.
   */
  for (const [recordId, moved] of movedNotes) readings.set(recordId, { moved })

  const about = spotlit[0]
  const waiting = setAside(records, openQuestions)

  return {
    available: stillToAsk(availablePresets(tree, ids), records, openQuestions),
    spots: drawn.flat(),
    marked,
    ...(waiting === undefined ? {} : { waiting }),
    readings,
    ...(about === undefined ? {} : { about }),
    /**
     * The newest marked change, which is the one the visitor has just asked
     * about — so a second ask scrolls the stage to *its* mark rather than
     * sitting still because an older question is still open.
     */
    spotlightToken: `${tree.revision}:${about?.record.recordId ?? ""}`,
  }
}
