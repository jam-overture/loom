import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

/**
 * Where the Architecture section's material actually lives, which is not here.
 *
 * The course in `lessons/` and the records in `decisions/` are the source, and
 * this section indexes them rather than repeating them. That is only true if
 * the index is *read* from them: a list of lesson titles typed into this
 * directory would be a copy, would drift, and nothing would fail when it did.
 * So the two README tables — both of which are already the index of their own
 * folder — are what this section parses, and the section can only ever say what
 * the repository says.
 *
 * Found by walking up for a marker rather than counting `..` segments, because
 * the callers stand in different places: `next build` runs from `apps/loom` and
 * vitest can be invoked from either there or the repository root. The lessons
 * surface resolves its own directory the same way, for the same reason.
 *
 * **It is also the only spelling that survives the build, and that is the part
 * worth knowing before you write the obvious line.** `new URL("../../x",
 * import.meta.url)` is the idiomatic ESM way to name a neighbouring path and it
 * fails here: Turbopack reads it as an asset this module imports and tries to
 * resolve the argument as a module specifier, so `next build` stops with
 * `Module not found: Can't resolve '../../x'` naming a module nobody wrote. The
 * directory is plainly there; the bundler is not asking the filesystem. Any
 * module the bundler will see has to find its files at run time, from
 * `process.cwd()`, which is what this does. Import `REPOSITORY_ROOT` rather
 * than walking a second time.
 */

const MARKER = join("decisions", "README.md")

const findRepositoryRoot = (start: string): string => {
  let at = resolve(start)

  for (;;) {
    if (existsSync(join(at, MARKER))) return at

    const up = dirname(at)
    if (up === at) {
      throw new Error(
        `loom: no ${MARKER} above ${start} — the Architecture section cannot find the decision records`
      )
    }

    at = up
  }
}

/** The repository root, resolved once. */
export const REPOSITORY_ROOT: string = findRepositoryRoot(process.cwd())

export const readDecisionsFile = (name: string): string =>
  readFileSync(join(REPOSITORY_ROOT, "decisions", name), "utf8")

export const readCourseFile = (name: string): string =>
  readFileSync(join(REPOSITORY_ROOT, "lessons", name), "utf8")

/** Whether a file this section points a reader at is really there. */
export const repositoryFileExists = (...segments: readonly string[]): boolean =>
  existsSync(join(REPOSITORY_ROOT, ...segments))

const BLOB = "https://github.com/jam-overture/loom/blob/main"

/**
 * A link to a file in the repository, which is a link off this site.
 *
 * This used to be where *both* halves of the section sent a reader, because
 * neither the course nor the records were rendered as pages anywhere in this
 * application. The course now is: `lessons/` grew a route on this same
 * deployment, so `course.ts` builds an address here instead and calls this only
 * for a lesson's `source`, which no reader is handed.
 *
 * **The records have no route and this is still where they go.** That is not an
 * oversight waiting on a run. A decision record is a working note written on the
 * day of the ruling, in the repository's own idiom, and the section's whole
 * argument is that it is a trail rather than a second documentation site. What
 * is owed to a reader is that a link which leaves says it leaves — which is what
 * the components do with it — rather than that every file becomes a page.
 */
export const repositoryHref = (...segments: readonly string[]): string =>
  `${BLOB}/${segments.join("/")}`

/** Markdown link syntax and emphasis, removed. Titles here are rendered as text. */
export const plainText = (markdown: string): string =>
  markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim()
