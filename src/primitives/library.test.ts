import { createElement, type ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type IdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { catalogueOf } from "../sdk/catalogue.js"
import { auditRegistry } from "../sdk/audit.js"
import { describeRegistryError, type PrimitiveRegistry } from "../sdk/registry.js"
import { renderLoomTree } from "../render/render.js"
import { THEME_PROP_KEY } from "../render/theme.js"
import { createThemeRegistry } from "../theme/registry.js"
import { PALETTE_SLOTS } from "../theme/theme.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { createStarterPrimitiveRegistry, STARTER_PRIMITIVES } from "./index.js"

const registryOf = (): PrimitiveRegistry => {
  const built = createStarterPrimitiveRegistry()
  if (!built.ok) throw new Error(describeRegistryError(built.error))

  return built.value
}

const registry = registryOf()
const themes = createThemeRegistry()

const EDITORIAL = { palette: "editorial", fontPack: "editorial-serif", stylePreset: "comfortable" }
const BOLD = { palette: "bold", fontPack: "bold-sans", stylePreset: "airy-modern" }

/**
 * A page that uses every primitive in the library at least once, so a single
 * fixture answers the questions worth asking of all ten at once: do they
 * register, do they render, do they survive a re-theme, and is any colour in
 * the output not coming from the palette.
 */
const samplePage = (theme: Record<string, string>, idFactory: IdFactory = sequentialIdFactory()): LoomTree => {
  const heading = buildElement(idFactory, {
    type: "loom.heading",
    props: { level: 1, balance: true },
    children: [buildText(idFactory, "A runtime for AI-authored interfaces")],
  })

  const lede = buildElement(idFactory, {
    type: "loom.prose",
    props: { size: "lead", tone: "muted", measured: true },
    children: [buildText(idFactory, "Change is proposed, gated, attributed, and reversible.")],
  })

  const hero = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Loom" },
    children: [
      buildSlot(idFactory, "heading", [heading]),
      lede,
      buildElement(idFactory, {
        type: "loom.action",
        props: { href: "https://example.com/start", variant: "primary", scale: "large" },
        children: [buildText(idFactory, "Read the thesis")],
      }),
    ],
  })

  const split = buildElement(idFactory, {
    type: "loom.split",
    props: { ratio: "start-wide", align: "center" },
    children: [
      buildSlot(idFactory, "start", [
        buildElement(idFactory, {
          type: "loom.prose",
          children: [buildText(idFactory, "Every proposal is inspectable before it lands.")],
        }),
      ]),
      buildSlot(idFactory, "end", [
        buildElement(idFactory, {
          type: "loom.media",
          props: {
            src: "https://example.com/tree.png",
            alt: "A component tree in the review portal",
            aspect: "wide",
            caption: "The tree, as the portal shows it",
          },
        }),
      ]),
    ],
  })

  const stats = buildElement(idFactory, {
    type: "loom.stat-grid",
    props: { columns: "three" },
    children: [
      buildElement(idFactory, { type: "loom.stat", props: { value: "4", label: "delta operations" } }),
      buildElement(idFactory, { type: "loom.stat", props: { value: "2", label: "gate axes" } }),
      buildElement(idFactory, {
        type: "loom.stat",
        props: { value: "100%", label: "reversible", caption: "every delta has an inverse" },
      }),
    ],
  })

  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
    children: [
      hero,
      buildElement(idFactory, { type: "loom.divider", props: { ornament: "diamond" } }),
      split,
      buildElement(idFactory, { type: "loom.divider", props: { ornament: "dots", spacing: "loose" } }),
      stats,
    ],
  })

  return createTree(page, idFactory)
}

const render = (tree: LoomTree, editMode = false): { markup: string; diagnostics: readonly unknown[] } => {
  const rendered = renderLoomTree(tree, {
    resolver: registry,
    validator: registry,
    themes,
    editMode,
  })

  return { markup: renderToStaticMarkup(rendered.element), diagnostics: rendered.diagnostics }
}

describe("the starter library", () => {
  it("registers as eighteen primitives, structure first and composed vocabulary after", () => {
    expect(STARTER_PRIMITIVES).toHaveLength(18)
    expect(registry.primitives.map((primitive) => primitive.type)).toEqual([
      "loom.page",
      "loom.section",
      "loom.split",
      "loom.hero",
      "loom.feature-grid",
      "loom.feature",
      "loom.stat-grid",
      "loom.stat",
      "loom.quote",
      "loom.logo-cloud",
      "loom.logo",
      "loom.faq-list",
      "loom.faq",
      "loom.heading",
      "loom.prose",
      "loom.divider",
      "loom.media",
      "loom.action",
    ])
  })

  it("passes the edit-mode conformance audit, so the portal can address all of it", () => {
    const audit = auditRegistry(registry)

    expect(audit.notDecorated).toEqual([])
    expect(audit.notProbeable).toEqual([])
  })

  it("places every region it declares, so nothing a tree puts in one is dropped", () => {
    expect(auditRegistry(registry).unplacedSlots).toEqual([])
  })

  it("agrees with itself about which primitives are leaves", () => {
    /**
     * A leaf holds its copy in props and has nowhere to put a child node. The
     * list is asserted rather than derived so that a primitive quietly losing
     * its `children` — the failure the probe exists to catch — fails here.
     */
    expect(auditRegistry(registry).leaves).toEqual([
      "loom.feature",
      "loom.stat",
      "loom.quote",
      "loom.logo",
      "loom.faq",
      "loom.divider",
    ])
  })

  it("tells a model the props of every primitive, including the refined one", () => {
    const catalogue = catalogueOf(registry)
    const media = catalogue.find((primitive) => primitive.type === "loom.media")

    expect(catalogue.every((primitive) => primitive.props !== undefined)).toBe(true)
    expect(media?.props?.map((prop) => prop.name)).toEqual([
      "alt",
      "aspect",
      "caption",
      "corners",
      "decorative",
      "fit",
      "src",
    ])
    expect(media?.props?.find((prop) => prop.name === "alt")?.required).toBe(true)
  })

  it("names the two regions the composing primitives place", () => {
    const catalogue = catalogueOf(registry)

    expect(catalogue.find((primitive) => primitive.type === "loom.section")?.slots).toEqual(["heading"])
    expect(catalogue.find((primitive) => primitive.type === "loom.split")?.slots).toEqual([
      "start",
      "end",
    ])
  })
})

describe("a page assembled from the library", () => {
  it("renders every primitive with nothing left unhonoured", () => {
    const { markup, diagnostics } = render(samplePage(EDITORIAL))

    expect(diagnostics).toEqual([])
    expect(markup).toContain("<h1")
    expect(markup).toContain("A runtime for AI-authored interfaces")
    expect(markup).toContain("<figcaption")
    expect(markup).toContain('role="separator"')
    expect(markup).toContain("delta operations")
    expect(markup).toContain('href="https://example.com/start"')
  })

  it("places a section's heading region above its content", () => {
    const { markup } = render(samplePage(EDITORIAL))

    const headingAt = markup.indexOf("A runtime for AI-authored interfaces")
    const ledeAt = markup.indexOf("Change is proposed")

    expect(headingAt).toBeGreaterThan(-1)
    expect(headingAt).toBeLessThan(ledeAt)
  })

  it("places a split's two regions in separate columns, in ratio order", () => {
    const { markup } = render(samplePage(EDITORIAL))

    const startAt = markup.indexOf("Every proposal is inspectable")
    const endAt = markup.indexOf("A component tree in the review portal")

    expect(startAt).toBeGreaterThan(-1)
    expect(startAt).toBeLessThan(endAt)
    expect(markup).toContain("62%")
    expect(markup).toContain("38%")
  })

  it("gives every node its own address in edit mode, stats included", () => {
    const { markup } = render(samplePage(EDITORIAL), true)

    expect(markup.match(/data-loom-node=/g)?.length).toBe(14)
    expect(markup.match(/data-loom-type="loom\.stat"/g)?.length).toBe(3)
  })
})

/**
 * The second fixture: a marketing page, built from the composed vocabulary the
 * way §4d will build the real one. Between them the two fixtures use every
 * registered primitive, which the test below asserts rather than trusts.
 */
const marketingPage = (theme: Record<string, string>, idFactory: IdFactory = sequentialIdFactory()): LoomTree => {
  const hero = buildElement(idFactory, {
    type: "loom.hero",
    props: { backdrop: "aurora", align: "start", eyebrow: "The AI-native runtime" },
    children: [
      buildSlot(idFactory, "heading", [
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 1, balance: true },
          children: [buildText(idFactory, "Ship interfaces your AI can change and your team can trust")],
        }),
      ]),
      buildElement(idFactory, {
        type: "loom.prose",
        children: [buildText(idFactory, "Every change is proposed, gated, attributed and reversible.")],
      }),
      buildSlot(idFactory, "actions", [
        buildElement(idFactory, {
          type: "loom.action",
          props: { href: "https://example.com/start", variant: "primary", scale: "large" },
          children: [buildText(idFactory, "Start building")],
        }),
        buildElement(idFactory, {
          type: "loom.action",
          props: { href: "https://example.com/docs", variant: "secondary", scale: "large" },
          children: [buildText(idFactory, "Read the docs")],
        }),
      ]),
      buildSlot(idFactory, "media", [
        buildElement(idFactory, {
          type: "loom.media",
          props: {
            src: "https://example.com/portal.png",
            alt: "A proposed change beside the page it changes",
            aspect: "wide",
          },
        }),
      ]),
    ],
  })

  const logos = buildElement(idFactory, {
    type: "loom.logo-cloud",
    props: { label: "Trusted by teams at", align: "center" },
    children: [
      buildElement(idFactory, { type: "loom.logo", props: { name: "Northwind" } }),
      buildElement(idFactory, {
        type: "loom.logo",
        props: { name: "Meridian", image: "https://example.com/meridian.svg", href: "https://example.com/meridian" },
      }),
      buildElement(idFactory, { type: "loom.logo", props: { name: "Halcyon" } }),
    ],
  })

  const features = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Why Loom", tone: "canvas" },
    children: [
      buildSlot(idFactory, "heading", [
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 2 },
          children: [buildText(idFactory, "A record beside every change")],
        }),
      ]),
      buildElement(idFactory, {
        type: "loom.feature-grid",
        props: { columns: "three" },
        children: [
          buildElement(idFactory, {
            type: "loom.feature",
            props: { icon: "◆", title: "Proposed, not written", body: "A model proposes a delta; nothing lands unreviewed." },
          }),
          buildElement(idFactory, {
            type: "loom.feature",
            props: {
              icon: "⛨",
              title: "Gated by policy",
              body: "Stakes and reversibility decide it, and the rule that fired is on the record.",
              href: "https://example.com/gate",
            },
          }),
          buildElement(idFactory, {
            type: "loom.feature",
            props: { icon: "↺", title: "Reversible", body: "Every delta has an inverse, and undo is a button.", surface: "plain" },
          }),
        ],
      }),
    ],
  })

  const proof = buildElement(idFactory, {
    type: "loom.quote",
    props: {
      quote: "We stopped arguing about what the assistant changed. The record answers it.",
      author: "Ada Whitfield",
      role: "Head of Platform, Northwind",
      emphasis: "feature",
    },
  })

  const questions = buildElement(idFactory, {
    type: "loom.faq-list",
    props: { width: "readable" },
    children: [
      buildElement(idFactory, {
        type: "loom.faq",
        props: { question: "Does the model touch my components?", answer: "No. It configures registered primitives.", open: true },
      }),
      buildElement(idFactory, {
        type: "loom.faq",
        props: { question: "What happens when a proposal is wrong?", answer: "The Gate refuses it, and says which rule did." },
      }),
    ],
  })

  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [hero, logos, features, proof, questions],
    }),
    idFactory
  )
}

/**
 * The library's stylesheet is hoisted ahead of the tree by React, so every
 * assertion about "the root" has to step over it first. Splitting it out is
 * also the only way to check the claim that matters about it: one stylesheet
 * for a page that emits it from four different primitives.
 */
const HOISTED_STYLESHEET = /^(<style[^>]*>[\s\S]*?<\/style>)?/

const splitStylesheet = (markup: string): { stylesheet: string; tree: string } => {
  const [matched] = HOISTED_STYLESHEET.exec(markup) ?? [""]

  return { stylesheet: matched ?? "", tree: markup.slice((matched ?? "").length) }
}

describe("the composed vocabulary", () => {
  it("covers every registered primitive across the two fixtures", () => {
    const used = new Set(
      [...render(samplePage(EDITORIAL), true).markup.matchAll(/data-loom-type="([^"]+)"/g)]
        .concat([...render(marketingPage(EDITORIAL), true).markup.matchAll(/data-loom-type="([^"]+)"/g)])
        .map((match) => match[1])
    )

    expect([...registry.primitives.map((primitive) => primitive.type)].filter((type) => !used.has(type))).toEqual([])
  })

  it("renders a marketing page with nothing left unhonoured", () => {
    const { markup, diagnostics } = render(marketingPage(EDITORIAL))

    expect(diagnostics).toEqual([])
    expect(markup).toContain("Ship interfaces your AI can change and your team can trust")
    expect(markup).toContain("Trusted by teams at")
    expect(markup).toContain("Proposed, not written")
    expect(markup).toContain("<blockquote")
    expect(markup).toContain("<details")
    expect(markup).toContain("<summary")
  })

  it("places the hero's three regions, each in its own part of the band", () => {
    const { markup } = render(marketingPage(EDITORIAL))

    const eyebrowAt = markup.indexOf("The AI-native runtime")
    const headingAt = markup.indexOf("Ship interfaces")
    const ledeAt = markup.indexOf("Every change is proposed")
    const actionAt = markup.indexOf("Start building")
    const mediaAt = markup.indexOf("portal.png")

    expect(eyebrowAt).toBeLessThan(headingAt)
    expect(headingAt).toBeLessThan(ledeAt)
    expect(ledeAt).toBeLessThan(actionAt)
    expect(actionAt).toBeLessThan(mediaAt)
  })

  it("emits one stylesheet for a page whose primitives each ask for it", () => {
    const { markup } = render(marketingPage(EDITORIAL))
    const { stylesheet } = splitStylesheet(markup)

    expect(markup.match(/<style/g)?.length).toBe(1)
    expect(stylesheet).toContain("@keyframes loom-rise")
    expect(stylesheet).toContain("prefers-reduced-motion")
  })

  it("keeps the animation out of the tree entirely", () => {
    const withMotion = render(marketingPage(EDITORIAL)).markup

    /**
     * The whole bargain in one assertion: the stylesheet is identical under a
     * different theme and carries no value any prop supplied, so no proposal
     * can reach the animation by configuring a node.
     */
    expect(splitStylesheet(withMotion).stylesheet).toBe(
      splitStylesheet(render(marketingPage(BOLD)).markup).stylesheet
    )
    expect(splitStylesheet(withMotion).stylesheet).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it("opens the question a tree marked open, and leaves the others closed", () => {
    const { markup } = render(marketingPage(EDITORIAL))

    expect(markup.match(/<details[^>]*open/g)?.length).toBe(1)
    expect(markup.match(/<details/g)?.length).toBe(2)
  })

  it("falls back to a wordmark for a logo with no image, and links the one that has a href", () => {
    const { markup } = render(marketingPage(EDITORIAL))

    expect(markup).toContain("Northwind")
    expect(markup).toContain('alt="Meridian"')
    expect(markup).toContain('href="https://example.com/meridian"')
  })

  it("survives the re-theme with no literal colour below the root", () => {
    const editorial = splitStylesheet(render(marketingPage(EDITORIAL)).markup).tree
    const bold = splitStylesheet(render(marketingPage(BOLD)).markup).tree
    const body = bold.slice(bold.indexOf(">"))

    expect(editorial.slice(editorial.indexOf(">"))).toBe(body)
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
  })
})

describe("the re-theme guarantee", () => {
  const styleOf = (markup: string): string => markup.slice(0, markup.indexOf(">"))

  it("changes only the root's variables when the palette changes", () => {
    const editorial = render(samplePage(EDITORIAL)).markup
    const bold = render(samplePage(BOLD)).markup

    expect(editorial).not.toBe(bold)
    expect(styleOf(editorial)).not.toBe(styleOf(bold))
    expect(editorial.slice(editorial.indexOf(">"))).toBe(bold.slice(bold.indexOf(">")))
  })

  it("mounts every palette slot at the root and reads colour only from there", () => {
    const { markup } = render(samplePage(BOLD))
    const root = styleOf(markup)
    const body = markup.slice(markup.indexOf(">"))

    for (const slot of PALETTE_SLOTS) expect(root).toContain(`--loom-${slot}:`)

    /** No literal colour anywhere below the root: hex, rgb(), or hsl(). */
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
  })

  it("renders identically under both palettes once the variables are stripped", () => {
    const editorialTree = samplePage(EDITORIAL)
    const boldTree = samplePage(BOLD)

    expect(render(editorialTree).diagnostics).toEqual([])
    expect(render(boldTree).diagnostics).toEqual([])
  })
})

describe("the schemas the seam enforces", () => {
  const propsOf = (type: string) => {
    const entry = registry.primitives.find((primitive) => primitive.type === type)
    if (!entry) throw new Error(`no ${type}`)

    return entry.validate
  }

  it("refuses a heading level outside the document outline", () => {
    expect(propsOf("loom.heading")({ level: 7 }).outcome).toBe("invalid")
    expect(propsOf("loom.heading")({ level: 2 }).outcome).toBe("valid")
  })

  it("refuses a prop no primitive declared, rather than ignoring it", () => {
    expect(propsOf("loom.divider")({ ornament: "rule", colour: "red" }).outcome).toBe("invalid")
  })

  it("requires alt text unless the image says it is decorative", () => {
    const media = propsOf("loom.media")
    const src = "https://example.com/a.png"

    expect(media({ src, alt: "" }).outcome).toBe("invalid")
    expect(media({ src, alt: "", decorative: true }).outcome).toBe("valid")
    expect(media({ src, alt: "A chart" }).outcome).toBe("valid")
  })

  it("refuses a destination whose scheme is not on the allowlist", () => {
    const action = propsOf("loom.action")

    expect(action({ href: "javascript:alert(1)" }).outcome).toBe("invalid")
    expect(action({ href: "/relative" }).outcome).toBe("invalid")
    expect(action({ href: "https://example.com" }).outcome).toBe("valid")
    expect(action({ href: "mailto:hello@example.com" }).outcome).toBe("valid")
  })

  it("refuses an image source that is not fetched over http", () => {
    const media = propsOf("loom.media")

    expect(media({ src: "data:image/svg+xml,<svg/>", alt: "x" }).outcome).toBe("invalid")
    expect(media({ src: "https://example.com/a.png", alt: "x" }).outcome).toBe("valid")
  })
})

describe("the enum-driven display mode", () => {
  const dividerMarkup = (props: JsonObject): string => {
    const idFactory = sequentialIdFactory()
    const root = buildElement(idFactory, {
      type: "loom.page",
      children: [buildElement(idFactory, { type: "loom.divider", props })],
    })

    return render(createTree(root, idFactory)).markup
  }

  it("renders a different structure for each ornament, not a different value", () => {
    const rule = dividerMarkup({ ornament: "rule" })
    const dots = dividerMarkup({ ornament: "dots" })
    const diamond = dividerMarkup({ ornament: "diamond" })

    expect(rule.match(/<span/g)?.length).toBe(1)
    expect(dots.match(/<span/g)?.length).toBe(4)
    expect(diamond.match(/<span/g)?.length).toBe(4)
    expect(diamond).toContain("rotate:45deg")
  })

  it("defaults to the plain rule when the tree names no ornament", () => {
    expect(dividerMarkup({})).toBe(dividerMarkup({ ornament: "rule" }))
  })
})

describe("purity", () => {
  it("renders the same markup twice for the same tree", () => {
    const tree = samplePage(EDITORIAL)

    expect(render(tree).markup).toBe(render(tree).markup)
  })

  it("holds no state between two trees built from the same primitives", () => {
    expect(render(samplePage(EDITORIAL)).markup).toBe(render(samplePage(EDITORIAL)).markup)
  })
})

describe("a leaf given children it cannot place", () => {
  it("renders the leaf rather than dropping it", () => {
    const idFactory = sequentialIdFactory()
    const root = buildElement(idFactory, {
      type: "loom.page",
      children: [
        buildElement(idFactory, {
          type: "loom.stat",
          props: { value: "7", label: "runs" },
          children: [buildText(idFactory, "stray")],
        }),
      ],
    })

    const { markup, diagnostics } = render(createTree(root, idFactory))

    expect(diagnostics).toEqual([])
    expect(markup).toContain("runs")
    expect(markup).not.toContain("stray")
  })
})

describe("createStarterPrimitiveRegistry", () => {
  it("refuses a host primitive that collides with a library type", () => {
    const clash = createStarterPrimitiveRegistry([STARTER_PRIMITIVES[0]!])

    expect(clash.ok).toBe(false)
  })

  it("registers a host's own primitives alongside the library", () => {
    const extra = {
      ...STARTER_PRIMITIVES[0]!,
      type: "host.page",
    }
    const built = createStarterPrimitiveRegistry([extra])

    expect(built.ok).toBe(true)
    expect(built.ok && built.value.primitives).toHaveLength(STARTER_PRIMITIVES.length + 1)
  })
})

describe("the root primitive", () => {
  it("mounts the theme on its own element, adding nothing to carry it", () => {
    const rendered = renderLoomTree(samplePage(EDITORIAL), {
      resolver: registry,
      validator: registry,
      themes,
    })

    const element = rendered.element as ReactElement<{ style?: Record<string, string> }>
    const markup = renderToStaticMarkup(createElement("div", null, element))

    expect(markup.startsWith("<div><div style=")).toBe(true)
  })
})
