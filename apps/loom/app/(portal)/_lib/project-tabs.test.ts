import { describe, expect, it } from "vitest"

import { isNavItemActive } from "./nav"
import { projectHome, projectTabs, waitingCountHref } from "./project-tabs"

describe("a project's rail", () => {
  const tabs = projectTabs("prj_shop")

  it("names every screen a project has, under that project, in the wireframes' order", () => {
    expect(tabs.map((tab) => tab.href)).toEqual([
      "/portal/prj_shop/signals",
      "/portal/prj_shop/review",
      "/portal/prj_shop/pages",
      "/portal/prj_shop/goals",
      "/portal/prj_shop/connect",
      "/portal/prj_shop/settings",
    ])
  })

  it("puts the screens that set the project up after the ones a person works in", () => {
    expect(tabs.map((tab) => tab.group)).toEqual(["work", "work", "work", "work", "setup", "setup"])
  })

  it("counts what waits on For review and nowhere else", () => {
    expect(tabs.filter((tab) => tab.counts === "waiting").map((tab) => tab.label)).toEqual([
      "For review",
    ])
  })

  it("asks for the count under the project's own For review", () => {
    expect(waitingCountHref("prj_shop")).toBe("/portal/prj_shop/review/waiting")
  })

  it("lands a person on one of its own tabs", () => {
    expect(tabs.map((tab) => tab.href)).toContain(projectHome("prj_shop"))
  })

  /** One tab lit on each screen, or the rail is saying *you are in two places*. */
  it("lights exactly one tab on each of its screens", () => {
    for (const tab of tabs) {
      expect(tabs.filter((other) => isNavItemActive(tab.href, other.href, other.exact))).toEqual([
        tab,
      ])
    }
  })
})
