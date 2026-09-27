import type { EntryPoint } from "../entry-points"

import { apiSymbolCount, type ApiEntry } from "./model"

/**
 * The doors seen together, which is the one view sixteen reference pages
 * cannot give.
 *
 * **The plain version.** Loom is one package you install once, and it offers
 * several different imports to write. Each reference page describes what comes
 * out of one of them. This is the view from outside: how big each door is, what
 * it is for, and the one fact about the set that a reader is most likely to
 * have guessed wrong — that the imports do not nest, so there is no single
 * import with the whole package behind it.
 *
 * **Why it is derived here rather than generated.** Every number below is
 * already in the generated reference: each entry carries its own `standing`,
 * which was measured across all of them when the file was written. Adding a
 * pass to the generator would be a second statement of the same measurement,
 * and the two would be free to disagree. So this arranges what is there and
 * measures nothing new — and the one thing it does compute, the count of pairs
 * of doors that share no name, is derived from the standings rather than from
 * the surfaces, so the page and the sixteen pages under it cannot tell a
 * reader two different stories.
 *
 * Pure over a list of entries, so its tests can state a package's shape instead
 * of arranging for one to exist.
 */

/** One door, as the front door lists it. */
export type ApiDoor = {
  /** Exactly as it is written in an import. */
  readonly specifier: string
  /** The last path segment of the page that documents it. */
  readonly slug: string
  /** The sentence the site already keeps for it, from `entry-points.ts`. */
  readonly summary: string
  /** Who is expected to import it. */
  readonly audience: EntryPoint["audience"]
  /** How many names it publishes. */
  readonly publishes: number
  /** Whether no other door publishes more. Ties are all widest. */
  readonly widest: boolean
  /**
   * The one door that publishes every name this one does, where there is one.
   *
   * This is the only shape in which a reader's guess — that a short import is
   * the whole of a longer one — is actually true, and saying which door it is
   * true of is how the page can say, honestly, that it is true of nothing else.
   */
  readonly insideOf?: string
}

/**
 * Two doors that publish some of the same names, meaning the same thing.
 *
 * Unordered: `a` is the wider of the two, or the earlier of the two where they
 * publish the same number, so one pair is one row rather than two.
 */
export type ApiDoorPair = {
  readonly a: string
  readonly b: string
  /** Names both publish, with the same kind and the same declaration. */
  readonly names: number
}

/** One name published by two doors that means two different things at each. */
export type ApiDoorCollision = {
  readonly name: string
  /** The two doors, in the order the rail lists them. */
  readonly specifiers: readonly [string, string]
}

/** The whole set of doors, and the shape they make. */
export type ApiDoorway = {
  readonly doors: readonly ApiDoor[]
  /** Distinct names across every door, counting a name published twice once. */
  readonly packageNames: number
  /** Export slots: the doors' own counts added up, which is the larger number. */
  readonly published: number
  /** How many pairs of doors there are: 16 doors make 120. */
  readonly pairs: number
  /** Of those, how many share not one name — not even a name meaning two things. */
  readonly pairsSharingNothing: number
  /** The pairs that publish the same name for the same thing, widest first. */
  readonly overlapping: readonly ApiDoorPair[]
  /** Names that mean two different things at two doors. */
  readonly collisions: readonly ApiDoorCollision[]
}

/**
 * A door whose whole surface is behind exactly one other door.
 *
 * Read off the standing rather than recomputed: `sharedWith` counts the names
 * two doors publish with the same declaration, so a door that shares all of its
 * names with one other door is a door that other door contains. Loom has
 * exactly one — the reader-signal broadcaster, which is the browser-sized half
 * of `@jam-overture/loom/signals` — and a page that claimed *no import is part of a
 * bigger one* would be false on precisely that door's row.
 */
const insideOf = (entry: ApiEntry): string | undefined =>
  entry.standing.sharedWith.find((door) => door.names === apiSymbolCount(entry))?.specifier

const doorOf = (entry: ApiEntry, listed: EntryPoint | undefined): ApiDoor => {
  if (listed === undefined) {
    throw new Error(
      `loom: the generated reference documents ${entry.specifier}, which entry-points.ts has never heard of`
    )
  }

  const inside = insideOf(entry)

  return {
    specifier: entry.specifier,
    slug: entry.slug,
    summary: listed.summary,
    audience: listed.audience,
    publishes: apiSymbolCount(entry),
    widest: entry.standing.widest,
    ...(inside === undefined ? {} : { insideOf: inside }),
  }
}

/**
 * The pairs that overlap, each counted once.
 *
 * Both halves of a pair say the same thing from their own side — `signals`
 * lists `broadcast` and `broadcast` lists `signals`, with the same count — so
 * the wider door is taken as `a` and the row is kept once. Where two doors
 * publish the same number of names, the order the rail lists them decides,
 * because something has to and list order is the only thing here that is not
 * arbitrary.
 */
const overlappingPairs = (entries: readonly ApiEntry[]): readonly ApiDoorPair[] => {
  const sizes = new Map(entries.map((entry) => [entry.specifier, apiSymbolCount(entry)]))
  const order = new Map(entries.map((entry, index) => [entry.specifier, index]))
  const wider = (a: string, b: string): boolean =>
    (sizes.get(a) ?? 0) === (sizes.get(b) ?? 0)
      ? (order.get(a) ?? 0) < (order.get(b) ?? 0)
      : (sizes.get(a) ?? 0) > (sizes.get(b) ?? 0)

  return entries
    .flatMap((entry) =>
      entry.standing.sharedWith
        .filter((door) => wider(entry.specifier, door.specifier))
        .map((door) => ({ a: entry.specifier, b: door.specifier, names: door.names }))
    )
    .sort((one, two) => two.names - one.names || one.a.localeCompare(two.a))
}

/**
 * Names that mean two things, each counted once.
 *
 * The same pairing rule as above, and for the same reason: both doors carry the
 * collision on their own page, and a reader seeing `horizonOf` listed twice
 * here would reasonably conclude there were two of them.
 */
const collisionsIn = (entries: readonly ApiEntry[]): readonly ApiDoorCollision[] => {
  const order = new Map(entries.map((entry, index) => [entry.specifier, index]))

  return entries
    .flatMap((entry) =>
      entry.standing.collisions
        .filter((collision) => (order.get(entry.specifier) ?? 0) < (order.get(collision.specifier) ?? 0))
        .map((collision) => ({
          name: collision.name,
          specifiers: [entry.specifier, collision.specifier] as readonly [string, string],
        }))
    )
    .sort((one, two) => one.name.localeCompare(two.name))
}

/**
 * How many pairs of doors share not one name.
 *
 * Every door's standing says how many of the others share nothing with it, and
 * each such pair is therefore counted twice — once from each side. An odd total
 * would mean one door believes something about another that the other does not
 * believe back, which is a reference nobody's generator wrote, and the page
 * would print a half-pair rather than say so.
 */
const pairsSharingNothing = (entries: readonly ApiEntry[]): number => {
  const total = entries.reduce((count, entry) => count + entry.standing.doorsSharingNothing, 0)

  if (total % 2 !== 0) {
    throw new Error(
      `loom: ${total} doors share nothing with another door, which cannot be — every such pair has two sides`
    )
  }

  return total / 2
}

/**
 * The doorway, from the generated reference and the site's own list of doors.
 *
 * Both are passed in rather than imported, which is what lets the tests state a
 * package's shape — a door inside another, a name meaning two things, a package
 * with one door — instead of arranging for Loom's package to take it.
 */
export const doorwayOf = (
  entries: readonly ApiEntry[],
  listed: readonly EntryPoint[]
): ApiDoorway => {
  const summaries = new Map(listed.map((entry) => [entry.specifier, entry]))
  const doors = entries.map((entry) => doorOf(entry, summaries.get(entry.specifier)))
  const [first] = entries

  if (first === undefined) throw new Error("loom: the generated reference has no doors")

  /*
   * One package, one total. Every door's standing carries it because every door
   * is measured against the same set; two doors disagreeing about how many
   * names the package publishes is a file written by two generators, and the
   * page would quietly print whichever one it read first.
   */
  const disagrees = entries.find(
    (entry) => entry.standing.packageNames !== first.standing.packageNames
  )

  if (disagrees !== undefined) {
    throw new Error(
      `loom: ${disagrees.specifier} says this package publishes ${disagrees.standing.packageNames} names and ${first.specifier} says ${first.standing.packageNames}`
    )
  }

  return {
    doors,
    packageNames: first.standing.packageNames,
    published: doors.reduce((total, door) => total + door.publishes, 0),
    pairs: (doors.length * (doors.length - 1)) / 2,
    pairsSharingNothing: pairsSharingNothing(entries),
    overlapping: overlappingPairs(entries),
    collisions: collisionsIn(entries),
  }
}

/** What the front door shows a reader, and which of the three comes first. */
export type ApiAudience = EntryPoint["audience"]

export const apiDoorsFor = (doorway: ApiDoorway, audience: ApiAudience): readonly ApiDoor[] =>
  doorway.doors.filter((door) => door.audience === audience)
