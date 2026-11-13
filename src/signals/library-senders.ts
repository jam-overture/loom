import { everyMemberOf } from "../closed-set.js"
import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { PRIMITIVE_ROLES, type PrimitiveRole } from "../role.js"

import { readingKeyOf } from "./audiences.js"
import { kindKeyOf, type KindKey } from "./library.js"
import type { PageReading } from "./parts.js"
import { between, extentsOf, prefixOf } from "./subtrees.js"

/**
 * **Which of a deployment's components are silent.**
 *
 * [0382](../../decisions/0382-a-part-that-reported-nothing-with-a-reader-below-it-is-an-eighth-collection-fault-and-it-reaches-both-ranking-keys.md)
 * named the defect: a part that reported nothing while a part **inside** it
 * reported reach. A reader was demonstrably below it, so it was on a screen and
 * did not say so — a primitive that does not spread the identity attributes a
 * broadcaster reads, or a sender switched on halfway through a release. It is
 * raised per page, as `parts-unreporting` on `PageHealth` ([`health.ts`](health.ts)), and it reaches
 * both of the fix-list's ranking keys.
 *
 * **Per page is the wrong unit for it, and this is the right one.** A deployment
 * with forty pages built out of one silent `loom.accordion` gets forty faulted
 * pages, and nothing in the repository says they are forty symptoms of one
 * thing. The fix is in the library — one primitive, once — and the errand the
 * fix-list hands over is *rewrite these forty pages*. This gathers the same
 * defect by {@link KindKey}, the way
 * [`library.ts`](library.ts) gathers standing and
 * [`library-reach.ts`](library-reach.ts) gathers readers, so the sentence is
 * *`loom.accordion` is silent in thirty-one of the thirty-four places it stands,
 * across nineteen of your pages*.
 *
 * It is the **twenty-fourth** reading taken out of the server-side join of 0212
 * rather than collected: no payload field, no counter, no column, no table, no
 * byte on any wire, and nothing in a reader's browser.
 *
 * ## The denominator is the placements the defect could be seen on
 *
 * This is the whole of the design and the only place it can go wrong.
 *
 * A silent **leaf** — a heading, a price, a control with nothing under it —
 * produces exactly the rows a part nobody reached produces. There is no witness
 * below it and there never can be, so the defect is undetectable there. A
 * placement that holds parts but whose window reported no reach below it is
 * undetectable **today**: nobody has been under it yet.
 *
 * So every placement is in exactly one of three states, and they add to
 * {@link KindSenders.placements}:
 *
 * - {@link KindSenders.leaves} — holds nothing. Never checkable.
 * - {@link KindSenders.unwitnessed} — holds parts, nothing below reported reach.
 *   Not checkable in this window.
 * - {@link KindSenders.witnessed} — at least one part below reported reach. The
 *   population this reading is about.
 *
 * {@link KindSenders.share} is `silent ÷ witnessed` and never `silent ÷
 * placements`. Dividing by the placements would make every library of mostly
 * leaves look healthy and every quiet window look healthier still — a share that
 * moves when readers arrive rather than when a sender is fixed, which is the
 * direction 0212 says a census of a quiet deployment must never be wrong in.
 *
 * ## The share is a floor, and the bracket says by how much
 *
 * A witnessed placement whose own standing is `unknown` reported *something
 * other than coming into view* with a reader below it — a press delegated to a
 * band no `viewed` ever named. That is plausibly the same defect and 0382 does
 * not claim it, because `unknown` is the absence of a claim (0282) and a fault
 * raised on an absence would be the lie in the direction nobody checks.
 *
 * It is not dropped either. {@link KindSenders.indeterminate} counts those
 * placements, {@link KindSenders.share} excludes them from the numerator and
 * {@link KindSenders.atMost} includes them, so the true rate is bracketed rather
 * than guessed. Where `indeterminate` is nought the two are equal and the
 * bracket is a point, which is what a deployment with working senders publishes.
 *
 * ## It is the same defect the page reading raises, not a second one
 *
 * {@link KindSenders.silent} is counted on the rule `pageFrontierOf` is counted
 * on — `skipped` with reach below it — spelled once in
 * [`subtrees.ts`](subtrees.ts) and shared with it. The totals agree with the
 * sum of `PageFrontier.notReporting` over the same readings term for term, which
 * is asserted rather than described. Two numbers about one defect that could
 * drift apart is the failure this subsystem already has several names for.
 *
 * ## One page counted twice is the one lie a census can tell
 *
 * A caller that concatenated two reads holds one revision twice. Readings are
 * deduplicated on `readingKeyOf` and the drops are reported in
 * {@link LibrarySenders.duplicated}
 * ([0158](../../decisions/0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)).
 *
 * Pure, and linear in the parts handed in: one pre-order pass and two prefix
 * counts per reading, which is the bound rule 4 of
 * [`docs/signals.md`](../../docs/signals.md) holds every reading here to.
 */

/** Why a kind has no silent-sender share. */
export type SenderSilence =
  /**
   * Nothing in the pages read is of this kind at all.
   *
   * Only ever a role row, and the reason a role row exists for every member of
   * the vocabulary: *nothing in this library is a landmark* is a fact about the
   * library, and a surface that had to tell a missing row from an empty one
   * would be reading the vocabulary itself. A type row cannot be in this state.
   */
  | "unplaced"
  /**
   * Every placement of this kind holds nothing, so the defect cannot be seen on
   * it at all.
   *
   * A structural answer and not a measurement one: no number of readers will
   * ever put one below a leaf. A silent leaf and a leaf nobody reached report
   * the same rows, and this reading does not guess between them.
   */
  | "unwitnessable"
  /**
   * It holds parts, and nothing below any of its placements reported reach in
   * this window.
   *
   * A measurement answer: come back with readers. Kept apart from
   * `unwitnessable` because the two are opposite instructions — one says there
   * is nothing here that could ever be checked, the other says nobody has been
   * under it yet.
   */
  | "unwitnessed"

export const SENDER_SILENCES: readonly SenderSilence[] = everyMemberOf<SenderSilence>()([
  "unplaced",
  "unwitnessable",
  "unwitnessed",
])

/** One line per silence, for a surface saying why a kind has no share. */
export const describeSenderSilence = (silence: SenderSilence): string => {
  switch (silence) {
    case "unplaced":
      return "nothing in the pages read is of this kind"
    case "unwitnessable":
      return "every place this kind stands holds nothing, so a silent sender could not be seen there"
    case "unwitnessed":
      return "nothing reported reach inside any place this kind stands, so nothing could witness it"
  }
}

/** Whether one kind of part reports itself, everywhere it stands in the pages read. */
export type KindSenders = {
  readonly kind: KindKey
  /** What part a type plays (0114), or `null`. Always `null` on a role row, which carries it as its key. */
  readonly role: PrimitiveRole | null
  /** Element nodes of this kind across the readings. */
  readonly placements: number
  /** Distinct trees it stands in, which is not the number of placements and not the number of readings. */
  readonly trees: number
  /** Distinct revisions it stands in: two live revisions of one page are two. */
  readonly revisions: number
  /** Placements holding no part at all, where the defect can never be seen. */
  readonly leaves: number
  /** Placements holding parts, none of which reported reach in this window. */
  readonly unwitnessed: number
  /**
   * Placements with at least one part below them reporting reach — the
   * population the rest of this row is about.
   *
   * `leaves + unwitnessed + witnessed` is {@link placements}.
   */
  readonly witnessed: number
  /**
   * Witnessed placements that reported no view of themselves, which is the
   * defect a page's own reading raises exactly as it raises it.
   *
   * A **floor** on what is wrong, and the reason is in the module
   * documentation: a silent leaf is invisible to this reading and so is a
   * silent part nobody has been under yet.
   */
  readonly silent: number
  /**
   * Witnessed placements whose own standing is `unknown` — something other than
   * a view, with a reader below.
   *
   * Plausibly the same defect, not claimed as it. The gap between
   * {@link share} and {@link atMost}.
   */
  readonly indeterminate: number
  /**
   * {@link silent} over {@link witnessed}; `null` where {@link silence} says why
   * not.
   *
   * *Of the places this kind stands that could be checked, this share did not
   * report themselves.*
   */
  readonly share: number | null
  /**
   * `(silent + indeterminate) ÷ witnessed`, the other end of the bracket;
   * `null` with {@link share}.
   *
   * Equal to {@link share} where nothing is indeterminate, which is what a
   * deployment with working senders publishes.
   */
  readonly atMost: number | null
  /** Why {@link share} is not there, and `null` where it is. */
  readonly silence: SenderSilence | null
  /**
   * Distinct trees with at least one silent placement of this kind.
   *
   * The figure the per-page fault cannot give: *this one component is silent
   * across nineteen of your pages*. Trees and not revisions, because a page is
   * what an operator opens and two revisions of it are one errand.
   */
  readonly silentTrees: number
  /**
   * Nodes of this kind that were silent, in the order the readings were handed
   * in, capped at {@link SILENT_EXAMPLES}.
   *
   * Examples and never a list to act on: the errand is the primitive, and a
   * surface that printed these as *the parts to fix* would be printing the
   * wrong unit of work. Capped so that a library of forty pages cannot put
   * tens of thousands of ids in a row nobody reads to the end.
   */
  readonly examples: readonly NodeId[]
}

/** How many silent nodes a row carries as examples. */
export const SILENT_EXAMPLES = 5

/** Which of a deployment's kinds of part report themselves, and which are silent. */
export type LibrarySenders = {
  /**
   * Every type that stands anywhere, most silent placements first.
   *
   * Then the higher share, then by type, so two kinds silent in equally many
   * places do not reorder on a refresh.
   */
  readonly byType: readonly KindSenders[]
  /**
   * Every role in the vocabulary that stands anywhere, then the row for parts
   * whose type declared none, in the same order as {@link byType}.
   */
  readonly byRole: readonly KindSenders[]
  /** Readings counted, which is revisions of pages and not trees. */
  readonly pages: number
  /** Distinct trees across them. */
  readonly trees: number
  /** Element nodes across them, which is the sum of every type row's placements. */
  readonly placements: number
  /** Placements the defect could be seen on, over the whole library. */
  readonly witnessed: number
  /**
   * Silent placements over the whole library, which is the sum of
   * `PageFrontier.notReporting` over the same readings.
   */
  readonly silent: number
  /** Witnessed placements whose own standing is `unknown`, over the whole library. */
  readonly indeterminate: number
  /**
   * The type silent in the most places, which is the component to fix first.
   *
   * By the **count** of places and not by the share, for the reason a page's
   * falls are ranked by the readers they lose (0221) and a library by the places
   * it is skipped in (0257): a kind silent in its one and only place is a
   * perfect share and a smaller problem than one silent in thirty-one of
   * thirty-four. `null` where nothing anywhere was silent — a deployment whose
   * senders work and one nothing could check both, which {@link witnessed} tells
   * apart.
   *
   * A type and never a role, because a type is the thing an author can replace.
   */
  readonly worstSender: KindSenders | null
  /**
   * Readings of a revision beyond the first, which were dropped.
   *
   * A page twice in a census is the one way a census can lie about how much of
   * a library there is (0158).
   */
  readonly duplicated: number
  /**
   * Types whose readings disagreed about the role they play, where the first
   * reading's answer stands.
   *
   * Two registries read as one library, which makes every role row below about
   * neither (0114).
   */
  readonly roleDisagreed: readonly PrimitiveType[]
}

/** What one kind's row is being built out of, before it is a row. */
type Tallying = {
  readonly kind: KindKey
  role: PrimitiveRole | null
  placements: number
  readonly trees: Set<TreeId>
  readonly revisions: Set<string>
  readonly silentIn: Set<TreeId>
  leaves: number
  unwitnessed: number
  witnessed: number
  silent: number
  indeterminate: number
  readonly examples: NodeId[]
}

const tallying = (kind: KindKey): Tallying => ({
  kind,
  role: null,
  placements: 0,
  trees: new Set(),
  revisions: new Set(),
  silentIn: new Set(),
  leaves: 0,
  unwitnessed: 0,
  witnessed: 0,
  silent: 0,
  indeterminate: 0,
  examples: [],
})

/** What one placement was, decided once per part and added into both its rows. */
type Placement = {
  readonly nodeId: NodeId
  readonly treeId: TreeId
  readonly leaf: boolean
  readonly witnessed: boolean
  readonly silent: boolean
  readonly indeterminate: boolean
}

const add = (into: Tallying, at: Placement, revision: string): void => {
  into.placements += 1
  into.trees.add(at.treeId)
  into.revisions.add(revision)

  if (at.leaf) into.leaves += 1
  else if (!at.witnessed) into.unwitnessed += 1
  else into.witnessed += 1

  if (at.indeterminate) into.indeterminate += 1

  if (at.silent) {
    into.silent += 1
    into.silentIn.add(at.treeId)
    if (into.examples.length < SILENT_EXAMPLES) into.examples.push(at.nodeId)
  }
}

/**
 * The silence, with the three reasons tried in the order they have to be tried
 * in.
 *
 * Nothing of the kind first, because *there is no such part in this library* is
 * a better answer than anything about readers and is true of the others by
 * accident. Then the structural reason before the measurement one: *this can
 * never be checked here* and *nobody has been under it yet* are opposite
 * instructions, and a kind standing only in leaves is in the first however many
 * readers arrive.
 */
const silenceOf = (of: Tallying): SenderSilence | null => {
  if (of.placements === 0) return "unplaced"
  if (of.witnessed > 0) return null

  return of.unwitnessed === 0 ? "unwitnessable" : "unwitnessed"
}

const rowOf = (of: Tallying): KindSenders => {
  const silence = silenceOf(of)

  return {
    kind: of.kind,
    role: of.kind.by === "type" ? of.role : null,
    placements: of.placements,
    trees: of.trees.size,
    revisions: of.revisions.size,
    leaves: of.leaves,
    unwitnessed: of.unwitnessed,
    witnessed: of.witnessed,
    silent: of.silent,
    indeterminate: of.indeterminate,
    share: of.witnessed === 0 ? null : of.silent / of.witnessed,
    atMost: of.witnessed === 0 ? null : (of.silent + of.indeterminate) / of.witnessed,
    silence,
    silentTrees: of.silentIn.size,
    examples: [...of.examples],
  }
}

/** The name a row is ordered by, which is the key's own and never the row's position. */
const nameOf = (kind: KindKey): string => (kind.by === "type" ? kind.type : (kind.role ?? ""))

/**
 * The kind to look at first, which is the ranking rule spelled once.
 *
 * Most places silent, then the higher share, then by name — so a kind with no
 * share at all sorts after one with a share of nought rather than above it,
 * because `null` is *nothing could be checked* and not *every sender works*.
 */
const worseOf = (one: KindSenders, other: KindSenders): number =>
  other.silent - one.silent ||
  (other.share ?? -1) - (one.share ?? -1) ||
  nameOf(one.kind).localeCompare(nameOf(other.kind))

/**
 * Which of a deployment's kinds of part report themselves.
 *
 * Takes the readings rather than the frontiers, for the reason every library
 * reading does: a frontier names the silent nodes and nothing says what kind
 * each one is, and the three states a placement can be in are a fact about the
 * tree rather than about the stops. A caller with a window of counters reads
 * each page, then this.
 */
export const librarySendersOf = (readings: readonly PageReading[]): LibrarySenders => {
  const rows = new Map<string, Tallying>()
  const seen = new Set<string>()
  const trees = new Set<TreeId>()
  const disagreed = new Set<PrimitiveType>()
  let pages = 0
  let duplicated = 0
  let placements = 0
  let witnessed = 0
  let silent = 0
  let indeterminate = 0

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

    const parts = reading.parts
    const { ends } = extentsOf(parts)
    const reads = prefixOf(parts, "read")

    for (const [at, part] of parts.entries()) {
      const end = ends[at] ?? parts.length
      const beneath = end - at - 1
      const readBelow = between(reads, at + 1, end)
      const sawBelow = readBelow > 0

      const placement: Placement = {
        nodeId: part.nodeId,
        treeId: reading.treeId,
        leaf: beneath === 0,
        witnessed: sawBelow,
        silent: sawBelow && part.standing === "skipped",
        indeterminate: sawBelow && part.standing === "unknown",
      }

      placements += 1
      witnessed += sawBelow ? 1 : 0
      silent += placement.silent ? 1 : 0
      indeterminate += placement.indeterminate ? 1 : 0

      const keys: readonly KindKey[] = [
        { by: "type", type: part.type },
        { by: "role", role: part.role },
      ]

      for (const kind of keys) {
        const key = kindKeyOf(kind)
        const row = rows.get(key) ?? tallying(kind)

        if (kind.by === "type") {
          if (row.placements === 0) row.role = part.role
          else if (row.role !== part.role) disagreed.add(part.type)
        }

        add(row, placement, revision)
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
    witnessed,
    silent,
    indeterminate,
    worstSender: byType.find((row) => row.silent > 0) ?? null,
    duplicated,
    roleDisagreed: [...disagreed].sort((one, other) => one.localeCompare(other)),
  }
}
