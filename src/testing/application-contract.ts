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

    /**
     * The three states of a patch, on the one field that has them.
     *
     * A host is the only thing about an application a person can be given and
     * then want taken away, and until a patch could say so the call that meant
     * *remove it* was the same call that meant *leave it alone* — so a settings
     * screen that emptied the box renamed nothing and reported success. Both
     * stores answer this the same way or neither is trustworthy: one holds a
     * `Map` where a missing key is the absence, the other a column where it is
     * `NULL`.
     */
    it("clears a host on null, leaving an application with none", async () => {
      const store = await make()
      const project = applicationFixture({ host: "old.example.com" })
      await store.create(project)

      const cleared = await store.rename(project.applicationId, { host: null })

      expect(cleared.ok && cleared.value.host).toBeUndefined()
      const read = await store.get(project.applicationId)
      expect(read.ok && read.value.host).toBeUndefined()
    })

    /**
     * A cleared host has to read back as the absence an application that never
     * had one reads back as, rather than as a key holding `undefined`. The two
     * are the same value to a reader and different objects to anything that
     * walks the record — and only one of them is what `applicationSchema`
     * produces.
     */
    it("clears a host to the same absence an application that never had one has", async () => {
      const store = await make()
      const never = applicationFixture({ applicationId: applicationIdSchema.parse("app_never") })
      const cleared = applicationFixture({
        applicationId: applicationIdSchema.parse("app_cleared"),
        host: "old.example.com",
      })
      await store.create(never)
      await store.create(cleared)

      await store.rename(cleared.applicationId, { host: null })

      const left = await store.get(never.applicationId)
      const right = await store.get(cleared.applicationId)
      expect(left.ok && Object.keys(left.value).sort()).toEqual(
        right.ok && Object.keys(right.value).sort()
      )
    })

    it("clears a host that was never there without failing", async () => {
      const store = await make()
      const project = applicationFixture()
      await store.create(project)

      const cleared = await store.rename(project.applicationId, { host: null })

      expect(cleared.ok && cleared.value.host).toBeUndefined()
    })

    it("renames and clears the host in one call", async () => {
      const store = await make()
      const project = applicationFixture({ name: "Before", host: "old.example.com" })
      await store.create(project)

      const renamed = await store.rename(project.applicationId, { name: "After", host: null })

      expect(renamed.ok && renamed.value.name).toBe("After")
      expect(renamed.ok && renamed.value.host).toBeUndefined()
    })

    /**
     * Clearing is `null` and nothing else. An empty string is a value the
     * schema refuses, and a store that accepted it as the absence would be a
     * second spelling of nothing for every later field to disagree about.
     */
    it("refuses an empty host rather than reading it as cleared", async () => {
      const store = await make()
      const project = applicationFixture({ host: "old.example.com" })
      await store.create(project)

      const refused = await store.rename(project.applicationId, { host: "" })

      expect(refused.ok).toBe(false)
      const read = await store.get(project.applicationId)
      expect(read.ok && read.value.host).toBe("old.example.com")
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

    /**
     * ## Closing (0289)
     *
     * The same shape the project store takes, held here too — an application is
     * closed by its own id or by its project closing, and the two must not be
     * able to disagree about what closed means.
     */
    describe("closing", () => {
      const AT = "2026-10-16T09:00:00.000Z"
      const LATER = "2026-10-16T10:00:00.000Z"

      it("stamps when it was closed", async () => {
        const store = await make()
        const application = applicationFixture()
        await store.create(application)

        const closed = await store.close(application.applicationId, AT)

        expect(closed.ok && closed.value.closedAt).toBe(AT)
      })

      it("still answers for it by id", async () => {
        const store = await make()
        const application = applicationFixture()
        await store.create(application)
        await store.close(application.applicationId, AT)

        const read = await store.get(application.applicationId)

        expect(read.ok && read.value.closedAt).toBe(AT)
      })

      it("leaves it out of a listing that did not ask for it", async () => {
        const store = await make()
        const application = applicationFixture()
        await store.create(application)
        await store.close(application.applicationId, AT)

        const listed = await store.list()

        expect(listed.ok && listed.value).toEqual([])
      })

      it("does not move the instant when it is closed again", async () => {
        const store = await make()
        const application = applicationFixture()
        await store.create(application)
        await store.close(application.applicationId, AT)

        const again = await store.close(application.applicationId, LATER)

        expect(again.ok && again.value.closedAt).toBe(AT)
      })

      /**
       * A closed application keeps its host. Closing says it has stopped, not
       * that it was never anywhere — and the host is what a person needs to
       * recognise it by when they come looking for it to reopen.
       */
      it("keeps the rest of the row exactly as it was", async () => {
        const store = await make()
        const application = applicationFixture({ host: "shop.example.com" })
        await store.create(application)

        const closed = await store.close(application.applicationId, AT)

        expect(closed.ok && closed.value.host).toBe("shop.example.com")
        expect(closed.ok && closed.value.name).toBe(application.name)
      })

      it("opens it again, and the stamp goes rather than emptying", async () => {
        const store = await make()
        const application = applicationFixture()
        await store.create(application)
        await store.close(application.applicationId, AT)

        const reopened = await store.reopen(application.applicationId)

        expect(reopened.ok && reopened.value.closedAt).toBeUndefined()
      })

      it("says so when there is no such application to close", async () => {
        const store = await make()

        const closed = await store.close(applicationIdSchema.parse("app_nothing"), AT)

        expect(closed.ok).toBe(false)
        expect(!closed.ok && closed.error.code).toBe("not-found")
      })
    })
  })
}
