import Link from "next/link"

import { Measured } from "@/app/(portal)/_components/screen"
import { inPageOrder } from "@/app/(portal)/_lib/page-order"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import {
  figuresFrom,
  notCountedYet,
  piecesReadSummary,
  READER_SILENCES_PLAIN,
  readerSilencesHeld,
  howItIsRead,
  whyItLeads,
  whyNotComparable,
  whyNotWeighed,
  type PieceReading,
  type PiecesRead,
} from "@/app/(portal)/_lib/pieces-read"

import { HowRead } from "./how-read"

/**
 * Which of the pieces on this page to look at first — the one thing a catalogue
 * could not say about itself.
 *
 * ## Why it is above the list and not a screen of its own
 *
 * The list below it is the catalogue, and every card in it is about to gain the
 * two figures this section leads with. The defect was never that a card was
 * missing something: it was that a person with eighteen registered pieces had no
 * way to know which of them was not working. A screen of its own holding a
 * league table would be a seventeenth noun in a portal whose verdict was that it
 * should be a flat list of them.
 *
 * So the section names the piece, the cards carry the figures, and nothing moved
 * anywhere else. **The list is not reordered**, deliberately: a catalogue is the
 * list of what an AI may build with, and rearranging it by what readers did
 * would make the answer to *what can Loom use* depend on last week's traffic.
 * The link here is how a person gets to the one that needs them.
 *
 * ## What is on the surface, and what is one click down
 *
 * On the surface: which piece, where it stands, the two shares, why it is at the
 * top, and how many pages the figures come from. One click down: what makes the
 * two shares different questions, the counters behind the piece at the top, the
 * readers counted at the doors, and the runtime's own line for every reason a
 * reader share can be missing.
 *
 * The pair is the care this component exists to take, and none of it is taken
 * here: `_lib/pieces-read.ts` hands over both halves at once, so there is no
 * arrangement of this markup that prints a share of places under a sentence
 * about readers, and `./how-read.tsx` draws them, so the lead and the card it
 * links to cannot show one reading in two shapes.
 */
export const WhichPieceFirst = ({ read }: { readonly read: PiecesRead }) => {
  const notComparable = whyNotComparable(read)
  const waiting = notCountedYet(read)
  const held = readerSilencesHeld(read)

  /*
   * One rung for all of them, and the shared tiebreak arranges them.
   *
   * **No order sentence above this list**, and the argument is the one
   * `_components/unreadable-pages.tsx` already earns its exemption with: every
   * page here needs the same thing from a reader, so there is no top to name,
   * and a reader concluding that the second row matters less is the one wrong
   * conclusion available. A single one of these pages is enough to withhold the
   * reader share from the whole library.
   *
   * The tiebreak half is not optional. 0256 hands them over by page and newest
   * revision first, which is an order nothing else in this portal uses — so two
   * screens listing the same pages would disagree for no reason a reader could
   * find, which is the defect `_lib/page-order.ts` exists to remove.
   */
  const unpriced = inPageOrder(read.unscaled, (page) => ({ rank: 0, page: page.page }))

  return (
    /*
     * Full width, with the prose measured inside it rather than the section
     * measured around it — the shape the first photograph of `WhichPageFirst`
     * settled. A measured section above a full-width grid of cards reads as a
     * sidebar that has drifted to the top rather than as the thing the list
     * below it is about.
     */
    <section className="flex flex-col gap-3">
      <Measured className="gap-2">
        <h2 className="text-base tracking-tight">Which piece should I look at first?</h2>

        <p className="text-ink-secondary text-sm">{piecesReadSummary(read)}</p>
      </Measured>

      {read.worst !== undefined && <Worst piece={read.worst} why={whyItLeads(read)} />}

      <Measured className="gap-2">
        <p className="text-ink-muted text-xs">{figuresFrom(read)}</p>

        {notComparable !== undefined && <p className="text-ink-muted text-xs">{notComparable}</p>}

        {waiting !== undefined && <p className="text-ink-muted text-xs">{waiting}</p>}

        {/*
         * The pages themselves, directly under the sentence that is about them
         * and with no heading of their own — a heading would make a one-line
         * list into a section, and the sentence above has already named what
         * these are.
         *
         * **Each with its own reason.** *One of these pages is why* is only
         * useful with the why, and the three reasons have three different
         * remedies: a row that has expired, a sender that is not marking its
         * openings, and a collection window that has not come round. The reason
         * is the page's own vocabulary rather than this screen's, because the
         * subject of a reason is a property of the reading it comes from.
         */}
        {read.unscaled.length > 0 && (
          <ul className="flex flex-col gap-1 p-0">
            {unpriced.map((page) => (
              <li key={page.treeId} className="text-ink-muted flex flex-wrap items-baseline gap-x-2 text-xs">
                {/*
                 * The page's own screen rather than this one's: every figure
                 * about that page still stands, and the readership is the only
                 * thing missing. A reader sent here has somewhere useful to go,
                 * which is the half a notice has to carry.
                 */}
                <Link href={`/portal/readers?tree=${encodeURIComponent(page.treeId)}`}>
                  {page.page.name}
                </Link>
                <span className="font-mono text-2xs">{page.page.treeId}</span>
                <span>— {whyNotWeighed(page)}.</span>
              </li>
            ))}
          </ul>
        )}
      </Measured>

      <TechnicalDetail summary="Why there are two figures, and the counters behind them">
        {/*
         * `{" "}` at every junction where a word follows an element, rather
         * than the real space the source can carry. The space is in the DOM
         * under the transform the tests run through and is **not** in the built
         * page, so a rendered assertion is green on a junction a browser runs
         * together — found by a photograph on 10 October and recorded as a
         * finding because nothing in this repository can catch the next one.
         * Punctuation needs no space and is attached directly.
         */}
        <p>
          <span className="font-mono">libraryReadingOf</span>{" "}
          (0257) counts <strong className="font-medium">placements</strong>: one element node of one
          revision of one page. Its <span className="font-mono">readShare</span>{" "}
          is <span className="font-mono">read ÷ (read + skipped)</span>, a ratio of two counts of
          parts of trees — so no reader is in either term, no roll-up window appears in it, and
          shortening a deployment&rsquo;s window cannot move it.
        </p>

        <p>
          <span className="font-mono">libraryReachOf</span>{" "}
          (0256) weighs each placement by the page views counted at its page&rsquo;s own door:{" "}
          <span className="font-mono">met ÷ counted</span>, a weighted mean of each page&rsquo;s own
          sound share. The two answer different questions about one type and the answers can differ
          by an order of magnitude — a kind read in the one busy place and skipped in nine quiet
          ones is one place in ten and nine readers in ten.
        </p>

        <p>
          Neither <span className="font-mono">met</span>{" "}
          nor <span className="font-mono">openings</span>{" "}
          is a headcount and neither is rounded into one: both are distinct page-view counts, and{" "}
          <span className="font-mono">openings</span>{" "}
          counts one page view once per place the type stands on that page.
        </p>

        {read.worst !== undefined && <OnTheRecord piece={read.worst} />}

        <p>
          Readers counted at the doors of the pages behind this reading:{" "}
          <span className="font-mono">{read.arrivals}</span>, over{" "}
          <span className="font-mono">{read.scaled}</span>{" "}
          of <span className="font-mono">{read.pages}</span>{" "}
          pages. It is added once per page, which is the one count here that may be added at all: a
          reader arrived at one revision of one tree and was counted once (0219).
        </p>

        <p>
          Both readings also publish <span className="font-mono">byRole</span>{" "}
          — the same census keyed by what part a type plays (0114) rather than by the type itself.
          None of it is drawn, because nothing in{" "}
          <span className="font-mono">src/primitives/</span>{" "}
          declares a role, so every placement in this deployment lands in the single row for{" "}
          <span className="font-mono">role: null</span>. One declaration per primitive would start
          those rows answering, with no migration: the join is at read time (0212), so every counter
          already stored reinterprets.
        </p>

        {read.duplicated + read.duplicatedRows > 0 && (
          <p>
            Readings dropped as a second copy of one revision:{" "}
            <span className="font-mono">{read.duplicated}</span>; door rows ignored beyond the first
            for a revision: <span className="font-mono">{read.duplicatedRows}</span>. Both are a
            caller that concatenated two reads, and a page held twice is the one way a census can lie
            about how much of a library there is (0158).
          </p>
        )}

        {read.disagreed.length > 0 && (
          <p>
            Types whose readings disagreed about the role they play:{" "}
            <span className="font-mono">{read.disagreed.join(", ")}</span>. A type plays one part
            (0114), so this is two libraries read as one and every role row would be about neither.
          </p>
        )}

        {held.length > 0 && (
          <dl className="flex flex-col gap-2">
            {held.map((silence) => (
              <div key={silence} className="flex flex-col gap-0.5">
                <dt className="text-ink-secondary">
                  {READER_SILENCES_PLAIN[silence].label} <span className="text-ink-muted">·</span>{" "}
                  <span className="font-mono">{READER_SILENCES_PLAIN[silence].technical}</span>
                </dt>
                <dd>{READER_SILENCES_PLAIN[silence].meaning}</dd>
              </div>
            ))}
          </dl>
        )}
      </TechnicalDetail>
    </section>
  )
}

/**
 * The piece at the top, which is the whole point of the section.
 *
 * Four things in the order a person needs them: which piece, how it is read,
 * why it is the one at the top, and where to go. The link is last because it is
 * the action, and a reader who has not been told why they are going does not
 * need it sooner.
 *
 * **It draws the same pair as the card it links to, and that repetition is the
 * point rather than a cost.** A lead that said something the card did not would
 * be a second reading of one piece; a lead that said less would send a person
 * down the page to find out what it meant. So both go through `HowRead`, and
 * the card below carries everything else about the piece — what it is, what you
 * can set, the line the AI is handed — which is what makes it worth arriving
 * at.
 */
const Worst = ({
  piece,
  why,
}: {
  readonly piece: PieceReading
  readonly why: string | undefined
}) => (
  <div className="border-edge-subtle bg-surface-base flex flex-col gap-1.5 rounded-md border p-4">
    <p className="text-ink text-sm">
      Start with <span className="font-medium">{piece.name}</span>{" "}
      <span className="text-ink-muted font-mono text-xs">{piece.type}</span>.
    </p>

    <HowRead read={howItIsRead(piece)} />

    {why !== undefined && <p className="text-ink-secondary text-xs">{why}</p>}

    <p className="text-xs">
      {/*
       * An ordinary anchor and not a `Link`: the card is on this screen, so
       * this is a jump down the page rather than a navigation, and routing it
       * through the router would reload the screen to arrive where it already
       * is.
       */}
      <a href={`#${piece.type}`}>Look at {piece.name} below →</a>
    </p>
  </div>
)

/**
 * The counters for the piece at the top, where the figures that are not for a
 * surface may sit beside each other, because a reader has asked for them and
 * the sentences above them say what each one is.
 */
const OnTheRecord = ({ piece }: { readonly piece: PieceReading }) => (
  <dl className="flex flex-wrap gap-x-5 gap-y-1">
    <Figure name="type" value={piece.type} />
    <Figure name="placements" value={String(piece.places)} />
    <Figure name="read" value={String(piece.read)} />
    <Figure name="skipped" value={String(piece.skipped)} />
    <Figure name="unknown" value={String(piece.unsaid)} />
    {piece.readShare !== null && <Figure name="readShare" value={piece.readShare.toFixed(3)} />}
    {piece.openings !== null && <Figure name="openings" value={String(piece.openings)} />}
    {piece.counted !== null && <Figure name="counted" value={piece.counted.toFixed(2)} />}
    {piece.met !== null && <Figure name="met" value={piece.met.toFixed(2)} />}
    {piece.missed !== null && <Figure name="missed" value={piece.missed.toFixed(2)} />}
    {piece.readerShare !== null && <Figure name="share" value={piece.readerShare.toFixed(3)} />}
    {piece.atMost !== null && <Figure name="atMost" value={piece.atMost.toFixed(3)} />}
    <Figure name="drift" value={String(piece.drift)} />
    <Figure name="pending" value={String(piece.pending)} />
    <Figure name="exact" value={String(piece.exact)} />
    {piece.onTheRecord !== undefined && <Figure name="withheld" value={piece.onTheRecord} />}
  </dl>
)

const Figure = ({ name, value }: { readonly name: string; readonly value: string }) => (
  <div className="flex gap-1">
    <dt className="text-ink-muted">{name}</dt>
    <dd className="font-mono">{value}</dd>
  </div>
)
