import type { PrimitiveType, TreeId } from "@jam-overture/loom"
import {
  describeKindReachSilence,
  describeKindSilence,
  KIND_REACH_SILENCES,
  type KindReach,
  type KindReachSilence,
  type KindReading,
  type LibraryReach,
  type LibraryReading,
  type ReachSilence,
  type UnscaledPage,
} from "@jam-overture/loom/signals"

import { plainPieceName } from "./piece-view"
import { unnamed, type PageName } from "./page-name"
import { plainShare } from "./stopping"
import { pagesCount, type PlainWord } from "./vocabulary"

/**
 * Which kinds of piece on your pages actually get read.
 *
 * ## The question the catalogue could not ask about itself
 *
 * `/portal/pieces` is the list of pieces an AI may put on a page, and it has
 * been a perfect catalogue and a static one: what each piece is, what you can
 * set on it, the line the model is handed. Nothing on it changes between visits
 * unless somebody registers a piece, which is a code change — so there has
 * never been a reason to open it twice.
 *
 * What a person actually wants to know about a piece they have registered is
 * whether it works: *do readers read the band I put on nine pages, or do they
 * pass it?* That question is about the **library** rather than about any one
 * page, and nothing could be asked it until
 * [0257](../../../../../../decisions/0257-a-kind-of-part-is-a-row-of-the-library-and-a-share-of-places-is-not-a-share-of-readers.md)
 * and
 * [0256](../../../../../../decisions/0256-a-kind-of-part-has-a-share-of-the-readers-who-met-it-and-the-door-is-what-makes-two-kinds-comparable.md)
 * joined a type's placements across every page a deployment has read.
 *
 * ## Two shares of one piece, and the order of magnitude between them
 *
 * The two readings answer different questions about the same piece and **the
 * answers are not near each other**:
 *
 * - the census's `readShare` is the share of the **places** it stands that at
 *   least one reader reached. No reader is in either term of it, so no counting
 *   window and no door row can move it;
 * - the reach's `share` is the share of the **readers who met it** that read it,
 *   each page weighted by the arrivals counted at its own door.
 *
 * A piece read in the one busy place and skipped in nine quiet ones is *one
 * place in ten* and *nine readers in ten*. Both are true. The first staged
 * deployment this screen was photographed against had a card piece at **4 of 7
 * places** and **2 in 10 readers** — the same piece, the same counters, a figure
 * nearly three times the other.
 *
 * So the rule this module exists to keep is the one the filing asked for:
 *
 * > **Two labelled figures, never one. The words *places* and *readers* are
 * > load-bearing rather than decorative.**
 *
 * {@link howItIsRead} is why it is a rule a component cannot break by accident:
 * the pair arrives as one value, the places half is never absent, and the
 * readers half is either a sentence or the reason there is not one. A card
 * cannot draw one of them and call it the other, because it never holds one of
 * them alone.
 *
 * ## The one state this screen refuses to improvise in
 *
 * A reach silence of `unscaled`, `unopened` or `uncounted` means **one page a
 * piece stands on** could not be put on the door's scale — and 0256 then
 * withholds the share for the *whole* piece rather than giving a share over the
 * pages it could price. That is the same refusal 0250 makes for a page out of
 * an order and 0221 makes inside one page: there is no safe direction to guess
 * in, and a share over the priceable pages would be a different measurement
 * wearing this one's label.
 *
 * It is also the **ordinary** state rather than an exotic one, which the first
 * staged deployment proved: one page of three with no door row withheld the
 * reader share on every piece in the library, because every piece stood on that
 * page. So this screen's commonest job is to say, clearly, that it can tell you
 * about places and cannot yet put that on the readers' scale — and to name the
 * page that is why, which {@link PiecesRead.unscaled} does in the vocabulary
 * whose subject is a page (0240).
 *
 * Falling back to the census is right, and the screen says that is what it is
 * doing rather than going quiet.
 *
 * ## Three figures that are never drawn as people
 *
 * `met` and `openings` and `counted` are all page-view counts at the door's
 * scale, and `openings` counts one page view **once per place the piece stands
 * there** — so none of the three is a headcount and none of them is rounded
 * into one here. This lane shipped that mistake on 8 October, with a share of
 * one part of a page multiplied by the page's readership printed as a count of
 * readers larger than the page had, and a share of *places* times a readership
 * would be worse because its denominator is not people at all.
 *
 * {@link PiecesRead.arrivals} is the one addable count of readers in this
 * reading, it is per page rather than per piece, and it is in the record.
 *
 * ## What is not grouped, and what would have to change
 *
 * Both readings also publish `byRole` — the same census keyed by what part a
 * piece plays rather than by its type (0114). **This screen draws none of it**,
 * because nothing in `src/primitives/` declares a role, so every placement in
 * this deployment lands in the one row for *parts whose type said nothing* and
 * a grouping with one row in it is not a grouping.
 *
 * The condition for that to stop being true is one declaration per primitive
 * and no migration — the join is at read time (0212), so the day a type
 * declares a role every counter already stored reinterprets. It is a `Loom
 * primitives` gap with five other consumers waiting on it, and this is the
 * sixth; what is written down here is **what would have to exist**, because a
 * comment arguing that a screen cannot do something is a dated claim about the
 * runtime and nothing re-reads one when the runtime changes.
 */

/** One kind of piece, as this screen reads it. */
export type PieceReading = {
  readonly type: PrimitiveType
  /** The heading a person scans. The type itself stays beside it, as everywhere else. */
  readonly name: string
  /** Element nodes of this kind across the pages read. */
  readonly places: number
  /** Distinct pages it stands on, which is never the number of places. */
  readonly pages: number
  /** Places at least one reader reached. */
  readonly read: number
  /** Places the window held readers for and none of them reached. */
  readonly skipped: number
  /**
   * Places nothing could be said about, which are in neither term of either
   * share.
   *
   * Not *skipped*: a place in a window that said nothing is a place nobody
   * measured, and calling it a skip is the one direction a census of a quiet
   * deployment must not be wrong in (0212).
   */
  readonly unsaid: number
  /** `read ÷ (read + skipped)`. Places and never people. */
  readonly readShare: number | null
  readonly placesSilence: KindReading["silence"]
  /**
   * The share of the readers who met it that read it, weighted by each page's
   * own arrivals. `null` under {@link readerSilence}.
   */
  readonly readerShare: number | null
  readonly readerSilence: KindReachSilence | null
  /** Page views that reached a place it stands, at the door's scale. Never people. */
  readonly met: number | null
  /** The denominator of {@link readerShare}, at the same scale. Never people. */
  readonly counted: number | null
  /** Page views that met a page holding it and did not reach the place. */
  readonly missed: number | null
  /** The ceiling on {@link readerShare} rather than an estimate of it (0229). */
  readonly atMost: number | null
  /** Page views counted once per place it stands on their page. Never people. */
  readonly openings: number | null
  /** Appearances in excess of openings: the straddle that divided out. */
  readonly drift: number
  /** Openings no window of reading has been folded for yet. */
  readonly pending: number
  /** Nobody straddled a window and nothing is pending, so the share is exact. */
  readonly exact: boolean
  /** Places reporting more reach than their page had page views. Nought is healthy. */
  readonly unreconciled: number
  /** Every word it says across its places, counted once. Addable (0212). */
  readonly words: number
  readonly wordsReached: number
  readonly wordShare: number | null
  /** Places whose words are a floor, because the type declares no `copy` (0122). */
  readonly floored: number
  /** The runtime's own line for why a share is missing, for the record. */
  readonly onTheRecord: string | undefined
}

/** A page a piece stands on that the door could not scale, named. */
export type UnpricedPage = {
  readonly treeId: TreeId
  readonly page: PageName
  /** The page's own reason, in the vocabulary whose subject is a page (0240). */
  readonly why: UnscaledPage["silence"]
}

/** What a deployment's library does for its readers, by kind of piece. */
export type PiecesRead = {
  /** Keyed by type, so a catalogue card finds its own row without holding a list. */
  readonly byType: ReadonlyMap<string, PieceReading>
  /**
   * The piece to look at first, where there is one.
   *
   * Read out of the runtime and never chosen here: {@link leadsOn} says which
   * of the two questions put it there.
   */
  readonly worst: PieceReading | undefined
  /**
   * Which reading named {@link worst}.
   *
   * `readers` is the one to lead with wherever it exists, because it weighs the
   * readers a piece misses rather than the places it is missed in. `places` is
   * the census's own answer and is what is left when the door cannot scale a
   * page — and the two are different questions, so the surface says which it
   * is answering rather than printing one sentence for both.
   */
  readonly leadsOn: "readers" | "places" | undefined
  /** Kinds of piece passed over in at least one place they stand. */
  readonly passedOver: number
  /** Kinds of piece in the reading at all, which is never the size of the catalogue. */
  readonly kinds: number
  /** Distinct pages behind every figure here. */
  readonly pages: number
  /** Versions of pages counted, which is at least {@link pages}. */
  readonly versions: number
  /**
   * Readers counted at the doors of those pages, added once per page.
   *
   * The one addable count of people in this reading, and it is not the
   * denominator of anything on it: a piece's own denominator counts a page once
   * per place the piece stands there (0219).
   */
  readonly arrivals: number
  /** Pages the door could scale, which is where every reader share comes from. */
  readonly scaled: number
  /** The pages that are why a reader share is withheld above. Empty is healthy. */
  readonly unscaled: readonly UnpricedPage[]
  /**
   * Pages the counters mention that are not in this reading at all.
   *
   * The version gap, and it is the screen's limit rather than the reading's: a
   * placement is a part of a version of a page, so the counters have to be laid
   * over the version they were filed against, and only one version of a page
   * can be read from the store. It clears itself within one collection window.
   */
  readonly unjoined: number
  /** Versions handed in twice, which were dropped. The one way a census can over-count. */
  readonly duplicated: number
  /** Door rows for one version beyond the first, which were ignored. */
  readonly duplicatedRows: number
  /**
   * Types whose pages disagreed about what part they play.
   *
   * Two libraries read as one, which is the one failure this join can have that
   * nothing else would catch.
   */
  readonly disagreed: readonly PrimitiveType[]
}

/**
 * What each reason for a missing reader share is, in words, with the runtime's
 * own name beside it.
 *
 * Total over `KIND_REACH_SILENCES` so a sixth reason cannot arrive without this
 * file failing to compile. `unplaced` is in the table and can never be drawn on
 * this screen — a type row exists only where a piece of that type stands — and
 * leaving it out would be the table deciding that for itself rather than the
 * reading.
 */
export const READER_SILENCES_PLAIN: Readonly<Record<KindReachSilence, PlainWord>> = {
  unread: {
    label: "nothing counted yet",
    meaning: "No reader has been reported at any of the places this piece stands.",
    technical: "unread",
  },
  unplaced: {
    label: "not on your pages",
    meaning: "Nothing on the pages behind these figures is a piece of this kind.",
    technical: "unplaced",
  },
  unscaled: {
    /**
     * The reason a person is likeliest to read as a fault in their piece, and
     * it is not one: every figure about the places it stands is as good as any
     * other piece's. What is missing is the one count that makes two pages'
     * readers comparable, so the label is about the comparison.
     */
    label: "not comparable yet",
    meaning:
      "One of the pages it stands on has no count of how many readers arrived, so nothing here can be said as a share of readers.",
    technical: "unscaled",
  },
  unopened: {
    label: "nobody marked as arriving",
    meaning:
      "On a page it stands on, nothing is saying when a reader arrives, so there is no readership to measure against.",
    technical: "unopened",
  },
  uncounted: {
    label: "still being counted",
    meaning:
      "Readers have arrived at a page it stands on and no window of their reading has been counted yet.",
    technical: "uncounted",
  },
}

/** `1 kind of piece` and never `1 kinds of piece`, which is the first thing a reader distrusts. */
export const piecesCount = (count: number): string =>
  count === 1 ? "1 kind of piece" : `${count} kinds of piece`

/** `1 place` and never `1 places`. */
const placesCount = (count: number): string => (count === 1 ? "1 place" : `${count} places`)

/**
 * The reading, from the two the runtime publishes and the names the pages give
 * themselves.
 *
 * **Both readings or neither.** They are built from one list of readings and
 * paired on the published key rather than on a string this module composes, so
 * a piece's two figures cannot come from two different joins. A screen that
 * took the census from one read and the reach from another would be the place
 * the pairing broke, and the pairing is the half of every join here that fails
 * quietly when it is got wrong.
 */
export const piecesReadOf = (
  census: LibraryReading,
  reach: LibraryReach,
  pages: ReadonlyMap<string, PageName>,
  unjoined: number
): PiecesRead => {
  /*
   * Keyed on the type rather than on the published key, because every consumer
   * of this map holds a catalogued piece and therefore a type. The pairing
   * below is the one that matters and it is the runtime's.
   */
  const reaches = new Map<string, KindReach>()

  for (const row of reach.byType) {
    if (row.kind.by === "type") reaches.set(row.kind.type, row)
  }

  const byType = new Map<string, PieceReading>()

  for (const row of census.byType) {
    if (row.kind.by !== "type") continue

    byType.set(row.kind.type, reading(row.kind.type, row, reaches.get(row.kind.type)))
  }

  /*
   * The runtime's two answers, read out rather than re-derived. `mostMissed`
   * weighs the readers a piece misses and `mostSkipped` counts the places it is
   * missed in, and both are a count rather than a share for the reason 0221
   * ranks a page's falls by the readers they lose: a piece skipped in its one
   * and only place is a perfect share and a smaller problem than one skipped in
   * seven of nine.
   *
   * Taken off the mapped rows and never off the reading, so the piece the
   * section leads with is the same value the card below it draws — two mappings
   * of one row is two chances to say two things about one piece.
   */
  const missed = named(reach.mostMissed, byType)
  const skipped = named(census.mostSkipped, byType)

  return {
    byType,
    worst: missed ?? skipped,
    leadsOn: missed !== undefined ? "readers" : skipped !== undefined ? "places" : undefined,
    passedOver: census.byType.filter((row) => row.standings.skipped > 0).length,
    kinds: byType.size,
    pages: census.trees,
    versions: census.pages,
    arrivals: reach.arrivals,
    scaled: reach.scaled,
    unscaled: reach.unscaled.map((page) => ({
      treeId: page.treeId,
      /*
       * A page whose own read did not come back is named by its identifier,
       * which is the rule `page-name.ts` states for every listing in this
       * portal: a naming miss costs a name and never a row.
       */
      page: pages.get(page.treeId) ?? unnamed(page.treeId),
      why: page.silence,
    })),
    unjoined,
    duplicated: census.duplicated,
    duplicatedRows: reach.duplicatedRows,
    disagreed: reach.roleDisagreed,
  }
}

/** The mapped row for a kind the runtime picked out, where it picked one. */
const named = (
  kind: { readonly kind: KindReading["kind"] } | null,
  byType: ReadonlyMap<string, PieceReading>
): PieceReading | undefined =>
  kind === null || kind.kind.by !== "type" ? undefined : byType.get(kind.kind.type)

const reading = (
  type: PrimitiveType,
  census: KindReading,
  reach: KindReach | undefined
): PieceReading => {
  /*
   * A census row with no reach row beside it is a deployment with no door rows
   * at all, and the honest reading of it is the state the reach itself would
   * have reported: nothing can be put on the readers' scale. Absent is not
   * nought and it is not an unexplained gap either, which is the whole of what
   * `howItIsRead` needs from this field.
   */
  const readerSilence = reach === undefined ? "unscaled" : reach.silence

  return {
    type,
    name: plainPieceName(type),
    places: census.placements,
    pages: census.trees,
    read: census.standings.read,
    skipped: census.standings.skipped,
    unsaid: census.standings.unknown,
    readShare: census.readShare,
    placesSilence: census.silence,
    readerShare: reach?.share ?? null,
    readerSilence,
    met: reach?.met ?? null,
    counted: reach?.counted ?? null,
    missed: reach?.missed ?? null,
    atMost: reach?.atMost ?? null,
    openings: reach?.openings ?? null,
    drift: reach?.drift ?? 0,
    pending: reach?.pending ?? 0,
    exact: reach?.exact ?? false,
    unreconciled: reach?.unreconciled ?? 0,
    words: census.words,
    wordsReached: census.wordsReached,
    wordShare: census.wordShare,
    floored: census.floored,
    /*
     * The reach's own line where there is one, and the census's where the reach
     * has nothing to withhold. Both vocabularies are the runtime's; the reach's
     * is a superset of the census's for exactly this reason (0256), so the two
     * cannot print two words for one state.
     */
    onTheRecord:
      readerSilence !== null
        ? describeKindReachSilence(readerSilence)
        : census.silence !== null
          ? describeKindSilence(census.silence)
          : undefined,
  }
}

/**
 * The two figures, as one value.
 *
 * This is the shape the filing asked for, made into something a component
 * cannot get wrong: a card is handed the places sentence and the readers
 * sentence together, so there is no call that produces one of them on its own
 * and no way to print the share of places under a label about readers.
 *
 * `readers` and `withheld` are exclusive — exactly one of them is there — which
 * is what makes *no reader figure* a sentence rather than a gap. A reader who
 * meets a places figure and nothing else cannot tell a piece nobody has
 * measured from a piece whose page has no door row, and those two send a person
 * to completely different places.
 */
export type HowItIsRead = {
  /** Always there. Carries the word *places* and its own denominator. */
  readonly places: string
  /** The share of the readers who met it. Absent exactly when {@link withheld} is not. */
  readonly readers: string | undefined
  /** Why there is no reader figure. Absent exactly when {@link readers} is not. */
  readonly withheld: string | undefined
}

/**
 * No share and no reason for it, which 0256 does not produce and this does not
 * pretend to explain.
 *
 * A share is `null` exactly where a silence says why, so this sentence is
 * unreachable against the published reading. It is written rather than asserted
 * away with a `!`, because the two things a non-total branch can do here are
 * both worse than one honest sentence: crash the catalogue, or print the places
 * figure with nothing under it and let a reader take the gap for a nought.
 */
const NO_READER_FIGURE =
  "No share of the readers who met this piece is given, and nothing has said why."

export const howItIsRead = (piece: PieceReading): HowItIsRead => {
  const share = piece.readerSilence === null ? piece.readerShare : null

  return {
    places: placesReading(piece),
    readers: share === null ? undefined : readersReading(share),
    withheld:
      share !== null
        ? undefined
        : piece.readerSilence === null
          ? NO_READER_FIGURE
          : READER_SILENCES_PLAIN[piece.readerSilence].meaning,
  }
}

/**
 * Where it stands and how much of that readers reached — the sound figure, and
 * the one no window can move.
 *
 * Three phrasings, because the denominator is three different populations and a
 * reader has to be told which. The places nothing was counted for are out of
 * the denominator rather than counted as skips, and the sentence says so where
 * there are any: *4 of the 5 places anything was counted for* and *4 of the 7
 * places it stands* are the same numerator and different news.
 */
const placesReading = (piece: PieceReading): string => {
  const counted = piece.read + piece.skipped

  if (counted === 0)
    return `It stands in ${placesCount(piece.places)} on ${pagesCount(piece.pages)}, and nothing has been counted for any of them.`

  const where = `It stands in ${placesCount(piece.places)} on ${pagesCount(piece.pages)}.`

  if (piece.unsaid > 0)
    return `${where} Readers reached it in ${piece.read} of the ${counted} that anything has been counted for.`

  return `${where} Readers reached it in ${reachedOf(piece.read, counted)}.`
}

/**
 * `all 7 of them`, `none of them`, `4 of them`.
 *
 * The two ends are named rather than printed as a ratio, for `plainShare`'s
 * reason: *7 of the 7 places* is a sentence a person has to do arithmetic on to
 * read as *everywhere*, and *0 of the 7* is the one figure on this screen
 * somebody will act on immediately.
 */
const reachedOf = (read: number, counted: number): string => {
  if (read === 0) return `none of them`
  if (read === counted) return counted === 1 ? "the one place it stands" : `all ${counted} of them`

  return `${read} of them`
}

/**
 * The share of the readers who met it that read it.
 *
 * `plainShare`'s tenths, with this reading's own population, because the two
 * screens must round one number the same way. The share is an estimate rather
 * than a census — it is a weighted mean of each page's own share — so *almost
 * all* at the top end is the honest end of it rather than a rounding away from
 * `10 in 10`.
 */
const readersReading = (share: number): string =>
  `${sentenceCase(plainShare(share, "readers who met it"))} read it.`

const sentenceCase = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

/**
 * The one sentence above the section, and the whole of what this reading is for.
 *
 * Four answers, and the three that are not a league table are each a different
 * fact said out loud rather than an empty section — the distinction this lane
 * has drawn since `StateNotice` gained a tone for a good result. *Nothing is
 * being passed over*, *nothing can be put on the readers' scale* and *nothing
 * has been counted* all render identically as silence and are three entirely
 * different pieces of news, and only one of them is about anybody's pages.
 */
export const piecesReadSummary = (read: PiecesRead): string => {
  if (read.kinds === 0)
    return "Nothing has been counted yet about how the pieces on your pages are read."

  if (read.worst !== undefined && read.leadsOn === "readers")
    return "One kind of piece misses more readers than any other on your pages. It is named below, with both of the figures that are known about it."

  if (read.worst !== undefined)
    return read.passedOver === 1
      ? "One kind of piece is being passed over somewhere it stands. It is named below."
      : `${piecesCount(read.passedOver)} are being passed over somewhere they stand. The one passed over in the most places is named below.`

  return `Readers reached every one of the ${piecesCount(read.kinds)} on your pages, everywhere it stands.`
}

/**
 * Why this piece is at the top, which is a different fact depending on which
 * reading put it there.
 *
 * *Misses more readers than any other* and *passed over in more places than any
 * other* are not the same claim, and a screen that printed one of them for both
 * would be wrong about a deployment exactly when the two readings disagree —
 * which is the deployment whose library is lopsided, and the one that most needs
 * reading.
 */
export const whyItLeads = (read: PiecesRead): string | undefined => {
  if (read.worst === undefined || read.leadsOn === undefined) return undefined

  return read.leadsOn === "readers"
    ? "It misses more readers than any other piece here."
    : `It is passed over in ${placesCount(read.worst.skipped)}, which is more than any other piece here.`
}

/**
 * Where every figure on this screen comes from, said on the surface.
 *
 * A census over three pages and a census over thirty are the same screen with
 * different weight behind it, and the count is the one thing a reader needs in
 * order to know how much to believe — the rule `reading-view.ts` states for
 * every count in this portal.
 */
export const figuresFrom = (read: PiecesRead): string =>
  read.versions === read.pages
    ? `These figures come from ${pagesCount(read.pages)}.`
    : `These figures come from ${pagesCount(read.pages)}, at ${read.versions} versions between them.`

/**
 * The pages that are why a reader share is missing, and that nothing about them
 * is wrong.
 *
 * One line on the surface; the pages themselves are a list beside it and their
 * reasons are the record's. A reader who has not asked *why* does not need the
 * runtime's three states for a door, and a reader who has is one click from all
 * of them.
 */
export const whyNotComparable = (read: PiecesRead): string | undefined => {
  if (read.unscaled.length === 0) return undefined

  const out = read.unscaled.length

  /*
   * *No readership to weigh these figures against*, which is true of all three
   * states of a door and not only of the one with no row at all. The first
   * photograph of this screen was staged with a page whose door row was missing
   * and the deployment reported `unopened` instead — a row that exists and says
   * nothing ever began — so a sentence written for *no count* was describing a
   * count of nought. Each page's own reason is beside it below.
   *
   * Two phrasings and the count chooses, because a count word carries the noun
   * and never the verb. *1 of these 3 pages have no readership* passed every
   * assertion about the number on the run that wrote this rule down, and was
   * the first sentence a reader would distrust.
   */
  return out === 1
    ? `${pagesCount(out)} here has no readership to weigh these figures against, so no figure on this screen can be given as a share of readers. Nothing is wrong with that page and nothing about it is hidden — every figure about the places a piece stands still holds, and so does everything on the page’s own card.`
    : `${pagesCount(out)} here have no readership to weigh these figures against, so no figure on this screen can be given as a share of readers. Nothing is wrong with those pages and nothing about them is hidden — every figure about the places a piece stands still holds, and so does everything on their own cards.`
}

/**
 * Why one page could not be weighed, in the vocabulary whose subject is a page.
 *
 * **Not the piece's vocabulary, and that is the point.** The subject of a reason
 * is a property of the reading it comes from (0240), so a reason about a page is
 * reported as a page's — the reach's own `unscaled` row carries the page's
 * `ReachSilence` for exactly this, and the two tables standing side by side is
 * what says they are one state at two subjects.
 *
 * This is the actionable half of every withheld figure above it. *One of these
 * pages is why* is only useful with the *why*, and the three reasons have three
 * different remedies: a row that has expired, a sender that is not marking its
 * openings, and a collection window that has not come round yet.
 */
export const WHY_NOT_WEIGHED: Readonly<Record<ReachSilence, string>> = {
  unmeasured: "nothing has counted how many readers arrived there",
  unopened: "nothing there is saying when a reader arrives",
  uncounted: "readers have arrived and no window of their reading has been counted yet",
}

/** The clause for one page, as a reader meets it beside the page's name. */
export const whyNotWeighed = (page: UnpricedPage): string => WHY_NOT_WEIGHED[page.why]

/**
 * The version gap, said out loud.
 *
 * A page whose counters have not caught up with a change that has just landed
 * cannot be in this reading at all, because a place is a part of a version of a
 * page. It clears itself within one collection window and there is nothing for
 * anybody to do about it, which is the half a notice has to carry or it sends
 * somebody looking for a fault.
 */
export const notCountedYet = (read: PiecesRead): string | undefined => {
  if (read.unjoined === 0) return undefined

  return read.unjoined === 1
    ? "1 page is not behind these figures yet, because what was counted for it is not the version being served. That clears itself once a collection window has passed, and there is nothing to do about it."
    : `${read.unjoined} pages are not behind these figures yet, because what was counted for them is not the version being served. That clears itself once a collection window has passed, and there is nothing to do about it.`
}

/**
 * A piece in the catalogue that no page behind these figures uses.
 *
 * **Never *nothing uses this*.** The reading is over the pages a deployment has
 * counted and joined, so a piece standing only on a page in the version gap, or
 * on a page whose read failed, has no row here and is in use all the same. The
 * sentence says which pages it is talking about, and that is the whole
 * difference between a fact and a wrong accusation.
 */
export const notOnThesePages = (read: PiecesRead): string =>
  read.pages === 0
    ? "Nothing has been counted about how this piece is read."
    : `No page behind the figures on this screen uses this piece, so there is nothing counted for it. It may well be on ${read.pages === 1 ? "another page" : "other pages"}.`

/** Every reason for a missing reader share that this reading actually holds, in table order. */
export const readerSilencesHeld = (read: PiecesRead): readonly KindReachSilence[] => {
  const held = new Set<KindReachSilence>()

  for (const piece of read.byType.values()) {
    if (piece.readerSilence !== null) held.add(piece.readerSilence)
  }

  return KIND_REACH_SILENCES.filter((silence) => held.has(silence))
}
