import { describe, expect, it } from "vitest"

import {
  applicationIdSchema,
  projectIdSchema,
  type Application,
  type Project,
} from "@jam-overture/loom/store"

import { workspaceOf, workspaceTotals, type ApplicationSummary } from "./workspace"

const projectOf = (id: string, name: string): Project => ({
  projectId: projectIdSchema.parse(id),
  name,
  createdAt: "2026-10-12T00:00:00.000Z",
})

const summaryOf = (
  id: string,
  projectId: string,
  over: Partial<Omit<ApplicationSummary, "application">> & { name?: string } = {}
): ApplicationSummary => {
  const application: Application = {
    applicationId: applicationIdSchema.parse(id),
    projectId: projectIdSchema.parse(projectId),
    name: over.name ?? id,
    createdAt: "2026-10-12T00:00:00.000Z",
  }

  return {
    application,
    pages: over.pages ?? 0,
    waiting: over.waiting ?? 0,
    unreadable: over.unreadable ?? 0,
  }
}

describe("the workspace, grouped", () => {
  it("puts each application under its project", () => {
    const workspace = workspaceOf(
      [projectOf("prj_one", "One"), projectOf("prj_two", "Two")],
      [summaryOf("app_a", "prj_one"), summaryOf("app_b", "prj_two")]
    )

    expect(workspace.groups.map((group) => group.applications.map((s) => s.application.applicationId))).toEqual([
      ["app_a"],
      ["app_b"],
    ])
  })

  it("keeps a project with no applications, rather than hiding it", () => {
    const workspace = workspaceOf([projectOf("prj_empty", "Empty")], [])

    expect(workspace.groups).toHaveLength(1)
    expect(workspace.groups[0]?.applications).toEqual([])
  })

  /**
   * The case a screen is most tempted to drop silently, and the one where
   * dropping it means an application you own stops appearing because a row
   * somewhere else is missing.
   */
  it("shows an application whose project is not in the list", () => {
    const workspace = workspaceOf(
      [projectOf("prj_one", "One")],
      [summaryOf("app_a", "prj_one"), summaryOf("app_orphan", "prj_gone")]
    )

    expect(workspace.groups[0]?.applications.map((s) => s.application.applicationId)).toEqual(["app_a"])
    expect(workspace.ungrouped.map((s) => s.application.applicationId)).toEqual(["app_orphan"])
  })

  it("puts what is waiting at the top of its project, not alphabetically", () => {
    const workspace = workspaceOf(
      [projectOf("prj_one", "One")],
      [
        summaryOf("app_a", "prj_one", { name: "Alpha", waiting: 0 }),
        summaryOf("app_z", "prj_one", { name: "Zulu", waiting: 3 }),
        summaryOf("app_m", "prj_one", { name: "Mike", waiting: 1 }),
      ]
    )

    expect(workspace.groups[0]?.applications.map((s) => s.application.name)).toEqual([
      "Zulu",
      "Mike",
      "Alpha",
    ])
  })

  it("falls back to the name when nothing is waiting on either", () => {
    const workspace = workspaceOf(
      [projectOf("prj_one", "One")],
      [
        summaryOf("app_z", "prj_one", { name: "Zulu" }),
        summaryOf("app_a", "prj_one", { name: "Alpha" }),
      ]
    )

    expect(workspace.groups[0]?.applications.map((s) => s.application.name)).toEqual([
      "Alpha",
      "Zulu",
    ])
  })

  it("does not reorder the projects", () => {
    const workspace = workspaceOf(
      [projectOf("prj_z", "Zulu"), projectOf("prj_a", "Alpha")],
      []
    )

    expect(workspace.groups.map((group) => group.project.name)).toEqual(["Zulu", "Alpha"])
  })
})

describe("the totals above the list", () => {
  it("counts every application once, grouped or not", () => {
    const workspace = workspaceOf(
      [projectOf("prj_one", "One")],
      [
        summaryOf("app_a", "prj_one", { pages: 3, waiting: 1 }),
        summaryOf("app_b", "prj_one", { pages: 2, waiting: 0 }),
        summaryOf("app_orphan", "prj_gone", { pages: 4, waiting: 2 }),
      ]
    )

    expect(workspaceTotals(workspace)).toEqual({ applications: 3, waiting: 3, pages: 9 })
  })

  it("is all zeroes on a deployment with nothing in it", () => {
    expect(workspaceTotals(workspaceOf([], []))).toEqual({ applications: 0, waiting: 0, pages: 0 })
  })
})
