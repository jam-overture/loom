import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

/**
 * Two suites told apart by a filename, the same arrangement the portal settled
 * on: `.test.ts` is pure and runs in Node, `.test.tsx` renders and gets a
 * document. The navigation model and the content checks are the first kind; an
 * example that has to actually mount through the runtime is the second.
 */

const docsRoot = fileURLToPath(new URL("./", import.meta.url))

const shared = {
  resolve: { alias: { "@": docsRoot } },
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
