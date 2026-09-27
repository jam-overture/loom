import type { ApiEntry, ApiNameCollision, ApiOverlappingDoor, ApiStanding } from "./model"
import { surfaceOf, type DoorSurface } from "./narrower"

/**
 * Where a door sits among the sixteen — which is to say, what it does *not*
 * have behind it.
 *
 * A reader meets this package as a list of sixteen imports with `@jam-overture/loom`
 * at the top of it, described as the one to start with. The belief that forms
 * is the one almost every package would have earned: that the short specifier
 * is the whole library and the longer ones are slices of it, kept separate as a
 * convenience. A reader holding it looks for `renderTree` behind
 * `@jam-overture/loom`, does not find it, and concludes the name does not exist.
 *
 * **It is wrong here, and by a long way.** The sixteen doors barely overlap.
 * The root door is the biggest of them and publishes less than half of what the
 * package publishes; thirteen of the fifteen others publish nothing it does.
 * There is no door with everything behind it, and there was nothing on this
 * site that said so.
 *
 * So each page says it, in its own numbers, measured the same way everything
 * else on it is: from the declarations the package ships.
 */

/**
 * The same name at two doors, and whether it is the same thing.
 *
 * Two doors publishing one name is ordinary and mostly harmless — thirteen of
 * Loom's fourteen shared names are one declaration reached through two doors,
 * and a reader who takes either gets the same thing. The interesting case is
 * the other one, and it is the reason the overlap is counted on the
 * declaration rather than on the name: `horizonOf` is a function about reader
 * signals behind one door and a function about telemetry retention behind
 * another, and nothing but the signature tells them apart.
 */
const sameDeclaration = (a: DoorSurface, b: DoorSurface, name: string): boolean =>
  a.get(name) === b.get(name)

const sharedNames = (a: DoorSurface, b: DoorSurface): readonly string[] =>
  [...a.keys()].filter((name) => b.has(name))

/** What the standing is measured from: a door's identity and its surface. */
export type StandingDoor = Pick<ApiEntry, "specifier" | "slug" | "groups">

/**
 * Every door's standing, keyed by specifier.
 *
 * Whole-reference rather than per-page, for the reason `narrower.ts` is: how
 * much of a package is behind one of its doors is not a fact about that door.
 * The first of the sixteen cannot know it, and a page that worked it out for
 * itself would be reading fifteen other pages to print one number.
 */
export const standingBySpecifier = (
  doors: readonly StandingDoor[]
): ReadonlyMap<string, ApiStanding> => {
  const surfaces = doors.map((door) => ({ door, surface: surfaceOf(door) }))

  /*
   * Distinct names, not the sum of sixteen counts. A name published by two
   * doors is one name a reader can import, and adding the doors up would
   * inflate the package by every name it publishes twice — which is the
   * arithmetic a reader would do by hand from the rail, and get wrong.
   */
  const packageNames = new Set(surfaces.flatMap(({ surface }) => [...surface.keys()])).size

  const widest = Math.max(...surfaces.map(({ surface }) => surface.size))

  return new Map(
    surfaces.map(({ door, surface }) => {
      const others = surfaces.filter((other) => other.door.specifier !== door.specifier)

      const overlaps = others.map((other) => ({
        other,
        shared: sharedNames(surface, other.surface),
      }))

      return [
        door.specifier,
        {
          packageNames,
          otherDoors: others.length,
          doorsSharingNothing: overlaps.filter(({ shared }) => shared.length === 0).length,
          /*
           * Ties are all called widest. Two doors publishing the same, largest
           * number of names are both true answers to "is there a bigger one",
           * and a rule that picked one of them would be picking by list order.
           */
          widest: surface.size === widest,
          sharedWith: overlaps
            .flatMap(({ other, shared }): readonly ApiOverlappingDoor[] => {
              const same = shared.filter((name) => sameDeclaration(surface, other.surface, name))

              return same.length === 0
                ? []
                : [{ specifier: other.door.specifier, slug: other.door.slug, names: same.length }]
            })
            .sort((a, b) => a.specifier.localeCompare(b.specifier)),
          collisions: overlaps
            .flatMap(({ other, shared }): readonly ApiNameCollision[] =>
              shared
                .filter((name) => !sameDeclaration(surface, other.surface, name))
                .map((name) => ({ name, specifier: other.door.specifier, slug: other.door.slug }))
            )
            .sort((a, b) => a.name.localeCompare(b.name) || a.specifier.localeCompare(b.specifier)),
        },
      ]
    })
  )
}
