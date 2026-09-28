import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { docsSections } from "@/app/(docs)/_lib/nav"
import {
  DECISIONS_URL,
  HOME,
  LICENSE_NOTICE,
  LICENSE_URL,
  OTHER_SURFACES,
  REPOSITORY_URL,
} from "@/app/(docs)/_lib/surfaces"

import { SiteFooter } from "./site-footer"

const footer = () => render(<SiteFooter />).container

const hrefs = (): readonly string[] =>
  [...footer().querySelectorAll("a")].map((anchor) => anchor.getAttribute("href") ?? "")

describe("the foot of every documentation page", () => {
  /**
   * The finding, as one assertion. It was filed as a measurement — `(docs)`
   * links to `/` zero times — and this is that measurement inverted so it
   * cannot go back to zero without something going red.
   */
  it("links to the front door", () => {
    expect(hrefs()).toContain(HOME.path)
  })

  it("offers every other surface of the application", () => {
    for (const surface of OTHER_SURFACES) {
      expect(hrefs(), surface.label).toContain(surface.path)
    }
  })

  it("says what each of them is, rather than only naming it", () => {
    const text = footer().textContent ?? ""

    for (const surface of OTHER_SURFACES) {
      expect(text, surface.label).toContain(surface.label)
      expect(text, surface.label).toContain(surface.blurb)
    }
  })

  it("carries a row for every section, read from the same list the rail reads", () => {
    const text = footer().textContent ?? ""

    for (const section of docsSections) {
      expect(text, section.slug).toContain(section.title)
      expect(hrefs().some((href) => href.startsWith(`/docs/${section.slug}`)), section.slug).toBe(
        true
      )
    }
  })

  it("points at the project itself, and says the licence", () => {
    expect(hrefs()).toContain(REPOSITORY_URL)
    expect(hrefs()).toContain(DECISIONS_URL)
    expect(hrefs()).toContain(LICENSE_URL)
    expect(footer().textContent).toContain(LICENSE_NOTICE)
  })

  /**
   * A footer is a landmark, and an unlabelled one is a list of links a screen
   * reader reader cannot skip past in one move.
   */
  it("is a landmark", () => {
    expect(footer().querySelector("footer")).not.toBeNull()
  })
})
