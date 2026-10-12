import Link from "next/link"

import { renderCatalogue } from "@jam-overture/loom"
import { catalogueOf } from "@jam-overture/loom/sdk"
import {
  describeReaderSignalStoreError,
  libraryReachOf,
  libraryReadingOf,
  pageReadingOf,
  type PageReading,
  type ReaderSignalStoreError,
} from "@jam-overture/loom/signals"

import { CardGrid, Measured, Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { pageNameOf, unnamed, type PageName } from "@/app/(portal)/_lib/page-name"
import { howItIsRead, notOnThesePages, piecesReadOf, type PiecesRead } from "@/app/(portal)/_lib/pieces-read"
import { portalReaderTallies } from "@/app/(portal)/_lib/reader-signals"
import { portalRegistry } from "@/app/(portal)/_lib/registry"
import { skippingComparable } from "@/app/(portal)/_lib/skipped"
import { portalStore } from "@/app/(portal)/_lib/store"

import { PieceCard } from "./_components/piece-card"
import { WhichPieceFirst } from "./_components/which-piece-first"

/**
 * What the AI is allowed to put on a page here, and nothing else.
 *
 * This was `/portal/primitives`. A primitive is the framework's word — it is in
 * the marketing lane's own list of words a visitor has never heard — and the
 * page led with it in lower case over the sentence *"This is exactly what a
 * model is told it may build."* Both halves of that sentence are the most
 * valuable thing on the screen and neither was written for the person reading
 * it.
 *
 * The route is `/portal/pieces` because *piece* is what the rest of the portal
 * already calls one. A change's plain reading says *"it brings 3 more pieces
 * with it"* and *"the 4 pieces inside it"*; a reviewer moving from that sentence
 * to this page should not have to learn a second word for the thing they just
 * read about. `/portal/primitives` answers permanently with a 308, the same
 * shape the three earlier renames took.
 *
 * The claim the page exists to make is the one a repository cannot make: **this
 * list bounds what an AI can do to your pages.** It is not a document about the
 * catalogue, it is the catalogue — the same projection `catalogueOf` hands the
 * interpreter, read from the same registry (0013) — so a piece on this page that
 * a proposal cannot use, or the reverse, is impossible rather than unlikely.
 * Each card carries the line the model is given, produced by the runtime's own
 * formatter, which is what turns the claim into something a reader can check.
 *
 * ## The half that was missing, and the reason to open this screen twice
 *
 * Everything above is read from the registry, which changes only when somebody
 * writes code. So this was a perfect catalogue with no reason to be visited
 * again: a person who had read it once had read it.
 *
 * What they actually want to know about a piece they registered is whether it
 * works — *do readers read the band I put on nine pages, or do they pass it?* —
 * and that is a question about the **library** rather than about any one page.
 * 0257 and 0256 joined a type's placements across every page a deployment has
 * counted, so it is now answerable, and `_lib/pieces-read.ts` holds the one rule
 * that makes it safe to answer: **two labelled figures, never one**, because the
 * share of the places a piece stands and the share of the readers who met it are
 * different questions whose answers can differ by an order of magnitude.
 *
 * ## Three reads, and what each failure costs
 *
 * The catalogue costs nothing — it is the registry, in memory, and it cannot
 * fail. Everything the reader half needs can:
 *
 * - the **counters** are the reading. A read of them that fails costs the reader
 *   half and says so, quietly, in a notice that does not compete with the
 *   catalogue. It does not cost the screen: this page's claim about what an AI
 *   may build does not depend on anybody having visited anything.
 * - the **door rows** are what makes two pages' readers comparable. Without them
 *   every reader share is withheld and every places figure stands, which is
 *   exactly the state 0256 publishes for a page the door cannot scale — so a
 *   failed read here degrades into a state the screen already draws properly.
 * - the **pages** are what a placement is a part of. A page whose read did not
 *   come back is not in the reading, and the count of pages that fell out is on
 *   the surface rather than quietly making the library look smaller.
 */
const PiecesPage = async () => {
  await requireActor("/portal/pieces")

  const catalogue = catalogueOf(portalRegistry)
  const read = await howPiecesAreRead()
  const library = read.kind === "read" ? read.value : undefined

  return (
    <Screen>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl tracking-tight">What Loom can put on your page</h1>
          {catalogue.length > 0 && (
            <Link href="/portal/pages" className="text-xs">
              Ask for a change →
            </Link>
          )}
        </div>

        {/*
         * Two leads rather than one with a clause in it, and neither says what
         * the notice below already says. The first draft of this screen had the
         * empty lead reading "the AI has nothing it can build with" directly
         * above a notice headed "There is nothing here for the AI to build
         * with" — the same fact twice, one line apart, which is the defect this
         * lane has now shipped and photographed four times. Found by looking at
         * the page.
         */}
        <Measured>
          <p className="text-ink-muted text-sm">
            {catalogue.length === 0
              ? "This is the list of pieces the AI is handed every time you ask for a change."
              : `Your project is set up with ${catalogue.length} kinds of piece. The AI is handed this exact list every time you ask for a change — anything that is not on it has nothing to draw it, so it would never appear on your page.`}
          </p>
        </Measured>
      </header>

      {catalogue.length === 0 ? (
        /*
         * The clearest instance of "what do I do now?" on this surface, and the
         * one a new person is most likely to meet: a deployment that has
         * registered nothing renders no pages at all, and the old screen said so
         * with the heading, the count `0 registered.` and an empty list.
         *
         * An empty catalogue is a developer's problem with a developer's fix, so
         * the action leaves the portal. That is the honest next move, and it is
         * better than a reassuring sentence that leads nowhere.
         */
        <StateNotice
          tone="empty"
          title="There is nothing here for the AI to build with."
          action={
            <Link href="/docs/building-with-loom/primitives">How to add the first one →</Link>
          }
        >
          <p>
            Loom brings no components of its own. It can only use what this project has
            registered, and this project has registered none — so a request to add anything
            would come back with nothing to show for it.
          </p>
          <p>
            That is the whole bargain, seen from its empty end: what you register is the
            complete list of what an AI can do to your site.
          </p>
        </StateNotice>
      ) : (
        /*
         * A grid, which is what the eighteen of these were always waiting for.
         * They were a single column: eighteen self-contained cards, each a name,
         * a sentence and a row of chips, stacked down a 768-pixel strip. Nothing
         * on one of them refers to the one above it, which is the test for
         * whether a list wants to be a column at all.
         *
         * 320 rather than the page cards' 288. A piece card's widest line is its
         * description — a real sentence — and at 288 the common ones wrap to four
         * lines and the cards stop being the same height as each other.
         */
        <>
          {/*
           * Only where something has been counted. A section headed *which
           * piece should I look at first* above a deployment nobody has visited
           * would be the screen inventing a question, and the notice below says
           * what is actually true instead.
           */}
          {library !== undefined && <WhichPieceFirst read={library} />}

          <CardGrid min={320}>
            {catalogue.map((primitive) => (
              <li key={primitive.type}>
                <PieceCard
                  primitive={primitive}
                  /*
                   * The pair, or nothing. `howItIsRead` is the one call that
                   * produces it, so the two figures cannot arrive from two
                   * places and cannot be drawn one without the other.
                   */
                  read={library === undefined ? undefined : howPieceIsRead(library, primitive.type)}
                  /*
                   * A registered piece with no row in the reading, which is a
                   * fact about the pages behind the figures and never about the
                   * piece: it may stand on a page whose counters have not
                   * caught up, or one whose read failed.
                   */
                  unused={
                    library !== undefined && !library.byType.has(primitive.type)
                      ? notOnThesePages(library)
                      : undefined
                  }
                />
              </li>
            ))}
          </CardGrid>
        </>
      )}

      {read.kind === "failed" && (
        /*
         * Quiet rather than a failure tone, and that is a judgement about what
         * this screen is: the catalogue is the screen's claim and it is intact,
         * so a red box across the top would report a working page as broken.
         * What failed is one addition to it, and the notice says which.
         */
        <StateNotice tone="notice" title="We couldn’t read how your pieces are being read.">
          <p>
            The list above is complete and is exactly what the AI is handed — it comes from your
            project&rsquo;s own code and nothing was read to produce it. What did not come back is
            the count of what readers did with these pieces on your pages.
          </p>
          <TechnicalDetail>
            <p className="font-mono">{describeReaderSignalStoreError(read.error)}</p>
          </TechnicalDetail>
        </StateNotice>
      )}

      {read.kind === "none" && catalogue.length > 0 && (
        <StateNotice
          tone="empty"
          title="Nothing has reported back about how these pieces are read."
          action={
            <Link href="/docs/the-runtime/what-your-readers-do">
              How to let a page report back →
            </Link>
          }
        >
          <p>
            This list says what an AI may build with. Once a published page reports how it was
            read, each card here also says how many of the places that piece stands readers
            reached, and what share of the readers who met it read it.
          </p>
          <p>
            Measuring is off until you ask for it. A published page reports nothing at all unless
            the code rendering it is told to broadcast — which is why a Loom page you have not
            configured is byte-for-byte the page it would be without any of this.
          </p>
        </StateNotice>
      )}

      {catalogue.length > 0 && (
        <TechnicalDetail summary="The whole list, as the AI receives it">
          <p className="text-ink-secondary">
            This block is sent with every request for a change, ahead of your page itself. It
            is the same catalogue this screen is built from, rendered by the runtime rather
            than by this page, so the two cannot disagree.
          </p>
          <pre className="text-ink-secondary border-edge-subtle bg-surface-hover overflow-x-auto rounded-sm border p-2 font-mono whitespace-pre-wrap">
            {renderCatalogue(catalogue)}
          </pre>
          <p>
            Adding to it is a developer&rsquo;s job and a code change, not a setting in here —{" "}
            <Link href="/docs/building-with-loom/primitives">how to register a piece</Link>.
          </p>
        </TechnicalDetail>
      )}
    </Screen>
  )
}

/**
 * Three outcomes, because the three are three different pieces of news and two
 * of them render identically as a blank half-screen.
 *
 * *The counters did not answer*, *nothing has ever reported* and *here is the
 * library* send a person to completely different places, and a reader who
 * cannot tell the first two apart goes looking for a fault in their pages that
 * is not there. It is the same distinction `/portal/readers` draws for its own
 * reads and `/portal/trust` draws between *nothing scored* and *nothing
 * happened*.
 */
type HowRead =
  | { readonly kind: "read"; readonly value: PiecesRead }
  | { readonly kind: "none" }
  | { readonly kind: "failed"; readonly error: ReaderSignalStoreError }

/**
 * The pair, for one piece of the catalogue.
 *
 * A function rather than an expression at the point of use, so the one call that
 * produces the two figures together is the one call a card is handed. A piece
 * with no row is `undefined` and the card says so in the words
 * `notOnThesePages` chooses — never *nothing uses this*, which this reading
 * cannot know.
 */
const howPieceIsRead = (library: PiecesRead, type: string) => {
  const piece = library.byType.get(type)

  return piece === undefined ? undefined : howItIsRead(piece)
}

/**
 * How the library is read, from the counters a deployment already has.
 *
 * ## Why the pages are read here and the reading is not built here
 *
 * Both runtime readings take a list of `PageReading`s — the counters laid over
 * the version of the page they were filed against — and that join is the
 * expensive half and the half that fails quietly when it is got wrong. So it
 * happens once, here, and both readings are taken off the one list: a screen
 * that joined twice would be two chances to hand one reading a different
 * window from the other, and the two figures on every card below would then be
 * about two different deployments.
 *
 * One read per **distinct** page rather than one per counter row, which is the
 * rule `/portal/readers` states for the same fan-out: a page with forty counted
 * parts is one page, and reading it forty times would be a fan-out over a list
 * the counters did not bound.
 *
 * ## The version gate, and why a page can be absent
 *
 * A placement is a part of a version of a page, so a page whose counted window
 * has not caught up with a change that has just landed cannot be in this
 * reading — the counters would be laid over parts that are no longer there.
 * `skippingComparable` is that check, written once where a test can reach it,
 * and the count of pages it turns away is handed over so the screen says so
 * rather than quietly reporting a smaller library.
 */
const howPiecesAreRead = async (): Promise<HowRead> => {
  const counted = await portalReaderTallies.tallies()

  if (!counted.ok) return { kind: "failed", error: counted.error }
  if (counted.value.length === 0) return { kind: "none" }

  /*
   * The door rows, which are what makes two pages' readers comparable. A failed
   * read costs every reader share and no places figure, which is the state 0256
   * publishes for a page the door cannot scale — so it degrades into something
   * this screen already draws properly rather than into a blank.
   */
  const doors = await portalReaderTallies.pageViews()
  const rows = doors.ok ? doors.value : []

  const distinct = [...new Set(counted.value.map((tally) => tally.treeId))]
  const heads = await Promise.all(
    distinct.map(async (treeId) => [treeId, await portalStore.head(treeId)] as const)
  )

  const names = new Map<string, PageName>()
  const readings: PageReading[] = []
  let unjoined = 0

  for (const [treeId, head] of heads) {
    /*
     * A page whose read did not come back is named by its identifier and is not
     * in the reading. The name is what the unscaled list needs and the reading
     * is what every figure needs, so the two are kept apart: a naming miss
     * costs a name, and a failed read costs a page.
     */
    if (!head.ok) {
      names.set(treeId, unnamed(treeId))
      unjoined += 1
      continue
    }

    names.set(treeId, pageNameOf(head.value))

    const forPage = counted.value.filter((tally) => tally.treeId === treeId)
    const newest = Math.max(...forPage.map((tally) => tally.revision))

    if (!skippingComparable(newest, head.value.revision)) {
      unjoined += 1
      continue
    }

    readings.push(pageReadingOf(head.value, forPage, portalRegistry))
  }

  /*
   * A reading with no pages in it is still a reading, and it is not the same
   * news as nothing having reported: the counters are there and every page they
   * mention is in the version gap or failed to read. The section says exactly
   * that, with the count, rather than the screen falling back to the empty
   * state and telling somebody measuring is off when it is not.
   */
  return {
    kind: "read",
    value: piecesReadOf(libraryReadingOf(readings), libraryReachOf(readings, rows), names, unjoined),
  }
}

export default PiecesPage
