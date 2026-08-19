import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

/**
 * One suite, in Node.
 *
 * Everything this site is made of is a pure function of a route, a theme and an
 * origin, and the assertions worth making about it are about *markup* — that
 * two palettes produce the same DOM below the root, that nothing hard-codes a
 * colour. `renderToStaticMarkup` answers those exactly, so a synthetic document
 * would be scenery no test reads.
 */
const marketingRoot = fileURLToPath(new URL("./", import.meta.url))

export default defineConfig({
  resolve: { alias: { "@": marketingRoot } },
  test: { exclude: ["node_modules", ".next"], environment: "node" },
})
