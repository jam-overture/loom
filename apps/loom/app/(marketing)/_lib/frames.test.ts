import { buildElement, createTree, sequentialIdFactory, type LoomTree } from "@jam-overture/loom"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  OWN_ORIGIN_DESCRIPTION,
  sameOriginFrames,
  siteFrameOrigins,
  siteFrameRegistry,
  unhonored,
  whyNoFrameOrigins,
} from "./frames"
import { renderTree, treeFor } from "./render"
import { DEFAULT_THEME, DEMO, SITE_ROUTES, surfaceHref } from "./site"

/**
 * The band that was built on 4 September, measured, and withdrawn the same run.
 *
 * It rendered perfectly and did nothing: every control in the demonstration is a
 * server action reached through a form element, and `loom.embed`'s sandbox had
 * no `allow-forms`. Nothing about that was visible in a screenshot, nothing
 * failed, and the only symptom was a large green button that a visitor could
 * press all afternoon.
 *
 * So the assertions here are about the two things that were invisible then —
 * **what the sandbox actually grants**, and **whether the frame was permitted at
 * all** — rather than about the band's words. A test that checked the copy would
 * have passed on 4 September.
 */

const ORIGIN = "https://loom.example"


/**
 * A page with a frame on it, built here rather than taken from the site.
 *
 * The two refusal tests below used the front door, which framed `/demo` from
 * 12 September until the maintainer removed it on 1 October. Nothing on this
 * site frames anything now — so a fixture that is *this site's page* can no
 * longer exercise a refusal, and reaching for another page would only move the
 * same dependency.
 *
 * What is being tested is the seam, not the page: a tree built for one origin,
 * rendered by a deployment that registered another. So the tree is three nodes
 * and it is honest about being a fixture. It frames the demonstration's own
 * address, which is exactly what `siteFrameRegistry` permits, so the *allowed*
 * half of the pair still proves the registry works rather than proving that
 * nothing was framed.
 */
const framedPage = (): LoomTree => {
  const ids = sequentialIdFactory("framed")

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { width: "wide" },
      children: [
        buildElement(ids, {
          type: "loom.embed",
          props: {
            src: surfaceHref(ORIGIN, DEMO),
            title: "The demonstration, framed by a fixture",
            aspect: "adaptive",
          },
        }),
      ],
    }),
    ids
  )
}


describe("the origins this site is willing to frame", () => {
  it("is exactly one, and it is this deployment's own", () => {
    const registry = siteFrameRegistry(ORIGIN)

    if (!registry.ok) throw new Error(`loom: ${ORIGIN} was refused`)

    expect(registry.value.origins).toEqual([
      { origin: ORIGIN, description: OWN_ORIGIN_DESCRIPTION, self: true },
    ])
  })

  /**
   * `self` is the load-bearing word rather than a label: it is the only thing
   * that grants the frame `allow-forms` (0135), and a registration that dropped
   * it would put the site back where it was in September — a frame that renders
   * and cannot be used.
   */
  it("marks it as its own, which is what a frame of it is granted on", () => {
    const registry = siteFrameOrigins(ORIGIN)

    expect(registry?.origin(new URL(surfaceHref(ORIGIN, DEMO)))?.self).toBe(true)
  })

  it("covers the demonstration's address and nothing on another host", () => {
    const registry = siteFrameOrigins(ORIGIN)

    expect(registry?.origin(new URL(surfaceHref(ORIGIN, DEMO)))).toBeDefined()
    expect(registry?.origin(new URL("https://elsewhere.example/demo"))).toBeUndefined()
  })

  /**
   * A mistyped `LOOM_SITE_ORIGIN` is a page that says the content cannot be
   * shown, never a landing page that throws. The reason is available to whoever
   * can fix it and is not on the page.
   */
  it("yields no registry, and a reason, when the origin is not one", () => {
    expect(siteFrameOrigins("not an origin")).toBeUndefined()
    expect(whyNoFrameOrigins("not an origin")).toMatch(/is not a framable origin/)
    expect(whyNoFrameOrigins("https://loom.example/with/a/path")).toMatch(/no path, query or fragment/)
    expect(whyNoFrameOrigins(ORIGIN)).toBeUndefined()
  })
})

describe("a frame this deployment did not register", () => {
  /**
   * The failure a visitor can see, rather than the one nobody can.
   *
   * A page built for one origin and rendered by a deployment that registered
   * another is the shape of every misconfiguration available here — a wrong
   * `LOOM_SITE_ORIGIN`, a preview host the tree was not built for — and the seam
   * fails closed. What matters is that it fails *loudly*: the box keeps its
   * space, the notice is in the markup, and the render says why.
   */
  it("renders the notice instead of the frame, and says so in the diagnostics", () => {
    const rendered = renderTree(framedPage(), { origin: "https://elsewhere.example", addressed: false })
    const markup = renderToStaticMarkup(rendered.element)

    expect(markup).not.toContain("<iframe")
    expect(markup).toContain("This content cannot be shown here.")
    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toContain("frame-refused")
  })

  /**
   * And it is a failure rather than a disclosure, which is the distinction
   * `unhonored` exists to keep. Every page test on this site asserts that list
   * is empty, so getting this backwards would make a refused frame invisible to
   * all of them.
   */
  it("is something the runtime could not honor, unlike a frame it could", () => {
    const refused = renderTree(framedPage(), { origin: "https://elsewhere.example", addressed: false })
    const allowed = renderTree(framedPage(), { origin: ORIGIN, addressed: false })

    expect(unhonored(refused.diagnostics)).not.toEqual([])
    expect(unhonored(allowed.diagnostics)).toEqual([])
    expect(allowed.diagnostics).not.toEqual([])
  })
})

describe("every page of this site", () => {
  /**
   * **Nothing on this site frames anything, as of 1 October**, and that is the
   * assertion rather than an absence of one.
   *
   * The front door carried a framed copy of `/demo` from 12 September until the
   * maintainer removed it: *"get rid of the demo injected into the main landing
   * page. If people want to get to the demo, they can click the demo link."*
   * So the exception this sweep used to carve out — `HOME` — is gone, and the
   * rule is now total.
   *
   * **The registry above stays, and stays tested.** A permission nothing uses
   * is a permission that grew quietly, and this is the pair that keeps it
   * honest: the registry says what *may* be framed, and this says that nothing
   * currently is. A frame arriving on any page, on a deployment that would
   * permit it, is a failing test rather than a thing somebody notices in a
   * screenshot.
   */
  it.each(SITE_ROUTES)(
    "$path frames nothing",
    (route) => {
      const rendered = renderTree(treeFor(route, { origin: ORIGIN, theme: DEFAULT_THEME }), {
        origin: ORIGIN,
        addressed: false,
      })

      expect(sameOriginFrames(rendered.diagnostics)).toEqual([])
      expect(renderToStaticMarkup(rendered.element)).not.toContain("<iframe")
    }
  )
})
