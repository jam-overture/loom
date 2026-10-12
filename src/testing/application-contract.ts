import { describe, expect, it } from "vitest"

import { applicationIdSchema, applicationSchema, type Application } from "../application/application.js"
import { DEFAULT_PROJECT_ID } from "../project/project.js"
import type { ApplicationStore } from "../application/store.js"

/**
 * One suite, two implementations.
 *
 * `memoryApplicationStore` calls itself the reference implementation; this is what
 * makes that claim checkable rather than aspirational, on the same terms
 * `store-contract.ts` and `hold-contract.ts` already set. The alternative —
 * each store asserted against its own expectations — is how two stores that
 * disagree both stay green.
 */

export const applicationFixture = (over: Partial<Application> = {}): Application =>
  applicationSchema.parse({
    applicationId: applicationIdSchema.parse("app_fixture"),
    projectId: DEFAULT_PROJECT_ID,
    name: "A fixture",
    createdAt: "2026-10-12T12:00:00.000Z",
    ...over,
  })

export const describeApplicationStoreContract = (
  name: string,
  make: () => Promise<ApplicationStore> | ApplicationStore
): void => {
  describe(`${name} — the project store contract`, () => {
    it("reads back what it recorded", async () => {
      const store = await make()
      const project = applicationFixture({ name: "The bakery" })

      expect(await store.create(project)).toEqual({ ok: true, value: project })
      expect(await store.get(project.applicationId)).toEqual({ ok: true, value: project })
    })

    it("keeps a host when one was given, and omits the key when none was", async () => {
      const store = await make()
      const withHost = applicationFixture({
        applicationId: applicationIdSchema.parse("app_hosted"),
        host: "shop.example.com",
      })
      const without = applicationFixture({ applicationId: applicationIdSchema.parse("app_bare") })

      await store.create(withHost)
      await store.create(without)

      const read = await store.get(withHost.applicationId)
      expect(read.ok && read.value.host).toBe("shop.example.com")

      const bare = await store.get(without.applicationId)
      expect(bare.ok && "host" in bare.value).toBe(false)
    })

    it("refuses an id already taken rather than overwriting the rows under it", async () => {
      const store = await make()
      const first = applicationFixture({ name: "The first" })
      await store.create(first)

      const second = await store.create(applicationFixture({ name: "The second" }))

      expect(second).toEqual({
        ok: false,
        error: { code: "already-exists", applicationId: first.applicationId },
      })
      const read = await store.get(first.applicationId)
      expect(read.ok && read.value.name).toBe("The first")
    })

    it("says not-found rather than returning nothing", async () => {
      const store = await make()
      const missing = applicationIdSchema.parse("app_nobody")

      expect(await store.get(missing)).toEqual({
        ok: false,
        error: { code: "not-found", applicationId: missing },
      })
    })

    it("lists nothing before anything is recorded", async () => {
      const store = await make()

      expect(await store.list()).toEqual({ ok: true, value: [] })
    })

    it("lists oldest first, whatever order they were written in", async () => {
      const store = await make()
      await store.create(
        applicationFixture({
          applicationId: applicationIdSchema.parse("app_third"),
          createdAt: "2026-10-12T14:00:00.000Z",
        })
      )
      await store.create(
        applicationFixture({
          applicationId: applicationIdSchema.parse("app_first"),
          createdAt: "2026-10-12T10:00:00.000Z",
        })
      )
      await store.create(
        applicationFixture({
          applicationId: applicationIdSchema.parse("app_second"),
          createdAt: "2026-10-12T12:00:00.000Z",
        })
      )

      const listed = await store.list()
      expect(listed.ok && listed.value.map((project) => project.applicationId)).toEqual([
        "app_first",
        "app_second",
        "app_third",
      ])
    })

    it("renames without touching anything else", async () => {
      const store = await make()
      const project = applicationFixture({ name: "Before", host: "old.example.com" })
      await store.create(project)

      const renamed = await store.rename(project.applicationId, { name: "After" })

      expect(renamed).toEqual({
        ok: true,
        value: { ...project, name: "After" },
      })
      const read = await store.get(project.applicationId)
      expect(read.ok && read.value.host).toBe("old.example.com")
    })

    it("sets a host on a project that had none", async () => {
      const store = await make()
      const project = applicationFixture()
      await store.create(project)

      const moved = await store.rename(project.applicationId, { host: "shop.example.com" })

      expect(moved.ok && moved.value.host).toBe("shop.example.com")
    })

    it("refuses to rename a project that is not there", async () => {
      const store = await make()
      const missing = applicationIdSchema.parse("app_nobody")

      expect(await store.rename(missing, { name: "Anything" })).toEqual({
        ok: false,
        error: { code: "not-found", applicationId: missing },
      })
    })

    /**
     * The two stores have to agree about what a project is, not merely about
     * what they store. An empty name is the cheapest way to ask: `applicationSchema`
     * refuses it, and a store that spread the change instead of parsing it would
     * accept it here and be refused by the column somewhere else.
     */
    it("refuses a rename the project schema would not accept", async () => {
      const store = await make()
      const project = applicationFixture()
      await store.create(project)

      const refused = await store.rename(project.applicationId, { name: "" })

      expect(refused.ok).toBe(false)
      const read = await store.get(project.applicationId)
      expect(read.ok && read.value.name).toBe(project.name)
    })
  })
}
