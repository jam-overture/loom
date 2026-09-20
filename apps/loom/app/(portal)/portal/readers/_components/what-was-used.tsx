import { PartName } from "@/app/(portal)/_components/part-name"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { outOfReaders, outOfVisits, type PageUse, type UnplacedUse } from "@/app/(portal)/_lib/reading-view"

/**
 * Whether anybody did anything, and where.
 *
 * ## The sentence this screen could not say
 *
 * Every other usage figure on this surface is an event count against one part:
 * *this button was pressed nine times*. Nine presses may be one enthusiastic
 * reader, and the part they landed on is always a control — so a page's
 * sections reported time on screen beside three permanent zeroes, and the
 * question an author actually opens this screen with, *is anybody using this
 * page*, had no answer on it at all.
 *
 * A reader who uses something is counted against every region it happened
 * inside, up to the whole page. So there are two sentences here and they are
 * different in kind: how many visits did something, which is exact, and which
 * part of the page saw the most of it, which is the half no analytics product
 * can produce because no analytics product knows a page is made of parts.
 *
 * ## Why the second one can arrive without a denominator
 *
 * A region is credited by what happened under it and by nothing else, so a band
 * nobody reported seeing, whose button somebody pressed, has a use and no
 * measured reach. That is a real state rather than a fault, and the branch
 * below says so in words instead of dividing by it. `reading-view.ts` decides
 * which of the two a part is in; this only reads the answer.
 */
export const WhatWasUsed = ({ use, views }: { readonly use: PageUse; readonly views: number }) => (
  <>
    <li className="text-ink">
      {outOfVisits(use.whole, views)} did something on this page — pressed
      something, followed a link, or opened something out.
    </li>

    {use.region !== undefined && (
      <li className="text-ink">
        The part that saw the most of that was <PartName part={use.region.part.name} />
        {use.region.outOf === undefined ? (
          <>
            {" "}
            — something in it was used on {use.region.used}{" "}
            {use.region.used === 1 ? "visit" : "visits"}. Nothing reported whether it was ever on
            screen, so there is no number here to measure that against.
          </>
        ) : (
          <>
            {" "}
            — {outOfReaders(use.region.used, use.region.outOf)} used something in it.
          </>
        )}
      </li>
    )}
  </>
)

/**
 * Presses that arrived with nowhere to put them.
 *
 * The reading this renders is the difference between *nobody uses my sections*
 * and *nothing told us where anything happened*, and a reader left to guess
 * between the two goes looking for a fault in their page that is not there. It
 * is a notice about the measurement rather than about the page, so it is the
 * quietest thing in the card, and the name of the thing to go and fix is one
 * click down where the person who can fix it will look for it.
 */
export const UnplacedUseNote = ({ unplaced }: { readonly unplaced: UnplacedUse }) => (
  <li className="text-ink-muted">
    {unplaced.uses} {unplaced.uses === 1 ? "click or opening was" : "clicks and openings were"}{" "}
    reported on this page, and not one of them said which part of the page it happened in — so
    nothing here can tell you where people are using it. That is the pages reporting back, not
    your readers.
    <TechnicalDetail summary="What is missing, and where to change it">
      <p>
        An <span className="font-mono">activated</span> or{" "}
        <span className="font-mono">disclosed</span> signal carries{" "}
        <span className="font-mono">within</span>: the addressed nodes it happened inside, nearest
        first, up to and including the root. A region&rsquo;s{" "}
        <span className="font-mono">engaged</span> is read off that ancestry and off nothing else,
        so a batch whose senders did not walk contributes nothing rather than a guess.
      </p>
      <p>
        The walk is on by default in{" "}
        <span className="font-mono">broadcastReaderSignals</span>. A batch arriving without it is
        usually an older copy of Loom on the site, a host that has turned it off, or signals
        synthesised somewhere that has no tree to walk.
      </p>
    </TechnicalDetail>
  </li>
)
