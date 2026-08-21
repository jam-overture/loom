/**
 * What dialect of markdown a page on this site is written in.
 *
 * MDX on its own is CommonMark, and CommonMark has **no tables**. Nothing warns
 * about this: a pipe table compiles perfectly happily into a paragraph of pipe
 * characters, and the page builds, deploys and ships looking like somebody
 * pasted a spreadsheet into it. `/docs/the-runtime/what-the-gate-decides` had
 * been rendering its three-answer table that way since it was written, and it
 * was found by looking at a screenshot rather than by anything failing.
 *
 * GFM is what a writer already assumes they have — tables, strikethrough, task
 * lists, bare URLs that link. Declared here rather than inline in
 * `next.config.ts` so that the one thing which decides how a docs page parses
 * lives in the documentation site's own directory, and so a test can compile
 * against the same list the build uses instead of a copy of it.
 *
 * **Named rather than imported**, which looks like the weaker choice and is the
 * required one: the loader's options cross into the bundler and are checked for
 * being serializable, so a plugin *function* here fails the build outright.
 * `mdx.test.ts` resolves each name to the module it points at, so a name that
 * is misspelled or a package that is not installed is a failing test rather
 * than a page that quietly loses its tables again.
 */
export const docsRemarkPlugins = [["remark-gfm", {}]] as const satisfies readonly (readonly [
  string,
  Record<string, unknown>,
])[]
