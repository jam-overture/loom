import type { ApiEntry, ApiNarrowerDoor } from "./model"

/**
 * Which door a reader should have gone through instead.
 *
 * Every other fact on a reference page is about **one** door. This is the only
 * one that comes from holding two of them against each other, and it exists
 * because a package with sixteen entry points has a shape no single page can
 * show: two of those doors can open onto the same code, and one of them can
 * cost a reader a library they will never call.
 *
 * `@loom/runtime/signals` is the case. It publishes the broadcaster *and* the
 * schemas that describe what the broadcaster sends, so importing it loads
 * `zod`. `@loom/runtime/signals/broadcast` publishes the broadcaster and
 * nothing else, and loads no package at all. A reader who wants to send reader
 * signals from a browser and reaches for the shorter specifier — which is also
 * the one the rail lists first — pays for schemas their browser never parses.
 *
 * The runtime's own author knew this and wrote it down, in a paragraph at the
 * top of `src/signals/index.ts` telling a reader to use the other door in a
 * browser bundle. Neither page could say it: a barrel's opening paragraph
 * reaches no page, and lifting prose is the thing a generated reference must
 * not do. So it is measured here instead, from the same walk that already knows
 * what every door loads.
 */

/** Every export a door publishes, against the declaration the package gives it. */
export type DoorSurface = ReadonlyMap<string, string>

/**
 * A door's exports, as the pair that has to match for two doors to be the same
 * door onto a smaller room.
 *
 * Kind and signature together, rather than the name alone. A name is not an
 * identity across sixteen entry points — two doors could each publish a
 * `Journal` meaning different things — and the whole claim this band makes to a
 * reader is *that one gives you the same thing*. Matching on the declaration is
 * what makes the claim true rather than likely.
 */
export const surfaceOf = (entry: Pick<ApiEntry, "groups">): DoorSurface =>
  new Map(entry.groups.flatMap((group) => group.symbols.map((symbol) => [symbol.name, `${symbol.kind} ${symbol.signature}`])))

/** Whether every one of the first door's exports is the second's, declared the same way. */
const opensOntoPartOf = (narrow: DoorSurface, wide: DoorSurface): boolean =>
  [...narrow].every(([name, declaration]) => wide.get(name) === declaration)

/** Whether the first set is contained in the second and smaller than it. */
const isStrictSubset = (inner: ReadonlySet<string>, outer: ReadonlySet<string>): boolean =>
  inner.size < outer.size && [...inner].every((member) => outer.has(member))

/**
 * The rule, and both halves of it are load-bearing.
 *
 * **Fewer packages, strictly.** Equal is not narrower: two doors that load the
 * same libraries cost a reader the same thing, whatever their sizes, and
 * pointing from one to the other would be a recommendation about taste. What
 * makes this band worth a reader's attention is that following it removes
 * something from their bundle.
 *
 * **And every export accounted for.** Without this half the pair that qualifies
 * is not a narrower door but a different one: `@loom/runtime/telemetry/postgres`
 * loads a strict subset of `@loom/runtime/telemetry`'s packages, and it
 * publishes four names, none of which are among that door's sixty-four. A rule
 * of packages alone would have sent a reader from the journal to the Postgres
 * journal and lost them everything they came for.
 *
 * **A door that publishes nothing is never narrower than anything.** The empty
 * set is a subset of every set, so the rule would otherwise offer a reader a
 * door with no exports behind it as a way to save a package — which is true,
 * and useless, in the way that not importing anything is true and useless.
 */
const isNarrowerThan = (
  narrow: { readonly packages: ReadonlySet<string>; readonly surface: DoorSurface },
  wide: { readonly packages: ReadonlySet<string>; readonly surface: DoorSurface }
): boolean =>
  narrow.surface.size > 0 &&
  isStrictSubset(narrow.packages, wide.packages) &&
  opensOntoPartOf(narrow.surface, wide.surface)

/** What one door loads and what it publishes, which is everything the rule reads. */
export type DoorFacts = {
  readonly entry: ApiEntry
  readonly packages: ReadonlySet<string>
}

/**
 * Every narrower door for every entry, keyed by the wider one's specifier.
 *
 * Whole-reference rather than per-page, because the answer for one door is a
 * fact about all sixteen: a page cannot know it is the wide one without being
 * told what the others are.
 *
 * A door can have more than one, and they are ordered by specifier so that the
 * generated file does not move when `package.json` reorders its exports. No
 * entry has two today; nothing here caps the list, because a cap would be this
 * page deciding, silently, which of a reader's options they are allowed to
 * hear about.
 */
export const narrowerDoorsBySpecifier = (
  doors: readonly DoorFacts[]
): ReadonlyMap<string, readonly ApiNarrowerDoor[]> => {
  const surfaces = new Map(doors.map((door) => [door.entry.specifier, surfaceOf(door.entry)]))

  const facts = doors.map((door) => ({
    door,
    packages: door.packages,
    surface: surfaces.get(door.entry.specifier) as DoorSurface,
  }))

  return new Map(
    facts.map((wide) => [
      wide.door.entry.specifier,
      facts
        .filter((narrow) => narrow.door.entry.specifier !== wide.door.entry.specifier)
        .filter((narrow) => isNarrowerThan(narrow, wide))
        .map(
          (narrow): ApiNarrowerDoor => ({
            specifier: narrow.door.entry.specifier,
            /* The entry's own slug, not a second derivation of it: a link that
               computed the URL for itself could disagree with the page. */
            slug: narrow.door.entry.slug,
            avoids: [...wide.packages].filter((name) => !narrow.packages.has(name)).sort(),
            shared: narrow.surface.size,
            files: narrow.door.entry.files,
          })
        )
        .sort((a, b) => a.specifier.localeCompare(b.specifier)),
    ])
  )
}
