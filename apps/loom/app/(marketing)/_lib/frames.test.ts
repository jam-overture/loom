import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { BAND } from "./bands"
import {
  OWN_ORIGIN_DESCRIPTION,
  sameOriginFrames,
  siteFrameOrigins,
  siteFrameRegistry,
  unhonored,
  whyNoFrameOrigins,
} from "./frames"
import { FRAME_CAPTION, FRAME_TITLE, YOUR_TURN_ANCHOR } from "./pages/in-your-own-words"
import { renderTree, treeFor } from "./render"
import { DEFAULT_THEME, DEMO, HOME, SITE_ROUTES, SITE_THEME_NAMES, surfaceHref } from "./site"

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

const home = (origin = ORIGIN) => treeFor(HOME, { origin, theme: DEFAULT_THEME })

const markupOf = (origin: string, rendering = origin): string =>
  renderToStaticMarkup(renderTree(home(origin), { origin: rendering, addressed: false }).element)

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

describe("the demonstration, framed on the front door", () => {
  it("is one frame, permitted, and reported as the deployment's own", () => {
    const disclosed = sameOriginFrames(
      renderTree(home(), { origin: ORIGIN, addressed: false }).diagnostics
    )

    expect(disclosed).toHaveLength(1)
    expect(disclosed[0]?.origin).toBe(ORIGIN)
    expect(disclosed[0]?.prop).toBe("src")
  })

  /**
   * The assertion the withdrawn band needed and did not have.
   *
   * `allow-forms` is the whole difference between a demonstration a visitor can
   * use and one that ignores them, and it is granted by the seam rather than by
   * anything in the tree — so it is checked on the markup a browser is served
   * rather than on a prop. `allow-top-navigation` is checked in the same breath
   * because it is still withheld, and a frame that could move the page it sits
   * on is a different thing from one that cannot.
   */
  it("is served with the one grant its controls need, and not with the one nothing needs", () => {
    const markup = markupOf(ORIGIN)
    const sandbox = /<iframe[^>]*sandbox="([^"]*)"/.exec(markup)?.[1]

    expect(sandbox).toBeDefined()
    expect(sandbox?.split(" ")).toContain("allow-forms")
    expect(sandbox).not.toContain("allow-top-navigation")
  })

  it("frames the demonstration's own address, lazily, with a name a screen reader can use", () => {
    const markup = markupOf(ORIGIN)

    expect(markup).toContain(`src="${surfaceHref(ORIGIN, DEMO)}"`)
    expect(markup).toContain('loading="lazy"')
    expect(markup).toContain(FRAME_TITLE)
  })

  /**
   * The caption, escaped the way the markup spells it. It is the one place a
   * visitor is told the frame is live rather than a recording, and that the page
   * inside it is not ours — so it is asserted on the served bytes rather than on
   * the prop it was written into.
   */
  it("says what it is, under it", () => {
    const escaped = FRAME_CAPTION.replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("'", "&#x27;")

    expect(markupOf(ORIGIN)).toContain(escaped)
  })

  it("is a band of its own, anchored, so the band above can point at it", () => {
    const band = home().root.children.find(
      (child) => child.kind === "element" && child.props["eyebrow"] === BAND.inYourOwnWords
    )

    expect(band?.kind).toBe("element")
    expect(band?.kind === "element" ? band.props["anchor"] : undefined).toBe(YOUR_TURN_ANCHOR)
  })

  /**
   * Two decisions that were measured rather than chosen, pinned so that undoing
   * either is a failing test rather than a quiet regression a screenshot at one
   * width would not show.
   *
   * `adaptive` is the shape: `wide` left the demonstration's one control twelve
   * pixels below the fold of the box at 1440, and `square` on a phone showed its
   * bar and two paragraphs and no control. And the way out comes **before** the
   * frame, because at 390 the frame is 465px tall and the control inside it is
   * 778px down — so below the frame, the link is behind the whole box on exactly
   * the device that cannot use the box.
   */
  it("holds the shape and the order the measurements settled", () => {
    const band = home().root.children.find(
      (child) => child.kind === "element" && child.props["eyebrow"] === BAND.inYourOwnWords
    )

    if (band?.kind !== "element") throw new Error("loom: the front door has no such band")

    const at = (type: string): number =>
      band.children.findIndex((child) => child.kind === "element" && child.type === type)

    const embed = at("loom.embed")
    const wayOut = at("loom.stack")

    expect(embed).toBeGreaterThan(-1)
    expect(wayOut).toBeGreaterThan(-1)
    expect(wayOut).toBeLessThan(embed)
    expect(
      band.children.find((child) => child.kind === "element" && child.type === "loom.embed")
    ).toMatchObject({ props: { aspect: "adaptive" } })
  })

  it.each(SITE_THEME_NAMES)("is framed the same way wearing %s", (theme) => {
    const markup = renderToStaticMarkup(
      renderTree(treeFor(HOME, { origin: ORIGIN, theme }), {
        origin: ORIGIN,
        addressed: false,
      }).element
    )

    expect(markup).toContain(`src="${surfaceHref(ORIGIN, DEMO)}"`)
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
    const rendered = renderTree(home(), { origin: "https://elsewhere.example", addressed: false })
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
    const refused = renderTree(home(), { origin: "https://elsewhere.example", addressed: false })
    const allowed = renderTree(home(), { origin: ORIGIN, addressed: false })

    expect(unhonored(refused.diagnostics)).not.toEqual([])
    expect(unhonored(allowed.diagnostics)).toEqual([])
    expect(allowed.diagnostics).not.toEqual([])
  })
})

describe("the rest of the site", () => {
  /**
   * One frame, on one page, and the others say so by rendering none.
   *
   * A registry is a permission, and a permission nothing uses is a permission
   * that grew quietly. This is what would catch a second frame arriving on a
   * page that nobody thought was framing anything.
   */
  it.each(SITE_ROUTES.filter((route) => route.path !== HOME.path))(
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
