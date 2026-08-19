import { describe, expect, it } from "vitest"

import {
  isServerActionModule,
  serverActionExports,
  stubServerActionModule,
} from "./server-action-stub"

const ACTION_MODULE = `"use server"

import { z } from "zod"

export type UndoReport = { readonly tone: string }

export const undoRevision = async (): Promise<void> => {}
export async function endSession(): Promise<void> {}
export function tally(): number {
  return z.number().parse(1)
}
`

describe("isServerActionModule", () => {
  it("recognises the directive that opens the module", () => {
    expect(isServerActionModule(ACTION_MODULE)).toBe(true)
    expect(isServerActionModule(`'use server'\nexport const a = 1`)).toBe(true)
  })

  it("looks past the comments and blank lines a directive may sit under", () => {
    expect(isServerActionModule(`// actions for /history\n\n"use server"\n`)).toBe(true)
    expect(isServerActionModule(`/* actions */\n"use server"\n`)).toBe(true)
  })

  it("leaves every other module alone", () => {
    expect(isServerActionModule(`"use client"\nexport const a = 1`)).toBe(false)
    expect(isServerActionModule(`export const a = 1`)).toBe(false)
  })

  it("does not mistake a mention of the directive for the directive", () => {
    expect(isServerActionModule(`export const doc = '"use server" marks an action'`)).toBe(false)
  })
})

describe("serverActionExports", () => {
  it("names every value export, in each form the actions are written in", () => {
    expect(serverActionExports(ACTION_MODULE)).toEqual(["undoRevision", "endSession", "tally"])
  })

  it("does not name a type export, which has nothing to stand in for", () => {
    expect(serverActionExports(`export type SignInReport = { readonly tone: string }`)).toEqual([])
    expect(serverActionExports(`export interface Report { tone: string }`)).toEqual([])
  })

  it("does not name something that is exported inside a string or a nested scope", () => {
    expect(serverActionExports(`const help = "export const nope = 1"`)).toEqual([])
    expect(serverActionExports(`const wrap = () => {\n  export const nope = 1\n}`)).toEqual([])
  })
})

describe("stubServerActionModule", () => {
  it("returns nothing for a module that is not a server action, so it transforms as usual", () => {
    expect(stubServerActionModule(`export const a = 1`)).toBeUndefined()
  })

  it("replaces the module with one handle per value export and no imports", () => {
    const stub = stubServerActionModule(ACTION_MODULE)

    expect(stub).toBeDefined()
    expect(stub).toContain("export const undoRevision")
    expect(stub).toContain("export const endSession")
    expect(stub).not.toContain("zod")
    expect(stub).not.toContain("UndoReport")
  })

  it("makes a handle that refuses when called, naming itself", async () => {
    const stub = stubServerActionModule(ACTION_MODULE) ?? ""
    const module: { undoRevision: () => void } = await import(
      `data:text/javascript,${encodeURIComponent(stub)}`
    )

    expect(module.undoRevision).toBeTypeOf("function")
    expect(() => module.undoRevision()).toThrowError(/undoRevision is a server action/)
  })
})
