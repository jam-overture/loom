import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

import { serverActionStubs } from "./test/server-action-stub"

/**
 * Two suites, told apart by a filename.
 *
 * Most of the portal's logic is pure and lives in `lib/`, and those tests want a
 * plain Node environment — some of them open a Postgres, and putting a synthetic
 * DOM in front of a store test would be scenery nothing in it reads.
 *
 * A test that renders needs the opposite: a document, Testing Library's cleanup,
 * and the client/server substitution the framework normally performs. Selecting
 * that per file with a docblock would work and would be forgotten; the extension
 * already says which kind of test this is, so it may as well decide. `.test.tsx`
 * renders, `.test.ts` does not, and nobody has to remember a third thing. Same
 * reasoning as 0015: a filename is a type.
 */

const portalRoot = fileURLToPath(new URL("./", import.meta.url))

const shared = {
  resolve: { alias: { "@": portalRoot } },
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
