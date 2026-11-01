import { configDefaults, defineConfig } from "vitest/config"

/**
 * The suites that open a PGlite database. They are named here rather than found,
 * because which pool a file runs in is decided before any of it is read.
 */
const postgres = [
  "src/**/postgres*.test.ts",
  "src/store/migrate-rename.test.ts",
  "src/application/application.test.ts",
  "src/application/scoped.test.ts",
  "tools/pglite/*.test.ts",
]

const shared = {
  globals: true,
}

export default defineConfig({
  test: {
    /**
     * Almost every file here is a function of its arguments, so it runs in a
     * worker that has already loaded what the previous file loaded. Isolating
     * each one meant importing the runtime afresh 246 times, which cost more
     * than the tests did.
     *
     * The Postgres suites keep a worker each, on the threads pool, because they
     * set their own timeout with `vi.setConfig`, and in Vitest 3 that only
     * reaches the first file a worker runs: the second file in a shared worker
     * silently keeps the 5s default. Isolation is a property of the pool rather
     * than of the project, which is why the two are on different pools. A new
     * suite that opens a database belongs in the list above.
     */
    poolOptions: { forks: { isolate: false }, threads: { isolate: true } },
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/index.ts"],
    },
    projects: [
      {
        test: {
          ...shared,
          name: "unit",
          include: ["src/**/*.test.ts", "tools/**/*.test.ts"],
          exclude: [...configDefaults.exclude, ...postgres],
        },
      },
      {
        test: {
          ...shared,
          name: "postgres",
          include: postgres,
          pool: "threads",
        },
      },
    ],
  },
})
