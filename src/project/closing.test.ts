import { describe, expect, it } from "vitest"

import { applicationIdSchema } from "../application/application.js"
import { memoryApplicationStore } from "../application/memory.js"
import type { ApplicationStore } from "../application/store.js"
import { applicationFixture } from "../testing/application-contract.js"
import { projectFixture } from "../testing/project-contract.js"

import { closeProject } from "./closing.js"
import { memoryProjectStore } from "./memory.js"
import { projectIdSchema } from "./project.js"

/**
 * The cascade, which is the half of closing that a delete would have got for
 * free and this has to do on purpose (0289).
 *
 * Against the memory stores, because what is under test is the **order and the
 * failure handling** rather than any SQL: which row is written first, what is
 * left behind when the second write refuses, and whether running it again
 * finishes the job.
 */

const AT = "2026-10-16T09:00:00.000Z"
const LATER = "2026-10-16T10:00:00.000Z"

const MINE = projectIdSchema.parse("prj_mine")
const OTHER = projectIdSchema.parse("prj_other")

const inProject = (id: string, projectId: string) =>
  applicationFixture({
    applicationId: applicationIdSchema.parse(id),
    projectId: projectIdSchema.parse(projectId),
  })

const stores = async () => {
  const projects = memoryProjectStore()
  const applications = memoryApplicationStore()

  await projects.create(projectFixture({ projectId: MINE }))
  await projects.create(projectFixture({ projectId: OTHER }))
  await applications.create(inProject("app_one", MINE))
  await applications.create(inProject("app_two", MINE))
  await applications.create(inProject("app_elsewhere", OTHER))

  return { projects, applications }
}

describe("closeProject", () => {
  it("closes the project", async () => {
    const { projects, applications } = await stores()

    expect(await closeProject(projects, applications, MINE, AT)).toEqual({
      ok: true,
      value: undefined,
    })

    const read = await projects.get(MINE)
    expect(read.ok && read.value.closedAt).toBe(AT)
  })

  it("closes the applications in it", async () => {
    const { projects, applications } = await stores()
    await closeProject(projects, applications, MINE, AT)

    const open = await applications.list()

    expect(open.ok && open.value.map((application) => application.applicationId)).toEqual([
      applicationIdSchema.parse("app_elsewhere"),
    ])
  })

  /**
   * The failure a cascade invites: closing everything rather than everything
   * *in this project*. It is invisible on the screen that did it — your project
   * closed, which is what you asked for — and it stops somebody else's
   * collection.
   */
  it("leaves another project's applications alone", async () => {
    const { projects, applications } = await stores()
    await closeProject(projects, applications, MINE, AT)

    const elsewhere = await applications.get(applicationIdSchema.parse("app_elsewhere"))

    expect(elsewhere.ok && elsewhere.value.closedAt).toBeUndefined()

    const other = await projects.get(OTHER)
    expect(other.ok && other.value.closedAt).toBeUndefined()
  })

  it("stamps the project and its applications with the same instant", async () => {
    const { projects, applications } = await stores()
    await closeProject(projects, applications, MINE, AT)

    const [project, one] = await Promise.all([
      projects.get(MINE),
      applications.get(applicationIdSchema.parse("app_one")),
    ])

    expect(project.ok && project.value.closedAt).toBe(AT)
    expect(one.ok && one.value.closedAt).toBe(AT)
  })

  it("says so when there is no such project", async () => {
    const { projects, applications } = await stores()

    const closed = await closeProject(
      projects,
      applications,
      projectIdSchema.parse("prj_nothing"),
      AT
    )

    expect(closed.ok).toBe(false)
    expect(!closed.ok && closed.error.code).toBe("not-found")
  })

  /**
   * **The project stays closed when an application refuses.**
   *
   * Rolling it back open would make the failure invisible and leave somebody
   * believing their project is collecting when most of it has stopped. The
   * state is reported and is recoverable by running it again, which is what
   * the next test holds.
   */
  it("reports a partial close and leaves the project closed", async () => {
    const { projects, applications } = await stores()

    const refusing: ApplicationStore = {
      ...applications,
      close: async (applicationId, at) =>
        applicationId === applicationIdSchema.parse("app_two")
          ? { ok: false, error: { code: "unavailable", detail: "the write failed" } }
          : applications.close(applicationId, at),
    }

    const closed = await closeProject(projects, refusing, MINE, AT)

    expect(closed.ok).toBe(false)
    expect(!closed.ok && closed.error.code).toBe("partly-closed")

    const project = await projects.get(MINE)
    expect(project.ok && project.value.closedAt).toBe(AT)
  })

  it("finishes the job when it is run again", async () => {
    const { projects, applications } = await stores()
    let refuse = true

    const sometimes: ApplicationStore = {
      ...applications,
      close: async (applicationId, at) =>
        refuse && applicationId === applicationIdSchema.parse("app_two")
          ? { ok: false, error: { code: "unavailable", detail: "the write failed" } }
          : applications.close(applicationId, at),
    }

    await closeProject(projects, sometimes, MINE, AT)
    refuse = false

    expect(await closeProject(projects, sometimes, MINE, LATER)).toEqual({
      ok: true,
      value: undefined,
    })

    /**
     * The second run closes what was left at the later instant and **does not
     * move** what already closed, which is `close` being idempotent rather than
     * this function remembering anything.
     */
    const [one, two, project] = await Promise.all([
      applications.get(applicationIdSchema.parse("app_one")),
      applications.get(applicationIdSchema.parse("app_two")),
      projects.get(MINE),
    ])

    expect(one.ok && one.value.closedAt).toBe(AT)
    expect(two.ok && two.value.closedAt).toBe(LATER)
    expect(project.ok && project.value.closedAt).toBe(AT)
  })

  /**
   * An application that closed between the project closing and the listing
   * being read. The listing asks for everything rather than the open ones, so
   * there is no row the cascade can walk past.
   */
  it("closes an application that was already closed without moving its instant", async () => {
    const { projects, applications } = await stores()
    await applications.close(applicationIdSchema.parse("app_one"), AT)

    await closeProject(projects, applications, MINE, LATER)

    const one = await applications.get(applicationIdSchema.parse("app_one"))

    expect(one.ok && one.value.closedAt).toBe(AT)
  })
})
