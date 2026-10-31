import { describe, expect, it } from "vitest"

import { ARRIVAL_ROUTE } from "../arrival/route"

import { pagesWithFences } from "./extract"
import { arrivalAt, LANDINGS, landingFaults, landingsOn, landings, type Landing } from "./landing"

/**
 * **A reader does not start at the top of the page.**
 *
 * `landing.ts` says why: this site hands out fragments of its own pages — the
 * search box's results are headings, its code band exists so that a block can
 * be found by a name in it, the contents rail links to every section, and the
 * arrival route anchors each step on the heading where its promised name is
 * first mentioned. The rule *the page shows the import*, which 29 October made
 * true, is only true for somebody who arrived at the top.
 *
 * The first `it` below is the one that was red: fifteen places a reader could be
 * sent to and meet a call whose only import was above where they landed.
 */

const landing = (over: Partial<Landing> = {}): Landing => ({
  section: "getting-started",
  page: "rendering-a-tree",
  door: {
    name: "renderLoomTree",
    specifier: "@jam-overture/loom/react",
    isType: false,
    form: "named",
  },
  anchor: "it-always-returns-an-element",
  heading: "It always returns an element",
  callsAt: 45,
  shownAt: undefined,
  ...over,
})

describe("the door a reader can see from where they landed", () => {
  it("has something to check, so this file cannot pass by having nothing to say", () => {
    expect(pagesWithFences().length).toBeGreaterThan(10)
    expect(LANDINGS.length).toBeGreaterThan(0)
  })

  it("shows a block's doors in the section the block is in", () => {
    expect(landingFaults(LANDINGS)).toEqual([])
  })

  /*
   * The route is the one caller that can name the anchor in advance, and what
   * makes this worth stating separately from the rule above is the promise: a
   * step says a reader will have typed a name, and sends them to a heading
   * part-way down a page to do it. Four of the six stops anchor on a heading
   * rather than on the page's top, so four of them are reading a fragment.
   */
  it("shows the import where the arrival route sets a reader down", () => {
    ARRIVAL_ROUTE.forEach((step) => {
      const [section = "", page = ""] = step.href.replace("/docs/", "").split("/")
      const [, anchor = ""] = step.checkpointHref.split("#")

      const { callsAt, shownAt } = arrivalAt(section, page, anchor, step.checkpoint)

      if (callsAt === undefined) return

      expect(
        shownAt !== undefined && shownAt <= callsAt,
        `${step.checkpointHref} sets a reader down above the block at line ${callsAt}, which calls ` +
          `${step.checkpoint}, and that section never shows them the import`
      ).toBe(true)
    })
  })

  it("asks the question of at least one route stop, rather than returning early for all six", () => {
    const asked = ARRIVAL_ROUTE.filter((step) => {
      const [section = "", page = ""] = step.href.replace("/docs/", "").split("/")
      const [, anchor = ""] = step.checkpointHref.split("#")

      return arrivalAt(section, page, anchor, step.checkpoint).callsAt !== undefined
    })

    expect(asked.length).toBeGreaterThan(0)
  })
})

describe("the sentence a fault says", () => {
  it("names the address a reader was sent to, because that is what went wrong", () => {
    expect(landingFaults([landing()])[0]).toContain(
      "/docs/getting-started/rendering-a-tree#it-always-returns-an-element"
    )
  })

  it("names the section in the page's own words, and the line of the block", () => {
    const fault = landingFaults([landing()])[0] ?? ""

    expect(fault).toContain('"It always returns an element"')
    expect(fault).toContain("line 45")
  })

  it("prints the line a reader would have to write, in the form that works", () => {
    expect(landingFaults([landing()])[0]).toContain(
      'import { renderLoomTree } from "@jam-overture/loom/react"'
    )
  })

  /*
   * The form is carried rather than assumed for this: `import { postgres } from
   * "postgres"` is not a line that works, so a fault telling somebody to write
   * it would be sending them somewhere worse than where they started.
   */
  it("does not put braces round a default import", () => {
    const fault =
      landingFaults([
        landing({ door: { name: "postgres", specifier: "postgres", isType: false, form: "default" } }),
      ])[0] ?? ""

    expect(fault).toContain('import postgres from "postgres"')
    expect(fault).not.toContain("{ postgres }")
  })

  it("says `import type` for a type, which is how a reader has to write it back", () => {
    expect(
      landingFaults([
        landing({
          door: { name: "ResolvedTheme", specifier: "@jam-overture/loom", isType: true, form: "named" },
        }),
      ])[0]
    ).toContain('import type { ResolvedTheme } from "@jam-overture/loom"')
  })

  it("calls the page's opening by its name rather than by an empty anchor", () => {
    const fault = landingFaults([landing({ anchor: "", heading: "" })])[0] ?? ""

    expect(fault).toContain("/docs/getting-started/rendering-a-tree —")
    expect(fault).toContain("the page's opening")
  })

  it("is silent where the section shows the door first", () => {
    expect(landingFaults([landing({ shownAt: 40 })])).toEqual([])
  })
})

describe("reading one page", () => {
  it("finds nothing to say about a page whose blocks open no doors", () => {
    expect(landingsOn("getting-started", "introduction")).toEqual([])
  })

  it("is every page with a fence on it, and no page twice", () => {
    const pages = landings().map((found) => `${found.section}/${found.page}`)

    pages.forEach((page) => {
      expect(pagesWithFences().map((with_) => `${with_.sectionSlug}/${with_.pageSlug}`)).toContain(page)
    })
  })

  /*
   * A block that uses a name an earlier block in its own section imported is the
   * shape the rule allows, and it has to stay reachable — otherwise the only way
   * to be clean is one import line per block, which is not how this site reads
   * and is not what `program.ts` hoists imports for.
   */
  it("keeps a use whose door is earlier in the same section, and says where both are", () => {
    const satisfied = LANDINGS.filter((found) => found.shownAt !== undefined)

    expect(satisfied.length).toBeGreaterThan(0)
    satisfied.forEach((found) => {
      expect(found.shownAt ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(found.callsAt)
    })
  })
})
