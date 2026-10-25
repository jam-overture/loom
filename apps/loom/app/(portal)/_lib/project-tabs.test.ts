import { describe, expect, it } from "vitest"

import { isNavItemActive } from "./nav"
import { projectHome, projectTabs } from "./project-tabs"

describe("a project's tabs", () => {
  const tabs = projectTabs("prj_shop")

  it("names every screen a project has, under that project", () => {
    expect(tabs.map((tab) => tab.href)).toEqual([
      "/portal/prj_shop/signals",
      "/portal/prj_shop/pages",
      "/portal/prj_shop/connect",
      "/portal/prj_shop/settings",
    ])
  })

  it("lands a person on one of its own tabs", () => {
    expect(tabs.map((tab) => tab.href)).toContain(projectHome("prj_shop"))
  })

  /** One tab lit on each screen, or the row is saying *you are in two places*. */
  it("lights exactly one tab on each of its screens", () => {
    for (const tab of tabs) {
      expect(tabs.filter((other) => isNavItemActive(tab.href, other.href, other.exact))).toEqual([
        tab,
      ])
    }
  })
})
