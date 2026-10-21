import { describe, expect, it } from "vitest"

import { applicationIdSchema, projectIdSchema, type Application } from "@jam-overture/loom/store"

import { soleApplicationOf } from "./sole-application"

describe("the application a project's key names", () => {
  const project = projectIdSchema.parse("prj_shop")
  const other = projectIdSchema.parse("prj_other")

  const application = (id: string, projectId = project): Application => ({
    applicationId: applicationIdSchema.parse(id),
    projectId,
    name: id,
    createdAt: "2026-10-20T00:00:00.000Z",
  })

  it("is the one inside it", () => {
    const shop = application("app_shop")

    expect(soleApplicationOf([application("app_else", other), shop], project)).toBe(shop)
  })

  it("is nobody's when the project holds none", () => {
    expect(soleApplicationOf([application("app_else", other)], project)).toBeUndefined()
  })

  /** Written before 0296, and which one a key should name is not the listing's to decide. */
  it("is nobody's when the project holds more than one", () => {
    expect(soleApplicationOf([application("app_a"), application("app_b")], project)).toBeUndefined()
  })
})
