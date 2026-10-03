/**
 * The packages Loom publishes, and the one place this repository reaches one of
 * them by a different name than a reader would.
 *
 * **The plain version.** Loom ships as two packages. `@jam-overture/loom` is the
 * framework — the tree, the change model, the Gate, and the adapters behind
 * their own doors. `@jam-overture/loom-primitives` is the starter library: the
 * primitives every example on this site is built from. How many there are is a
 * number no file states — `_lib/counts.ts` reads it off the library, because the
 * sentence this one used to carry said ninety-eight while there were ninety-nine.
 *
 * They were one package until 27 September, and the seam is the whole reason
 * this file exists.
 * [0194](decisions/0194-the-framework-is-the-package-and-everything-that-uses-it-ships-separately.md)
 * withholds `./primitives` from the framework's published `exports` map, so
 * `@jam-overture/loom/primitives` resolves **inside this workspace and nowhere
 * else** — on the registry it is `ERR_PACKAGE_PATH_NOT_EXPORTED`. The library
 * did not move; only the door it is opened by did.
 *
 * So there are two true names for one module, and which one is true depends on
 * where you are standing:
 *
 * | | reaches the library by |
 * | --- | --- |
 * | a reader, with an `npm install` behind them | `@jam-overture/loom-primitives` |
 * | this repository, before anything is published | `@jam-overture/loom/primitives` |
 *
 * **The site teaches the first and compiles the second**, and this file is the
 * one statement of that. A page's code block says what a reader should type;
 * `fences/program.ts` rewrites it to what resolves here before `tsc` sees it, so
 * the example is still executed rather than illustrated — §4c's rule that an
 * example which cannot render is a failing test rather than a stale snippet.
 * `tools/package/` performs the mirror image of this rewrite at package time,
 * turning the library's relative imports into `@jam-overture/loom/sdk`; a
 * repository that assembles a package from a workspace owes one of these in each
 * direction.
 *
 * Nothing here is a workaround waiting to be removed. It is what a monorepo
 * that publishes more than one package looks like from inside.
 */

/**
 * What a subpath of the framework really ships as, where it does not ship as a
 * subpath of the framework at all.
 *
 * Keyed by the specifier that resolves **here**, because that is the one a file
 * in this repository can be written against. Two entries today, and
 * `packages.test.ts` holds that against the framework's own manifest: the keys
 * are exactly the doors the workspace has and the registry does not, so a
 * seventeenth door that publishes needs no edit here, and one that is withheld
 * cannot be forgotten.
 *
 * **The library publishes two doors, and the second is where the bands live.**
 * `@jam-overture/loom-primitives` is the catalogue — `STARTER_COMPOSITIONS`,
 * `compositionById`, `planComposition`. `…/compositions` is the bands under
 * their own names, `heroBand` and `pricingBand` among them, and
 * until 1 October this repository had no door to rewrite that one to, so the
 * page that teaches it could name it in prose and never compile it.
 */
export const PUBLISHED_AS: ReadonlyMap<string, string> = new Map([
  ["@jam-overture/loom/primitives", "@jam-overture/loom-primitives"],
  ["@jam-overture/loom/primitives/compositions", "@jam-overture/loom-primitives/compositions"],
])

/**
 * The package a specifier installs from, which stops being the specifier the
 * moment a package publishes a second door.
 *
 * `@jam-overture/loom-primitives/compositions` is one import and no extra
 * `pnpm add`, and two checks on this site assert over names a reader has to
 * install. They were both right while every name in the map above was a whole
 * package; this is what they ask now.
 */
export const packageOf = (specifier: string): string =>
  specifier.split("/").slice(0, specifier.startsWith("@") ? 2 : 1).join("/")

/** The reverse: what a name a reader would type resolves to inside this repository. */
export const RESOLVES_HERE_AS: ReadonlyMap<string, string> = new Map(
  [...PUBLISHED_AS].map(([here, published]) => [published, here] as const)
)

/**
 * The name to show for a module, which is the name a reader could install.
 *
 * Every specifier the site prints goes through this — the entry-point table, the
 * generated reference's titles and its addresses, the search box's context line.
 * A specifier with no entry is returned unchanged, which is all fifteen of the
 * framework's own doors.
 */
export const publishedSpecifier = (specifier: string): string =>
  PUBLISHED_AS.get(specifier) ?? specifier

/**
 * The name to compile, which is the name this workspace can resolve.
 *
 * The inverse of the above, and the only thing the fence pipeline does to a
 * reader's code before typechecking it.
 */
export const workspaceSpecifier = (specifier: string): string =>
  RESOLVES_HERE_AS.get(specifier) ?? specifier

/**
 * A whole source file, as a reader would have to write it.
 *
 * The other half of the fence pipeline's rewrite, for the one file on this site
 * that is **shown verbatim rather than compiled from a page**: the quickstart,
 * which a reader is told to save and run. It is a real module in this
 * repository — `quickstart.test.ts` executes it and compares its output line for
 * line — so it has to import the door the workspace has, and it is read off disk
 * as the page builds, so what a reader copies is what this repository ran.
 *
 * Both of those are worth keeping, and they disagree about one line. This is
 * where they are reconciled: the file compiles here, and the block on the page
 * says the package a reader can install.
 *
 * Quoted-exact, so a longer specifier that merely starts with a shorter one
 * cannot be caught by it, and applied to nothing but the names in the map.
 */
export const asAReaderWouldWrite = (source: string): string =>
  [...PUBLISHED_AS].reduce(
    (text, [here, published]) =>
      text.replaceAll(`"${here}"`, `"${published}"`).replaceAll(`'${here}'`, `'${published}'`),
    source
  )

/**
 * The same file, back in the names this workspace can resolve.
 *
 * The inverse of the above, and it exists for one caller: the quickstart's test
 * harness, which copies the block a reader would copy into a scratch directory
 * and **runs it**. That directory resolves out of this repository's
 * `node_modules`, where the framework is and the separately published library is
 * not — so the reader's text has to come back to the workspace's door on the way
 * to the interpreter.
 *
 * What is worth stating is what this does *not* weaken. The file is still
 * executed, the three edits the page invites are still made to the text the page
 * shows, and `packages.test.ts` holds the round trip against the real file — the
 * block on the page and the module this repository runs differ in the names in
 * the map above and in nothing else.
 */
export const asThisWorkspaceResolves = (source: string): string =>
  [...PUBLISHED_AS].reduce(
    (text, [here, published]) =>
      text.replaceAll(`"${published}"`, `"${here}"`).replaceAll(`'${published}'`, `'${here}'`),
    source
  )
