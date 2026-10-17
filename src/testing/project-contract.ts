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

    /**
     * ## Closing (0289)
     *
     * What this store has instead of a delete. The failure these guard is the
     * one a soft delete usually ships with: a row that has stopped according to
     * one read and is still there according to another.
     */
    describe("closing", () => {
      const AT = "2026-10-16T09:00:00.000Z"
      const LATER = "2026-10-16T10:00:00.000Z"

      it("stamps when it was closed", async () => {
        const store = await make()
        const project = projectFixture()
        await store.create(project)

        const closed = await store.close(project.projectId, AT)

        expect(closed.ok && closed.value.closedAt).toBe(AT)
      })

      /**
       * A closed project is still there, and `get` says so. A store that
       * answered `not-found` about a row it is holding would be lying about its
       * contents, and the first casualty is the audit that goes looking for
       * exactly those rows.
       */
      it("still answers for it by id", async () => {
        const store = await make()
        const project = projectFixture()
        await store.create(project)
        await store.close(project.projectId, AT)

        const read = await store.get(project.projectId)

        expect(read.ok && read.value.projectId).toBe(project.projectId)
        expect(read.ok && read.value.closedAt).toBe(AT)
      })

      it("leaves it out of a listing that did not ask for it", async () => {
        const store = await make()
        const project = projectFixture()
        await store.create(project)
        await store.close(project.projectId, AT)

        const listed = await store.list()

        expect(listed.ok && listed.value).toEqual([])
      })

      it("lists it when asked for closed, and not the open ones", async () => {
        const store = await make()
        const open = projectFixture({ projectId: projectIdSchema.parse("prj_open") })
        const shut = projectFixture({ projectId: projectIdSchema.parse("prj_shut") })
        await store.create(open)
        await store.create(shut)
        await store.close(shut.projectId, AT)

        const listed = await store.list({ closed: true })

        expect(listed.ok && listed.value.map((project) => project.projectId)).toEqual([
          shut.projectId,
        ])
      })

      it("lists both when asked for everything", async () => {
        const store = await make()
        const open = projectFixture({ projectId: projectIdSchema.parse("prj_open") })
        const shut = projectFixture({ projectId: projectIdSchema.parse("prj_shut") })
        await store.create(open)
        await store.create(shut)
        await store.close(shut.projectId, AT)

        const listed = await store.list({ closed: "all" })

        expect(listed.ok && listed.value).toHaveLength(2)
      })

      /**
       * The instant must not move. *When did this stop* is the question a
       * closed project is asked, and a second press is not a second stopping.
       */
      it("does not move the instant when it is closed again", async () => {
        const store = await make()
        const project = projectFixture()
        await store.create(project)
        await store.close(project.projectId, AT)

        const again = await store.close(project.projectId, LATER)

        expect(again.ok && again.value.closedAt).toBe(AT)
      })

      it("opens it again, and the stamp goes rather than emptying", async () => {
        const store = await make()
        const project = projectFixture()
        await store.create(project)
        await store.close(project.projectId, AT)

        const reopened = await store.reopen(project.projectId)

        expect(reopened.ok && reopened.value.closedAt).toBeUndefined()

        const listed = await store.list()
        expect(listed.ok && listed.value).toHaveLength(1)
      })

      it("reopens one that was never closed without complaining", async () => {
        const store = await make()
        const project = projectFixture()
        await store.create(project)

        const reopened = await store.reopen(project.projectId)

        expect(reopened.ok && reopened.value.closedAt).toBeUndefined()
      })

      it("says so when there is no such project to close", async () => {
        const store = await make()

        const closed = await store.close(projectIdSchema.parse("prj_nothing"), AT)

        expect(closed.ok).toBe(false)
        expect(!closed.ok && closed.error.code).toBe("not-found")
      })
    })
  })
}
