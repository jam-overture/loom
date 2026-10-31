import { everyMemberOf } from "../closed-set.js"
import type { TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { PRIMITIVE_ROLES, type PrimitiveRole } from "../role.js"

import { readingKeyOf } from "./audiences.js"
import { atDoorScale, doorOf, type PageDoor } from "./door.js"
import { kindKeyOf, type KindKey, type KindSilence } from "./library.js"
import { type UnscaledPage } from "./library-reach.js"
import {
  paceStandingOf,
  readingPaceOf,
  READING_WORDS_PER_MINUTE,
  type PacedPart,
  type PaceSilence,
  type PaceStanding,
} from "./pace.js"
import { pageViewsFor, type StoredPageViews } from "./page-views.js"
import type { PageReading } from "./parts.js"

/**
 * Whether the readers who meet a kind of part have time for what it says.
 *
 * Four readings already stand on one list of `PageReading`s and answer four
 * different questions about one primitive type: the **places** it stands and
 * how many were reached ([`library.ts`](library.ts), 0257), the share of the
 * **readers** who met those places that read it
 * ([`library-reach.ts`](library-reach.ts), 0256), the share of those readers
 * that acted inside it ([`library-action.ts`](library-action.ts), 0265), and
 * what a change did to each of those.
 *
 * **Every one of them is about reach, and none of them is about reading.** A
 * part counts as reached when half of it was half a viewport's height up the
 * screen (0136), which is a fact about scrolling and not about a reader. The
 * question an author rewriting a band actually has is the next one — *did
 * anybody have time to read it* — and a page's own reading has answered it per
 * part since [`pace.ts`](pace.ts) landed: the time its readers had, against the
 * time its words take at a costing rate. **Asked of a kind it was unaskable**,
 * for the reason every library question was before the join that answers it: a
 * type's placements are scattered across forty readings and nothing added them
 * up.
 *
 * This is that join. It is the **twenty-second** thing taken out of what this
 * subsystem already knows rather than collected: no payload, no browser change,
 * no counter that does not exist, no column and no byte on any wire.
 *
 * ## The figure is a pooled ratio and not a mean of ratios
 *
 * Each placement contributes two reader-milliseconds figures and the kind's
 * pace is the quotient of the two sums:
 *
 * - **the time on screen**, `dwellMs`, added exactly as the rows hold it. It is
 *   already summed over the readers who were there, so it needs no weight;
 * - **the time its words take those readers**, `readers × wordsWithin ×
 *   msPerWord`, with the readers put on the door's scale by `atDoorScale`
 *   before two pages are added together (0250).
 *
 * What comes out is a mean of the per-placement paces **weighted by the words
 * each placement put in front of readers**, which is the ranking key a page's
 * own reading already orders its parts by (0221, applied to pace): a caption
 * two readers hurried past is a worse ratio and a smaller thing than a band
 * four hundred of them did, and a mean of ratios would let the caption drown
 * the band.
 *
 * The straddle correction divides out of the numerator exactly: a page view
 * counted twice by a rollup carries one page view's dwell, so `dwellMs` is
 * sound as it stands and the whole of the correction is in the readers. That is
 * the same cancellation 0229 relies on one level down, arrived at here rather
 * than assumed.
 *
 * ## A page the door cannot scale is kept, and that is the opposite of 0256
 *
 * A kind's share of readers is withheld entirely where one bearing page has no
 * door row, because a weighted mean over the pages that could be priced is a
 * figure whose denominator nobody named. **This reading keeps the page and
 * applies no correction to it**, and the difference is which way the missing
 * correction moves the claim.
 *
 * The correction only ever makes the readers fewer, so leaving it off only ever
 * makes the denominator bigger and the pace lower — **towards `skimmed`, which
 * is this module's safe verdict** and the one it is built to be able to defend
 * (see `pace.ts` on why `skimmed` is reached before the floor is consulted). A
 * share of readers has no safe direction, so it must refuse; a pace has one, so
 * it may answer and say how much of its evidence was uncorrected.
 * {@link KindPace.unscaled} is that figure and {@link LibraryPace.unscaled}
 * names the pages, in the vocabulary whose subject is a page (0240).
 *
 * ## A placement inside another of its own kind is counted once
 *
 * A part is judged against its **subtree's** words, because the words on screen
 * while a band was up are the band's and its children's — so a kind's figures
 * nest wherever it stands inside itself. A stack inside a stack would put the
 * inner stack's words and the inner stack's seconds into the type row twice,
 * and the role row for parts that declare none is nearly every part of nearly
 * every page, so without a rule it would count a page's words once per level.
 *
 * So **the outermost placement of a kind on a page stands for the ones inside
 * it**: an inner placement is counted in {@link KindPace.nested} and is in no
 * term. Nothing is lost by it — the outer placement's words already include the
 * inner one's — and what it buys is the one property that makes the figure
 * addable at all (0158).
 *
 * ## What is deliberately not published
 *
 * **No library-wide pace.** Two kinds nest in each other wherever a band holds
 * a paragraph, so a total over the kinds adds one page's words once per level
 * of its tree — the artefact a census of places does not have and the reason
 * `library.ts` refuses to add `dwellMs` across kinds. Every figure here is a
 * row's, and the only error available to it is one page standing in it twice,
 * which is the one thing deduplicated.
 *
 * **Nothing the other four readings say.** The standings, the places, the
 * words, the uses and the shares stay where they are and pair on
 * {@link kindKeyOf}.
 *
 * Pure. It reaches no store, no clock and no DOM, it is linear in the parts of
 * the readings times the rows handed in, and nothing in it survives into a
 * browser bundle.
 */

/** Why a kind of part has no pace. */
export type KindPaceSilence =
  /**
   * The census's own two reasons, which were already a kind's and are reused as
   * values rather than said again (0256).
   *
   * `unread` here is *no place this kind stands reported a view*, which is what
   * a page's own reading calls `unreached` at a part.
   */
  | KindSilence
  /**
   * Nothing countable is said anywhere it stands that readers reached, and
   * something in it declares no `copy` (0122).
   *
   * The same state as a part's `unreadable`, at a kind — and **also** the state
   * of a kind whose pace was computed and is not low enough to be safe: words
   * nobody counted can only make a part more skimmed, so `skimmed` stands and
   * anything above it is a claim resting on a floor. That is `paceStandingOf`'s
   * asymmetry, unchanged, and {@link KindPace.floored} says how many placements
   * caused it.
   */
  | "unreadable"
  /**
   * It says nothing that takes time to read, anywhere it stands, and nothing
   * went uncounted either.
   *
   * A spacer, a rule, a stack that only holds other parts. Kept apart from
   * `unreadable` because *there are none* and *nobody said* are different
   * answers (0122).
   */
  | "wordless"

export const KIND_PACE_SILENCES: readonly KindPaceSilence[] = everyMemberOf<KindPaceSilence>()([
  "unread",
  "unplaced",
  "unreadable",
  "wordless",
])

/** One line per silence, for a surface saying why a kind has no pace. */
export const describeKindPaceSilence = (silence: KindPaceSilence): string => {
  switch (silence) {
    case "unread":
      return "nothing reported a view of any place this kind of part stands"
    case "unplaced":
      return "nothing in the pages read is of this kind"
    case "unreadable":
      return "some of its words could not be counted, so only a skim could be claimed of it"
    case "wordless":
      return "it says nothing that takes time to read"
  }
}

/** One kind of part, against the time its readers had for what it says. */
export type KindPace = {
  readonly kind: KindKey
  /** What part a type plays (0114), or `null`. Always `null` on a role row, which carries it as its key. */
  readonly role: PrimitiveRole | null
  /** Element nodes of this kind across the readings, as the census counts them. */
  readonly placements: number
  /**
   * Placements standing inside another placement of the same kind, which are in
   * no term here.
   *
   * The outer one's words and seconds already include theirs. Nought on most
   * type rows and the ordinary state of a role row, because a page's parts
   * nearly all declare no role and so are all one kind.
   */
  readonly nested: number
  /** Placements in the figures: not nested, reached, and saying something counted. */
  readonly counted: number
  /** Why the rest have no pace of their own. The counts add to `placements − nested − counted`. */
  readonly silences: Readonly<Record<PaceSilence, number>>
  /**
   * Every placement a page could be read for, by its own verdict.
   *
   * The census view of the same set the two figures above partition: the counts
   * add to `placements − nested`, and `unknown` is a placement with no pace of
   * its own *or* one whose words are a floor.
   */
  readonly standings: Readonly<Record<PaceStanding, number>>
  /** Revisions bearing a counted placement. */
  readonly pages: number
  /** Counted placements whose words are a floor, because a type in them declares no `copy` (0122). */
  readonly floored: number
  /**
   * Counted placements that are a page's root, which is why a kind holding the
   * whole page is out of {@link LibraryPace.mostSkimmed}.
   *
   * By words it would win every ranking it was entered in, for the reason a
   * page's own reading keeps its root out of `mostSkimmed`: the page contains
   * every part.
   */
  readonly whole: number
  /**
   * Page views that reached a counted placement, at the door's scale, counted
   * once per place it stands.
   *
   * **Not a count of people and deliberately not rounded into one** (0256): it
   * is a weight, and a reader who met three placements of one kind is three of
   * them. `null` under a silence.
   */
  readonly readers: number | null
  /**
   * Time on screen across the counted placements, added, exactly as the rows
   * hold it.
   *
   * Sound without a correction: a page view a rollup counted twice carries one
   * page view's dwell. **Nests across kinds** — a band's seconds are its
   * paragraph's too — so it is never added across rows.
   */
  readonly dwellMs: number
  /**
   * The time its words take the readers who met it: `readers × wordsWithin ×
   * msPerWord`, added over the counted placements.
   *
   * The denominator, in the same reader-milliseconds {@link dwellMs} is in.
   * `null` under a silence.
   */
  readonly needMs: number | null
  /** `dwellMs ÷ readers`: the time the typical reader who met a place of it had there. `null` under a silence. */
  readonly spentMs: number | null
  /**
   * `needMs − dwellMs` where positive: the reading time its readers did not
   * have, and the key the rows are ordered by.
   *
   * By the **amount** and not by the ratio, for the reason a deployment's falls
   * are ordered by the readers they lose (0221). Nought where readers had time
   * enough, and `null` under a silence.
   */
  readonly shortMs: number | null
  /** `dwellMs ÷ needMs`. `1` is exactly time enough. `null` under a silence. */
  readonly pace: number | null
  /** The verdict, by `paceStandingOf` — so a floor can hold up anything but `skimmed`. */
  readonly standing: PaceStanding
  /**
   * Of {@link readers}, those on a page the door could not scale, so no
   * straddle correction was applied to them.
   *
   * It biases the pace **down**, towards `skimmed`, which is why the row is
   * published rather than withheld. `LibraryPace.unscaled` names the pages.
   */
  readonly unscaled: number
  readonly silence: KindPaceSilence | null
}

/** What a deployment's library asks of its readers' time, by kind of part. */
export type LibraryPace = {
  /**
   * Every type that stands anywhere, most reading time missing first.
   *
   * Then the lower pace, then by type, so two kinds that ask the same do not
   * reorder on a refresh. A kind with no pace sorts after one whose pace is
   * nought, because `null` is *nothing can be said* and not *nobody had any
   * time for it*.
   */
  readonly byType: readonly KindPace[]
  /** Every role in the vocabulary, then the row for parts whose type declared none, in the same order. */
  readonly byRole: readonly KindPace[]
  /** Readings counted, which is revisions of pages and not trees. */
  readonly pages: number
  /** Distinct trees across them. */
  readonly trees: number
  /** Element nodes across them, which is the sum of every type row's placements. */
  readonly placements: number
  /** Placements standing inside another of their own type, across the type rows. */
  readonly nested: number
  /** Pages whose door could scale them, which is where the correction comes from. */
  readonly scaled: number
  /**
   * The pages bearing a counted placement that the door could not scale, by
   * tree and newest revision first.
   *
   * The actionable half of every {@link KindPace.unscaled} above: one of these
   * pages is why. Empty is the healthy state, and a page here still has every
   * figure it contributed to — see the module documentation on why this reading
   * keeps it where a share of readers refuses it.
   */
  readonly unscaled: readonly UnscaledPage[]
  /**
   * The type whose readers are shortest of the time its words take, which is
   * the kind to rewrite first.
   *
   * By {@link KindPace.shortMs} and never by the ratio, and **never a kind that
   * holds a page's root**, for the reason a page's own reading keeps its root
   * out of the same ranking. A type and never a role, because a type is the
   * thing an author can replace.
   */
  readonly mostSkimmed: KindPace | null
  /**
   * Readings of a revision beyond the first, which were dropped.
   *
   * A caller that concatenated two reads holds one page twice, and a page twice
   * doubles both terms of every ratio here while looking like twice the
   * evidence.
   */
  readonly duplicated: number
  /** Door rows for one revision beyond the first, which were ignored. */
  readonly duplicatedRows: number
  /**
   * Types whose readings disagreed about the role they play, where the first
   * reading's answer stands.
   *
   * Raised here rather than fetched from the census, because every role row
   * below is about neither library when it is set. Detected off the same
   * readings by the same rule as the other library readings, so they cannot
   * disagree about it.
   */
  readonly roleDisagreed: readonly PrimitiveType[]
  /** The costing rate that was applied, which is the default unless one was given. */
  readonly wordsPerMinute: number
}

export type LibraryPaceOptions = {
  /**
   * The costing rate, where {@link READING_WORDS_PER_MINUTE} is wrong for this
   * deployment's text. Refused the way a page's own reading refuses it.
   */
  readonly wordsPerMinute?: number
}

/**
 * **There is no `inflation` option**, and that is the one place this reading's
 * arguments differ from a page's.
 *
 * A page's reading takes the straddle correction as a number because it is
 * about one page and the caller holds that page's row. A library spans forty of
 * them, each with its own straddle rate (0250), and one scalar over all of them
 * would be a correction nobody measured. So the rows are handed in instead and
 * each page's own `inflation` is read off its own door, which is the same
 * argument that put the rows in `libraryReachOf`'s signature.
 */

const NO_STANDINGS: Readonly<Record<PaceStanding, number>> = Object.freeze({
  skimmed: 0,
  paced: 0,
  lingered: 0,
  unknown: 0,
})

const NO_SILENCES: Readonly<Record<PaceSilence, number>> = Object.freeze({
  unreached: 0,
  unreadable: 0,
  wordless: 0,
})

/** What one kind's row is being built out of, before it is a row. */
type Tallying = {
  readonly kind: KindKey
  role: PrimitiveRole | null
  placements: number
  nested: number
  counted: number
  floored: number
  whole: number
  readonly standings: Record<PaceStanding, number>
  readonly silences: Record<PaceSilence, number>
  readonly pages: Set<string>
  readers: number
  dwellMs: number
  needMs: number
  unscaled: number
}

const tallying = (kind: KindKey): Tallying => ({
  kind,
  role: null,
  placements: 0,
  nested: 0,
  counted: 0,
  floored: 0,
  whole: 0,
  standings: { ...NO_STANDINGS },
  silences: { ...NO_SILENCES },
  pages: new Set(),
  readers: 0,
  dwellMs: 0,
  needMs: 0,
  unscaled: 0,
})

/**
 * One placement's contribution.
 *
 * A nested placement is counted and returns: the outer one standing for it is
 * the whole of the rule, and letting it through would be the one error here
 * that cannot be undone afterwards (0158).
 */
const add = (
  into: Tallying,
  part: PacedPart,
  nested: boolean,
  door: PageDoor,
  msPerWord: number,
  revision: string
): void => {
  into.placements += 1

  if (nested) {
    into.nested += 1

    return
  }

  into.standings[part.standing] += 1

  if (part.pace === null) {
    /**
     * A part with no pace always carries the reason it has none, because
     * `pace.ts` fills the silence for every standing of `unknown` and a part
     * with no pace is always one. The fallback is the type system's and not a
     * state.
     */
    into.silences[part.silence ?? "unreached"] += 1

    return
  }

  const readers = door.silence === null ? atDoorScale(part.readers, door) : part.readers

  into.counted += 1
  into.pages.add(revision)
  into.floored += part.floored ? 1 : 0
  into.whole += part.depth === 0 ? 1 : 0
  into.readers += readers
  into.dwellMs += part.dwellMs
  into.needMs += readers * part.wordsWithin * msPerWord
  into.unscaled += door.silence === null ? 0 : readers
}

/**
 * The silence, with the reasons tried in the order they have to be tried in.
 *
 * Nothing of the kind before nothing read, because *there is none of it* is a
 * better answer than *nobody was seen reading it* and the second is true of the
 * first by accident. Then the part-level reasons, in the order a part's own
 * reading reaches them: no reader before no words, and a floor before silence,
 * because *nobody counted them* outranks *there are none*.
 */
const silenceOf = (of: Tallying, standing: PaceStanding): KindPaceSilence | null => {
  if (of.placements === 0) return "unplaced"

  if (of.counted === 0) {
    if (of.silences.unreadable > 0) return "unreadable"
    if (of.silences.wordless > 0) return "wordless"

    return "unread"
  }

  return standing === "unknown" ? "unreadable" : null
}

const rowOf = (of: Tallying): KindPace => {
  /**
   * A counted placement always has a reader and a word, so a kind with one has
   * a denominator: `needMs` is nought exactly when `counted` is.
   */
  const pace = of.counted === 0 ? null : of.dwellMs / of.needMs
  const standing = paceStandingOf(pace, of.floored > 0)
  const silence = silenceOf(of, standing)
  const measured = silence === null

  return {
    kind: of.kind,
    role: of.kind.by === "type" ? of.role : null,
    placements: of.placements,
    nested: of.nested,
    counted: of.counted,
    silences: { ...of.silences },
    standings: { ...of.standings },
    pages: of.pages.size,
    floored: of.floored,
    whole: of.whole,
    readers: measured ? of.readers : null,
    dwellMs: of.dwellMs,
    needMs: measured ? of.needMs : null,
    spentMs: measured ? of.dwellMs / of.readers : null,
    shortMs: measured ? Math.max(0, of.needMs - of.dwellMs) : null,
    pace: measured ? pace : null,
    standing,
    unscaled: of.unscaled,
    silence,
  }
}

/** The name a row is ordered by, which is the key's own and never the row's position. */
const nameOf = (kind: KindKey): string => (kind.by === "type" ? kind.type : (kind.role ?? ""))

/**
 * The worse of two, which is the ranking rule spelled once.
 *
 * Most reading time missing, then the lower pace, then by name — so a kind with
 * no pace at all sorts after one whose pace is nought rather than above it.
 */
const worseOf = (one: KindPace, other: KindPace): number =>
  (other.shortMs ?? -1) - (one.shortMs ?? -1) ||
  (one.pace ?? Number.POSITIVE_INFINITY) - (other.pace ?? Number.POSITIVE_INFINITY) ||
  nameOf(one.kind).localeCompare(nameOf(other.kind))

/** Tree id, then newest revision first, which is the order the page-view rows are read in. */
const byPage = (one: UnscaledPage, other: UnscaledPage): number =>
  one.treeId.localeCompare(other.treeId) || other.revision - one.revision

const MS_PER_MINUTE = 60_000

/** A positive, finite option, or the fallback. Everything else is refused. */
const positive = (value: number | undefined, fallback: number): number =>
  value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback

/**
 * Whether the readers who meet a kind of part have time for what it says.
 *
 * Takes the readings and the whole window of page-view rows a deployment holds
 * — each page's own row is picked out of them by the published matching rule
 * (`pageViewsFor`) rather than by a hand-written copy of it, because the
 * pairing is the part of every join here that fails quietly when it is got
 * wrong.
 *
 * Linear in the parts of the readings times the rows, with one pass that fills
 * both groupings.
 */
export const libraryPaceOf = (
  readings: readonly PageReading[],
  rows: readonly StoredPageViews[],
  options: LibraryPaceOptions = {}
): LibraryPace => {
  const wordsPerMinute = positive(options.wordsPerMinute, READING_WORDS_PER_MINUTE)
  const msPerWord = MS_PER_MINUTE / wordsPerMinute

  const tallies = new Map<string, Tallying>()
  const seen = new Set<string>()
  const trees = new Set<TreeId>()
  const unscaled: UnscaledPage[] = []
  const disagreed = new Set<PrimitiveType>()
  let pages = 0
  let placements = 0
  let nestedParts = 0
  let scaled = 0
  let duplicated = 0
  let duplicatedRows = 0

  /**
   * Every role in the vocabulary gets a row whether or not anything plays it,
   * the way the census's role rows do: a role nothing in the library plays is a
   * fact about the library worth having, and a surface that had to tell a
   * missing row from an empty one would be reading the vocabulary itself.
   */
  for (const role of [...PRIMITIVE_ROLES, null]) {
    const kind: KindKey = { by: "role", role }

    tallies.set(kindKeyOf(kind), tallying(kind))
  }

  for (const reading of readings) {
    const revision = readingKeyOf(reading)

    if (seen.has(revision)) {
      duplicated += 1
      continue
    }

    seen.add(revision)
    trees.add(reading.treeId)
    pages += 1

    const found = pageViewsFor(reading, rows)
    const door = doorOf(found.measured)

    duplicatedRows += found.duplicated

    if (door.silence === null) scaled += 1

    /**
     * Each page's own straddle rate, off its own row (0250). A page the door
     * cannot scale gets no correction, which leaves its pace low rather than
     * high — see the module documentation on why that is answerable where a
     * share of readers is not.
     */
    const paced = readingPaceOf(reading, {
      inflation: found.measured?.inflation ?? 0,
      wordsPerMinute,
    })

    /**
     * How many placements of each kind are open above the part being read.
     *
     * The parts are pre-order with depths, so the open ancestors are what is
     * left on the stack once everything at or below this depth has been closed
     * — the same walk `pace.ts` totals subtrees with, and the reason it is
     * depth rather than `parentId` is the same: a slot node is not a part and
     * can hold element children, so the parent chain strands a whole band.
     */
    const open: { readonly depth: number; readonly keys: readonly string[] }[] = []
    const openKinds = new Map<string, number>()
    let anyCounted = false

    const close = (): void => {
      const frame = open.pop()
      if (frame === undefined) return

      for (const key of frame.keys) openKinds.set(key, (openKinds.get(key) ?? 0) - 1)
    }

    for (const part of paced.parts) {
      while ((open[open.length - 1]?.depth ?? -1) >= part.depth) close()

      const kinds: readonly KindKey[] = [
        { by: "type", type: part.type },
        { by: "role", role: part.role },
      ]
      const keys = kinds.map(kindKeyOf)

      placements += 1

      kinds.forEach((kind, at) => {
        const key = keys[at] ?? ""
        const tally = tallies.get(key) ?? tallying(kind)

        if (kind.by === "type") {
          if (tally.placements === 0) tally.role = part.role
          else if (tally.role !== part.role) disagreed.add(part.type)
        }

        const nested = (openKinds.get(key) ?? 0) > 0

        if (kind.by === "type" && nested) nestedParts += 1
        if (kind.by === "type" && !nested && part.pace !== null) anyCounted = true

        add(tally, part, nested, door, msPerWord, revision)
        tallies.set(key, tally)
      })

      open.push({ depth: part.depth, keys })
      for (const key of keys) openKinds.set(key, (openKinds.get(key) ?? 0) + 1)
    }

    /**
     * A page the door cannot scale is listed only where something on it was
     * counted: a page nobody read is not a page whose readers could not be
     * scaled, and listing it would put the commonest healthy state on the one
     * list here that is meant to be empty.
     */
    if (door.silence !== null && anyCounted) {
      unscaled.push({ treeId: reading.treeId, revision: reading.revision, silence: door.silence })
    }
  }

  const built = [...tallies.values()].map(rowOf)
  const byType = built.filter((row) => row.kind.by === "type").sort(worseOf)

  return {
    byType,
    byRole: built.filter((row) => row.kind.by === "role").sort(worseOf),
    pages,
    trees: trees.size,
    placements,
    nested: nestedParts,
    scaled,
    unscaled: [...unscaled].sort(byPage),
    mostSkimmed: byType.find((row) => row.standing === "skimmed" && row.whole === 0) ?? null,
    duplicated,
    duplicatedRows,
    roleDisagreed: [...disagreed].sort((one, other) => one.localeCompare(other)),
    wordsPerMinute,
  }
}
