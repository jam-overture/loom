import { everyMemberOf } from "../closed-set.js"
import type { TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { PRIMITIVE_ROLES, type PrimitiveRole } from "../role.js"

import { readingKeyOf } from "./audiences.js"
import { PART_STANDINGS, type PageReading, type PartReading, type PartStanding } from "./parts.js"
import { countWords } from "./words.js"

/**
 * Whether a *kind* of part gets read, across every page it is on.
 *
 * Every reading in this subsystem answers about one page: where its reading
 * stops, how much of what it says gets read, what a change did to it.
 * [`deployment.ts`](deployment.ts) is the first that is larger than a page, and
 * it is still an order **over** pages — the unit it ranks is a page and the
 * answer it gives is *fix this one next*.
 *
 * **Nothing could be asked about a kind of part.** A deployment builds forty
 * pages out of the same two dozen primitives, and *do readers read the
 * testimonial band anywhere* is a question about the **library** rather than
 * about any one page. It is the question a model proposing a change most wants
 * answered before it proposes one, and it was the one question the counters
 * could not be asked: a type's placements are scattered across forty readings
 * and nothing joined them.
 *
 * This is that join, taken off the readings a deployment already has and
 * nothing else: no payload, no browser change, no counter that does not exist,
 * no column and no byte on any wire. It is the **fourteenth** thing derived
 * from what the server already knows rather than collected.
 *
 * ## The unit is the placement, and a reader is never the unit
 *
 * A page is a part of a revision of a tree; a **placement** is one element node
 * of one revision, which is exactly what a `PartReading` is. So a type's row
 * counts placements: *`loom.testimonial` stands in nine places and readers
 * reached two of them.*
 *
 * **Everything that counts readers is absent from these rows**, and the reason
 * is not caution. `views`, `reached` and `engaged` count distinct page views, and
 * distinctness cannot be added — one reader who read a heading on three pages is
 * three in a sum of `reached` and one person
 * ([0147](../../decisions/0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)).
 * A `RoleReading` already refuses them one level down for the same reason
 * ([0212](../../decisions/0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md)),
 * and across pages it is worse rather than better: each page's distinct counts
 * are inflated by **its own** straddle rate, which is the fact that put every
 * page's loss on the door's scale before it could be ranked
 * ([0250](../../decisions/0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)).
 *
 * A share of **placements** has none of that in it. `read ÷ (read + skipped)` is
 * a ratio of two counts of parts of trees, so no reader is counted at all, no
 * rollup window appears in either term, and shortening a deployment's window
 * cannot move it. That is what makes it the figure this reading leads with.
 *
 * ## What that costs, said plainly
 *
 * **A placement on a page nine thousand people read counts the same as one on a
 * page three people read.** A kind read in the one busy place and skipped in
 * nine quiet ones reports a read share of one in ten, and *most readers who met
 * it read it* would also have been true. The share is about places and never
 * about people, and a surface that prints it as *readers skip this* is printing
 * something this reading did not say.
 *
 * **The weighted figure is a different question and needs the door.** Weighting
 * each placement by its page's readers means `reached ÷ views` per placement and
 * a mean over them — two distinct counts, each inflated by its own page's
 * straddle, so the pages whose readers linger would weigh most and a deployment
 * that shortened its rollup window would see the figure move with no reader
 * moving. The correction exists and is `opened` at the door (0250), so the
 * question is answerable and is not answered here; it is filed rather than
 * shipped with a caveat.
 *
 * **A share of placements multiplied by anything is not a count of people.** A
 * share of one part of a page times the page's readership was a count of people
 * larger than the page had, found on a reader card on 8 October; a share of
 * places times a readership is worse, because its denominator is not people in
 * the first place.
 *
 * ## Why a count of places is worth having anyway
 *
 * Because the three sentences it supports are the ones an author can act on, and
 * none of them needs a reader to be counted:
 *
 * - *this kind of part is skipped in seven of the nine places it stands* — a
 *   fact about the library, which is a reason to change the primitive rather
 *   than the page;
 * - *this kind says four thousand words and readers reached three hundred of
 *   them* — words partition a page exactly once (0212), so they add across
 *   placements without counting a sentence twice;
 * - *this kind was used eleven hundred times* — an occurrence, filed against the
 *   part the reader used, so no press is counted twice (0167).
 *
 * ## The one figure that nests, and the total this does not publish
 *
 * `dwellMs` is time on screen, and a part is on screen while its children are.
 * So one second a reader spent in a band is in the band's row **and** in the
 * row of everything inside it, and that is true of a `RoleReading`'s dwell
 * already. Within a kind it is a volume of attention and is useful as one; added
 * **across** kinds it is not a duration anybody spent, so there is no
 * reading-wide dwell here and there will not be one.
 *
 * Nor is there a deployment-wide `placements` share or a single headline number
 * over the kinds. The artefact is a census, and the only error available to a
 * census is counting the same page twice — which is the one thing deduplicated
 * here (0158: counting a window and forgetting it are one operation).
 *
 * Pure. It reaches no store, no clock and no DOM, it is linear in the parts of
 * the readings handed to it, and nothing in it survives into a browser bundle.
 */

/** Why a kind's read share is not there. */
export type KindSilence =
  /**
   * No placement of it has a verdict: every page it stands on held no views, or
   * reported something other than a view of it.
   *
   * Not *nobody read it*. A placement whose standing is `unknown` is in a window
   * that said nothing, and the one direction a census of a quiet deployment must
   * not be wrong in is calling that a skip (0212). The placements are still counted and still in {@link KindReading.standings};
   * what is withheld is the share, because its denominator would be nought.
   */
  | "unread"
  /**
   * Nothing in the pages read is of this kind at all.
   *
   * Only ever a role row, and it is the reason a role row exists for every
   * member of the vocabulary: *nothing in this library is a heading* is a fact
   * about the library, and a surface that had to tell a missing row from an
   * empty one would be reading the vocabulary itself. A type row cannot be in
   * this state, because a type row exists only where a part of that type stands.
   *
   * Kept apart from {@link KindSilence} `unread` because the two are opposite
   * instructions: one says measure more, the other says there is nothing here to
   * measure.
   */
  | "unplaced"

export const KIND_SILENCES: readonly KindSilence[] = everyMemberOf<KindSilence>()([
  "unread",
  "unplaced",
])

/** One line per silence, for a surface saying why a kind has no share. */
export const describeKindSilence = (silence: KindSilence): string => {
  switch (silence) {
    case "unread":
      return "nothing reported a view of any place this kind of part stands"
    case "unplaced":
      return "nothing in the pages read is of this kind"
  }
}

/** What a row is a census of: one primitive type, or one role, across the pages read. */
export type KindKey =
  | { readonly by: "type"; readonly type: PrimitiveType }
  /** `null` is the row for parts whose type declared no role, which is most of a library today. */
  | { readonly by: "role"; readonly role: PrimitiveRole | null }

/** A key as a string, for a surface keying a list and for this module's own grouping. */
export const kindKeyOf = (kind: KindKey): string =>
  kind.by === "type" ? `type\u0000${kind.type}` : `role\u0000${kind.role ?? ""}`

/**
 * One kind of part, everywhere it stands in the pages read.
 *
 * The same shape for a type row and a role row, because they are one census
 * asked of two keys: a type is what an author can change and a role is what a
 * reader meets, and a figure that meant different things in the two would be the
 * kind of near-duplicate this subsystem has already been bitten by.
 */
export type KindReading = {
  readonly kind: KindKey
  /** What part a type plays (0114), or `null`. Always `null` on a role row, which carries it as its key. */
  readonly role: PrimitiveRole | null
  /** Element nodes of this kind across the readings. */
  readonly placements: number
  /** Distinct trees it stands in, which is not the number of placements and not the number of readings. */
  readonly trees: number
  /** Distinct revisions it stands in: two live revisions of one page are two. */
  readonly revisions: number
  /** Placements by standing. The three add to {@link placements}. */
  readonly standings: Readonly<Record<PartStanding, number>>
  /**
   * The share of its placements at least one reader reached. `null` where
   * {@link silence} says why not.
   *
   * *At least one*, which is what a standing of `read` means and not what a
   * person reads the word as (0235). `read ÷ (read + skipped)`, so a placement
   * nothing can be said about is in neither term rather than counted as a skip.
   *
   * **Places and not people.** See the module documentation: it is sound as a
   * statement about where this kind of part stands and is not a share of
   * readers.
   */
  readonly readShare: number | null
  /**
   * Why {@link readShare} is not there, and `null` where it is.
   *
   * About the read share and not about the row: {@link wordShare} is absent for
   * a reason of its own and says so where it is, which is how a copy reading
   * already publishes a share beside a withheld figure (0235).
   */
  readonly silence: KindSilence | null
  /**
   * Every word this kind says across its placements, counted once.
   *
   * Addable for the reason no view count here is: a part's words are its own and
   * the words of a page are partitioned across its parts exactly once (0212), so
   * two placements' words are two different sentences.
   */
  readonly words: number
  /** Words said by a placement at least one reader reached. */
  readonly wordsReached: number
  /**
   * {@link wordsReached} over {@link words}; `null` where this kind says nothing
   * at all, which a spacer, a rule and a stack that only holds other parts all
   * do.
   */
  readonly wordShare: number | null
  /**
   * Placements whose words are a floor, because the type declares no `copy`
   * (0122).
   *
   * The direction {@link wordShare} is wrong in, handed over rather than
   * summarised: a floored placement understates the numerator and the
   * denominator together where it was reached, and the denominator alone where
   * it was skipped. On a library built from the starter primitives this is
   * nought (0223); on one built from a deployment's own it is most of the rows,
   * and that is the thinness the server-side join already names rather than a
   * fault here (0212).
   */
  readonly floored: number
  /**
   * Time on screen across its placements, added.
   *
   * A volume of attention and **not a duration anybody spent**: a part is on
   * screen while its children are, so a nested placement's seconds are its
   * ancestors' too. Comparable between two kinds of the same depth and
   * meaningless added across kinds, which is why nothing here adds it.
   */
  readonly dwellMs: number
  /** Presses, filed against the part the reader used, so no press is in two rows (0167). */
  readonly activations: number
  readonly opens: number
  readonly closes: number
  /** Forms this kind of part let go (0211). */
  readonly completions: number
}

/** What a deployment's library does for its readers, by kind of part. */
export type LibraryReading = {
  /**
   * Every type that stands anywhere, most placements skipped first.
   *
   * Then the lower read share, then by type, so two kinds that are skipped
   * equally often do not reorder on a refresh.
   */
  readonly byType: readonly KindReading[]
  /**
   * Every role in the vocabulary that stands anywhere, then the row for parts
   * whose type declared none, in the same order as {@link byType}.
   *
   * Thin today for the reason every role figure in this subsystem is thin:
   * nothing in `src/primitives/` declares one, so nearly every part is in the
   * `null` row. The join is at read time (0212), so the day a role is declared
   * every counter already stored reinterprets and these rows start answering
   * without a migration.
   */
  readonly byRole: readonly KindReading[]
  /** Readings counted, which is revisions of pages and not trees. */
  readonly pages: number
  /** Distinct trees across them. */
  readonly trees: number
  /** Element nodes across them, which is the sum of every type row's placements. */
  readonly placements: number
  /** Placements by standing, over the whole library. */
  readonly standings: Readonly<Record<PartStanding, number>>
  /**
   * The type skipped in the most places, which is the kind to look at first.
   *
   * By the **count** of places and not by the share, for the reason a page's
   * falls are ranked by the readers they lose (0221): a kind skipped in its one
   * and only place is a perfect share and a smaller problem than one skipped in
   * seven of nine. `null` where nothing anywhere was skipped — a healthy
   * deployment and an unmeasured one both, which {@link standings} tells apart.
   *
   * A type and never a role, because a type is the thing an author can replace.
   */
  readonly mostSkipped: KindReading | null
  /** The type used most, by presses. A count of things that happened, not of readers. */
  readonly mostUsed: KindReading | null
  /**
   * Readings of a revision beyond the first, which were dropped.
   *
   * A caller that concatenated two reads holds one page twice, and a page twice
   * in a census is the one way a census can lie about how much of a library
   * there is.
   */
  readonly duplicated: number
  /**
   * Types whose readings disagreed about the role they play, where the first
   * reading's answer stands.
   *
   * The one failure this join can have that nothing else would catch: readings
   * joined against two different registries, concatenated. A type plays one part
   * (0114), so a disagreement is not a fact about the library — it is two
   * libraries read as one, and every role row below is then about neither.
   */
  readonly roleDisagreed: readonly PrimitiveType[]
}

const NO_STANDINGS: Readonly<Record<PartStanding, number>> = Object.freeze(
  Object.fromEntries(PART_STANDINGS.map((standing) => [standing, 0])) as Record<
    PartStanding,
    number
  >
)

/**
 * What one kind's row is being built out of, before it is a row.
 *
 * The sets are what makes `trees` and `revisions` honest — a kind that stands
 * four times on one page stands in one tree — and they are the reason this is a
 * mutable accumulator rather than a fold: a fold would copy two sets per
 * placement, and a library of forty pages is tens of thousands of placements.
 * Nothing escapes this module.
 */
type Tallying = {
  readonly kind: KindKey
  role: PrimitiveRole | null
  placements: number
  readonly trees: Set<TreeId>
  readonly revisions: Set<string>
  readonly standings: Record<PartStanding, number>
  words: number
  wordsReached: number
  floored: number
  dwellMs: number
  activations: number
  opens: number
  closes: number
  completions: number
}

const tallying = (kind: KindKey): Tallying => ({
  kind,
  role: null,
  placements: 0,
  trees: new Set(),
  revisions: new Set(),
  standings: { ...NO_STANDINGS },
  words: 0,
  wordsReached: 0,
  floored: 0,
  dwellMs: 0,
  activations: 0,
  opens: 0,
  closes: 0,
  completions: 0,
})

const add = (into: Tallying, part: PartReading, page: PageReading, revision: string): void => {
  const words = countWords(part.copy.words)

  into.placements += 1
  into.trees.add(page.treeId)
  into.revisions.add(revision)
  into.standings[part.standing] += 1
  into.words += words
  into.wordsReached += part.standing === "read" ? words : 0
  into.floored += part.copy.unread.length > 0 || part.copy.unspoken.length > 0 ? 1 : 0
  into.dwellMs += part.counters?.dwellMs ?? 0
  into.activations += part.counters?.activations ?? 0
  into.opens += part.counters?.opens ?? 0
  into.closes += part.counters?.closes ?? 0
  into.completions += part.counters?.completions ?? 0
}

/**
 * The silence, with the two reasons tried in the order they have to be tried in.
 *
 * Nothing of the kind before nothing measured, because *there is no such part in
 * this library* is a better answer than *nobody was seen reading it*, and the
 * second is true of the first by accident.
 */
const silenceOf = (of: Tallying, verdicts: number): KindSilence | null => {
  if (of.placements === 0) return "unplaced"

  return verdicts === 0 ? "unread" : null
}

const rowOf = (of: Tallying): KindReading => {
  const verdicts = of.standings.read + of.standings.skipped

  return {
    kind: of.kind,
    role: of.kind.by === "type" ? of.role : null,
    placements: of.placements,
    trees: of.trees.size,
    revisions: of.revisions.size,
    standings: { ...of.standings },
    readShare: verdicts === 0 ? null : of.standings.read / verdicts,
    silence: silenceOf(of, verdicts),
    words: of.words,
    wordsReached: of.wordsReached,
    wordShare: of.words === 0 ? null : of.wordsReached / of.words,
    floored: of.floored,
    dwellMs: of.dwellMs,
    activations: of.activations,
    opens: of.opens,
    closes: of.closes,
    completions: of.completions,
  }
}

/** The name a row is ordered by, which is the key's own and never the row's position. */
const nameOf = (kind: KindKey): string => (kind.by === "type" ? kind.type : (kind.role ?? ""))

/**
 * The kind to look at first, which is the ranking rule spelled once.
 *
 * Most places skipped, then the lower read share, then by name — so a kind with
 * no share at all sorts after one with a share of nought rather than above it,
 * because `null` is *nothing can be said* and not *nobody read it*.
 */
const worseOf = (one: KindReading, other: KindReading): number =>
  other.standings.skipped - one.standings.skipped ||
  (one.readShare ?? 2) - (other.readShare ?? 2) ||
  nameOf(one.kind).localeCompare(nameOf(other.kind))

/**
 * Whether a kind of part gets read, across every page it stands on.
 *
 * Takes the readings rather than the counters and the trees, for the reason
 * every derived reading in this subsystem does: the standings and the words are
 * what this is made of, and deriving them twice is how two screens come to
 * disagree. A caller with a window of counters reads each page, then this.
 *
 * Linear in the parts handed in, with one pass that fills both groupings: a pass
 * per key would be a walk of the whole library per member of the role
 * vocabulary, and the vocabulary grows while the library is what it is.
 */
export const libraryReadingOf = (readings: readonly PageReading[]): LibraryReading => {
  const rows = new Map<string, Tallying>()
  const seen = new Set<string>()
  const trees = new Set<TreeId>()
  const standings = { ...NO_STANDINGS }
  const disagreed = new Set<PrimitiveType>()
  let pages = 0
  let duplicated = 0
  let placements = 0

  /**
   * Every role in the vocabulary gets a row whether or not anything plays it,
   * the way a page's role rows do — a role nothing in the library plays is a
   * fact about the library worth having, and a surface that had to tell a
   * missing row from an empty one would be reading the vocabulary itself.
   */
  for (const role of [...PRIMITIVE_ROLES, null]) {
    const kind: KindKey = { by: "role", role }

    rows.set(kindKeyOf(kind), tallying(kind))
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

    for (const part of reading.parts) {
      const keys: readonly KindKey[] = [
        { by: "type", type: part.type },
        { by: "role", role: part.role },
      ]

      placements += 1
      standings[part.standing] += 1

      for (const kind of keys) {
        const key = kindKeyOf(kind)
        const row = rows.get(key) ?? tallying(kind)

        if (kind.by === "type") {
          if (row.placements === 0) row.role = part.role
          else if (row.role !== part.role) disagreed.add(part.type)
        }

        add(row, part, reading, revision)
        rows.set(key, row)
      }
    }
  }

  const built = [...rows.values()].map(rowOf)
  const byType = built.filter((row) => row.kind.by === "type").sort(worseOf)

  return {
    byType,
    byRole: built.filter((row) => row.kind.by === "role").sort(worseOf),
    pages,
    trees: trees.size,
    placements,
    standings,
    mostSkipped: byType.find((row) => row.standings.skipped > 0) ?? null,
    mostUsed:
      byType
        .filter((row) => row.activations > 0)
        .sort(
          (one, other) =>
            other.activations - one.activations ||
            nameOf(one.kind).localeCompare(nameOf(other.kind))
        )[0] ?? null,
    duplicated,
    roleDisagreed: [...disagreed].sort((one, other) => one.localeCompare(other)),
  }
}
