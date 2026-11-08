import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

import type { Role } from "@/app/(portal)/_lib/auth/roles"

const held: {
  actor: string | null
  role: Role | null | undefined
  waiting: number | undefined
  read: string[]
} = { actor: null, role: undefined, waiting: undefined, read: [] }

/**
 * The route with the session and the store stubbed, imported fresh so the stubs
 * replace modules no earlier file in the worker has loaded.
 */
const ask = async (project: string): Promise<Response> => {
  vi.resetModules()
  vi.doMock("@/app/(portal)/_lib/auth/identity", () => ({
    currentActor: () => Promise.resolve(held.actor),
    roleOf: () => Promise.resolve(held.role),
  }))
  vi.doMock("@/app/(portal)/_lib/review-reading", () => ({
    readWaitingCount: (projectId: string) => {
      held.read.push(projectId)
      return Promise.resolve(held.waiting)
    },
  }))

  const { GET } = await import("./route")

  return GET(new Request(`http://localhost/portal/${project}/review/waiting`), {
    params: Promise.resolve({ project }),
  })
}

describe("how many changes wait, for the rail", () => {
  beforeEach(() => {
    held.actor = "reviewer@example.com"
    held.role = "viewer"
    held.waiting = 2
    held.read = []
  })

  afterAll(() => {
    vi.doUnmock("@/app/(portal)/_lib/auth/identity")
    vi.doUnmock("@/app/(portal)/_lib/review-reading")
    vi.resetModules()
  })

  it("tells any member of the project how many wait, and is never kept", async () => {
    const answer = await ask("prj_shop")

    expect(answer.status).toBe(200)
    expect(answer.headers.get("Cache-Control")).toBe("no-store")
    expect(await answer.json()).toEqual({ waiting: 2 })
    expect(held.read).toEqual(["prj_shop"])
  })

  it("says no count where what waits could not be read", async () => {
    held.waiting = undefined

    expect(await (await ask("prj_shop")).json()).toEqual({ waiting: null })
  })

  it("reads nothing for somebody signed out", async () => {
    held.actor = null

    const answer = await ask("prj_shop")

    expect(answer.status).toBe(401)
    expect(await answer.json()).toEqual({ waiting: null })
    expect(held.read).toEqual([])
  })

  it("answers a project that is not theirs as one that does not exist", async () => {
    held.role = null

    const notTheirs = await ask("prj_shop")
    const noSuch = await ask("not a project")

    expect([notTheirs.status, noSuch.status]).toEqual([404, 404])
    expect(held.read).toEqual([])
  })

  it("reads nothing where it could not tell what the person may see", async () => {
    held.role = undefined

    const answer = await ask("prj_shop")

    expect(answer.status).toBe(503)
    expect(held.read).toEqual([])
  })
})
