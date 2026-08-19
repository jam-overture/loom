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

export default defineConfig({
  ...shared,
  test: {
    projects: [
      {
        ...shared,
        test: { ...shared.test, name: "node", include: ["**/*.test.ts"], environment: "node" },
      },
      {
        ...shared,
        plugins: [serverActionStubs()],
        test: {
          ...shared.test,
          name: "dom",
          include: ["**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["./test/dom-setup.ts"],
        },
      },
    ],
  },
})
