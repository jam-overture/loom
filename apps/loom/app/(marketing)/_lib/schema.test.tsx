import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { StructuredData } from "../_components/structured-data"
import { siteQuestions } from "./questions"
import { everyPageSchema, pageSchema, UNMADE_CLAIMS } from "./schema"
import { HOME, internalHref, SITE_ROUTES, type SiteRoute } from "./site"

/**
 * The one text on this site with a non-human reader, held to the same standard
 * as the rest of it.
 *
 * Nobody proofreads a JSON-LD graph. It does not render, a wrong field breaks
 * nothing, and a page carrying a claim nobody made looks exactly like a page
 * carrying none. That is the whole risk of structured data and it is why this
 * file is longer than the module it tests: **the failure mode is a machine
 * repeating something untrue to somebody who never sees the page.**
 */

const ORIGIN = "https://loom.example"

/** Every value in the graph, at any depth, as strings. */
const valuesIn = (value: unknown): readonly string[] => {
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.flatMap(valuesIn)
  if (value !== null && typeof value === "object") {
    return Object.values(value).flatMap(valuesIn)
  }

  return []
}

/** Every key in the graph, at any depth. */
const keysIn = (value: unknown): readonly string[] => {
  if (Array.isArray(value)) return value.flatMap(keysIn)
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, held]) => [key, ...keysIn(held)])
  }

  return []
}

const nodesOf = (route: SiteRoute): readonly Record<string, unknown>[] =>
  (pageSchema(route, ORIGIN) as unknown as { "@graph": readonly Record<string, unknown>[] })[
    "@graph"
  ]

const typesOn = (route: SiteRoute): readonly string[] =>
  nodesOf(route).map((node) => String(node["@type"]))

describe("the graph every page carries", () => {
  it.each(SITE_ROUTES)("$path says what site it is part of and what it is about", (route) => {
    const page = nodesOf(route).find((node) => node["@type"] === "WebPage")

    expect(page?.["url"]).toBe(internalHref(ORIGIN, route.path))
    expect(page?.["name"]).toBe(route.title)
    expect(page?.["description"]).toBe(route.description)
  })

  /**
   * The `@id` references are the reason this is one graph rather than three
   * scripts. A crawler that read three pages and found three unlinked
   * `SoftwareApplication` nodes would have three products.
   */
  it.each(SITE_ROUTES)("$path points at one site and one product, by reference", (route) => {
    const nodes = nodesOf(route)
    const page = nodes.find((node) => node["@type"] === "WebPage")
    const site = nodes.find((node) => node["@type"] === "WebSite")
    const product = nodes.find((node) => node["@type"] === "SoftwareApplication")

    expect(page?.["isPartOf"]).toEqual({ "@id": site?.["@id"] })
    expect(page?.["about"]).toEqual({ "@id": product?.["@id"] })
  })

  it("puts the questions on the front door and nowhere else", () => {
    expect(typesOn(HOME)).toContain("FAQPage")

    for (const route of SITE_ROUTES.filter((found) => found.path !== HOME.path)) {
      expect({ route: route.path, types: typesOn(route) }).toEqual({
        route: route.path,
        types: expect.not.arrayContaining(["FAQPage"]),
      })
    }
  })

  /**
   * Two levels, because the site is two levels. A breadcrumb claiming a
   * hierarchy the navigation does not have describes a different site.
   */
  it.each(SITE_ROUTES)("$path has a breadcrumb as deep as the site is", (route) => {
    const page = nodesOf(route).find((node) => node["@type"] === "WebPage")
    const crumbs = (page?.["breadcrumb"] as { itemListElement: readonly unknown[] })
      .itemListElement

    expect(crumbs).toHaveLength(route.path === HOME.path ? 1 : 2)
  })
})

describe("the questions, as a machine reads them", () => {
  const faq = nodesOf(HOME).find((node) => node["@type"] === "FAQPage")
  const asked = (faq?.["mainEntity"] ?? []) as readonly Record<string, unknown>[]

  /**
   * The assertion this file exists for.
   *
   * The band and the graph are two readers of `questions.ts`, and the failure
   * that matters is not either of them being wrong — it is them disagreeing,
   * which is this site telling a person one thing and an assistant another with
   * nothing on any screen to say so. Held word for word rather than by count.
   */
  it("are the same questions and the same answers the page shows", () => {
    expect(asked.map((entry) => entry["name"])).toEqual(
      siteQuestions().map((entry) => entry.question)
    )
    expect(asked.map((entry) => (entry["acceptedAnswer"] as Record<string, unknown>)["text"])).toEqual(
      siteQuestions().map((entry) => entry.answer)
    )
  })

  /**
   * An answer is quoted away from the page it was on, so it has to survive the
   * journey. One that opened *it does that too* would be correct in the band
   * and useless in a search result.
   */
  it.each(siteQuestions())("$question is answered in whole sentences", (entry) => {
    expect(entry.answer.length).toBeGreaterThan(40)
    expect(entry.answer.trim()).toMatch(/[.!?]$/)
    expect(entry.answer).not.toMatch(/^(It does|That too|Also|Yes, and)\b/)
  })
})

/**
 * The claims this site will not make, asserted rather than commented.
 *
 * Every one of these is a field somebody could add in one line for a schema
 * that looks more complete: a price nobody has set, a rating nobody has given,
 * a publisher nobody has named, a modified date nothing at serve time knows.
 * They do not render and they do not break a page. **The only thing standing
 * between this site and a fabricated rating is this test.**
 */
describe("what the graph refuses to say", () => {
  it.each(UNMADE_CLAIMS)("never carries %s, on any page", (claim) => {
    for (const graph of everyPageSchema(ORIGIN)) {
      expect({ claim, present: keysIn(graph).includes(claim) }).toEqual({ claim, present: false })
    }
  })

  /**
   * The same rule from the other side: a price could arrive as a value rather
   * than a key, and a currency is the giveaway.
   */
  it("names no currency and no rating anywhere in it", () => {
    for (const graph of everyPageSchema(ORIGIN)) {
      for (const value of valuesIn(graph)) {
        expect(value).not.toMatch(/\b(USD|EUR|GBP)\b/)
        expect(value).not.toMatch(/^\d+(\.\d+)?$/)
      }
    }
  })

  /**
   * Nothing in the graph is typed twice. Every string in it has to come from
   * somewhere a person edits — a route, or `questions.ts` — because a literal
   * written here is the one that goes stale silently.
   */
  it("says nothing the site does not say somewhere a person edits", () => {
    const written = new Set<string>([
      ...SITE_ROUTES.flatMap((route) => [route.title, route.description, route.label]),
      ...siteQuestions().flatMap((entry) => [entry.question, entry.answer]),
    ])
    const vocabulary = new Set(["Loom", "DeveloperApplication", "Any", "https://schema.org"])

    for (const graph of everyPageSchema(ORIGIN)) {
      for (const value of valuesIn(graph)) {
        if (value.startsWith("http") || value.startsWith("WebSite") || vocabulary.has(value)) continue
        if (value.startsWith("Web") || value.endsWith("List") || value.endsWith("Page")) continue
        if (["Question", "Answer", "ListItem", "SoftwareApplication"].includes(value)) continue

        expect({ value, written: written.has(value) }).toEqual({ value, written: true })
      }
    }
  })
})

describe("the tag the page renders", () => {
  const markup = renderToStaticMarkup(<StructuredData route={HOME} origin={ORIGIN} />)

  it("is a JSON-LD script and nothing else", () => {
    expect(markup.startsWith('<script type="application/ld+json">')).toBe(true)
    expect(markup.endsWith("</script>")).toBe(true)
  })

  it("holds JSON a consumer can actually parse", () => {
    const body = markup.slice('<script type="application/ld+json">'.length, -"</script>".length)

    expect(() => JSON.parse(body)).not.toThrow()
    expect(JSON.parse(body)["@context"]).toBe("https://schema.org")
  })

  /**
   * React escapes nothing inside `dangerouslySetInnerHTML`, so the one sequence
   * that could end the script early is escaped by hand. Every string in the
   * graph is a literal in this repository today; this is what holds when one of
   * them stops being.
   */
  it("cannot be ended early by anything inside it", () => {
    const body = markup.slice('<script type="application/ld+json">'.length, -"</script>".length)

    expect(body).not.toContain("</script")
    expect(body).not.toContain("</SCRIPT")
  })
})
