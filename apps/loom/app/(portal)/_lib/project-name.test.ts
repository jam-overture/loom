import { describe, expect, it } from "vitest"

import type { Role } from "./auth/roles"
import {
  answerProjectName,
  projectInAddress,
  projectNameBody,
  projectNameHref,
  projectNameOf,
} from "./project-name"

describe("the name of the project in the address", () => {
  it("reads back the name it was sent", () => {
    expect(projectNameOf(projectNameBody("Shop"))).toBe("Shop")
  })

  it("is no name where the project could not be read, never an empty one", () => {
    expect(projectNameBody(undefined)).toEqual({ name: null })
    expect(projectNameOf(projectNameBody(undefined))).toBeUndefined()
  })

  it("is no name for anything that is not an answer", () => {
    expect(projectNameOf(null)).toBeUndefined()
    expect(projectNameOf("<!doctype html>")).toBeUndefined()
    expect(projectNameOf({ name: "" })).toBeUndefined()
    expect(projectNameOf({ name: 3 })).toBeUndefined()
    expect(projectNameOf({})).toBeUndefined()
  })
})

describe("the project an address is inside", () => {
  it("is the project a screen of it is about", () => {
    expect(projectInAddress("/portal/prj_shop")).toBe("prj_shop")
    expect(projectInAddress("/portal/prj_shop/review/accepted")).toBe("prj_shop")
  })

  it("is none for an address that is not a project's", () => {
    expect(projectInAddress("/portal")).toBeUndefined()
    expect(projectInAddress("/portal/preview/shop")).toBeUndefined()
    expect(projectInAddress("/portal/sign-in")).toBeUndefined()
    expect(projectInAddress("/docs/prj_shop")).toBeUndefined()
    expect(projectInAddress(null)).toBeUndefined()
  })

  it("asks the project's own read for its name", () => {
    const projectId = projectInAddress("/portal/prj_shop/signals")

    expect(projectId === undefined ? undefined : projectNameHref(projectId)).toBe(
      "/portal/prj_shop/name"
    )
  })
})

describe("answering the top bar", () => {
  const sources = (
    overrides: Partial<{
      actor: string | null
      role: Role | null | undefined
      name: string | undefined
    }> = {}
  ) => {
    const given = {
      actor: "reviewer@example.com",
      role: "viewer" as Role | null | undefined,
      name: "Shop" as string | undefined,
      ...overrides,
    }
    const read: string[] = []

    return {
      read,
      answer: answerProjectName({
        currentActor: () => Promise.resolve(given.actor),
        roleOf: () => Promise.resolve(given.role),
        readProjectName: (projectId) => {
          read.push(projectId)
          return Promise.resolve(given.name)
        },
      }),
    }
  }

  it("tells any member of the project its name, and is never kept", async () => {
    const { answer, read } = sources()
    const response = await answer("prj_shop")

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(await response.json()).toEqual({ name: "Shop" })
    expect(read).toEqual(["prj_shop"])
  })

  it("says no name where the project could not be read", async () => {
    const { answer } = sources({ name: undefined })

    expect(await (await answer("prj_shop")).json()).toEqual({ name: null })
  })

  it("reads nothing for somebody signed out", async () => {
    const { answer, read } = sources({ actor: null })
    const response = await answer("prj_shop")

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ name: null })
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
