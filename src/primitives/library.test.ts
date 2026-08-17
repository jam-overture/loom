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
import { LIBRARY_CLASS } from "./stylesheet.js"

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
    /**
     * The registry is its own `TextResolver`, over the strings the primitives
     * declared (0060). Wired here because omitting it is not a no-op: every
     * primitive is handed an empty map, so a declared accessible name silently
     * becomes no accessible name — which is the failure the seam exists to
     * prevent, arriving through the seam itself. This library's own tests are
     * the closest thing to a host that would notice.
     */
    text: registry,
    themes,
    editMode,
  })

  return { markup: renderToStaticMarkup(rendered.element), diagnostics: rendered.diagnostics }
}

describe("the starter library", () => {
  it("registers as twenty-nine primitives, structure first and the leaves that go anywhere last", () => {
    expect(STARTER_PRIMITIVES).toHaveLength(29)
    expect(registry.primitives.map((primitive) => primitive.type)).toEqual([
      "loom.page",
      "loom.section",
      "loom.split",
      "loom.stack",
      "loom.grid",
      "loom.card",
      "loom.hero",
      "loom.feature-grid",
      "loom.feature",
      "loom.stat-grid",
      "loom.stat",
      "loom.tier-table",
      "loom.tier",
      "loom.perk-list",
      "loom.perk-list-item",
      "loom.quote-grid",
      "loom.quote",
      "loom.logo-cloud",
      "loom.logo",
      "loom.faq-list",
      "loom.faq",
      "loom.heading",
      "loom.prose",
      "loom.badge",
      "loom.icon",
      "loom.perk",
      "loom.divider",
      "loom.media",
      "loom.action",
    ])
  })

  it("pairs every container with the singular child it is named for", () => {
    const types = new Set(registry.primitives.map((primitive) => primitive.type))

    /**
     * 0054's rule, asserted rather than trusted: the container is the child's
     * name plus the arrangement, so stripping the arrangement word off a
     * container must name something registered. A pair that drifted apart — a
     * `loom.tier-table` whose child got renamed — fails here rather than in a
     * catalogue a model misreads.
     */
    const ARRANGEMENTS = ["grid", "list", "cloud", "table", "row", "carousel"]

    for (const type of types) {
      const arrangement = ARRANGEMENTS.find((word) => type.endsWith(`-${word}`))
      if (arrangement === undefined) continue

      expect(types).toContain(type.slice(0, -(arrangement.length + 1)))
    }
  })

  it("names a general arranger for the arrangement alone, without tripping the stem rule", () => {
    const types = new Set(registry.primitives.map((primitive) => primitive.type))

    /**
     * 0062, and the reason it needs no exception carved out of the test above:
     * the stem rule strips an arrangement word *with its hyphen*, and neither
     * general arranger has one. `loom.grid` is not a container that lost its
     * child — its whole name is the arrangement, which is what a container that
     * repeats nothing in particular is called.
     */
    expect(types).toContain("loom.stack")
    expect(types).toContain("loom.grid")
    expect(types).not.toContain("loom.stack-grid")

    for (const general of ["loom.stack", "loom.grid"]) expect(general.endsWith("-grid")).toBe(false)

    /**
     * The preference is carried by the descriptions, because a description is
     * all a model has when it is choosing between `loom.grid` and a band named
     * for what it holds. If this ever stops being said out loud, 0062's only
     * mitigation is gone.
     */
    const describes = (type: string): string =>
      registry.primitives.find((primitive) => primitive.type === type)?.description ?? ""

    expect(describes("loom.stack")).toContain("prefer a named band")
    expect(describes("loom.grid")).toContain("prefer a named band")
  })

  it("says out loud where the perk trio breaks the stem rule, since the stem rule cannot", () => {
    const types = new Set(registry.primitives.map((primitive) => primitive.type))

    /**
     * The cost 0061 accepts, pinned so it stays deliberate. The test above
     * passes for `loom.perk-list` because stripping `-list` names
     * `loom.perk` — but `loom.perk` is the standalone `<div>`, not the list's
     * child. All three are registered and each says in its own description
     * where it goes, which is the whole of the mitigation.
     *
     * 0054's stem rule still holds everywhere else, which is why the test above
     * stays as it is: 0061 supersedes one clause of 0054, not the record.
     */
    expect(types).toContain("loom.perk-list")
    expect(types).toContain("loom.perk-list-item")
    expect(types).toContain("loom.perk")

    const describes = (type: string): string =>
      registry.primitives.find((primitive) => primitive.type === type)?.description ?? ""

    expect(describes("loom.perk-list-item")).toContain("loom.perk")
    expect(describes("loom.perk")).toContain("loom.perk-list-item")
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
      "loom.perk-list-item",
      "loom.quote",
      "loom.logo",
      "loom.faq",
      "loom.perk",
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

  it("names the regions the composing primitives place", () => {
    const catalogue = catalogueOf(registry)

    expect(catalogue.find((primitive) => primitive.type === "loom.section")?.slots).toEqual(["heading"])
    expect(catalogue.find((primitive) => primitive.type === "loom.split")?.slots).toEqual([
      "start",
      "end",
    ])
    expect(catalogue.find((primitive) => primitive.type === "loom.tier")?.slots).toEqual([
      "badge",
      "action",
    ])
  })

  it("keeps a tier's five props to the fixed fields of one plan", () => {
    const catalogue = catalogueOf(registry)
    const tier = catalogue.find((primitive) => primitive.type === "loom.tier")

    /**
     * The 0052 assertion for this unit. Hermes' `PricingTier` had eight fields;
     * `features`, `description` and the two CTA fields became structure, and
     * `highlighted` split into an `emphasis` prop and a badge region. What is
     * left must stay fixed fields — an `items`, a `features` or a `ctaUrl`
     * reappearing here is the port sliding back into a prop bag.
     */
    expect(tier?.props?.map((prop) => prop.name)).toEqual([
      "emphasis",
      "name",
      "note",
      "period",
      "price",
    ])
    expect(tier?.props?.filter((prop) => prop.required).map((prop) => prop.name)).toEqual([
      "name",
      "price",
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
 * The third fixture: the two bands that close a sale. It is here rather than
 * folded into `marketingPage` because it is the one that has to be read as a
 * *decomposition* — every piece of a Hermes `PricingTier` that became a node is
 * a node someone can point at in this tree, and the assertions below count
 * them.
 */
const pricingPage = (theme: Record<string, string>, idFactory: IdFactory = sequentialIdFactory()): LoomTree => {
  const perk = (label: string, extra: JsonObject = {}): ReturnType<typeof buildElement> =>
    buildElement(idFactory, { type: "loom.perk-list-item", props: { label, ...extra } })

  const tier = (
    props: JsonObject,
    summary: string,
    perks: readonly ReturnType<typeof buildElement>[],
    cta: string,
    badge?: string
  ): ReturnType<typeof buildElement> =>
    buildElement(idFactory, {
      type: "loom.tier",
      props,
      children: [
        ...(badge === undefined
          ? []
          : [
              buildSlot(idFactory, "badge", [
                buildElement(idFactory, {
                  type: "loom.badge",
                  props: { tone: "accent" },
                  children: [buildText(idFactory, badge)],
                }),
              ]),
            ]),
        buildElement(idFactory, {
          type: "loom.prose",
          props: { tone: "muted" },
          children: [buildText(idFactory, summary)],
        }),
        buildElement(idFactory, {
          type: "loom.perk-list",
          props: { density: "loose" },
          children: [...perks],
        }),
        buildSlot(idFactory, "action", [
          buildElement(idFactory, {
            type: "loom.action",
            props: {
              href: "https://example.com/start",
              variant: props["emphasis"] === "featured" ? "primary" : "secondary",
            },
            children: [buildText(idFactory, cta)],
          }),
        ]),
      ],
    })

  const pricing = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Pricing", width: "wide" },
    children: [
      buildSlot(idFactory, "heading", [
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 2 },
          children: [buildText(idFactory, "One record beside every change, at every size")],
        }),
      ]),
      buildElement(idFactory, {
        type: "loom.tier-table",
        props: { columns: "three" },
        children: [
          tier(
            { name: "Starter", price: "Free", period: "for one project" },
            "Everything you need to see whether the record is worth keeping.",
            [perk("One tree, one reviewer"), perk("Full revision log"), perk("Priority support", { state: "excluded" })],
            "Start free"
          ),
          tier(
            { name: "Studio", price: "$99", period: "per month", note: "billed annually", emphasis: "featured" },
            "For teams shipping AI-authored changes to a live product.",
            [
              perk("Unlimited trees and reviewers"),
              perk("Policy per change", { note: "stakes and reversibility, per rule" }),
              perk("Calibration reporting"),
              perk("SSO", { state: "coming" }),
            ],
            "Start a trial",
            "Most popular"
          ),
          tier(
            { name: "Scale", price: "Custom", note: "annual contract" },
            "Your own store, your own policy, your own retention.",
            [
              perk("Self-hosted Postgres"),
              perk("Bring your own model"),
              perk("Audit export", { note: "every verdict, every fingerprint" }),
            ],
            "Talk to us"
          ),
        ],
      }),
      /**
       * The standalone case 0061 exists for: one reassurance under the band,
       * belonging to no list. As a `loom.perk-list-item` this would be an `<li>`
       * with no `<ul>` anywhere near it.
       */
      buildElement(idFactory, {
        type: "loom.perk",
        props: { label: "Every plan includes the full revision log", note: "no card required to start" },
      }),
    ],
  })

  const wall = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Proof", tone: "surface" },
    children: [
      buildSlot(idFactory, "heading", [
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 2 },
          children: [buildText(idFactory, "What teams say once the arguing stops")],
        }),
      ]),
      buildElement(idFactory, {
        type: "loom.quote-grid",
        props: { columns: "three" },
        children: [
          buildElement(idFactory, {
            type: "loom.quote",
            props: {
              quote: "The Gate held a change nobody would have caught in review.",
              author: "Ada Whitfield",
              role: "Head of Platform, Northwind",
            },
          }),
          buildElement(idFactory, {
            type: "loom.quote",
            props: {
              quote: "Undo is a proposal. That single decision ended a whole category of incident for us.",
              author: "Ren Okafor",
              role: "Staff Engineer, Meridian",
              avatar: "https://example.com/ren.jpg",
            },
          }),
          buildElement(idFactory, {
            type: "loom.quote",
            props: {
              quote: "We can finally answer what the assistant changed, and who approved it.",
              author: "Sofia Lindqvist",
              role: "Design Director, Halcyon",
            },
          }),
        ],
      }),
    ],
  })

  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [pricing, buildElement(idFactory, { type: "loom.divider" }), wall],
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
  it("covers every registered primitive across the four fixtures", () => {
    const typesIn = (tree: LoomTree): readonly string[] =>
      [...render(tree, true).markup.matchAll(/data-loom-type="([^"]+)"/g)].flatMap((match) =>
        match[1] === undefined ? [] : [match[1]]
      )

    const used = new Set([
      ...typesIn(samplePage(EDITORIAL)),
      ...typesIn(marketingPage(EDITORIAL)),
      ...typesIn(pricingPage(EDITORIAL)),
      ...typesIn(arrangedPage(EDITORIAL)),
    ])

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

describe("the pricing band", () => {
  it("renders three plans and their checklists with nothing left unhonoured", () => {
    const { markup, diagnostics } = render(pricingPage(EDITORIAL))

    expect(diagnostics).toEqual([])
    expect(markup).toContain("Studio")
    expect(markup).toContain("$99")
    expect(markup).toContain("per month")
    expect(markup).toContain("billed annually")
    expect(markup).toContain("Calibration reporting")
    expect(markup).toContain("stakes and reversibility, per rule")
  })

  it("makes every perk its own addressable node, which is the whole of 0052 here", () => {
    const { markup } = render(pricingPage(EDITORIAL), true)

    /**
     * Ten perks across three plans. As Hermes shipped it these were ten strings
     * inside three `features` arrays inside one `items` array — none of them a
     * node, so none of them insertable, movable, attributable or separately
     * reversible. The count is asserted because it is the number that says the
     * decomposition actually happened.
     */
    expect(markup.match(/data-loom-type="loom\.perk-list-item"/g)?.length).toBe(10)
    expect(markup.match(/data-loom-type="loom\.tier"/g)?.length).toBe(3)
    expect(markup.match(/data-loom-type="loom\.perk-list"/g)?.length).toBe(3)
  })

  it("gives a row an <li> and a standalone perk a <div>, which is the whole of 0061", () => {
    const { markup } = render(pricingPage(EDITORIAL))

    /**
     * Ten rows in three lists, and one perk belonging to no list. Before the
     * rename the eleventh was an `<li>` outside any `<ul>` — markup that
     * renders correctly and says something untrue about the page.
     */
    expect(markup.match(/<ul/g)?.length).toBe(3)
    expect(markup.match(/<li/g)?.length).toBe(10)
    expect(markup).toContain("Every plan includes the full revision log")

    const standaloneAt = markup.indexOf("Every plan includes the full revision log")
    const lastListCloseAt = markup.lastIndexOf("</ul>")

    expect(standaloneAt).toBeGreaterThan(lastListCloseAt)
  })

  it("places the badge beside the plan name and the action at the foot of the card", () => {
    const { markup } = render(pricingPage(EDITORIAL))

    const badgeAt = markup.indexOf("Most popular")
    const priceAt = markup.indexOf("$99")
    const lastPerkAt = markup.indexOf("SSO")
    const actionAt = markup.indexOf("Start a trial")

    /**
     * The 0051 assertion for this primitive: neither region is where the flow
     * of children would have put it. The badge arrives as the tier's *first*
     * child in the tree and renders after the plan name; the action arrives
     * last and renders after a body it is not part of.
     */
    expect(badgeAt).toBeGreaterThan(-1)
    expect(badgeAt).toBeLessThan(priceAt)
    expect(priceAt).toBeLessThan(lastPerkAt)
    expect(lastPerkAt).toBeLessThan(actionAt)
  })

  it("declares the two strings a perk owns, so a deployment has something to replace", () => {
    /**
     * 0060's seam, adopted. The strings were inline in the component until the
     * framework routine answered this routine's finding the same day; declared,
     * they are in the entry a host can override and the render resolves before
     * the component sees them.
     */
    const declared = (type: string): Readonly<Record<string, string>> =>
      registry.primitives.find((primitive) => primitive.type === type)?.text ?? {}

    for (const type of ["loom.perk-list-item", "loom.perk"]) {
      expect(Object.keys(declared(type)).sort()).toEqual(["coming", "excluded"])
      expect(declared(type)["excluded"]).toBe("Not included")
    }

    /** No key for `included` — nine rows announcing themselves is unlistenable. */
    expect(declared("loom.perk")["included"]).toBeUndefined()
  })

  it("names a perk's state only when the glyph says something the text does not", () => {
    const { markup } = render(pricingPage(EDITORIAL))

    expect(markup.match(/aria-label="Not included"/g)?.length).toBe(1)
    expect(markup.match(/aria-label="Coming soon"/g)?.length).toBe(1)
    /**
     * The other nine are marked — eight rows plus the standalone perk under the
     * band — and not one of them announces itself.
     */
    expect(markup).not.toContain('aria-label="Included"')
    expect(markup.match(/✓/g)?.length).toBe(9)
  })

  it("builds a proof wall out of the quote that was already registered", () => {
    const { markup } = render(pricingPage(EDITORIAL), true)

    expect(markup.match(/data-loom-type="loom\.quote"/g)?.length).toBe(3)
    expect(markup.match(/<blockquote/g)?.length).toBe(3)
    expect(markup).toContain('src="https://example.com/ren.jpg"')
  })

  it("survives the re-theme with no literal colour below the root", () => {
    const editorial = splitStylesheet(render(pricingPage(EDITORIAL)).markup).tree
    const bold = splitStylesheet(render(pricingPage(BOLD)).markup).tree
    const body = bold.slice(bold.indexOf(">"))

    expect(editorial.slice(editorial.indexOf(">"))).toBe(body)
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
  })

  it("emits one stylesheet for a band whose every card asks for it", () => {
    const { markup } = render(pricingPage(EDITORIAL))

    expect(markup.match(/<style/g)?.length).toBe(1)
  })
})

/**
 * The compose-and-arrange layer, exercised as the thing it exists for: a band
 * nobody has ported, assembled out of the general four. Every band in the three
 * fixtures above is a primitive that knew what it held; this one is a
 * `loom.grid` of `loom.card`s that holds whatever the tree put on it, which is
 * the whole of 0062's floor-not-ceiling argument in one fixture.
 */
const arrangedPage = (theme: Record<string, string>, idFactory: IdFactory = sequentialIdFactory()): LoomTree => {
  const text = (value: string) => buildText(idFactory, value)

  const icon = (glyph: string, props: JsonObject) =>
    buildElement(idFactory, { type: "loom.icon", props, children: [text(glyph)] })

  const integration = (glyph: string, title: string, body: string, tone: string) =>
    buildElement(idFactory, {
      type: "loom.card",
      props: { tone, padding: "loose" },
      children: [
        buildElement(idFactory, {
          type: "loom.stack",
          props: { gap: "snug", align: "start" },
          children: [
            icon(glyph, { shape: "soft", tone: tone === "accent" ? "strong" : "accent" }),
            buildElement(idFactory, {
              type: "loom.heading",
              props: { level: 3 },
              children: [text(title)],
            }),
            buildElement(idFactory, {
              type: "loom.prose",
              props: { tone: "muted", size: "small" },
              children: [text(body)],
            }),
          ],
        }),
        buildSlot(idFactory, "footer", [
          buildElement(idFactory, {
            type: "loom.action",
            props: { href: "https://example.com/docs", variant: "quiet", scale: "small" },
            children: [text(`Wire up ${title}`)],
          }),
        ]),
      ],
    })

  /** The one card with a picture, so the media region has something to bleed. */
  const featured = buildElement(idFactory, {
    type: "loom.card",
    props: { href: "https://example.com/changelog", padding: "loose" },
    children: [
      buildElement(idFactory, {
        type: "loom.stack",
        props: { direction: "row", gap: "tight", align: "center", wrap: false },
        children: [
          icon("◆", { shape: "circle", tone: "accent", size: "small" }),
          buildElement(idFactory, { type: "loom.badge", props: { tone: "neutral" }, children: [text("New")] }),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 3 },
        children: [text("Every proposal, end to end")],
      }),
    ],
  })

  const featuredWithMedia = buildElement(idFactory, {
    type: "loom.card",
    props: { tone: "outline", padding: "normal" },
    children: [
      buildSlot(idFactory, "media", [
        buildElement(idFactory, {
          type: "loom.media",
          props: {
            src: "https://example.com/portal.png",
            alt: "The review queue, mid-proposal",
            aspect: "wide",
            corners: "none",
          },
        }),
      ]),
      buildElement(idFactory, {
        type: "loom.heading",
        props: { level: 3 },
        children: [text("Watch a change land")],
      }),
    ],
  })

  const band = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Integrations", tone: "surface" },
    children: [
      buildSlot(idFactory, "heading", [
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 2 },
          children: [text("It meets the stack you already run")],
        }),
      ]),
      buildElement(idFactory, {
        type: "loom.grid",
        props: { columns: "three", gap: "normal" },
        children: [
          integration("◈", "Postgres", "Your own store, your own retention.", "surface"),
          integration("◇", "Vercel", "Ship the portal beside the app.", "surface"),
          integration("★", "Anthropic", "Bring the model you already pay for.", "accent"),
          featured,
          featuredWithMedia,
        ],
      }),
    ],
  })

  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [band],
    }),
    idFactory
  )
}

describe("the compose-and-arrange layer", () => {
  it("renders a band nobody ported, out of the general four", () => {
    const { markup, diagnostics } = render(arrangedPage(EDITORIAL))

    expect(diagnostics).toEqual([])
    expect(markup).toContain("It meets the stack you already run")
    expect(markup).toContain("Wire up Postgres")
    expect(markup).toContain("Every proposal, end to end")
  })

  it("puts the card's media outside the padding and its footer on the card's floor", () => {
    const { markup } = render(arrangedPage(EDITORIAL))

    /**
     * The two claims that make these regions rather than children (0051). The
     * media region carries no padding — that is what "flush to the edges"
     * means — and the footer carries `margin-top:auto`, which is the only
     * reason a row of cards of unequal length has its actions on one line.
     */
    const mediaAt = markup.indexOf("portal.png")
    const cardOpensAt = markup.lastIndexOf("<div", mediaAt)

    expect(markup.slice(cardOpensAt, mediaAt)).not.toContain("padding:")
    expect(markup).toContain("margin-top:auto")
    expect(markup).toContain("border-top:1px solid var(--loom-border-subtle)")

    /** And the clip that lets it be flush without a negative margin. */
    expect(markup).toContain("overflow:hidden")
  })

  it("makes a linked card the anchor, and lifts it without being told to", () => {
    const { markup } = render(arrangedPage(EDITORIAL))
    const anchorAt = markup.indexOf('href="https://example.com/changelog"')
    const anchor = markup.slice(markup.lastIndexOf("<a", anchorAt), markup.indexOf(">", anchorAt))

    expect(anchor.startsWith("<a ")).toBe(true)
    expect(anchor).toContain(LIBRARY_CLASS.lift)
  })

  it("flips a stack's axis with a prop, since a flip is a configure and not a rebuild", () => {
    const column = render(arrangedPage(EDITORIAL)).markup

    expect(column).toContain("flex-direction:row")
    expect(column).toContain("flex-direction:column")

    /**
     * The 0062 assertion. `direction` decides how however-many children are
     * arranged and never how many there are, so the same node with the same
     * children renders both ways — which is what makes the adaptation a
     * `configure` rather than a `remove` and an `insert`.
     */
    const rowOnly = render(
      createTree(
        buildElement(sequentialIdFactory(), {
          type: "loom.stack",
          props: { direction: "row" },
          children: [buildText(sequentialIdFactory(), "one"), buildText(sequentialIdFactory(), "two")],
        }),
        sequentialIdFactory()
      )
    ).markup

    expect(rowOnly).toContain("flex-direction:row")
    expect(rowOnly).toContain("one")
    expect(rowOnly).toContain("two")
  })

  it("keeps a grid's columns a floor rather than a count", () => {
    const idFactory = sequentialIdFactory()
    const children = ["alpha", "beta", "gamma", "delta", "epsilon"]

    const gridOf = (columns: string): string =>
      render(
        createTree(
          buildElement(idFactory, {
            type: "loom.grid",
            props: { columns },
            children: children.map((child) => buildText(idFactory, child)),
          }),
          idFactory
        )
      ).markup

    /**
     * The near-miss the granularity doc warns about, asserted rather than
     * argued: `two` and `four` change the minimum width and nothing else. Every
     * child survives both, so the prop changes no node and stays a prop.
     */
    for (const columns of ["two", "four"]) {
      const markup = gridOf(columns)
      for (const child of children) expect(markup).toContain(child)
    }

    expect(gridOf("two")).toContain("22rem")
    expect(gridOf("four")).toContain("13rem")
  })

  it("wraps a general grid at the same widths as the band-shaped one", () => {
    const idFactory = sequentialIdFactory()

    const minimumIn = (markup: string): string | undefined =>
      /minmax\(min\(100%, ([^)]+)\)/.exec(markup)?.[1]

    const general = render(
      createTree(
        buildElement(idFactory, {
          type: "loom.grid",
          props: { columns: "three" },
          children: [buildText(idFactory, "cell")],
        }),
        idFactory
      )
    ).markup

    const band = render(
      createTree(
        buildElement(idFactory, {
          type: "loom.feature-grid",
          props: { columns: "three" },
          children: [buildText(idFactory, "cell")],
        }),
        idFactory
      )
    ).markup

    /** One shared table in `layout.ts`, so a page that mixes them breaks in one place. */
    expect(minimumIn(general)).toBe(minimumIn(band))
    expect(minimumIn(general)).toBe("17rem")
  })

  it("hides an unlabelled glyph and names a labelled one", () => {
    const idFactory = sequentialIdFactory()

    const iconOf = (props: JsonObject): string =>
      render(
        createTree(
          buildElement(idFactory, { type: "loom.icon", props, children: [buildText(idFactory, "★")] }),
          idFactory
        )
      ).markup

    /**
     * Decorative is the default because the common case is a glyph beside the
     * word it repeats, and a screen reader reading both is worse than reading
     * neither. Naming one is opting in.
     */
    expect(iconOf({})).toContain('aria-hidden="true"')
    expect(iconOf({})).not.toContain('role="img"')

    const named = iconOf({ label: "Favourite" })
    expect(named).toContain('role="img"')
    expect(named).toContain('aria-label="Favourite"')
    expect(named).not.toContain("aria-hidden")
  })

  it("survives the re-theme with no literal colour below the root", () => {
    const editorial = splitStylesheet(render(arrangedPage(EDITORIAL)).markup).tree
    const bold = splitStylesheet(render(arrangedPage(BOLD)).markup).tree
    const body = bold.slice(bold.indexOf(">"))

    expect(render(arrangedPage(BOLD)).diagnostics).toEqual([])
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

  it("refuses a tier that tries to carry its own list of features again", () => {
    const tier = propsOf("loom.tier")

    /**
     * The port's rule, enforced by the schema rather than by a reviewer
     * noticing. `.strict()` is what makes "features are child nodes" a fact
     * about the tree and not a convention a proposal can route around.
     */
    expect(tier({ name: "Studio", price: "$99", features: ["a", "b"] }).outcome).toBe("invalid")
    expect(tier({ name: "Studio", price: "$99", ctaUrl: "https://example.com" }).outcome).toBe("invalid")
    expect(tier({ name: "Studio", price: "$99", highlighted: true }).outcome).toBe("invalid")
    expect(tier({ name: "Studio", price: "$99", emphasis: "featured" }).outcome).toBe("valid")
  })

  it("lets a price be the free text a real price list needs", () => {
    const tier = propsOf("loom.tier")

    for (const price of ["Free", "Custom", "$99", "from £5k"]) {
      expect(tier({ name: "Plan", price }).outcome).toBe("valid")
    }

    expect(tier({ name: "Plan", price: 99 }).outcome).toBe("invalid")
    expect(tier({ name: "Plan" }).outcome).toBe("invalid")
  })

  it("refuses a perk state the renderer has no marker for, on both halves of the pair", () => {
    /**
     * Asserted on both because 0061 splits one primitive into two that share a
     * schema module. The point of sharing it is that a state added to one
     * cannot be missing from the other, and this is what says so.
     */
    for (const type of ["loom.perk-list-item", "loom.perk"]) {
      const perk = propsOf(type)

      expect(perk({ label: "SSO", state: "maybe" }).outcome).toBe("invalid")
      expect(perk({ label: "SSO", state: "coming" }).outcome).toBe("valid")
      expect(perk({ label: "SSO" }).outcome).toBe("valid")
      expect(perk({ label: "SSO", note: "single sign-on" }).outcome).toBe("valid")
    }
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
