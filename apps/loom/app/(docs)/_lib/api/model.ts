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
