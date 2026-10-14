import { describe, expect, it } from "vitest"

import { projectIdSchema, projectSchema, type Project } from "../project/project.js"
import type { ProjectStore } from "../project/store.js"

/**
 * One suite, two implementations.
 *
 * `memoryProjectStore` calls itself the reference implementation; this is what
 * makes that claim checkable rather than aspirational, on the same terms
 * `store-contract.ts` and `hold-contract.ts` already set. The alternative —
 * each store asserted against its own expectations — is how two stores that
 * disagree both stay green.
 */

export const projectFixture = (over: Partial<Project> = {}): Project =>
  projectSchema.parse({
    projectId: projectIdSchema.parse("prj_fixture"),
    name: "A fixture",
    createdAt: "2026-10-12T12:00:00.000Z",
    ...over,
  })

export const describeProjectStoreContract = (
  name: string,
  make: () => Promise<ProjectStore> | ProjectStore
): void => {
  describe(`${name} — the project store contract`, () => {
    it("reads back what it recorded", async () => {
      const store = await make()
      const project = projectFixture({ name: "The bakery" })

      expect(await store.create(project)).toEqual({ ok: true, value: project })
      expect(await store.get(project.projectId)).toEqual({ ok: true, value: project })
    })

    it("refuses an id already taken rather than overwriting the rows under it", async () => {
      const store = await make()
      const first = projectFixture({ name: "The first" })
      await store.create(first)

      const second = await store.create(projectFixture({ name: "The second" }))

      expect(second).toEqual({
        ok: false,
        error: { code: "already-exists", projectId: first.projectId },
      })
      const read = await store.get(first.projectId)
      expect(read.ok && read.value.name).toBe("The first")
    })

    it("says not-found rather than returning nothing", async () => {
      const store = await make()
      const missing = projectIdSchema.parse("prj_nobody")

      expect(await store.get(missing)).toEqual({
        ok: false,
        error: { code: "not-found", projectId: missing },
      })
    })

    it("lists nothing before anything is recorded", async () => {
      const store = await make()

      expect(await store.list()).toEqual({ ok: true, value: [] })
    })

    it("lists oldest first, whatever order they were written in", async () => {
      const store = await make()
      await store.create(
        projectFixture({
          projectId: projectIdSchema.parse("prj_third"),
          createdAt: "2026-10-12T14:00:00.000Z",
        })
      )
      await store.create(
        projectFixture({
          projectId: projectIdSchema.parse("prj_first"),
          createdAt: "2026-10-12T10:00:00.000Z",
        })
      )
      await store.create(
        projectFixture({
          projectId: projectIdSchema.parse("prj_second"),
          createdAt: "2026-10-12T12:00:00.000Z",
        })
      )

      const listed = await store.list()
      expect(listed.ok && listed.value.map((project) => project.projectId)).toEqual([
        "prj_first",
        "prj_second",
        "prj_third",
      ])
    })

    it("renames without touching anything else", async () => {
      const store = await make()
      const project = projectFixture({ name: "Before" })
      await store.create(project)

      const renamed = await store.rename(project.projectId, { name: "After" })

      expect(renamed).toEqual({
        ok: true,
        value: { ...project, name: "After" },
      })
    })

    it("refuses to rename a project that is not there", async () => {
      const store = await make()
      const missing = projectIdSchema.parse("prj_nobody")

      expect(await store.rename(missing, { name: "Anything" })).toEqual({
        ok: false,
        error: { code: "not-found", projectId: missing },
      })
    })

    /**
     * The two stores have to agree about what a project is, not merely about
     * what they store. An empty name is the cheapest way to ask: `projectSchema`
     * refuses it, and a store that spread the change instead of parsing it would
     * accept it here and be refused by the column somewhere else.
     */
    it("refuses a rename the project schema would not accept", async () => {
      const store = await make()
      const project = projectFixture()
      await store.create(project)

      const refused = await store.rename(project.projectId, { name: "" })

      expect(refused.ok).toBe(false)
      const read = await store.get(project.projectId)
      expect(read.ok && read.value.name).toBe(project.name)
    })
  })
}
