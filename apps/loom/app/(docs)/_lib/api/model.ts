/**
 * What a generated API reference is, as data.
 *
 * The shape is deliberately small. Everything here can be read off the
 * declaration files the package publishes, and nothing here is an opinion — a
 * field that needed a person to fill it in would be a field that goes stale,
 * which is the whole reason this section is generated rather than written.
 *
 * The one exception is a group's `title`, which is a label for a directory. It
 * is derived by default and overridden in `groups.ts` for the handful where a
 * directory name is a poor sentence; a test holds every override against a
 * directory that exists.
 */

/**
 * What kind of thing an export is, in the words a reader would use.
 *
 * `schema` is the one that is not a TypeScript kind. A Zod schema is a `const`
 * like any other, but its *type* is a page of `ZodObject<{ … }>` that tells a
 * reader nothing they want and buries the sentence that does. So it is called
 * what it is and its shape is left to the type beside it.
 */
export type ApiKind = "function" | "value" | "schema" | "type" | "interface" | "class"

export type ApiSymbol = {
  readonly name: string
  readonly kind: ApiKind
  /** The declaration as the package publishes it, with `export declare` removed. */
  readonly signature: string
  /** Whether the signature above was cut short because it ran past the cap. */
  readonly truncated: boolean
  /** The first paragraph of the doc comment, or empty when there is none. */
  readonly summary: string
}

/**
 * How a package a door needs is reached.
 *
 * `loaded` — the door's JavaScript imports it, so importing the door imports
 * it. Absent, the import throws.
 *
 * `declared` — only the door's own declarations name it, as a type. The
 * program runs without it; the type-checker asks for it.
 */
export type ApiRequirementReach = "loaded" | "declared"

/** A package a reader has to install for themselves before a door will open. */
export type ApiRequirement = {
  readonly package: string
  /** The version range this package asks for, exactly as `package.json` writes it. */
  readonly range: string
  /** Whether the package declares it optional, which every one of Loom's peers is. */
  readonly optional: boolean
  readonly reach: ApiRequirementReach
}

/**
 * A door that opens onto part of what a wider door opens onto, and loads less
 * to do it.
 *
 * The fact underneath is about **bundles rather than installs**. Everything in
 * `ApiRequirement` answers *will my import run*; this answers the question a
 * reader asks next, and which nothing on the site could answer before: *should
 * I be importing this one at all*. A reader who wants the broadcaster and finds
 * `@loom/runtime/signals` first — the shorter specifier, and the one the rail
 * lists first — gets the schema library in their browser bundle along with it,
 * and nothing they did was wrong.
 *
 * It is measured, not asserted. A door is narrower than another when its
 * JavaScript loads a **strict subset** of the other's packages and every export
 * it publishes is published by the other **with the same kind and the same
 * declaration**. Both halves are load-bearing and the second is the one that is
 * easy to leave out: two doors can each be a strict subset of the other's
 * packages and still be two doors to two different places, which is what
 * `@loom/runtime/telemetry` and `@loom/runtime/telemetry/postgres` are. A rule
 * that compared only packages would send a reader from the journal to the
 * Postgres journal and lose them sixty exports.
 */
export type ApiNarrowerDoor = {
  /** Exactly as it is written in an import: `@loom/runtime/signals/broadcast`. */
  readonly specifier: string
  /** The last path segment of the page that documents it, so the band can link. */
  readonly slug: string
  /** Packages the wider door loads and this one does not, sorted. */
  readonly avoids: readonly string[]
  /** How many exports it publishes — all of which the wider door publishes too. */
  readonly shared: number
  /** Built files its JavaScript reaches, against the wider door's `files`. */
  readonly files: number
}

/** The exports that share one module inside an entry point. */
export type ApiGroup = {
  /** The declaring module, relative to the package root: `tree/navigation`. */
  readonly module: string
  readonly title: string
  /**
   * The module's own opening paragraph, where it has one.
   *
   * This is the sentence the framework's author wrote at the top of the file to
   * say what the file is for, and it is almost always the plainest description
   * of that idea anywhere in the repository. Lifting it is what makes a
   * generated reference readable rather than a list of names.
   */
  readonly summary: string
  readonly symbols: readonly ApiSymbol[]
}

export type ApiEntry = {
  /** Exactly as it is written in an import: `@loom/runtime/react`. */
  readonly specifier: string
  /** The last path segment of the page that documents it. */
  readonly slug: string
  /** The declaration file the package's `exports` map points at, for provenance. */
  readonly types: string
  /**
   * The packages a reader must install themselves before this import will work.
   *
   * Measured from the built package rather than read off anybody's prose: what
   * this door's JavaScript loads, and what its own declarations name. Empty for
   * most doors, which is itself worth saying on a page.
   */
  readonly requires: readonly ApiRequirement[]
  /**
   * How many of the package's own built files this door's JavaScript reaches.
   *
   * Reach rather than shipped bytes — a bundler drops what a program does not
   * use — so it is an upper bound and the only honest scale this instrument
   * has. It is here so that a narrower door can be compared against the door a
   * reader is standing at.
   */
  readonly files: number
  /**
   * Other doors onto part of this one that load less, where there are any.
   *
   * Empty on fifteen of Loom's sixteen doors, and unlike `requires` a page says
   * nothing when it is empty. See `NarrowerDoors` for why the two bands differ
   * on that.
   */
  readonly narrower: readonly ApiNarrowerDoor[]
  readonly groups: readonly ApiGroup[]
}

export type ApiReference = {
  readonly entries: readonly ApiEntry[]
}

/**
 * The page slug for an entry point.
 *
 * `@loom/runtime` is the root door and gets the plainest name; the others are
 * their subpath with the separator flattened, so `@loom/runtime/telemetry/postgres`
 * is one segment rather than two directories deep. The reference is a flat list
 * of doors and the URL says so.
 */
export const apiSlugFor = (specifier: string): string => {
  const subpath = specifier.replace(/^@loom\/runtime\/?/, "")

  return subpath === "" ? "runtime" : subpath.replace(/\//g, "-")
}

/** What the rail shows: the specifier without the package name it repeats. */
export const apiNavLabelFor = (specifier: string): string =>
  specifier.replace(/^@loom\//, "")

/** The id an export is linked to on its page. Names are unique within an entry. */
export const apiAnchorFor = (name: string): string => `s-${name}`

export const apiSymbolCount = (entry: ApiEntry): number =>
  entry.groups.reduce((total, group) => total + group.symbols.length, 0)
