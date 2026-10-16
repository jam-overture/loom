import { describe, expect, it } from "vitest"

import {
  applicationIdSchema,
  projectIdSchema,
  type Application,
  type Project,
} from "@jam-overture/loom/store"

import { actorSchema } from "./auth/accounts"
import type { Membership, Role } from "./auth/roles"
import { workspaceFor, workspaceOf, workspaceTotals, type ApplicationSummary } from "./workspace"

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

const ANA = actorSchema.parse("ana@example.com")

const holds = (projectId: string, role: Role): Membership => ({
  actor: ANA,
  projectId: projectIdSchema.parse(projectId),
  role,
})

/**
 * The scoped workspace — what one person has, rather than what the deployment
 * holds.
 *
 * The failure these guard is the one 0285 exists to prevent arriving on a
 * screen: somebody seeing a project they were never added to. It is invisible
 * when it happens, because a workspace with an extra card on it looks exactly
 * like a workspace.
 */
describe("workspaceFor", () => {
  it("shows a project the actor holds a role in", () => {
    const workspace = workspaceFor(
      [holds("prj_a", "owner")],
      [projectOf("prj_a", "Alpha")],
      [summaryOf("app_1", "prj_a")]
    )

    expect(workspace.groups).toHaveLength(1)
    expect(workspace.groups[0]?.project.name).toBe("Alpha")
    expect(workspace.groups[0]?.applications).toHaveLength(1)
  })

  it("leaves out a project the actor holds no role in", () => {
    const workspace = workspaceFor(
      [holds("prj_a", "owner")],
      [projectOf("prj_a", "Alpha"), projectOf("prj_b", "Beta")],
      [summaryOf("app_1", "prj_a"), summaryOf("app_2", "prj_b")]
    )

    expect(workspace.groups.map((group) => group.project.name)).toEqual(["Alpha"])
  })

  /**
   * The half that is easy to get wrong: filtering the projects and forgetting
   * the applications would put another project's application on your screen
   * under no heading at all.
   */
  it("leaves out the applications of a project it left out", () => {
    const workspace = workspaceFor(
      [holds("prj_a", "owner")],
      [projectOf("prj_a", "Alpha"), projectOf("prj_b", "Beta")],
      [summaryOf("app_2", "prj_b")]
    )

    expect(workspace.groups[0]?.applications).toEqual([])
    expect(workspace.ungrouped).toEqual([])
  })

  /**
   * `workspaceOf` reports orphans so a deployment-wide view cannot silently
   * drop one. Here the same list would be every application whose project row
   * is missing, shown to everybody — so it is empty by construction.
   */
  it("never shows an orphaned application to somebody who holds no role in it", () => {
    const workspace = workspaceFor(
      [holds("prj_a", "owner")],
      [projectOf("prj_a", "Alpha")],
      [summaryOf("app_lost", "prj_gone")]
    )

    expect(workspace.ungrouped).toEqual([])
    expect(workspace.groups[0]?.applications).toEqual([])
  })

  it("carries the role, so a card can say who can release what", () => {
    const workspace = workspaceFor(
      [holds("prj_a", "viewer"), holds("prj_b", "approver")],
      [projectOf("prj_a", "Alpha"), projectOf("prj_b", "Beta")],
      []
    )

    expect(workspace.groups.map((group) => group.role)).toEqual(["viewer", "approver"])
  })

  it("shows nothing to an actor who holds nothing", () => {
    const workspace = workspaceFor([], [projectOf("prj_a", "Alpha")], [summaryOf("app_1", "prj_a")])

    expect(workspace.groups).toEqual([])
    expect(workspace.ungrouped).toEqual([])
  })

  /**
   * A membership naming a project the store does not have. It cannot put a
   * card on the screen, because there is no project to draw — and it must not
   * throw, because a row somewhere else being missing is not a reason for
   * somebody's whole workspace to fail.
   */
  it("survives a membership whose project is not in the store", () => {
    const workspace = workspaceFor([holds("prj_gone", "owner")], [projectOf("prj_a", "Alpha")], [])

    expect(workspace.groups).toEqual([])
  })
})
