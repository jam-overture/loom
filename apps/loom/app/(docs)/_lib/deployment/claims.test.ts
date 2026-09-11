import { describe, expect, it } from "vitest"

import { apiEntries } from "../api/reference"
import { storageSeams, storageTables } from "./schema"

/**
 * The claims the deployment page makes about the runtime, held against the
 * runtime.
 *
 * These are the tests that are *supposed* to go red when `src/` changes, and
 * that is the difference between this file and `schema.test.ts` next door. Each
 * one stands behind a sentence a reader would act on — every table is locked,
 * every function named here is one you can import — and a change that made one
 * false would leave the page confidently wrong rather than merely out of date.
 * The documentation lane cannot fix that; it can be the thing that notices.
 */

const publishedNames = (specifier: string): ReadonlySet<string> => {
  const entry = apiEntries.find((candidate) => candidate.specifier === specifier)

  if (entry === undefined) throw new Error(`loom: nothing publishes ${specifier}`)

  return new Set(entry.groups.flatMap((group) => group.symbols.map((symbol) => symbol.name)))
}

describe("what the deployment page tells a host to import", () => {
  it("names a function that the Postgres door really exports", () => {
    for (const seam of storageSeams) {
      const published = publishedNames(seam.specifier)

      expect([seam.specifier, seam.postgres, published.has(seam.postgres)]).toEqual([
        seam.specifier,
        seam.postgres,
        true,
      ])
      expect([seam.specifier, seam.ensure, published.has(seam.ensure)]).toEqual([
        seam.specifier,
        seam.ensure,
        true,
      ])
    }
  })

  it("names an in-memory alternative that really exists, from the door it says", () => {
    for (const seam of storageSeams) {
      expect([seam.memorySpecifier, seam.memory, publishedNames(seam.memorySpecifier).has(seam.memory)]).toEqual(
        [seam.memorySpecifier, seam.memory, true]
      )
    }
  })
})

describe("what the deployment page tells a host about their database", () => {
  /**
   * The page says every table Loom creates is locked as it is created, and
   * links that sentence to 0036. A table shipped without the statement would
   * make the page tell a host their trees are private while a public key can
   * read them, which is the worst class of documentation error there is: it is
   * acted on, and it is silent.
   */
  it("shows every table with row level security switched on", () => {
    for (const table of storageTables) {
      expect([table.name, table.rowLevelSecurity]).toEqual([table.name, true])
    }
  })

  /**
   * Not decoration — `tablesIn` throws on a statement it cannot read, so this
   * is the check that the runtime has not started doing something to a host's
   * database that this page silently omits.
   */
  it("can read every statement the runtime would run", () => {
    expect(storageTables.length).toBeGreaterThan(0)
  })

  /**
   * The one list on this page that is typed rather than derived is in the
   * prose, which names `loom_trees` and `loom_revisions` in sentences and says
   * there are three places state lives. A table that appeared or was renamed
   * would leave those sentences wrong while the generated tables beside them
   * went on being right — the hardest kind of staleness to see. So the names
   * are written down once, here, where changing them is the same edit as
   * changing the page.
   */
  it("creates exactly the tables the prose names", () => {
    expect(storageSeams.map((seam) => seam.tables.map((table) => table.name))).toEqual([
      ["loom_trees", "loom_revisions"],
      ["loom_holds"],
      ["loom_telemetry"],
    ])
  })
})
