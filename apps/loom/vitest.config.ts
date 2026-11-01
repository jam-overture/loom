import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

import { serverActionStubs } from "./test/server-action-stub"

/**
 * One suite for the whole application, split in two by a filename.
 *
 * Most of what these four surfaces are made of is pure and wants a plain Node
 * environment — a marketing page is a function of a route and a theme, the
 * portal's `_lib` is view models and a store, and some of those open a Postgres.
 * Putting a synthetic DOM in front of any of them would be scenery nothing in
 * them reads.
 *
 * A test that renders needs the opposite: a document, Testing Library's cleanup,
 * and the client/server substitution the framework normally performs. Selecting
 * that per file with a docblock would work and would be forgotten; the extension
 * already says which kind of test this is, so it may as well decide. `.test.tsx`
 * renders, `.test.ts` does not, and nobody has to remember a third thing. Same
 * reasoning as 0015: a filename is a type.
 *
 * The arrangement is the portal's, adopted for all four surfaces because the
 * docs suite had already reached the same one independently and the marketing
 * suite is the node half of it.
 */

const appRoot = fileURLToPath(new URL("./", import.meta.url))

const shared = {
  resolve: { alias: { "@": appRoot } },
  test: { exclude: ["node_modules", ".next"] },
}

/**
 * The suites that open a PGlite database, by the names they all share.
 */
const postgres = ["**/*postgres.test.ts", "**/*.live.test.ts"]

export default defineConfig({
  ...shared,
  test: {
    /**
     * A node file runs in a worker that has already loaded what the previous
     * file loaded. Isolating every file meant importing the runtime and each
     * surface's `_lib` afresh 287 times, which was most of what the node half
     * spent: 175s of loading against 180s of testing. Those files are functions
     * of their arguments, so a warm module cache is scenery to them.
     *
     * Two kinds of file keep a worker each, on the threads pool. A rendering
     * file, because Testing Library's `screen` is bound to the document of the
     * first file that imported it, and a document left over from another file
     * is exactly the leak `dom-setup.ts` exists to prevent. A Postgres suite,
     * because it sets its own timeout with `vi.setConfig`, and in Vitest 3 that
     * only reaches the first file a worker runs. Isolation is a property of the
     * pool rather than of the project, which is why the halves are on
     * different pools.
     */
    poolOptions: { forks: { isolate: false }, threads: { isolate: true } },
    projects: [
      {
        ...shared,
        test: {
          ...shared.test,
          name: "node",
          include: ["**/*.test.ts"],
          exclude: [...shared.test.exclude, ...postgres],
          environment: "node",
        },
      },
      {
        ...shared,
        test: { ...shared.test, name: "postgres", include: postgres, environment: "node", pool: "threads" },
      },
      {
        ...shared,
        plugins: [serverActionStubs()],
        test: {
          ...shared.test,
          name: "dom",
          include: ["**/*.test.tsx"],
          environment: "jsdom",
          pool: "threads",
          setupFiles: ["./test/dom-setup.ts"],
        },
      },
    ],
  },
})
