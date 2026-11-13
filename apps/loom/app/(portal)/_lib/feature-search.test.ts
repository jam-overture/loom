import { describe, expect, it } from "vitest"

import {
  FEATURES,
  MOST_FOUND,
  featureHref,
  findFeatures,
  movedTo,
  queryWordsOf,
  searchAnswer,
  wordsOf,
  type Feature,
} from "./feature-search"
import { portalScreens, screenSource } from "./screen-source"

const names = (features: readonly Feature[]) => features.map((feature) => feature.name)
const first = (query: string) => findFeatures(query)[0]?.name

describe("the words of what a person typed", () => {
  it("are compared without case, accents, punctuation or a plural s", () => {
    expect(wordsOf("GOÄLS, Settings!")).toEqual(["goal", "setting"])
    expect(wordsOf("press  sign-ins pages")).toEqual(["press", "sign", "ins", "page"])
  })

  it("leave out the words that only make it a question", () => {
    expect(queryWordsOf("where do I set my API key?")).toEqual(["set", "api", "key"])
    expect(queryWordsOf("how do I")).toEqual([])
  })
})

describe("what the search finds", () => {
  it("finds a screen by its name, typed whole or begun", () => {
    expect(first("goals")).toBe("Goals")
    expect(first("goa")).toBe("Goals")
    expect(first("For review")).toBe("For review")
    expect(first("connect")).toBe("Connect your site")
  })

  it("finds a feature by the words a person would use for it rather than its name", () => {
    expect(first("anthropic")).toBe("Model key")
    expect(first("where do I set my api key")).toBe("Model key")
    expect(first("snippet")).toBe("Paste this into your site")
    expect(first("delete project")).toBe("Close this project")
    expect(first("rejected")).toBe("Turned down")
    expect(first("install")).toBe("Connect your site")
    expect(first("rename")).toBe("Settings")
  })

  it("narrows with every word typed, as each screen's own Find does", () => {
    expect(names(findFeatures("key"))).toEqual(
      expect.arrayContaining(["The key", "Model key", "Publish your pages"])
    )
    expect(names(findFeatures("publish key"))).toEqual(["Publish your pages"])
    expect(findFeatures("goals zebra")).toEqual([])
  })

  it("puts a name typed out whole before one that only shares a word with it", () => {
    expect(names(findFeatures("new goal")).slice(0, 1)).toEqual(["New goal"])
    expect(names(findFeatures("new project")).slice(0, 1)).toEqual(["New project"])
  })

  it("finds nothing for nothing typed, rather than everything", () => {
    expect(findFeatures("")).toEqual([])
    expect(findFeatures("   ")).toEqual([])
    expect(findFeatures("where is the")).toEqual([])
  })

  it("finds no data: a page's name or a reader's event is each screen's own Find", () => {
    expect(findFeatures("prj_shop")).toEqual([])
    expect(findFeatures("checkout button")).toEqual([])
  })
})

describe("where an answer takes a person", () => {
  const goals = FEATURES.find((feature) => feature.name === "Goals")!
  const projects = FEATURES.find((feature) => feature.name === "Projects")!

  it("is the project in the address for a project's feature, and nowhere without one", () => {
    expect(featureHref(goals, "prj_shop")).toBe("/portal/prj_shop/goals")
    expect(featureHref(goals, undefined)).toBeUndefined()
    expect(featureHref(projects, "prj_shop")).toBe("/portal")
  })

  it("counts a project's features outside a project instead of drawing links with nowhere to go", () => {
    expect(searchAnswer("goal", undefined)).toEqual({ found: [], inAProject: 3 })
    expect(searchAnswer("project", undefined).found.map(({ href }) => href)).toEqual([
      "/portal",
      "/portal/new",
    ])
    expect(searchAnswer("goal", "prj_shop")).toEqual({
      found: [
        { feature: expect.objectContaining({ name: "Goals" }), href: "/portal/prj_shop/goals" },
        {
          feature: expect.objectContaining({ name: "New goal" }),
          href: "/portal/prj_shop/goals?goal=new",
        },
        {
          feature: expect.objectContaining({ name: "By page" }),
          href: "/portal/prj_shop/signals/pages",
        },
      ],
      inAProject: 0,
    })
  })

  it("draws at most a glance's worth of answers", () => {
    expect(findFeatures("page").length).toBeGreaterThan(MOST_FOUND)
    expect(searchAnswer("page", "prj_shop").found).toHaveLength(MOST_FOUND)
  })
})

/**
 * The index is written by hand, so it is held against the portal as it is: a
 * feature whose screen was moved, or whose section lost its anchor, would be a
 * search answer that leads nowhere, which is the bug `destinations.test.ts`
 * exists for and cannot see here, since these addresses are not `href=` literals.
 */
describe("every feature in the index", () => {
  const routes = portalScreens()
  const servedBy = (path: string) =>
    routes.find(({ route }) =>
      new RegExp(`^${route.replace(/\[[^\]]+\]/gu, "[^/]+")}$`, "u").test(path)
    )

  it.each(FEATURES.map((feature) => [feature.name, feature] as const))(
    "%s is a screen the portal serves, at a place on it that exists",
    (_name, feature) => {
      const href = featureHref(feature, "prj_shop")!
      const [address, anchor] = href.split("#")
      const path = (address ?? "").split("?")[0] ?? ""
      const screen = servedBy(path)

      expect(screen).toBeDefined()

      if (anchor !== undefined) {
        expect(screenSource(screen!.file)).toContain(`id="${anchor}"`)
      }
    }
  )

  it("names the place as it is headed where it is drawn", () => {
    const named = FEATURES.filter(
      (feature) => feature.on !== undefined && feature.path.includes("#")
    )

    expect(named.length).toBeGreaterThan(3)
    named.forEach((feature) => {
      const path = featureHref(feature, "prj_shop")!.split("#")[0] ?? ""
      expect(screenSource(servedBy(path)!.file)).toContain(feature.name)
    })
  })

  it("is one place, once", () => {
    const hrefs = FEATURES.map((feature) => `${feature.name} ${feature.path}`)

    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})

describe("moving through the answers with the arrow keys", () => {
  it("starts at the first going down and the last going up", () => {
    expect(movedTo(undefined, 3, "down")).toBe(0)
    expect(movedTo(undefined, 3, "up")).toBe(2)
  })

  it("wraps round at either end", () => {
    expect(movedTo(2, 3, "down")).toBe(0)
    expect(movedTo(0, 3, "up")).toBe(2)
    expect(movedTo(1, 3, "down")).toBe(2)
  })

  it("marks nothing where there is nothing", () => {
    expect(movedTo(undefined, 0, "down")).toBeUndefined()
    expect(movedTo(4, 0, "up")).toBeUndefined()
  })
})
