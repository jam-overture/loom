import { describe, expect, it } from "vitest"

import type { Role } from "./auth/roles"
import { answerWaitingCount, waitingCountBody, waitingCountOf } from "./waiting-count"

describe("the count of what waits for review", () => {
  it("reads back the count it was sent", () => {
    expect(waitingCountOf(waitingCountBody(3))).toBe(3)
    expect(waitingCountOf(waitingCountBody(0))).toBe(0)
  })

  it("is no count where the changes could not be read, never a nought", () => {
    expect(waitingCountBody(undefined)).toEqual({ waiting: null })
    expect(waitingCountOf(waitingCountBody(undefined))).toBeUndefined()
  })

  it("is no count for anything that is not an answer", () => {
    expect(waitingCountOf(null)).toBeUndefined()
    expect(waitingCountOf("<!doctype html>")).toBeUndefined()
    expect(waitingCountOf({ waiting: -1 })).toBeUndefined()
    expect(waitingCountOf({ waiting: 1.5 })).toBeUndefined()
    expect(waitingCountOf({})).toBeUndefined()
  })
})

describe("answering the rail", () => {
  const sources = (
    overrides: Partial<{
      actor: string | null
      role: Role | null | undefined
      waiting: number | undefined
    }> = {}
  ) => {
    const given = {
      actor: "reviewer@example.com",
      role: "viewer" as Role | null | undefined,
      waiting: 2,
      ...overrides,
    }
    const read: string[] = []

    return {
      read,
      answer: answerWaitingCount({
        currentActor: () => Promise.resolve(given.actor),
        roleOf: () => Promise.resolve(given.role),
        readWaitingCount: (projectId) => {
          read.push(projectId)
          return Promise.resolve(given.waiting)
        },
      }),
    }
  }

  it("tells any member of the project how many wait, and is never kept", async () => {
    const { answer, read } = sources()
    const response = await answer("prj_shop")

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(await response.json()).toEqual({ waiting: 2 })
    expect(read).toEqual(["prj_shop"])
  })

  it("says no count where what waits could not be read", async () => {
    const { answer } = sources({ waiting: undefined })

    expect(await (await answer("prj_shop")).json()).toEqual({ waiting: null })
  })

  it("reads nothing for somebody signed out", async () => {
    const { answer, read } = sources({ actor: null })
    const response = await answer("prj_shop")

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ waiting: null })
    expect(read).toEqual([])
  })

  it("answers a project that is not theirs as one that does not exist", async () => {
    const notTheirs = sources({ role: null })
    const noSuch = sources()

    expect([
      (await notTheirs.answer("prj_shop")).status,
      (await noSuch.answer("not a project")).status,
    ]).toEqual([404, 404])
    expect([...notTheirs.read, ...noSuch.read]).toEqual([])
  })

  it("reads nothing where it could not tell what the person may see", async () => {
    const { answer, read } = sources({ role: undefined })

    expect((await answer("prj_shop")).status).toBe(503)
    expect(read).toEqual([])
  })
})
