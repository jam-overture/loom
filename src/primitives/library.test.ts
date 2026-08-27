import { createElement, type ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type IdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { SUBMIT_PROP_KEY } from "../reserved-props.js"
import { err, ok } from "../result.js"
import {
  createEndpointRegistry,
  defineEndpoint,
  type EndpointEntry,
  type EndpointRegistry,
} from "../submit/endpoint.js"
import { resolveTreeSubmissions } from "../submit/resolve.js"
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
import { LINK_MARK, LINK_MARK_SIZE } from "./link-mark.js"
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
const MINIMAL = { palette: "minimal", fontPack: "minimal-sans", stylePreset: "precise" }

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
     * **No `text` here, deliberately.** It used to be wired because omitting it
     * was not a no-op — every primitive was handed an empty map, so a declared
     * accessible name silently became no accessible name, which this library's
     * tests noticed and filed as a finding on 16 August.
     *
     * #84 closed it: declarations now come off the `resolver` itself, and
     * `options.text` is only a host's dictionary laid over them
     * ([0063](../../decisions/0063-a-declared-string-travels-with-the-primitive.md)).
     * So leaving it out is the honest wiring for a host that has no
     * translations, and the declared-name assertions below now prove the new
     * behaviour rather than working around the old one.
     */
    themes,
    editMode,
  })

  return { markup: renderToStaticMarkup(rendered.element), diagnostics: rendered.diagnostics }
}

describe("the starter library", () => {
  it("registers as sixty-four primitives, structure first and the leaves that go anywhere last", () => {
    expect(STARTER_PRIMITIVES).toHaveLength(64)
    expect(registry.primitives.map((primitive) => primitive.type)).toEqual([
      "loom.page",
      "loom.nav",
      "loom.section",
      "loom.split",
      "loom.stack",
      "loom.grid",
      "loom.mosaic",
      "loom.marquee",
      "loom.card",
      "loom.hero",
      "loom.feature-grid",
      "loom.feature",
      "loom.milestone-list",
      "loom.milestone",
      "loom.stat-grid",
      "loom.stat",
      "loom.tier-table",
      "loom.tier",
      "loom.perk-list",
      "loom.perk-list-item",
      "loom.comparison-table",
      "loom.comparison-row",
      "loom.comparison",
      "loom.table",
      "loom.table-row",
      "loom.table-cell",
      "loom.product-grid",
      "loom.product",
      "loom.quote-grid",
      "loom.quote",
      "loom.person-grid",
      "loom.person",
      "loom.avatar-row",
      "loom.article-grid",
      "loom.article",
      "loom.logo-cloud",
      "loom.logo",
      "loom.faq-list",
      "loom.faq",
      "loom.form",
      "loom.field",
      "loom.option",
      "loom.footer",
      "loom.link-list",
      "loom.heading",
      "loom.prose",
      "loom.list",
      "loom.list-item",
      "loom.callout",
      "loom.code",
      "loom.code-span",
      "loom.emphasis",
      "loom.badge",
      "loom.icon",
      "loom.avatar",
      "loom.kbd",
      "loom.perk",
      "loom.divider",
      "loom.media",
      "loom.embed",
      "loom.before-after",
      "loom.action",
      "loom.button",
      "loom.link",
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
    expect(types).toContain("loom.mosaic")
    expect(types).not.toContain("loom.stack-grid")

    /**
     * `loom.mosaic` is the third of them and the one that shows the rule is
     * doing work rather than describing two names that happened to be short:
     * *mosaic* is an arrangement with no child word to build a container name
     * out of, and `loom.bento-grid` — the name a model is likelier to reach for
     * — would have tripped the stem rule by promising a `loom.bento` that does
     * not and should not exist.
     */
    for (const general of ["loom.stack", "loom.grid", "loom.mosaic"]) {
      expect(general.endsWith("-grid")).toBe(false)
    }

    /**
     * `loom.list` is the fourth container named for the arrangement
     * alone, and the first of them with a child it names. It needs no
     * exception here for the same reason `loom.grid` does not — the stem rule
     * strips an arrangement word *with its hyphen* — and its child is named for
     * the element it is, which is 0061 extended by one step to the primitive
     * that has no twin.
     */
    expect(types).toContain("loom.list")
    expect(types).toContain("loom.list-item")
    expect(types).not.toContain("loom.item")
    expect(types).not.toContain("loom.point-list")

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
    expect(describes("loom.mosaic")).toContain("prefer a named band")
    /** The word a model looking for this arrangement actually knows it by. */
    expect(describes("loom.mosaic")).toContain("bento")
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
      "loom.milestone",
      "loom.stat",
      "loom.perk-list-item",
      "loom.product",
      "loom.quote",
      "loom.person",
      "loom.article",
      "loom.logo",
      "loom.faq",
      /** The face on its own, which is a leaf for the reason `loom.person` is. */
      "loom.avatar",
      /**
       * `loom.field` is deliberately absent. It places children only when its
       * `type` is `select`, and the probe now asks it under every value its own
       * enum declares (0075) rather than under the default alone — so the one
       * primitive here whose answer depends on a prop is no longer reported as
       * having nowhere to put a child node.
       */
      "loom.perk",
      "loom.divider",
      /**
       * The two new frames. An `<iframe>` has no interior this library can
       * address, and a wipe places two *slots* rather than a run of children —
       * so neither has anywhere to put a child node, and both say so.
       */
      "loom.embed",
      "loom.before-after",
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

    /**
     * The catalogue pair, where the region list is the difference between them:
     * a written piece has qualifiers and nowhere to put a button, because the
     * card is already the button (0066).
     */
    expect(catalogue.find((primitive) => primitive.type === "loom.article")?.slots).toEqual(["meta"])
    expect(catalogue.find((primitive) => primitive.type === "loom.product")?.slots).toEqual([
      "meta",
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
  it("covers every registered primitive across the ten fixtures", () => {
    const typesIn = (tree: LoomTree): readonly string[] =>
      [...render(tree, true).markup.matchAll(/data-loom-type="([^"]+)"/g)].flatMap((match) =>
        match[1] === undefined ? [] : [match[1]]
      )

    const used = new Set([
      ...typesIn(samplePage(EDITORIAL)),
      ...typesIn(marketingPage(EDITORIAL)),
      ...typesIn(pricingPage(EDITORIAL)),
      ...typesIn(arrangedPage(EDITORIAL)),
      ...typesIn(portedPage(EDITORIAL)),
      ...typesIn(cataloguePage(EDITORIAL)),
      ...typesIn(chromePage(EDITORIAL)),
      ...typesIn(contactPage(EDITORIAL)),
      ...typesIn(technicalPage(EDITORIAL)),
      ...typesIn(comparisonPage(EDITORIAL)),
      ...typesIn(prosePage(EDITORIAL)),
      ...typesIn(tablePage(EDITORIAL)),
      ...typesIn(motionPage(EDITORIAL)),
    ])

    expect([...registry.primitives.map((primitive) => primitive.type)].filter((type) => !used.has(type))).toEqual([])
  })

  it("never pads a full-width band past the parent it sits in", () => {
    /**
     * A phone-width horizontal scroll, asserted as an invariant rather than
     * caught by eye. An inline style carries no reset, so `box-sizing` is
     * `content-box` and a band that says `width: 100%` and then pads itself is
     * wider than its parent by exactly its padding — on a 390px screen the
     * library was rendering a 486px page. Nothing in a pure render can notice
     * that, and no test before this one could either.
     */
    const offenders = [
      samplePage,
      marketingPage,
      pricingPage,
      arrangedPage,
      portedPage,
      cataloguePage,
      chromePage,
      contactPage,
      technicalPage,
      prosePage,
      tablePage,
    ].flatMap((fixture) =>
      [...render(fixture(EDITORIAL)).markup.matchAll(/style="([^"]*)"/g)]
        .map(([, style]) => style ?? "")
        .filter(
          (style) =>
            /padding-inline[^:]*:(?!0)/.test(style) &&
            style.includes("width:100%") &&
            !style.includes("box-sizing:border-box")
        )
    )

    expect(offenders).toEqual([])
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

/**
 * The two ported pairs. The milestone band is deliberately built here as a
 * *roadmap* rather than a timeline — same primitive, markers that are versions
 * and statuses instead of dates — because that equivalence is the whole reason
 * seven Hermes blocks became one pair, and a fixture that only ever showed
 * dates would not demonstrate it.
 */
const portedPage = (theme: Record<string, string>, idFactory: IdFactory = sequentialIdFactory()): LoomTree => {
  const text = (value: string) => buildText(idFactory, value)

  const milestone = (props: JsonObject) => buildElement(idFactory, { type: "loom.milestone", props })

  const roadmap = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Roadmap" },
    children: [
      buildSlot(idFactory, "heading", [
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 2 },
          children: [text("What has shipped, and what is next")],
        }),
      ]),
      buildElement(idFactory, {
        type: "loom.milestone-list",
        props: { density: "loose" },
        children: [
          milestone({
            marker: "v0.4",
            title: "The compose-and-arrange layer",
            body: "Stack, grid, card and icon — the general vocabulary.",
            state: "done",
          }),
          milestone({
            marker: "v0.5",
            title: "The sequence bands",
            body: "Seven Hermes blocks, one pair.",
            state: "current",
            href: "https://example.com/roadmap",
          }),
          milestone({ marker: "Q4", title: "Chrome", body: "Navigation and a footer.", state: "planned" }),
        ],
      }),
    ],
  })

  const team = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Team", tone: "surface" },
    children: [
      buildSlot(idFactory, "heading", [
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 2 },
          children: [text("The people who answer when you write in")],
        }),
      ]),
      buildElement(idFactory, {
        type: "loom.person-grid",
        props: { columns: "three" },
        children: [
          buildElement(idFactory, {
            type: "loom.person",
            props: {
              name: "Ada Whitfield",
              role: "Head of Platform",
              bio: "Wrote the Gate's first rule table and has argued about it since.",
              photo: "https://example.com/ada.jpg",
            },
          }),
          buildElement(idFactory, {
            type: "loom.person",
            props: { name: "Ren Okafor", role: "Staff Engineer", href: "https://example.com/ren" },
          }),
          buildElement(idFactory, {
            type: "loom.person",
            props: { name: "Sofia Lindqvist", role: "Design Director", align: "center" },
          }),
        ],
      }),
    ],
  })

  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [roadmap, team],
    }),
    idFactory
  )
}

describe("the ported bands", () => {
  it("renders a roadmap and a team with nothing left unhonoured", () => {
    const { markup, diagnostics } = render(portedPage(EDITORIAL))

    expect(diagnostics).toEqual([])
    expect(markup).toContain("What has shipped, and what is next")
    expect(markup).toContain("The compose-and-arrange layer")
    expect(markup).toContain("Ada Whitfield")
  })

  it("takes a marker that is a version, a quarter or a date, because Hermes never parsed it", () => {
    const { markup } = render(portedPage(EDITORIAL))

    /**
     * The reason seven blocks are one pair: `marker` is free text, so a roadmap
     * and a changelog and a timeline differ by what is written in it and not by
     * which primitive was chosen.
     */
    for (const marker of ["v0.4", "v0.5", "Q4"]) expect(markup).toContain(marker)
  })

  it("ends the rail at the last dot, in CSS, because no node knows it is last", () => {
    const { markup } = render(portedPage(EDITORIAL))
    const { stylesheet } = splitStylesheet(markup)

    /** Every entry draws a connector — including the last, which cannot know. */
    const connectors = [...markup.matchAll(new RegExp(LIBRARY_CLASS.railLine, "g"))]
    expect(connectors.length).toBeGreaterThanOrEqual(3)

    /** And the stylesheet is the only thing that does know. */
    expect(stylesheet).toContain(`.loom-rail > li:last-child .${LIBRARY_CLASS.railLine}`)
    expect(stylesheet).toContain(`.loom-rail > li:last-child .${LIBRARY_CLASS.railBody}`)
  })

  it("names the two states that contradict the default, and only those", () => {
    const { markup } = render(portedPage(EDITORIAL))

    /**
     * `loom.perk`'s rule, applied to a second primitive: a hollow dot says "not
     * yet" to someone looking and nothing to someone listening, so `current`
     * and `planned` carry declared names (0060). `done` does not — announcing
     * "Completed" on every row of a history is how a list becomes unlistenable.
     */
    expect(markup).toContain('aria-label="In progress"')
    expect(markup).toContain('aria-label="Planned"')
    expect(markup).not.toContain('aria-label="Completed"')
    expect(markup).toContain('aria-hidden="true"')
  })

  it("carries the list's density and rail in classes, since a child cannot be told", () => {
    const idFactory = sequentialIdFactory()

    /**
     * The tree, not the whole markup: the hoisted stylesheet names every class
     * in the library, so asserting a class is *absent* from the markup would
     * pass only by accident and fail here for the wrong reason.
     */
    const listOf = (props: JsonObject): string =>
      splitStylesheet(
        render(
          createTree(
            buildElement(idFactory, {
              type: "loom.milestone-list",
              props,
              children: [buildElement(idFactory, { type: "loom.milestone", props: { title: "One" } })],
            }),
            idFactory
          )
        ).markup
      ).tree

    expect(listOf({})).toContain(LIBRARY_CLASS.rail)
    expect(listOf({})).not.toContain(LIBRARY_CLASS.railTight)
    expect(listOf({ density: "tight" })).toContain(LIBRARY_CLASS.railTight)
    expect(listOf({ rail: "none" })).toContain(LIBRARY_CLASS.railNone)
  })

  it("falls back to a monogram for a person with no photograph", () => {
    const { markup } = render(portedPage(EDITORIAL))

    /** Two initials, the convention a reader recognises. */
    expect(markup).toContain(">RO<")
    expect(markup).toContain(">SL<")

    /**
     * And an empty alt on the one that has a photograph: the name is in the
     * same node, so alt text would make a screen reader say it twice.
     */
    expect(markup).toContain('src="https://example.com/ada.jpg"')
    expect(markup).toMatch(/<img[^>]*src="https:\/\/example\.com\/ada\.jpg"[^>]*alt=""/)
  })

  it("survives the re-theme with no literal colour below the root", () => {
    const editorial = splitStylesheet(render(portedPage(EDITORIAL)).markup).tree
    const bold = splitStylesheet(render(portedPage(BOLD)).markup).tree
    const body = bold.slice(bold.indexOf(">"))

    expect(render(portedPage(BOLD)).diagnostics).toEqual([])
    expect(editorial.slice(editorial.indexOf(">"))).toBe(body)
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
  })
})

/**
 * The two catalogue pairs, and the one fixture that shows what separates them.
 *
 * Both bands are the same five fields — a picture, a name, a label, a sentence,
 * a destination — so a fixture that rendered them apart would prove nothing.
 * Rendered together, the whole of [0066] is visible in one page: the written
 * pieces put their anchor over the card, and the products put a control on the
 * floor and link nothing else.
 *
 * The article band is built as a **press page** rather than a blog index —
 * kickers that are publications rather than dates — for the reason the ported
 * fixture is built as a roadmap: the collapse of five Hermes blocks into one
 * pair is the claim, and a fixture that only ever showed dated posts would not
 * demonstrate it.
 */
const cataloguePage = (theme: Record<string, string>, idFactory: IdFactory = sequentialIdFactory()): LoomTree => {
  const text = (value: string) => buildText(idFactory, value)

  const badge = (label: string) =>
    buildElement(idFactory, { type: "loom.badge", props: { tone: "outline" }, children: [text(label)] })

  const article = (props: JsonObject, meta: readonly string[] = []) =>
    buildElement(idFactory, {
      type: "loom.article",
      props,
      children: meta.length === 0 ? [] : [buildSlot(idFactory, "meta", meta.map(badge))],
    })

  const press = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Press" },
    children: [
      buildSlot(idFactory, "heading", [
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 2 },
          children: [text("What people have written about us")],
        }),
      ]),
      buildElement(idFactory, {
        type: "loom.article-grid",
        props: { columns: "three", lead: true },
        children: [
          article(
            {
              kicker: "The Standard",
              title: "The framework that asks permission before it changes anything",
              excerpt:
                "A long look at why the interesting part of an AI-authored interface is the part that refuses.",
              image: "https://example.com/standard.jpg",
              href: "https://example.com/press/standard",
            },
            ["Feature", "12 min read"]
          ),
          article({
            kicker: "Q2 2026",
            title: "Rebuilding a year-old page in an afternoon",
            excerpt: "Seventy blocks, twenty-five content models, and what the difference cost.",
            href: "https://example.com/press/rebuild",
          }),
          article(
            {
              kicker: "Northwind Foods",
              title: "Forty stores, one tree, no deploy",
              excerpt: "What happened when the people who write the copy stopped filing tickets for it.",
              image: "https://example.com/northwind.jpg",
              href: "https://example.com/press/northwind",
            },
            ["Case study"]
          ),
        ],
      }),
    ],
  })

  const product = (props: JsonObject, meta: readonly string[], action?: string) =>
    buildElement(idFactory, {
      type: "loom.product",
      props,
      children: [
        buildSlot(idFactory, "meta", meta.map(badge)),
        ...(action === undefined
          ? []
          : [
              buildSlot(idFactory, "action", [
                buildElement(idFactory, {
                  type: "loom.action",
                  props: { href: "https://example.com/buy", variant: "primary" },
                  children: [text(action)],
                }),
              ]),
            ]),
      ],
    })

  const shop = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Shop", tone: "surface" },
    children: [
      buildSlot(idFactory, "heading", [
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 2 },
          children: [text("Things you can take away today")],
        }),
      ]),
      buildElement(idFactory, {
        type: "loom.product-grid",
        props: { columns: "three" },
        children: [
          product(
            {
              name: "The porting field guide",
              price: "$29",
              description: "Seventy blocks, one at a time, with the granularity test worked through each.",
              image: "https://example.com/guide.jpg",
              href: "https://example.com/guide",
            },
            ["PDF", "148 pages"],
            "Buy the guide"
          ),
          product(
            {
              name: "Starter trees",
              price: "Free",
              description: "Six pages you can drop in and rearrange.",
              href: "https://example.com/trees",
            },
            ["JSON"],
            "Download"
          ),
          product({ name: "Stationery", price: "From £12", image: "https://example.com/paper.jpg" }, ["18 items"]),
        ],
      }),
    ],
  })

  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [press, shop],
    }),
    idFactory
  )
}

describe("the catalogue bands", () => {
  it("renders a press page and a shop with nothing left unhonoured", () => {
    const { markup, diagnostics } = render(cataloguePage(EDITORIAL))

    expect(diagnostics).toEqual([])
    expect(markup).toContain("What people have written about us")
    expect(markup).toContain("The framework that asks permission before it changes anything")
    expect(markup).toContain("The porting field guide")
    expect(markup).toContain("From £12")
  })

  it("names a written piece's link by its title alone, and covers the card with it", () => {
    const { markup, diagnostics } = render(cataloguePage(EDITORIAL))

    /**
     * 0066's first half, and the assertion the whole record exists for. The
     * anchor's text content is the accessible name, so it must be the title and
     * nothing else — not the kicker, not the excerpt, not the meta strip. The
     * card is still the click target, and that is what the class says.
     */
    const anchors = [...markup.matchAll(/<a\b[^>]*class="([^"]*)"[^>]*>([^<]*)<\/a>/g)]
    const covers = anchors.filter(([, className]) => className?.includes(LIBRARY_CLASS.coverLink))

    expect(covers).toHaveLength(3)
    expect(covers.map(([, , label]) => label)).toEqual([
      "The framework that asks permission before it changes anything",
      "Rebuilding a year-old page in an afternoon",
      "Forty stores, one tree, no deploy",
    ])

    /** The root of a written piece is not itself a target, which is what makes a link inside one valid. */
    expect(markup).not.toMatch(/<a[^>]*>\s*<article/)
    expect(diagnostics).toEqual([])
  })

  it("gives a product a control on the floor and no overlay to fight it", () => {
    const { markup } = render(cataloguePage(EDITORIAL))

    /**
     * 0066's second half. The three articles carry the overlay class; the three
     * products carry none, so the buy buttons are the only targets on their
     * cards. A product's name is still a link — an ordinary one.
     */
    expect(splitStylesheet(markup).tree.match(new RegExp(LIBRARY_CLASS.coverLink, "g"))).toHaveLength(3)
    expect(markup).toContain(">Buy the guide<")
    expect(markup).toContain(">Download<")
    expect(markup).toMatch(/<a[^>]*href="https:\/\/example\.com\/guide"[^>]*>The porting field guide<\/a>/)
  })

  it("makes every qualifier its own node, since a download is never one thing", () => {
    const { markup } = render(cataloguePage(EDITORIAL), true)

    /**
     * Hermes' `format` and `itemCount` were single strings, and this is what
     * they became: `PDF` and `148 pages` are two badges a delta can insert or
     * remove one at a time, not one field somebody has to split at a separator.
     */
    const badges = [...markup.matchAll(/data-loom-type="loom\.badge"/g)]
    expect(badges).toHaveLength(7)
    expect(markup).toContain(">PDF<")
    expect(markup).toContain(">148 pages<")
    expect(markup).toContain(">18 items<")
  })

  it("takes a kicker that is a publication, a quarter or a client, because Hermes never parsed it", () => {
    const { markup } = render(cataloguePage(EDITORIAL))

    /**
     * The claim the five-block collapse rests on: `date`, publication `name`
     * and `client` are one free-text label, and a parsed date could carry none
     * of the three.
     */
    expect(markup).toContain(">The Standard<")
    expect(markup).toContain(">Q2 2026<")
    expect(markup).toContain(">Northwind Foods<")
  })

  it("carries the lead layout in a class, since no cell knows it is first", () => {
    const { stylesheet, tree } = splitStylesheet(render(cataloguePage(EDITORIAL)).markup)

    expect(tree).toContain(LIBRARY_CLASS.lead)
    expect(stylesheet).toContain(".loom-lead > article:first-of-type")

    /**
     * And it stays a prop, which is the granularity doc's sharper question
     * asserted rather than argued: turning it off changes the class and leaves
     * the set of nodes exactly as it was. A `lead` that promoted, truncated or
     * duplicated a cell would fail here.
     */
    const bandOf = (props: JsonObject): string => {
      const idFactory = sequentialIdFactory()
      const grid = buildElement(idFactory, {
        type: "loom.article-grid",
        props,
        children: [
          buildElement(idFactory, { type: "loom.article", props: { title: "First" } }),
          buildElement(idFactory, { type: "loom.article", props: { title: "Second" } }),
        ],
      })

      return render(
        createTree(
          buildElement(idFactory, {
            type: "loom.page",
            props: { [THEME_PROP_KEY]: EDITORIAL, width: "wide" },
            children: [grid],
          }),
          idFactory
        ),
        true
      ).markup
    }

    const idsIn = (markup: string): readonly string[] =>
      [...markup.matchAll(/data-loom-id="([^"]+)"/g)].flatMap((match) => (match[1] === undefined ? [] : [match[1]]))

    expect(splitStylesheet(bandOf({ lead: true })).tree).toContain(LIBRARY_CLASS.lead)
    expect(splitStylesheet(bandOf({})).tree).not.toContain(LIBRARY_CLASS.lead)
    expect(idsIn(bandOf({ lead: true }))).toEqual(idsIn(bandOf({})))
  })

  it("survives the re-theme with no literal colour below the root", () => {
    const editorial = splitStylesheet(render(cataloguePage(EDITORIAL)).markup).tree
    const bold = splitStylesheet(render(cataloguePage(BOLD)).markup).tree
    const body = bold.slice(bold.indexOf(">"))

    expect(render(cataloguePage(BOLD)).diagnostics).toEqual([])
    expect(editorial.slice(editorial.indexOf(">"))).toBe(body)
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
  })
})

/**
 * The chrome, top and bottom, around a page that is only there to be framed.
 *
 * It is built as a **site** rather than as a specimen strip, because the two
 * claims the chrome makes are about a site and cannot be seen anywhere else:
 * the header knows which page the reader is on, and the footer's columns are
 * named groups rather than columns that happen to look like groups. A fixture
 * of one nav and one footer with placeholder links would render the same
 * pixels and prove neither.
 */
const chromePage = (theme: Record<string, string>, idFactory: IdFactory = sequentialIdFactory()): LoomTree => {
  const text = (value: string) => buildText(idFactory, value)

  const link = (label: string, href: string, props: JsonObject = {}) =>
    buildElement(idFactory, { type: "loom.link", props: { href, ...props }, children: [text(label)] })

  const group = (label: string, items: readonly (readonly [string, string])[]) =>
    buildElement(idFactory, {
      type: "loom.link-list",
      props: { label },
      children: items.map(([itemLabel, href]) => link(itemLabel, href, { tone: "muted", scale: "small" })),
    })

  const nav = buildElement(idFactory, {
    type: "loom.nav",
    props: { position: "sticky", tone: "surface", align: "end" },
    children: [
      link("Product", "https://example.com/product", { scale: "small", current: true }),
      link("How it works", "https://example.com/how-it-works", { scale: "small" }),
      link("Pricing", "https://example.com/pricing", { scale: "small" }),
      link("Docs", "https://example.com/docs", { scale: "small" }),
      buildSlot(idFactory, "brand", [
        buildElement(idFactory, {
          type: "loom.logo",
          props: { name: "Loom", href: "https://example.com/" },
        }),
      ]),
      buildSlot(idFactory, "actions", [
        buildElement(idFactory, {
          type: "loom.action",
          props: { href: "https://example.com/start", variant: "primary", scale: "small" },
          children: [text("Start building")],
        }),
      ]),
    ],
  })

  const body = buildElement(idFactory, {
    type: "loom.hero",
    props: { backdrop: "grid", align: "center", eyebrow: "The chrome" },
    children: [
      buildSlot(idFactory, "heading", [
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 1, balance: true },
          children: [text("A page knows where it begins and where it ends")],
        }),
      ]),
      buildElement(idFactory, {
        type: "loom.prose",
        children: [text("The bar above and the band below are nodes, not markup wrapped around the render.")],
      }),
    ],
  })

  const footer = buildElement(idFactory, {
    type: "loom.footer",
    props: { tone: "surface", columns: "four" },
    children: [
      group("Product", [
        ["Overview", "https://example.com/product"],
        ["Pricing", "https://example.com/pricing"],
        ["Changelog", "https://example.com/changelog"],
      ]),
      group("Learn", [
        ["Documentation", "https://example.com/docs"],
        ["Decision records", "https://example.com/decisions"],
        ["The porting guide", "https://example.com/guide"],
      ]),
      group("Company", [
        ["About", "https://example.com/about"],
        ["Careers", "https://example.com/careers"],
        ["Write to us", "mailto:hello@example.com"],
      ]),
      buildSlot(idFactory, "brand", [
        buildElement(idFactory, { type: "loom.logo", props: { name: "Loom" } }),
        buildElement(idFactory, {
          type: "loom.prose",
          props: { size: "small", tone: "muted" },
          children: [text("An adaptive UI runtime. The interface is data, and every change to it is reviewable.")],
        }),
      ]),
      buildSlot(idFactory, "note", [
        buildElement(idFactory, {
          type: "loom.prose",
          props: { size: "small", tone: "muted" },
          children: [text("© 2026 Loom")],
        }),
        buildElement(idFactory, {
          type: "loom.link-list",
          props: { direction: "row" },
          children: [
            link("Privacy", "https://example.com/privacy", { tone: "muted", scale: "small" }),
            link("Terms", "https://example.com/terms", { tone: "muted", scale: "small" }),
            link("Source", "https://example.com/source", { tone: "muted", scale: "small", external: true }),
          ],
        }),
      ]),
    ],
  })

  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "full", fills: true },
      children: [nav, body, footer],
    }),
    idFactory
  )
}

describe("the page chrome", () => {
  it("renders a header and a footer with nothing left unhonoured", () => {
    const { markup, diagnostics } = render(chromePage(EDITORIAL))

    expect(diagnostics).toEqual([])
    expect(markup).toContain("<nav")
    expect(markup).toContain("<footer")
    expect(markup).toContain("How it works")
    expect(markup).toContain("Decision records")
    expect(markup).toContain("Start building")
  })

  it("marks the page the reader is on, which is the whole reason `current` exists", () => {
    const { markup } = render(chromePage(EDITORIAL))

    /**
     * One `aria-current` and exactly one. The header keeps every route in the
     * menu and marks the one it is showing — the marketing site's header
     * dropped the current route instead, because nothing in the tree could say
     * this, and a menu that changes length as you walk the site is what that
     * costs.
     */
    const marked = [...markup.matchAll(/<a[^>]*aria-current="page"[^>]*>([^<]*)</g)]

    expect(marked.map(([, label]) => label)).toEqual(["Product"])

    /** Pinned open by the stylesheet rather than by a second class to learn. */
    expect(markup).toContain(`.loom-underline[aria-current="page"]`)
  })

  it("names every group of links, so a footer is landmarks rather than columns", () => {
    const { markup } = render(chromePage(EDITORIAL))

    const labelled = [...markup.matchAll(/<nav[^>]*aria-label="([^"]+)"/g)]

    expect(labelled.map(([, label]) => label)).toEqual(["Product", "Learn", "Company"])

    /**
     * The visible heading and the landmark's name are one prop, so they cannot
     * drift. The unlabelled group in the note region is a `<div>` for the
     * reason `loom.link-list` gives: a page of nameless navigation landmarks is
     * worse for a reader than none.
     */
    expect(markup).toContain(">Product</p>")
    expect([...markup.matchAll(/<nav\b/g)]).toHaveLength(4)
  })

  it("keeps the menu children and puts the ends in regions, which is 0052 and 0051", () => {
    const catalogue = catalogueOf(registry)

    expect(catalogue.find((primitive) => primitive.type === "loom.nav")?.slots).toEqual([
      "brand",
      "actions",
    ])
    expect(catalogue.find((primitive) => primitive.type === "loom.footer")?.slots).toEqual([
      "brand",
      "note",
    ])

    /**
     * The 0052 assertion for this unit: neither band declares a prop that
     * carries its items, so a menu grows and shrinks by `insert` and `remove`
     * and every link is a node with an author.
     */
    const propNames = (type: string): readonly string[] =>
      catalogue.find((primitive) => primitive.type === type)?.props?.map((prop) => prop.name) ?? []

    expect(propNames("loom.nav")).toEqual(["align", "position", "tone"])
    expect(propNames("loom.footer")).toEqual(["columns", "tone"])
  })

  it("takes a link's label as a child, since one string is the whole of what it says", () => {
    const catalogue = catalogueOf(registry)

    expect(catalogueOf(registry).find((primitive) => primitive.type === "loom.link")?.props?.map((prop) => prop.name))
      .toEqual(["current", "external", "href", "scale", "tone"])

    /** No `label`. 0059, and the same call `loom.action` and `loom.badge` make. */
    expect(catalogue.find((primitive) => primitive.type === "loom.link")?.props?.some((prop) => prop.name === "label"))
      .toBe(false)
    expect(auditRegistry(registry).leaves).not.toContain("loom.link")
  })

  it("collapses the bar behind one control, with the links left where they were", () => {
    const { markup } = render(chromePage(EDITORIAL))

    const bar = markup.slice(markup.indexOf("<nav"), markup.indexOf("</nav>"))

    /**
     * This assertion used to say the opposite, and the replaced version is
     * worth remembering: it held that a disclosure would need one subtree
     * inside a `<details>` on a phone and outside it on a laptop, so the only
     * ways out were two copies for a screen reader to read or client state the
     * runtime did not have. 0092 gave the runtime a control that stamps its own
     * state on itself, and the subtree never had to move.
     *
     * So: still one copy of the menu, still no `<details>`, and still wrapping
     * — which is now what the collapsed rendering is *built on* rather than the
     * whole of the responsive behaviour.
     */
    expect(bar).toContain("flex-wrap:wrap")
    expect(bar).not.toContain("<details")
    expect([...bar.matchAll(/class="loom-nav-menu"/g)]).toHaveLength(1)
    expect([...bar.matchAll(/class="loom-nav-toggle"/g)]).toHaveLength(1)
  })

  it("survives the re-theme with no literal colour below the root", () => {
    const editorial = splitStylesheet(render(chromePage(EDITORIAL)).markup).tree
    const bold = splitStylesheet(render(chromePage(BOLD)).markup).tree
    const body = bold.slice(bold.indexOf(">"))

    expect(render(chromePage(BOLD)).diagnostics).toEqual([])
    expect(editorial.slice(editorial.indexOf(">"))).toBe(body)
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
  })
})

/**
 * The contact page: two forms, one that asks a lot and one that asks for an
 * email address, plus the section that introduces them.
 *
 * `declared` is what the tree says under `loom:submit`, and it defaults to
 * **nothing** — so the fixtures that render this page synchronously exercise
 * the untargeted state, which is the one a page has before anybody wires a
 * deployment. The targeted states need the seam resolved first and are asked
 * for by name below.
 */
const contactPage = (
  theme: Record<string, string>,
  idFactory: IdFactory = sequentialIdFactory(),
  declared: { readonly enquiry?: JsonObject; readonly subscribe?: JsonObject } = {}
): LoomTree => {
  const text = (value: string) => buildText(idFactory, value)

  const field = (props: JsonObject, choices: readonly string[] = []) =>
    buildElement(idFactory, {
      type: "loom.field",
      props,
      children: choices.map((choice) =>
        buildElement(idFactory, { type: "loom.option", children: [text(choice)] })
      ),
    })

  const button = (label: string, props: JsonObject) =>
    buildElement(idFactory, { type: "loom.button", props, children: [text(label)] })

  const enquiry = buildElement(idFactory, {
    type: "loom.form",
    props: {
      layout: "paired",
      width: "wide",
      ...(declared.enquiry === undefined ? {} : { [SUBMIT_PROP_KEY]: declared.enquiry }),
    },
    children: [
      field({ name: "name", label: "Your name", required: true, autocomplete: "name" }),
      field({ name: "email", label: "Email", type: "email", required: true }),
      field({ name: "organisation", label: "Company", autocomplete: "organization" }),
      field(
        { name: "heard", label: "How did you hear about Loom?", type: "select", placeholder: "Choose one" },
        ["A colleague", "The documentation", "A conference talk", "Somewhere else"]
      ),
      field({
        name: "message",
        label: "What are you building?",
        type: "textarea",
        required: true,
        span: "row",
        hint: "A paragraph is plenty. We read every one of these.",
      }),
      buildSlot(idFactory, "submit", [
        button("Send the message", { variant: "primary", scale: "large", width: "full" }),
      ]),
      buildSlot(idFactory, "note", [
        buildElement(idFactory, {
          type: "loom.perk",
          props: { label: "We reply within two working days", state: "included" },
        }),
      ]),
    ],
  })

  const subscribe = buildElement(idFactory, {
    type: "loom.form",
    props: {
      layout: "inline",
      width: "readable",
      ...(declared.subscribe === undefined ? {} : { [SUBMIT_PROP_KEY]: declared.subscribe }),
    },
    children: [
      field({
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        placeholder: "you@example.com",
      }),
      buildSlot(idFactory, "submit", [button("Subscribe", { variant: "secondary" })]),
      buildSlot(idFactory, "note", [
        buildElement(idFactory, {
          type: "loom.prose",
          props: { size: "small", tone: "muted" },
          children: [text("One note a month about what shipped. Leave whenever you like.")],
        }),
      ]),
    ],
  })

  const section = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Contact", width: "wide" },
    children: [
      buildSlot(idFactory, "heading", [
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 2, balance: true },
          children: [text("Tell us what you are building")],
        }),
      ]),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "lead", tone: "muted" },
        children: [text("The heading, the sentence and the form are three nodes, not three fields on one.")],
      }),
      enquiry,
      subscribe,
    ],
  })

  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide" },
      children: [section],
    }),
    idFactory
  )
}

const endpointsOf = (...entries: readonly EndpointEntry[]): EndpointRegistry => {
  const built = createEndpointRegistry(entries)
  if (!built.ok) throw new Error(`the endpoint registry refused: ${built.error.code}`)

  return built.value
}

/**
 * A render with the submission seam resolved, which is the only way to see a
 * form in any state but untargeted. It is the same wiring a deployment does —
 * plan, resolve, then a synchronous walk (0065) — so the two-step is the
 * assertion as much as the markup is.
 */
const renderPosting = async (
  tree: LoomTree,
  endpoints: EndpointRegistry
): Promise<{ markup: string; diagnostics: readonly unknown[] }> => {
  const submissions = await resolveTreeSubmissions(tree, { registry: endpoints })
  const rendered = renderLoomTree(tree, {
    resolver: registry,
    validator: registry,
    themes,
    submissions,
  })

  return { markup: renderToStaticMarkup(rendered.element), diagnostics: rendered.diagnostics }
}

const propsOfType = (type: string): readonly string[] =>
  catalogueOf(registry)
    .find((primitive) => primitive.type === type)
    ?.props?.map((prop) => prop.name) ?? []

const CSRF = "a-token-minted-for-this-request"

const workingEndpoints = (): EndpointRegistry =>
  endpointsOf(
    defineEndpoint({
      id: "contact.enquiry",
      description: "The enquiry inbox.",
      endpoint: {
        target: async () =>
          ok({
            action: "/api/enquiry",
            method: "post" as const,
            fields: [{ name: "csrf", value: CSRF }],
          }),
      },
    }),
    defineEndpoint({
      id: "newsletter.subscribe",
      description: "The monthly note.",
      endpoint: {
        target: async () =>
          ok({ action: "https://lists.example.com/subscribe", method: "post" as const, fields: [] }),
      },
    })
  )

const targeted = (theme: Record<string, string>): LoomTree =>
  contactPage(theme, sequentialIdFactory(), {
    enquiry: { to: "contact.enquiry" },
    subscribe: { to: "newsletter.subscribe" },
  })

describe("the form band", () => {
  it("posts where the deployment said, carrying what the deployment asked it to carry", async () => {
    const { markup, diagnostics } = await renderPosting(targeted(EDITORIAL), workingEndpoints())

    expect(diagnostics).toEqual([])
    expect(markup).toContain('action="/api/enquiry"')
    expect(markup).toContain('action="https://lists.example.com/subscribe"')
    expect(markup).toContain('method="post"')
    expect(markup).toContain(`<input type="hidden" name="csrf" value="${CSRF}"/>`)

    /**
     * The token is outside the fieldset, and this is the assertion that keeps
     * it there: a disabled fieldset makes every control inside it unsuccessful,
     * so a CSRF field that ever sits in one is a form that posts without its
     * token on the day the endpoint has a bad afternoon.
     */
    expect(markup.indexOf('name="csrf"')).toBeLessThan(markup.indexOf("<fieldset"))
    expect(markup).not.toContain("<fieldset disabled")
  })

  it("renders disabled, and says so, when the tree never named a destination", () => {
    const { markup, diagnostics } = render(contactPage(EDITORIAL))

    /**
     * The failure 0065 exists to prevent is a submit button that silently goes
     * nowhere. A tree that declared nothing is not a diagnostic — nothing was
     * misdeclared — so the page itself has to be honest about it.
     */
    expect(diagnostics).toEqual([])
    expect(markup).toContain("<fieldset disabled")
    expect(markup).toContain("This form is not connected yet")
    expect(markup).not.toContain("<form action")
    expect(markup).not.toContain('method="post"')
  })

  it("tells a deployment that cannot answer apart from one that will not", async () => {
    const failing = endpointsOf(
      defineEndpoint({
        id: "contact.enquiry",
        description: "The enquiry inbox, mid-incident.",
        endpoint: {
          target: async () => err({ code: "unavailable" as const, detail: "the token store timed out" }),
        },
      }),
      defineEndpoint({
        id: "newsletter.subscribe",
        description: "A list that closed.",
        endpoint: {
          target: async () => err({ code: "refused" as const, detail: "the list is not taking sign-ups" }),
        },
      })
    )

    const { markup, diagnostics } = await renderPosting(targeted(EDITORIAL), failing)

    /** Two states the seam keeps apart, so two sentences a visitor acts on differently. */
    expect(markup).toContain("Please try again in a moment")
    expect(markup).toContain("not accepting messages")
    expect(markup).not.toContain("<form action")

    /**
     * The reason itself never reaches the page. It reaches the diagnostics,
     * where the person who can fix a timed-out token store is looking.
     */
    expect(markup).not.toContain("token store")
    expect(diagnostics).toHaveLength(2)
    expect(JSON.stringify(diagnostics)).toContain("submit-unavailable")
    expect(JSON.stringify(diagnostics)).toContain("the token store timed out")
  })

  it("disables the submit control without the control knowing anything about it", () => {
    const { markup } = render(contactPage(EDITORIAL))

    /**
     * `loom.submit` reaches the node that declared the submission and not its
     * children, so a `loom.button` cannot know the form around it has no
     * address. A disabled fieldset is what makes that irrelevant — and it is
     * why the button carries no `disabled` prop for some other node to set
     * correctly.
     */
    const fieldset = markup.slice(markup.indexOf("<fieldset"))

    expect(fieldset).toContain("<button")
    expect(fieldset).toContain("Send the message")
    expect(propsOfType("loom.button")).toEqual(["scale", "variant", "width"])
  })

  it("turns Hermes' twelve-shape `fields` array into twelve nodes, which is 0052's first half", () => {
    const catalogue = catalogueOf(registry)
    const propsOf = (type: string): readonly string[] =>
      catalogue.find((primitive) => primitive.type === type)?.props?.map((prop) => prop.name) ?? []

    /**
     * The whole 0052 assertion for this unit. Hermes held a `fields` list of
     * `ContactFormField` on the block, so adding a phone number was a
     * `configure` carrying all twelve and no field had an author. Neither prop
     * here carries an item.
     */
    expect(propsOf("loom.form")).toEqual(["layout", "width"])
    expect(propsOf("loom.field")).toEqual([
      "autocomplete",
      "hint",
      "label",
      "name",
      "placeholder",
      "required",
      "span",
      "type",
    ])

    /** The two regions the form places wherever its fields end (0051). */
    expect(catalogue.find((primitive) => primitive.type === "loom.form")?.slots).toEqual([
      "submit",
      "note",
    ])
  })

  it("gives a select the choices Hermes' dropdown never had, as child nodes", () => {
    const { markup } = render(contactPage(EDITORIAL))

    const select = markup.slice(markup.indexOf("<select"), markup.indexOf("</select>"))

    expect(select).toContain(">A colleague<")
    expect(select).toContain(">Somewhere else<")

    /**
     * No `value` attribute on a choice whose label is the value: an `<option>`
     * submits its own text, so the string is not written twice to drift.
     */
    expect(select).toContain("<option>A colleague</option>")

    /** The placeholder is the selected choice, and it is not a submittable one. */
    expect(select).toContain('<option value="" disabled="" selected="">Choose one</option>')
  })

  it("wires a label, a hint and an autocomplete token to the control they belong to", () => {
    const { markup } = render(contactPage(EDITORIAL))

    const labelled = [...markup.matchAll(/<label for="([^"]+)"/g)].map(([, id]) => id)
    const controls = [...markup.matchAll(/<(?:input|textarea|select)[^>]*id="([^"]+)"/g)].map(
      ([, id]) => id
    )

    /** Every label points at a control that exists, and every control has one. */
    expect(labelled).toHaveLength(6)
    expect(controls.sort()).toEqual([...labelled].sort())

    const describedBy = /<textarea[^>]*aria-describedby="([^"]+)"/.exec(markup)?.[1]

    expect(describedBy).toBeDefined()
    expect(markup).toContain(`<p id="${describedBy ?? ""}"`)
    expect(markup).toContain("A paragraph is plenty")

    /**
     * `autocomplete` is emitted, and derived where the type says it plainly —
     * better markup than Hermes had rather than a port of it. A contact form
     * that makes someone type their own email address again is one measurably
     * fewer people finish.
     */
    /**
     * Case-insensitively, because React 19 writes the prop's own spelling into
     * the attribute and HTML attribute names do not care. The browser reads it
     * either way; the assertion should not pin a renderer's spelling.
     */
    expect(markup).toMatch(/autocomplete="name"/i)
    expect(markup).toMatch(/autocomplete="organization"/i)
    expect(markup).toMatch(/type="email" autocomplete="email"/i)
  })

  it("keeps the row layout to CSS the children cannot see", async () => {
    const { markup } = await renderPosting(targeted(EDITORIAL), workingEndpoints())

    /**
     * A field in a row has to grow and a field in a column must not, and the
     * field cannot know which it is in. A descendant rule in the static
     * stylesheet reaches it — the same mechanic `details[open] > summary` uses
     * — so no prop was invented for a parent to set on its children.
     */
    expect(markup).toContain(".loom-form-inline > .loom-field")
    expect(markup).toContain(`class="${LIBRARY_CLASS.formInline}"`)
  })

  it("draws its own focus ring and its own chevron, because neither is the palette's by default", () => {
    const { markup } = render(contactPage(EDITORIAL))

    /** A native select arrow is the operating system's colour, and cannot be told about a theme. */
    expect(markup).toContain(".loom-select::after")
    expect(markup).toContain("border-inline-end: 2px solid currentColor")
    expect(markup).toContain(".loom-input:focus-visible")
    expect(markup).toContain("outline: 2px solid var(--loom-border-accent)")

    /** Reduced motion drops the transition and keeps the ring, which is feedback rather than movement. */
    const reduced = markup.slice(markup.indexOf("@media (prefers-reduced-motion"))

    expect(reduced).toContain(".loom-input")
  })

  it("survives the re-theme in every state, with no literal colour below the root", async () => {
    const editorial = await renderPosting(targeted(EDITORIAL), workingEndpoints())
    const bold = await renderPosting(targeted(BOLD), workingEndpoints())
    const boldBody = splitStylesheet(bold.markup).tree

    expect(editorial.diagnostics).toEqual([])
    expect(bold.diagnostics).toEqual([])
    expect(splitStylesheet(editorial.markup).tree.slice(splitStylesheet(editorial.markup).tree.indexOf(">")))
      .toBe(boldBody.slice(boldBody.indexOf(">")))
    expect(boldBody.slice(boldBody.indexOf(">"))).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(boldBody.slice(boldBody.indexOf(">"))).not.toMatch(/\b(rgba?|hsla?)\(/)

    /** The untargeted state is a different page, and it is held to the same rule. */
    const untargeted = splitStylesheet(render(contactPage(MINIMAL)).markup).tree

    expect(untargeted.slice(untargeted.indexOf(">"))).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it("carries no destination of its own on the control that sends it", () => {
    /**
     * `formAction` is the one attribute that would let a button override where
     * its form posts, and a primitive that accepted it would have reopened the
     * channel 0065 closed. There is no prop here that reaches the network, on
     * the button or on the form.
     */
    expect(propsOfType("loom.button")).not.toContain("formAction")
    expect(propsOfType("loom.form")).not.toContain("action")
    expect(propsOfType("loom.form")).not.toContain("to")
    expect(render(contactPage(EDITORIAL)).markup).not.toContain("formaction")
  })
})

describe("the targets the library declares", () => {
  const declarationOf = (type: string) =>
    registry.primitives.find((primitive) => primitive.type === type)?.interactive

  it("declares a target wherever the reader aims at the whole node", () => {
    /**
     * 0064's adoption, which #88 filed for this lane and 0068 finishes. The
     * list is asserted rather than derived, so a primitive that grows an
     * `href` and forgets to say so fails here rather than in a deployment
     * whose Gate quietly stops refusing nested targets.
     */
    expect(declarationOf("loom.action")).toBe("always")
    expect(declarationOf("loom.link")).toBe("always")
    /** The submit control: the whole of it is what a reader presses (0068). */
    expect(declarationOf("loom.button")).toBe("always")

    for (const type of ["loom.card", "loom.feature", "loom.logo", "loom.article"]) {
      expect(declarationOf(type)).toEqual({ whenProps: ["href"] })
    }
  })

  it("leaves the card whose control is the target undeclared, which is 0066 and 0068", () => {
    /**
     * The one that reads the other way, and the reason 0068 was worth writing.
     * `loom.product` has an `href` like the others — but it links the *name*,
     * and 0066 puts a real `loom.action` in the region beneath on purpose.
     * Declaring it would make the Gate refuse this library's own composition,
     * which is how a check ends up switched off everywhere.
     */
    expect(declarationOf("loom.product")).toBeUndefined()

    const { diagnostics, markup } = render(cataloguePage(EDITORIAL))

    expect(diagnostics).toEqual([])
    expect(markup).toContain("Buy the guide")
  })

  it("declares nothing on a container, since a container is not a target", () => {
    for (const type of ["loom.footer", "loom.link-list", "loom.article-grid", "loom.product-grid", "loom.form", "loom.field"]) {
      expect(declarationOf(type)).toBeUndefined()
    }
  })

  it("declares the one container that holds a control, which is what keeps a menu out of a card", () => {
    /**
     * `loom.nav` was in the list above until 27 August and left it by taking
     * the disclosure control. A container is not a target *because of what it
     * arranges*; a container that places a `<button>` is one anyway, and the
     * registry refuses the `disclose` declaration without this — which is the
     * check that stops a menu button ending up inside a linked card, where a
     * browser silently drops one of the two.
     */
    expect(declarationOf("loom.nav")).toBe("always")
    expect(declarationOf("loom.code")).toBe("always")
  })

  it("names only props the schema declares, which the registry is what enforces", () => {
    /**
     * The half of the declaration that is checkable. A renamed prop with the
     * trigger left pointing at the old name is the drift that actually
     * happens, and it is a failed registration rather than a check that
     * quietly stops firing.
     */
    const declared = createStarterPrimitiveRegistry([
      {
        ...STARTER_PRIMITIVES.find((primitive) => primitive.type === "loom.card")!,
        type: "host.card",
        interactive: { whenProps: ["destination"] },
      },
    ])

    expect(declared.ok).toBe(false)
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

  it("renders every fixture under the house theme, which is the third palette's whole job", () => {
    /**
     * `minimal` is the first palette not ported from Hermes, and a third one
     * earns its keep here rather than in the theme tests: two palettes prove a
     * primitive reads its colours from slots, and the third proves the *slots
     * were filled by someone who knew what reads them*. A palette that put its
     * light green at `accent` would compile, register, and resolve — and every
     * eyebrow, kicker and disclosure marker in these eight fixtures would come
     * out at 1.6:1 with nothing failing.
     */
    for (const fixture of [samplePage, marketingPage, pricingPage, arrangedPage, portedPage, cataloguePage, chromePage, contactPage, technicalPage, comparisonPage]) {
      const { markup, diagnostics } = render(fixture(MINIMAL))
      const tree = splitStylesheet(markup).tree
      const body = tree.slice(tree.indexOf(">"))

      expect(diagnostics).toEqual([])
      expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
    }
  })

  it("changes nothing below the root when the house theme is the one selected", () => {
    /**
     * The same guarantee the two ported palettes are held to, asserted for the
     * third: a re-theme is three ids on the root and nothing else (0049). The
     * font pack and style preset differ here as well as the palette, so this
     * also catches a primitive that hard-coded a length or a family.
     */
    const editorial = splitStylesheet(render(chromePage(EDITORIAL)).markup).tree
    const minimal = splitStylesheet(render(chromePage(MINIMAL)).markup).tree

    expect(editorial.slice(editorial.indexOf(">"))).toBe(minimal.slice(minimal.indexOf(">")))
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

  it("spans the line with every ornament, which nothing asserted until one shipped wrong", () => {
    /**
     * The marketing routine's finding, as the assertion that was missing. The
     * palette test rendered all three ornaments and asserted about colour, so a
     * mark drawn at the left end of an empty line passed it for six days. The
     * divider's element is a flex row: an ornament that states neither a width
     * nor a flex shrinks to its content, and `dots` and `diamond` both did.
     */
    const ornament = (markup: string): string =>
      markup.slice(markup.indexOf("<span"), markup.indexOf(">", markup.indexOf("<span")))

    expect(ornament(dividerMarkup({ ornament: "rule" }))).toContain("width:100%")
    expect(ornament(dividerMarkup({ ornament: "dots" }))).toContain("flex:1 1 auto")
    expect(ornament(dividerMarkup({ ornament: "diamond" }))).toContain("flex:1 1 auto")
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

/**
 * The technical vocabulary: a page about a tool rather than about a service.
 *
 * It exercises every one of the five at least once and each of the props whose
 * value changes the markup, because the conformance probe asks a primitive what
 * it does under every closed choice (0075) and a fixture that only ever renders
 * the default leaves half of each schema unrendered by anything.
 */
const technicalPage = (theme: Record<string, string>, idFactory: IdFactory = sequentialIdFactory()): LoomTree => {
  const text = (value: string) => buildText(idFactory, value)

  const code = (props: JsonObject, body: string) =>
    buildElement(idFactory, { type: "loom.code", props, children: [text(body)] })

  const avatar = (name: string, image?: string) =>
    buildElement(idFactory, {
      type: "loom.avatar",
      props: image === undefined ? { name } : { name, image },
    })

  const key = (legend: string) =>
    buildElement(idFactory, { type: "loom.kbd", children: [text(legend)] })

  const install = buildElement(idFactory, {
    type: "loom.hero",
    props: { backdrop: "grid", align: "center", eyebrow: "Loom" },
    children: [
      buildSlot(idFactory, "heading", [
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 1 },
          children: [text("A tree, a delta, and a page that adapts")],
        }),
      ]),
      buildSlot(idFactory, "actions", [
        code({ tone: "terminal", density: "compact", language: "bash" }, "pnpm add @loom/runtime"),
      ]),
    ],
  })

  const proof = buildElement(idFactory, {
    type: "loom.stack",
    props: { direction: "row", gap: "snug" },
    children: [
      buildElement(idFactory, {
        type: "loom.avatar-row",
        children: [
          avatar("Ada Lovelace", "https://example.com/ada.jpg"),
          avatar("Grace Hopper"),
          avatar("Alan Turing"),
          avatar("Katherine Johnson"),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "small", tone: "muted" },
        children: [text("and four thousand others")],
      }),
    ],
  })

  const shortcut = buildElement(idFactory, {
    type: "loom.stack",
    props: { direction: "row", gap: "tight", wrap: false },
    children: [key("⌘"), key("K")],
  })

  const band = buildElement(idFactory, {
    type: "loom.mosaic",
    props: { rhythm: "showcase", gap: "loose" },
    children: [
      code(
        { language: "loom.tree.json", caption: "The node the proposal addresses" },
        '{\n  "type": "loom.heading",\n  "props": { "level": 1 }\n}'
      ),
      buildElement(idFactory, {
        type: "loom.card",
        props: { tone: "surface" },
        children: [
          buildElement(idFactory, {
            type: "loom.heading",
            props: { level: 3 },
            children: [text("Open the palette")],
          }),
          shortcut,
        ],
      }),
      buildElement(idFactory, {
        type: "loom.feature",
        props: { title: "Gated", body: "Every change is weighed before it lands." },
      }),
      buildElement(idFactory, {
        type: "loom.feature",
        props: { title: "Attributed", body: "Every node knows who placed it." },
      }),
      buildElement(idFactory, {
        type: "loom.feature",
        props: { title: "Reversible", body: "Every delta has an inverse." },
      }),
    ],
  })

  const spaced = buildElement(idFactory, {
    type: "loom.avatar-row",
    props: { spacing: "spaced" },
    children: [
      avatar("Ada Lovelace"),
      buildElement(idFactory, {
        type: "loom.avatar",
        props: { name: "Grace Hopper", size: "large", shape: "soft" },
      }),
      buildElement(idFactory, { type: "loom.avatar", props: { name: "Alan Turing", size: "small" } }),
    ],
  })

  const lead = buildElement(idFactory, {
    type: "loom.mosaic",
    props: { rhythm: "lead" },
    children: [
      code({ tone: "source" }, "const inverse = invert(delta)"),
      buildElement(idFactory, { type: "loom.card", children: [text("One")] }),
      buildElement(idFactory, { type: "loom.card", children: [text("Two")] }),
    ],
  })

  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
    children: [
      install,
      buildElement(idFactory, {
        type: "loom.section",
        children: [proof, band, spaced, lead],
      }),
      buildElement(idFactory, { type: "loom.mosaic", props: { rhythm: "alternating" }, children: [] }),
    ],
  })

  return createTree(page, idFactory)
}

/**
 * The tenth fixture: a page written in prose rather than assembled from bands.
 *
 * Every other fixture here proves that a *band* renders. This one proves the
 * layer underneath — that a sentence can stress a word, name a symbol, make
 * three points and stop to give a caveat — which is what the surfaces in
 * `apps/loom` are actually made of and what the library could not do until now.
 */
const prosePage = (theme: Record<string, string>, idFactory: IdFactory = sequentialIdFactory()): LoomTree => {
  const text = (value: string) => buildText(idFactory, value)

  const symbol = (name: string) =>
    buildElement(idFactory, { type: "loom.code-span", children: [text(name)] })

  const emphasis = (tone: string, value: string) =>
    buildElement(idFactory, { type: "loom.emphasis", props: { tone }, children: [text(value)] })

  const point = (...children: readonly ReturnType<typeof text>[]) =>
    buildElement(idFactory, { type: "loom.list-item", children: [...children] })

  const headline = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "The prose layer" },
    children: [
      buildSlot(idFactory, "heading", [
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 1, balance: true },
          children: [text("A page is written, not just "), emphasis("marked", "assembled")],
        }),
      ]),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "lead", measured: true },
        children: [
          text("A change is a "),
          emphasis("strong", "delta"),
          text(" the runtime hands to a "),
          symbol("ChangeInterpreter"),
          text(", which re-plans it against the tree it is actually given — "),
          emphasis("subtle", "not"),
          text(" the tree it was written against."),
        ],
      }),
    ],
  })

  const points = buildElement(idFactory, {
    type: "loom.list",
    props: { measured: true },
    children: [
      point(text("Every node knows who placed it.")),
      buildElement(idFactory, {
        type: "loom.list-item",
        children: [
          text("Every operation has an inverse, so "),
          symbol("invert(delta)"),
          text(" is always available."),
          buildElement(idFactory, {
            type: "loom.list",
            props: { marker: "none", density: "tight", size: "small" },
            children: [
              point(text("— including the ones a preset computed")),
              point(text("— and the ones a reviewer refused")),
            ],
          }),
        ],
      }),
      point(text("Nothing reaches the page without being weighed first.")),
    ],
  })

  const steps = buildElement(idFactory, {
    type: "loom.list",
    props: { marker: "number", density: "loose", measured: true },
    children: [
      point(text("The visitor asks for something.")),
      point(text("The model proposes a delta against the tree.")),
      point(text("The Gate weighs it on two axes and answers.")),
    ],
  })

  const caution = buildElement(idFactory, {
    type: "loom.callout",
    props: { title: "Before you start" },
    children: [
      buildSlot(idFactory, "marker", [
        buildElement(idFactory, {
          type: "loom.icon",
          props: { shape: "bare", tone: "accent", size: "medium" },
          children: [text("\u2605")],
        }),
      ]),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "small" },
        children: [
          text("A proposal is measured before it is applied. Run "),
          symbol("pnpm verify"),
          text(" and read what the Gate says back."),
        ],
      }),
    ],
  })

  const aside = buildElement(idFactory, {
    type: "loom.callout",
    props: { tone: "neutral" },
    children: [
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "small", tone: "muted" },
        children: [text("A callout with no title and no marker is still an aside, and still says so.")],
      }),
    ],
  })

  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { [THEME_PROP_KEY]: theme, width: "readable", fills: true },
    children: [
      headline,
      buildElement(idFactory, {
        type: "loom.section",
        children: [points, caution, steps, aside],
      }),
    ],
  })

  return createTree(page, idFactory)
}

describe("the technical vocabulary", () => {
  it("renders all five with nothing left unhonoured", () => {
    const { markup, diagnostics } = render(technicalPage(EDITORIAL))

    expect(diagnostics).toEqual([])
    expect(markup).toContain("<pre")
    expect(markup).toContain("<kbd")
    expect(markup).toContain("pnpm add @loom/runtime")
    expect(markup).toContain("and four thousand others")
  })

  it("keeps a snippet's whitespace, which is the whole reason it is not prose", () => {
    const { markup } = render(technicalPage(EDITORIAL))

    /**
     * The newlines and the two-space indent survive into the markup verbatim.
     * `loom.prose` would fold both into single spaces, which is why the port
     * map calls this block atomic rather than a composition.
     */
    expect(markup).toContain("{\n  &quot;type&quot;: &quot;loom.heading&quot;,")
    expect(markup).toMatch(/<pre[^>]*white-space:pre/)
  })

  it("scrolls a long line inside the panel rather than across the page", () => {
    const { markup } = render(technicalPage(EDITORIAL))

    /**
     * The 20 August phone-scrollbar finding, in the one primitive whose content
     * is deliberately unwrappable: the overflow is the `pre`'s, and the root is
     * allowed to be narrower than it so a flex or grid track is not widened by
     * a line nobody can break.
     */
    expect(markup).toMatch(/<pre[^>]*overflow-x:auto/)
    expect(markup).toMatch(/<figure[^>]*min-width:0/)
  })

  it("gives a terminal its window bar and a source listing none", () => {
    const { markup } = render(technicalPage(EDITORIAL))

    /**
     * The display-mode assertion for this unit (0052): one enum, two
     * renderings, and the difference is markup rather than a colour — a
     * terminal that were merely a darker panel would be unreadable under a
     * palette that has no dark surface.
     *
     * The *bar* stopped being part of that difference on 25 August, when the
     * copy control landed and needed somewhere to sit that is not on top of the
     * first line of the code. Every panel has one now; what still separates the
     * two tones is the window dots and where the label sits.
     */
    const panels = [...markup.matchAll(/<pre/g)]
    const dots = [...markup.matchAll(/border-radius:var\(--loom-radius-full\);background:var\(--loom-border-strong\)/g)]

    expect(panels).toHaveLength(3)
    expect(dots).toHaveLength(3)
    expect(markup).toContain("loom.tree.json")
  })

  it("names a face however it is drawn, so a monogram and a photograph read alike", () => {
    const { markup } = render(technicalPage(EDITORIAL))

    /** The photograph carries the name as its alt; the monogram carries it as a label. */
    expect(markup).toContain('alt="Ada Lovelace"')
    expect(markup).toContain('role="img" aria-label="Grace Hopper"')
    /** The first letter of the first two words, and never a third. */
    expect(markup).toContain(">GH<")
    expect(markup).toContain(">AT<")
  })

  it("keeps the overlap on the row and off the face, and puts its rule after the faces", () => {
    const { markup } = render(technicalPage(EDITORIAL))

    /**
     * The coupling this pair exists to avoid: a `loom.avatar` carries no prop
     * that means anything only inside a `loom.avatar-row`, so the negative
     * margin is a rule keyed on position. That rule is `> * + *`, which counts
     * from the first child — so a `<style>` emitted *before* the faces would
     * pull the first one half a face to the left. The library's other emitters
     * put it first; these two cannot.
     */
    expect(propsOfType("loom.avatar")).toEqual(["image", "name", "shape", "size"])
    expect(propsOfType("loom.avatar-row")).toEqual(["spacing"])
    expect(markup).toContain(".loom-cluster > * + *")
    expect(markup).toMatch(/class="loom-cluster"[^>]*><img/)
  })

  it("switches the mosaic's rhythm off in a narrow band, and counts from the first cell", () => {
    const { markup } = render(technicalPage(EDITORIAL))

    /**
     * 0079: the six columns exist only where there is room for them, and the
     * markup is identical either side of the breakpoint. The cycles are
     * asserted because a span that did not sum to six would leave a hole in
     * every row and no test that only renders would see it.
     *
     * **The question is asked of the band and not of the window**, which is
     * this run's repair of the 21 August finding. A `@media` here answered for
     * the viewport, so a mosaic in a split's end region or inside a card laid
     * six columns across four hundred pixels.
     */
    const sixColumns = markup.indexOf("grid-template-columns: repeat(6, 1fr)")
    const query = markup.lastIndexOf("@container (min-width: 48rem)", sixColumns)

    expect(sixColumns).toBeGreaterThan(-1)
    /** The rule is *inside* the container query, not merely near one. */
    expect(markup.slice(query, sixColumns)).not.toContain("}")
    expect(markup).toContain(".loom-mosaic-showcase > *:nth-child(5n + 1)")
    expect(markup).toContain(".loom-mosaic-lead > *:first-child")

    /** The frame declares the containment; nothing else in the library may answer for it. */
    expect(markup).toMatch(/\.loom-mosaic \{\s*container-type: inline-size;\s*\}/)
    expect(markup).toMatch(/class="loom-mosaic-grid loom-mosaic-showcase"[^>]*><figure/)
  })

  it("puts the frame outside the cells, and keeps one node id on one element", () => {
    const { markup } = render(technicalPage(EDITORIAL), true)

    /**
     * The frame is an element the *tree* does not have, which is the one thing
     * an extra wrapper can get wrong: 0051's failure, where a portal resolves
     * an id and highlights something that is not the node the reviewer clicked.
     * The identity stays on the frame and the grid carries none, so the count
     * is unchanged by this run.
     *
     * The stylesheet's position among the cells is deliberately *not* asserted
     * here — React hoists it out of the markup entirely, which is why the old
     * arrangement could only be defended in a comment. It is now in the frame,
     * one level above the cells, where a renderer that does not hoist cannot
     * count it as `:nth-child(1)` either. The trap is gone rather than avoided.
     */
    const frames = [...markup.matchAll(/<div[^>]*class="loom-mosaic"[^>]*>/g)]
    const grids = [...markup.matchAll(/<div[^>]*class="loom-mosaic-grid[^"]*"[^>]*>/g)]

    expect(frames).toHaveLength(3)
    expect(grids).toHaveLength(3)
    expect(frames.every(([opening]) => opening.includes("data-loom-node"))).toBe(true)
    expect(grids.some(([opening]) => opening.includes("data-loom-node"))).toBe(false)
  })

  it("sets no column count inline, because the rule is what has to change it", () => {
    const { markup } = render(technicalPage(EDITORIAL))

    /**
     * The trap `stylesheet.ts` names: an inline style beats a rule, so a
     * `display:grid` or a `grid-template-columns` set on the element would make
     * the container query inert and the band would be six columns on a phone.
     */
    const root = markup.slice(markup.indexOf('class="loom-mosaic-grid'))
    const opening = root.slice(0, root.indexOf(">"))

    expect(opening).not.toContain("grid-template-columns")
    expect(opening).not.toContain("display:grid")
    expect(opening).toContain("gap:")
  })

  it("renders an empty mosaic as an empty band rather than as nothing", () => {
    const { diagnostics, markup } = render(technicalPage(EDITORIAL))

    expect(diagnostics).toEqual([])
    expect([...markup.matchAll(/class="loom-mosaic-grid /g)]).toHaveLength(3)
  })

  it("takes its monospace from a variable the theme does not yet set, and falls back", () => {
    const { markup } = render(technicalPage(EDITORIAL))

    /**
     * The finding filed with this run: a font pack declares heading, body and
     * accent families and no mono. Written as a fallback so that the day
     * `--loom-mono-family` exists, every code panel and key cap already reads
     * it — and until then the stack resolves and nothing is unstyled.
     */
    expect(markup).toContain("var(--loom-mono-family, ui-monospace")
  })

  it("carries no props at all on the key cap, which is the honest shape", () => {
    /**
     * 0052's atomic case: a key is a key. A `size` prop was the candidate and
     * is wrong — a cap sits inside a line of text more often than beside one,
     * so it is sized in `em` against whatever it is set in.
     */
    expect(propsOfType("loom.kbd")).toEqual([])
    expect(render(technicalPage(EDITORIAL)).markup).toMatch(/<kbd[^>]*font-size:0\.85em/)
  })

  it("renders the same under every palette, with no colour of its own", () => {
    for (const theme of [EDITORIAL, BOLD, MINIMAL]) {
      const { markup, diagnostics } = render(technicalPage(theme))
      const tree = splitStylesheet(markup).tree
      const body = tree.slice(tree.indexOf(">"))

      expect(diagnostics).toEqual([])
      expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
    }
  })
})


describe("the prose vocabulary", () => {
  it("renders all five with nothing left unhonoured", () => {
    const { markup, diagnostics } = render(prosePage(EDITORIAL))

    expect(diagnostics).toEqual([])
    expect(markup).toContain("<ul")
    expect(markup).toContain("<ol")
    expect(markup).toContain("<li")
    expect(markup).toContain("<aside")
    expect(markup).toContain("<mark")
    expect(markup).toContain("ChangeInterpreter")
  })

  it("gives a numbered list an <ol> and a bulleted one a <ul>, because a reader is told which", () => {
    const { markup } = render(prosePage(EDITORIAL))

    /**
     * The element follows the `marker` prop rather than a `list-style` alone.
     * A numbered list styled onto a `<ul>` renders identically and announces
     * itself wrongly, which is the half of the choice a screenshot cannot show.
     */
    expect(markup).toMatch(/<ol[^>]*list-style-type:decimal/)
    expect(markup).toMatch(/<ul[^>]*list-style-type:disc/)
    expect(markup).toMatch(/<ul[^>]*list-style-type:none/)
  })

  it("keeps the gap between rows off the row, which is the coupling the pair exists to avoid", () => {
    const { markup } = render(prosePage(EDITORIAL))

    /**
     * A row cannot know how far it should sit from a sibling it cannot see, so
     * the gap is a rule keyed on position — the argument `loom.avatar-row`
     * makes about its overlap. The assertion that matters is the second one: a
     * `loom.list-item` carries no props at all and no style at all, so nothing
     * about it can disagree with the list it is in.
     */
    expect(markup).toContain(".loom-list > li + li")
    expect(markup).toContain(".loom-list-tight > li + li")
    expect(markup).toContain(".loom-list-loose > li + li")
    expect(propsOfType("loom.list-item")).toEqual([])
    /** No class, no style, no attribute of its own outside edit mode. */
    expect(markup).toContain("<li>")
  })

  it("colours the marker from the stylesheet, because ::marker cannot be reached inline", () => {
    const { markup } = render(prosePage(EDITORIAL))

    expect(markup).toContain(".loom-list > li::marker")
    expect(markup).toContain("color: var(--loom-accent)")
  })

  it("leaves the indent reachable and sets no margin the nested rule would lose to", () => {
    const { markup } = render(prosePage(EDITORIAL))

    /**
     * `stylesheet.ts`'s first mechanic: an inline style beats a rule, always.
     * A sublist's top margin is a rule, so the list must not set `margin`
     * inline — and the indent, which the rule never varies, must.
     */
    const opening = markup.slice(markup.indexOf("<ul"), markup.indexOf(">", markup.indexOf("<ul")))

    expect(opening).not.toContain("margin")
    expect(opening).toContain("padding-inline-start:1.4em")
    expect(markup).toContain(".loom-list .loom-list")
  })

  it("drops the indent when the marker is dropped, so a plain run does not hang off nothing", () => {
    const { markup } = render(prosePage(EDITORIAL))
    const start = markup.indexOf("list-style-type:none")

    expect(markup.slice(start, start + 120)).toContain("padding-inline-start:0")
  })

  it("marks a span with the tinted pairing that is measured, and not with the one that fails", () => {
    const { markup } = render(prosePage(EDITORIAL))

    /**
     * The 22 August contrast finding, avoided rather than rediscovered:
     * `fg-default` on `accent-subtle` is in `PALETTE_TEXT_PAIRINGS` and clears
     * 0074's bar everywhere; `accent` on the same ground is the obvious ink for
     * a tinted panel and does not. A `<mark>` needs both halves set, because
     * the UA supplies a yellow ground and black ink of its own.
     */
    const mark = markup.slice(markup.indexOf("<mark"), markup.indexOf("</mark>"))

    expect(mark).toContain("background:var(--loom-accent-subtle)")
    expect(mark).toContain("color:var(--loom-fg-default)")
    expect(mark).not.toContain("color:var(--loom-accent)")
  })

  it("gives each emphasis the element its meaning already has", () => {
    const { markup } = render(prosePage(EDITORIAL))

    /**
     * One content model, three renderings, one enum (0052) — and the element
     * changes with the enum because importance, stress and relevance are three
     * things a screen reader distinguishes and a font weight is not.
     */
    expect(markup).toMatch(/<em[^>]*font-style:italic/)

    /**
     * `bolder` rather than `var(--loom-heading-weight)`, which is the mistake
     * this shipped as and a screenshot caught. `bold-sans` declares
     * `headingWeight: 400` beside `bodyWeight: 400` — a legitimate pack that
     * carries emphasis in size and colour — so the heading token renders a
     * stressed word identically to the words either side of it. A relative
     * keyword is heavier than whatever it inherits under every pack, including
     * one nobody has registered yet.
     */
    expect(markup).toMatch(/<strong[^>]*font-weight:bolder/)
    expect(markup).not.toContain("<strong style=\"font-weight:var(--loom-heading-weight)")
    expect(propsOfType("loom.emphasis")).toEqual(["tone"])
  })

  it("sets a symbol in monospace inside the sentence, with no panel and no props", () => {
    const { markup } = render(prosePage(EDITORIAL))

    /**
     * The whole of the lessons finding: a symbol named inside a paragraph. It
     * is a `<code>` with no `<pre>` anywhere on the page, sized in `em` against
     * the line it sits in rather than off the ramp, and tinted with the other
     * measured pairing on `accent-subtle`.
     */
    const span = markup.slice(markup.indexOf("<code"), markup.indexOf("</code>"))

    expect(markup).not.toContain("<pre")
    expect(span).toContain("font-size:0.9em")
    expect(span).toContain("background:var(--loom-accent-subtle)")
    expect(span).toContain("color:var(--loom-accent-strong)")
    expect(span).toContain("var(--loom-mono-family, ui-monospace")
    expect(propsOfType("loom.code-span")).toEqual([])
  })

  it("lets a code span wrap rather than widen the aside it is in", () => {
    const { markup } = render(prosePage(EDITORIAL))

    /**
     * The 20 August scrollbar finding one level in. `white-space:nowrap` was
     * the tempting mistake — a symbol has no break opportunity inside it and
     * needs no help, while `pnpm verify` does and would push the panel out.
     */
    const span = markup.slice(markup.indexOf("<code"), markup.indexOf("</code>"))

    expect(span).not.toContain("white-space:nowrap")
    expect(markup).toMatch(/<aside[^>]*min-width:0/)
  })

  it("makes a callout an aside whose label stays out of the document outline", () => {
    const { markup } = render(prosePage(EDITORIAL))

    /**
     * The argument against building this as `loom.card` with `tone: "accent"`.
     * A card is a `<div>`, and the label would have to be a `loom.heading` to
     * be bold — which puts "Before you start" into the outline beside the
     * section titles, so a reader navigating by headings gets a page whose
     * structure is half furniture. Here it is a fixed field on a paragraph.
     */
    const aside = markup.slice(markup.indexOf("<aside"), markup.indexOf("</aside>"))

    expect(aside).toContain("Before you start")
    expect(aside).not.toMatch(/<h[1-6]/)
    expect(aside).toContain("border-inline-start:3px solid var(--loom-accent)")
    expect(propsOfType("loom.callout")).toEqual(["title", "tone"])
  })

  it("places the marker in its gutter ahead of the content it introduces", () => {
    const { markup } = render(prosePage(EDITORIAL))

    /**
     * 0051's test: the callout puts the marker where the flow of children does
     * not go, so "the first child is the icon" is a rule no schema states and
     * every `move` breaks. The region is a region because of this ordering.
     */
    const aside = markup.slice(markup.indexOf("<aside"), markup.indexOf("</aside>"))

    expect(aside.indexOf("\u2605")).toBeGreaterThan(-1)
    expect(aside.indexOf("\u2605")).toBeLessThan(aside.indexOf("Before you start"))
  })

  it("still draws a callout that was given neither a title nor a marker", () => {
    const { markup, diagnostics } = render(prosePage(EDITORIAL))

    expect(diagnostics).toEqual([])
    expect([...markup.matchAll(/<aside/g)]).toHaveLength(2)
    expect(markup).toContain("border-inline-start:3px solid var(--loom-border-strong)")
  })

  it("renders the same under every palette, with no colour of its own", () => {
    for (const theme of [EDITORIAL, BOLD, MINIMAL]) {
      const { markup, diagnostics } = render(prosePage(theme))
      const tree = splitStylesheet(markup).tree
      const body = tree.slice(tree.indexOf(">"))

      expect(diagnostics).toEqual([])
      expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
    }
  })
})

describe("a headline on a narrow screen", () => {
  it("holds the top two steps under a fraction of the screen, and leaves the rest alone", () => {
    /**
     * The 20 August finding, closed. A font pack's ramp is eight fixed pixel
     * sizes, so `level: 1` is 72px in every registered pack and a long word
     * runs past the padding into the hero's `overflow: hidden` — clipped, so no
     * overflow measurement sees it.
     *
     * Asserted as a `min()` rather than by measuring, because nothing in a pure
     * render has a viewport to measure against: what a test can hold is that
     * the cap is expressed, that it is expressed only where the ramp overflows,
     * and that the ramp is still the other half of it.
     */
    const idFactory = sequentialIdFactory()
    const heading = (level: number) =>
      buildElement(idFactory, {
        type: "loom.heading",
        props: { level },
        children: [buildText(idFactory, `Level ${level}`)],
      })

    const { markup } = render(
      createTree(
        buildElement(idFactory, {
          type: "loom.page",
          props: { [THEME_PROP_KEY]: MINIMAL },
          children: [heading(1), heading(2), heading(3)],
        }),
        idFactory
      )
    )

    expect(markup).toContain("font-size:min(var(--loom-scale-8), 11vw)")
    expect(markup).toContain("font-size:min(var(--loom-scale-7), 9vw)")
    /** Step 6 is 32px and fits a phone with room to spare. */
    expect(markup).toContain("font-size:var(--loom-scale-6)")
    expect(markup).not.toContain("min(var(--loom-scale-6)")
  })
})

/**
 * The comparison band: the one page a framework's front door cannot do without,
 * and the library's only two-dimensional structure.
 *
 * It renders the band twice, because 0075's probe asks a primitive what it does
 * under every closed choice its schema names and a fixture that only ever draws
 * the default leaves the other half of each enum drawn by nothing. Between the
 * two tables every value of `feature`, `density`, `role` and `mark` is on the
 * page, along with a row that has a criterion and a row that has none.
 */
const comparisonPage = (theme: Record<string, string>, idFactory: IdFactory = sequentialIdFactory()): LoomTree => {
  const subject = (name: string, note?: string) =>
    buildElement(idFactory, {
      type: "loom.comparison",
      props: note === undefined ? { role: "subject" } : { role: "subject", note },
      children: [buildText(idFactory, name)],
    })

  const cell = (props: JsonObject, value?: string) =>
    buildElement(idFactory, {
      type: "loom.comparison",
      props,
      children: value === undefined ? [] : [buildText(idFactory, value)],
    })

  const row = (props: JsonObject, cells: readonly ReturnType<typeof cell>[]) =>
    buildElement(idFactory, { type: "loom.comparison-row", props, children: [...cells] })

  const approaches = buildElement(idFactory, {
    type: "loom.comparison-table",
    props: { caption: "Loom against the two ways this is done today", feature: "first" },
    children: [
      buildSlot(idFactory, "columns", [
        row({}, [
          subject("Loom", "a runtime"),
          subject("Code generation"),
          subject("Hand-built", "a component per case"),
        ]),
      ]),
      row({ heading: "Every change has an inverse" }, [
        cell({ mark: "yes" }),
        cell({ mark: "no" }),
        cell({ mark: "no" }),
      ]),
      row({ heading: "Reviewed before a visitor sees it", note: "not after the fact" }, [
        cell({ mark: "yes" }),
        cell({ mark: "partial", note: "at the pull request" }),
        cell({ mark: "yes" }),
      ]),
      row({ heading: "Adapts to the person reading it" }, [
        cell({ mark: "yes" }),
        cell({ mark: "no" }),
        cell({ mark: "no" }),
      ]),
      row({ heading: "Who wrote this line" }, [
        cell({ mark: "yes" }, "Every node"),
        cell({ mark: "no" }),
        cell({ mark: "partial" }, "The commit"),
      ]),
      row({ heading: "Time to the first change" }, [
        cell({}, "Seconds"),
        cell({}, "A build"),
        cell({}, "A sprint"),
      ]),
    ],
  })

  const plans = buildElement(idFactory, {
    type: "loom.comparison-table",
    props: { density: "tight", feature: "none" },
    children: [
      buildSlot(idFactory, "columns", [row({}, [subject("Starter"), subject("Team")])]),
      row({ heading: "Deployments" }, [cell({}, "1"), cell({}, "Unlimited")]),
      row({ heading: "Attribution history" }, [cell({ mark: "yes" }), cell({ mark: "yes" })]),
      row({ heading: "Single sign-on" }, [cell({ mark: "no" }), cell({ mark: "yes" })]),
    ],
  })

  const band = (eyebrow: string, title: string, table: ReturnType<typeof row>) =>
    buildElement(idFactory, {
      type: "loom.section",
      props: { eyebrow },
      children: [
        buildSlot(idFactory, "heading", [
          buildElement(idFactory, {
            type: "loom.heading",
            props: { level: 2 },
            children: [buildText(idFactory, title)],
          }),
        ]),
        table,
      ],
    })

  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [
        band("Why Loom", "How it differs from generating code", approaches),
        band("Plans", "What each plan includes", plans),
      ],
    }),
    idFactory
  )
}

describe("the comparison band", () => {
  /** Every `<tr>` in the markup, as the list of its own top-level cell tags. */
  const rowsOf = (markup: string): readonly (readonly string[])[] =>
    [...markup.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(([, body]) =>
      [...(body ?? "").matchAll(/<(t[dh])\b/g)].map(([, tag]) => tag ?? "")
    )

  it("renders as a real table, with a caption and a head", () => {
    const { markup, diagnostics } = render(comparisonPage(EDITORIAL))

    expect(diagnostics).toEqual([])
    expect(markup).toContain("<thead>")
    expect(markup).toContain("<tbody>")
    expect(markup).toMatch(/<table aria-labelledby="[^"]+"/)
    expect(markup).toContain("Loom against the two ways this is done today")
    expect(markup).toContain("Every change has an inverse")
    expect(markup).toContain("A sprint")
  })

  it("gives every row the same number of cells, which is the invariant a shifted column breaks", () => {
    /**
     * The reason `loom.comparison-row` emits its leading cell whether or not it
     * has a heading. A row that skipped the empty corner would slide its
     * answers one column left of the subjects they belong to — a table that
     * lies rather than one that is missing a label, and nothing that merely
     * rendered it would notice.
     */
    const rows = rowsOf(render(comparisonPage(EDITORIAL)).markup)

    expect(rows).toHaveLength(10)

    const [approaches, plans] = [rows.slice(0, 6), rows.slice(6)]

    for (const row of approaches) expect(row).toHaveLength(4)
    for (const row of plans) expect(row).toHaveLength(3)
  })

  it("names the axes, so a cell is read back as its criterion and its subject", () => {
    const { markup } = render(comparisonPage(EDITORIAL))

    /**
     * The whole argument for a `<table>` over a grid of boxes. Without these a
     * screen reader reaching the fifteenth cell announces "No"; with them it
     * announces the question and the column it was asked of.
     */
    expect([...markup.matchAll(/scope="col"/g)]).toHaveLength(5)
    expect([...markup.matchAll(/scope="row"/g)]).toHaveLength(8)

    /** The corner above the criteria is a `<td>`: it heads nothing. */
    const [header] = rowsOf(markup)

    expect(header?.[0]).toBe("td")
    expect(header?.slice(1)).toEqual(["th", "th", "th"])
  })

  it("names all three verdicts, unlike a perk's tick", () => {
    const { markup } = render(comparisonPage(EDITORIAL))

    /**
     * 0060, decided the other way round from `perk-content.ts` and for a stated
     * reason: a perk sits under a heading that says "what you get", so a named
     * tick on every row is noise. A comparison cell has no such heading — the
     * row and column give the *question* — so a bare glyph that is not
     * announced is an answer a listener never receives.
     */
    expect(markup).toContain('aria-label="Yes"')
    expect(markup).toContain('aria-label="No"')
    expect(markup).toContain('aria-label="Partial"')
    expect(markup).toContain("\u2212")
    expect(markup).not.toMatch(/aria-hidden="true"[^>]*>✓/)
  })

  it("selects the featured column by position, because a column is not a node", () => {
    const { markup } = render(comparisonPage(EDITORIAL))

    /**
     * 0084. The rule is static text with an ordinal in it and no node id, which
     * is what 0055 requires of anything in this stylesheet — so the tree says
     * *feature the first subject* and where that lands is the implementation's.
     */
    expect(markup).toContain(`class="${LIBRARY_CLASS.compare} ${LIBRARY_CLASS.compareFeatureFirst}"`)
    expect(markup).toContain(".loom-compare-feature-1 tr > *:nth-child(2)")
    expect(markup).toContain(".loom-compare-feature-4 tr > *:nth-child(5)")

    /** The unfeatured table carries the base class and no column rule of its own. */
    expect(markup).toContain(`class="${LIBRARY_CLASS.compare} ${LIBRARY_CLASS.compareTight}"`)
  })

  it("repaints the ink inside the featured column, because two pairings there fail AA", () => {
    const { markup } = render(comparisonPage(EDITORIAL))

    /**
     * Measured across all 39 registered palettes rather than assumed. On
     * `accent-subtle` — the tinted column's ground — `accent` bottoms out at
     * 4.43:1 and `fg-subtle` at 3.76:1, both under the 4.5 bar 0074 holds a
     * text slot to. `accent-strong` clears it at 4.75:1 and `fg-muted` at
     * 4.99:1.
     *
     * So the tick is `accent-strong` **everywhere** rather than `accent` outside
     * the column and `accent-strong` inside it: one slot passes on both grounds,
     * and a tick that changed colour with its column would say something about
     * the answer that is not true. What the column does re-ink is the two that
     * recede, `no` and the notes, which is the rule asserted here.
     *
     * It is also why no mark and no note sets a colour inline. An inline colour
     * beats a rule, so a cell that painted its own glyph would be unreachable
     * from the column that has to re-ink it — the first trap `stylesheet.ts`
     * names, and here it would be an accessibility failure rather than a
     * cosmetic one.
     */
    expect(markup).toContain(".loom-compare-feature-1 tr > *:nth-child(2) .loom-compare-no")
    expect(markup).toContain(".loom-compare-feature-1 tr > *:nth-child(2) .loom-compare-note")
    expect(markup).toMatch(/\.loom-compare-yes\s*\{\s*color: var\(--loom-accent-strong\);/)

    const cells = markup.slice(markup.indexOf("<tbody>"))

    expect(cells).not.toMatch(/<span class="loom-compare-(yes|no|partial)"[^>]*color:/)
  })

  it("makes density a rule the table switches, not a length its cells set", () => {
    const { markup } = render(comparisonPage(EDITORIAL))

    /**
     * Density is a property of the band — one comparison is a spec to scan and
     * another is a page to read — and neither cell nor row can know which it is
     * in. So the padding lives where the container can reach it, and no cell
     * sets one inline for the rule to lose to.
     */
    expect(markup).toContain(".loom-compare th, .loom-compare td")
    expect(markup).toContain(".loom-compare-tight th, .loom-compare-tight td")
    expect(markup.slice(markup.indexOf("<tbody>"))).not.toMatch(/<t[dh][^>]*padding:/)
  })

  it("scrolls the band inside its own edge and keeps the criterion in view", () => {
    const { markup } = render(comparisonPage(EDITORIAL))

    /**
     * Four subjects are wider than a phone and no arrangement fixes that, so
     * the band overflows itself rather than the page — `loom.code`'s answer to
     * the 20 August scrollbar finding. The criterion sticks to the leading edge
     * on the way, because a row of ticks whose question has scrolled away is
     * the phone rendering of every comparison table nobody tried on a phone.
     */
    expect(markup).toMatch(/<div[^>]*overflow-x:auto[^>]*min-width:0/)
    expect(markup).toContain(".loom-compare-key")
    expect(markup).toContain("position: sticky")
    expect(markup).toContain("inset-inline-start: 0")
  })

  it("holds no list in any of the three schemas, which is 0052 for a two-dimensional band", () => {
    /**
     * The port map calls `comparison-table` a pair and it came out a trio,
     * because both axes are repeated content: rows are nodes and so are the
     * cells in them. What stayed a prop is what there is exactly one of — the
     * criterion of a row, the note under an answer, the caption of the table —
     * and nothing here decides how many of anything exists.
     */
    expect(propsOfType("loom.comparison-table")).toEqual(["caption", "density", "feature"])
    expect(propsOfType("loom.comparison-row")).toEqual(["heading", "note"])
    expect(propsOfType("loom.comparison")).toEqual(["mark", "note", "role"])

    /** The header row is a region the table places in `<thead>`, not the first child (0051). */
    expect(catalogueOf(registry).find((primitive) => primitive.type === "loom.comparison-table")?.slots)
      .toEqual(["columns"])
  })

  it("keeps the value a child and the verdict a prop", () => {
    const { markup } = render(comparisonPage(EDITORIAL))

    /**
     * 0052's third clause and its first, in one cell. "Seconds" is the whole of
     * what that node says, so it is a text child with an author and an inverse;
     * the tick is one of three renderings the primitive draws, so it is a prop
     * a `configure` changes and never a glyph a proposal can choose.
     */
    expect(markup).toContain(">Every node<")
    expect(markup).toContain(">Seconds<")
    expect(propsOfType("loom.comparison")).not.toContain("glyph")
    expect(propsOfType("loom.comparison")).not.toContain("value")
  })

  it("is a table where the pricing band is a row of cards, and neither borrowed the other", () => {
    const comparison = render(comparisonPage(EDITORIAL)).markup
    const pricing = render(pricingPage(EDITORIAL)).markup

    expect(comparison).toContain("<table")
    expect(pricing).not.toContain("<table")
  })
})

/**
 * The general table, as the two documents that wanted one would use it.
 *
 * Two tables rather than one, because the primitive's whole claim is that a
 * cell holds *whatever the tree puts in it* — and a fixture of one shape would
 * prove that for one shape. The first is a lessons table: prose in every cell,
 * set into running text with no panel around it. The second is a spec sheet:
 * headings down the side, figures that have to line up, and one row the page is
 * pointing at.
 */
const tablePage = (theme: Record<string, string>, idFactory: IdFactory = sequentialIdFactory()): LoomTree => {
  const text = (value: string) => buildText(idFactory, value)

  const symbol = (name: string) => buildElement(idFactory, { type: "loom.code-span", children: [text(name)] })

  type CellChild = ReturnType<typeof text> | ReturnType<typeof symbol>

  const cell = (props: JsonObject, ...children: readonly CellChild[]) =>
    buildElement(idFactory, { type: "loom.table-cell", props, children: [...children] })

  const heading = (label: string, props: JsonObject = {}) => cell({ role: "column", ...props }, text(label))

  const row = (props: JsonObject, cells: readonly ReturnType<typeof cell>[]) =>
    buildElement(idFactory, { type: "loom.table-row", props, children: [...cells] })

  const glossary = buildElement(idFactory, {
    type: "loom.table",
    props: { caption: "Where a change is weighed, and by what", rules: "rows" },
    children: [
      buildSlot(idFactory, "columns", [
        row({}, [heading("Where"), heading("What it means"), heading("Whose problem")]),
      ]),
      row({}, [
        cell({}, text("The interpreter")),
        cell({}, text("A delta is re-planned against the tree it is actually given")),
        cell({}, text("The runtime's")),
      ]),
      row({}, [
        cell({}, text("The Gate")),
        cell({}, text("Two axes, weighed before a visitor sees anything at all")),
        cell({}, text("The deployment's")),
      ]),
      row({}, [
        cell({}, text("The record")),
        cell({}, text("Every node knows who placed it, and "), symbol("invert(delta)"), text(" is always available")),
        cell({}, text("Nobody's, which is the point")),
      ]),
    ],
  })

  const plans = buildElement(idFactory, {
    type: "loom.table",
    props: { caption: "What each plan carries", tone: "panel", rules: "grid", density: "tight" },
    children: [
      buildSlot(idFactory, "columns", [
        row({}, [
          heading("Plan"),
          heading("Deployments", { align: "end" }),
          heading("Retained changes", { align: "end" }),
          heading("Reviewers", { align: "end" }),
        ]),
      ]),
      row({}, [
        cell({ role: "row" }, text("Starter")),
        cell({ numeric: true }, text("1")),
        cell({ numeric: true }, text("1,000")),
        cell({ numeric: true }, text("1")),
      ]),
      row({ tone: "highlight" }, [
        cell({ role: "row" }, text("Team")),
        cell({ numeric: true }, text("12")),
        cell({ numeric: true }, text("250,000")),
        cell({ numeric: true }, text("25")),
      ]),
      row({}, [
        cell({ role: "row" }, text("Enterprise")),
        cell({ numeric: true }, text("Unlimited")),
        cell({ numeric: true }, text("Unlimited")),
        cell({ numeric: true }, text("Unlimited")),
      ]),
    ],
  })

  const band = (eyebrow: string, title: string, table: ReturnType<typeof row>) =>
    buildElement(idFactory, {
      type: "loom.section",
      props: { eyebrow },
      children: [
        buildSlot(idFactory, "heading", [
          buildElement(idFactory, { type: "loom.heading", props: { level: 2 }, children: [text(title)] }),
        ]),
        table,
      ],
    })

  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [
        band("The vocabulary", "Three places a change is looked at", glossary),
        band("Plans", "What each plan carries", plans),
      ],
    }),
    idFactory
  )
}

describe("the general table", () => {
  /** Every `<tr>` in the markup, as the list of its own top-level cell tags. */
  const cellTagsOf = (markup: string): readonly (readonly string[])[] =>
    [...markup.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(([, body]) =>
      [...(body ?? "").matchAll(/<(t[dh])[\s>]/g)].flatMap((match) => (match[1] === undefined ? [] : [match[1]]))
    )

  it("renders under both starter palettes with no literal colour below the root", () => {
    const editorial = splitStylesheet(render(tablePage(EDITORIAL)).markup).tree
    const bold = splitStylesheet(render(tablePage(BOLD)).markup).tree
    const body = bold.slice(bold.indexOf(">"))

    expect(render(tablePage(BOLD)).diagnostics).toEqual([])
    expect(render(tablePage(MINIMAL)).diagnostics).toEqual([])
    expect(editorial.slice(editorial.indexOf(">"))).toBe(body)
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
  })

  it("puts the heading row in a thead and scopes every heading cell", () => {
    const { markup } = render(tablePage(EDITORIAL))

    /**
     * The reason this is a `<table>` at all. `scope="col"` is what a screen
     * reader reads back on reaching a column six rows later, and `scope="row"`
     * is what turns "12" into "Team, Deployments, 12". A grid of `<div>`s
     * cannot say either at any price.
     */
    const [glossaryHead, ...glossaryBody] = cellTagsOf(markup)

    expect(glossaryHead).toEqual(["th", "th", "th"])
    expect(glossaryBody.slice(0, 3)).toEqual([
      ["td", "td", "td"],
      ["td", "td", "td"],
      ["td", "td", "td"],
    ])
    expect(markup).toMatch(/<thead><tr[^>]*><th[^>]*scope="col"/)
    expect(markup).toMatch(/<th[^>]*scope="row"[^>]*class="loom-table-key"/)
  })

  it("emits one heading row per table and never a header outside a thead", () => {
    const { markup } = render(tablePage(EDITORIAL))

    /**
     * 0051's test, checked rather than asserted in a comment: the heading row is
     * a region the table places, so a `move` cannot put it in the body and a
     * body row cannot drift into the head.
     */
    const heads = [...markup.matchAll(/<thead>/g)]
    const columnHeadings = [...markup.matchAll(/scope="col"/g)]
    const bodies = [...markup.matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)].map(([, body]) => body ?? "")

    expect(heads).toHaveLength(2)
    expect(columnHeadings).toHaveLength(7)
    expect(bodies).toHaveLength(2)
    for (const body of bodies) expect(body).not.toContain('scope="col"')
  })

  it("defaults a numeric cell to the trailing edge and a word to the leading one", () => {
    const { markup } = render(tablePage(EDITORIAL))

    /**
     * Alignment is a fact about what a cell holds rather than a decision the
     * column makes, which is why it is not the enumerated-ordinal machinery
     * 0084 needs for a tint. A numeric cell also sets tabular figures, so
     * "1,000" and "250,000" line up digit under digit instead of drifting.
     */
    expect(markup).toMatch(/text-align:end;[^"]*font-variant-numeric:tabular-nums[^"]*">1</)
    expect(markup).toMatch(/text-align:start[^"]*">The interpreter</)
    expect(markup).not.toMatch(/font-variant-numeric:tabular-nums[^"]*">The interpreter</)
  })

  it("tints a row from the row rather than from each of its cells", () => {
    const { markup } = render(tablePage(EDITORIAL))

    /**
     * 0084's argument about a featured column, applied on the axis that has a
     * node to carry it. One decision in one place — and because the row is a
     * node, it needs no ordinal and no static rule keyed on position.
     */
    expect(markup).toContain(`class="${LIBRARY_CLASS.tableRow} ${LIBRARY_CLASS.tableHighlight}"`)
    expect(markup).toContain(`.${LIBRARY_CLASS.tableHighlight} > * {`)
    expect(markup.slice(markup.indexOf("<tbody>"))).not.toMatch(/<t[dh][^>]*background:/)
  })

  it("names the table for a screen reader without letting the caption scroll away", () => {
    const { markup } = render(tablePage(EDITORIAL))

    /**
     * A `<caption>` takes the width of its table, and a table wider than a phone
     * would clip its own name on the screen where the name matters most. The
     * association is the one `loom.field` uses for a hint: one id minted from
     * the node's own, announced once because only the table points at it.
     */
    const labelled = [...markup.matchAll(/aria-labelledby="([^"]+)"/g)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]]
    )

    expect(labelled).toHaveLength(2)
    expect(markup).not.toContain("<caption")
    for (const id of labelled) expect(markup).toContain(`id="${id}"`)
  })

  it("scrolls a wide table inside its own edge and keeps the row heading in view", () => {
    const { markup } = render(tablePage(EDITORIAL))

    expect(markup).toMatch(/<div[^>]*overflow-x:auto[^>]*min-width:0/)
    expect(markup).toContain(`.${LIBRARY_CLASS.tablePanel} .${LIBRARY_CLASS.tableKey} {`)
    /** Only in a panel: a sticky cell needs an opaque ground, and a plain table has none of its own. */
    expect(markup).not.toMatch(new RegExp(`\n\\.${LIBRARY_CLASS.tableKey} \\{`))
  })

  it("holds no list in any of the three schemas, and no count", () => {
    /**
     * Every prop is a rendering of however-many rows there are. Nothing here
     * decides how many exist, which is the question `docs/primitive-granularity.md`
     * says to ask instead of matching on a prop's name.
     */
    expect(propsOfType("loom.table")).toEqual(["caption", "density", "rules", "tone"])
    expect(propsOfType("loom.table-row")).toEqual(["tone"])
    expect(propsOfType("loom.table-cell")).toEqual(["align", "numeric", "role"])

    expect(catalogueOf(registry).find((primitive) => primitive.type === "loom.table")?.slots).toEqual(["columns"])
    for (const type of ["loom.table", "loom.table-row", "loom.table-cell"]) {
      expect(propsOfType(type)).not.toContain("rows")
      expect(propsOfType(type)).not.toContain("columns")
      expect(propsOfType(type)).not.toContain("cells")
    }
  })

  it("lets a cell hold nodes, which is the whole difference from a comparison", () => {
    const { markup } = render(tablePage(EDITORIAL))

    /**
     * A comparison cell draws one of three verdicts because that is what a
     * comparison *is*. This one holds what the tree put in it — here a
     * `loom.code-span` inside a sentence, which no `value: string` prop could
     * have carried without burning the markup into the content.
     */
    expect(markup).toMatch(/<td[^>]*>[\s\S]*?<code[^>]*>invert\(delta\)<\/code>[\s\S]*?<\/td>/)
  })

  it("sets its density on the table so a cell cannot contradict it", () => {
    const { markup } = render(tablePage(EDITORIAL))

    expect(markup).toContain(`.${LIBRARY_CLASS.tableTight} th, .${LIBRARY_CLASS.tableTight} td`)
    expect(markup.slice(markup.indexOf("<tbody>"))).not.toMatch(/<t[dh][^>]*padding:/)
  })

  it("is a panel only when it is asked to be", () => {
    const plain = render(tablePage(EDITORIAL)).markup

    /**
     * The default is the table set into running prose, because most of the
     * tables this exists for are in documents and a second box around one is a
     * card inside a card. Both tones are in the fixture, so one markup carries
     * the presence and the absence.
     */
    expect(plain).toContain(LIBRARY_CLASS.tablePanel)
    expect([...plain.matchAll(new RegExp(LIBRARY_CLASS.tablePanel, "g"))].length).toBeGreaterThan(1)
    expect(cellTagsOf(plain)).toHaveLength(8)
  })
})

describe("the repairs this run made", () => {
  it("leaves a card's height to its parent, so a column of them keeps its content", () => {
    const { markup } = render(arrangedPage(EDITORIAL), true)

    /**
     * `Loom marketing` measured three cards in a `loom.section` — a flex column
     * — all coming out the height of the shortest, and the tallest losing a
     * heading, two rows and the action under it to the `overflow` the media
     * region needs. The card was asserting `height: 100%` against a parent that
     * had asked for nothing of the kind.
     *
     * A grid stretches its items to the row and a flex row stretches them to the
     * line, both without being asked, so the equal heights this was protecting
     * survive its removal. The assertion is on the *absence*, because that is
     * what regressed and what a well-meaning edit would put back.
     */
    const cards = [...markup.matchAll(/<(?:div|a)[^>]*data-loom-type="loom\.card"[^>]*>/g)].map(([tag]) => tag)

    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) expect(card).not.toMatch(/height:100%/)
  })

  it("declares that loom.form posts, so a refactor that unwires it is visible", () => {
    const audited = auditRegistry(registry)

    /**
     * 0087's whole point. The probe reports what the component does and the
     * declaration reports what its author meant, and they disagree in exactly
     * two directions — the useful one being a later edit that reads
     * `loom.submit` and forgets to put the action back, which is
     * indistinguishable from a primitive that never posted unless somebody said
     * it did.
     */
    expect(audited.submits).toEqual(["loom.form"])
    expect(audited.undeclaredSubmitters).toEqual([])
    expect(audited.unwiredSubmitters).toEqual([])
  })

  it("closes every block in the library stylesheet", () => {
    const { stylesheet } = splitStylesheet(render(tablePage(EDITORIAL)).markup)
    const css = stylesheet.replace(/^<style[^>]*>/, "").replace(/<\/style>$/, "")

    /**
     * The test that would have caught a shipped bug. `.loom-list { margin: 0 }`
     * spent 22 and 23 August inside the comparison band's last rule, because
     * that rule was missing its `}` — and CSS error recovery drops the swallowed
     * rule, keeps everything around it, and renders a page that looks almost
     * right. Every list in the library carried the browser's default margins and
     * no assertion about markup, tokens or themes could see it.
     *
     * Two properties hold it. The braces balance, and no rule body contains a
     * `{` — the second is the one that fails on a swallowed rule, because a
     * missing `}` does not unbalance a file whose next rule supplies one.
     */
    let depth = 0
    for (const character of css) {
      if (character === "{") depth += 1
      if (character === "}") depth -= 1
      expect(depth).toBeGreaterThanOrEqual(0)
    }
    expect(depth).toBe(0)

    const nestable = /@(?:media|container|supports|keyframes)/
    for (const [block, prelude, body] of css.matchAll(/([^{}]*)\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)) {
      if (nestable.test(prelude ?? "")) continue
      expect([prelude?.trim(), body]).toEqual([prelude?.trim(), (body ?? "").replace(/[{}]/g, "")])
      expect(block).toBeDefined()
    }
  })

  it("still applies the margin reset the swallowed rule was carrying", () => {
    const { stylesheet } = splitStylesheet(render(prosePage(EDITORIAL)).markup)

    expect(stylesheet).toMatch(new RegExp(`\\.${LIBRARY_CLASS.list} \\{\\s*margin: 0;\\s*\\}`))
  })
})

/**
 * The three primitives a still page could not have: a band that travels, a
 * document somebody else serves, and two pictures wiped against each other.
 *
 * The marquee appears three times on purpose — a logo wall, a wall of quotes
 * running the other way, and a two-item band — because the thing most likely to
 * be wrong about it is a function of how many items it holds.
 */
const motionPage = (theme: Record<string, string>, idFactory: IdFactory = sequentialIdFactory()): LoomTree => {
  const text = (value: string) => buildText(idFactory, value)

  const logo = (name: string) =>
    buildElement(idFactory, {
      type: "loom.logo",
      props: { name, image: `https://example.com/${name.toLowerCase()}.svg` },
    })

  const quote = (body: string, author: string) =>
    buildElement(idFactory, { type: "loom.quote", props: { quote: body, author } })

  const shot = (src: string, alt: string) =>
    buildElement(idFactory, {
      type: "loom.media",
      props: { src, alt, aspect: "wide", corners: "none" },
    })

  const wall = buildElement(idFactory, {
    type: "loom.marquee",
    props: { density: "roomy" },
    children: [
      logo("Meridian"),
      logo("Halcyon"),
      logo("Kestrel"),
      logo("Ardent"),
      logo("Northwind"),
      logo("Perihelion"),
      logo("Talisman"),
    ],
  })

  const voices = buildElement(idFactory, {
    type: "loom.marquee",
    props: { direction: "end", density: "loose", edges: "faded" },
    children: [
      quote("Undo is a proposal, and that ended a category of incident for us.", "Ren Okafor"),
      quote("We can answer what the assistant changed, and who approved it.", "Sofia Lindqvist"),
      quote("The page adapts and the diff is still readable.", "Amara Diallo"),
    ],
  })

  const pair = buildElement(idFactory, {
    type: "loom.marquee",
    props: { edges: "hard", density: "tight" },
    children: [logo("Meridian"), logo("Halcyon")],
  })

  const film = buildElement(idFactory, {
    type: "loom.embed",
    props: {
      src: "https://player.example.com/embed/loom-in-ninety-seconds",
      title: "Loom in ninety seconds",
      caption: "The whole pipeline, from request to revision.",
    },
  })

  const flush = buildElement(idFactory, {
    type: "loom.embed",
    props: {
      src: "https://maps.example.com/embed?place=studio",
      title: "Where the studio is",
      aspect: "square",
      frame: "flush",
    },
  })

  const wipe = buildElement(idFactory, {
    type: "loom.before-after",
    props: { position: 42, beforeLabel: "Revision 3", afterLabel: "Revision 4" },
    children: [
      buildSlot(idFactory, "before", [shot("https://example.com/before.png", "The page at revision three")]),
      buildSlot(idFactory, "after", [shot("https://example.com/after.png", "The page at revision four")]),
    ],
  })

  const framed = buildElement(idFactory, {
    type: "loom.before-after",
    props: { aspect: "wide" },
    children: [
      buildSlot(idFactory, "before", [shot("https://example.com/staged.png", "The room, staged")]),
      buildSlot(idFactory, "after", [shot("https://example.com/empty.png", "The room, empty")]),
    ],
  })

  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [
        buildElement(idFactory, {
          type: "loom.section",
          props: { eyebrow: "Trusted by" },
          children: [
            buildSlot(idFactory, "heading", [
              buildElement(idFactory, {
                type: "loom.heading",
                props: { level: 1 },
                children: [text("A page that moves, and still says what it is")],
              }),
            ]),
            wall,
            voices,
            pair,
          ],
        }),
        buildElement(idFactory, {
          type: "loom.section",
          children: [film, flush, wipe, framed],
        }),
      ],
    }),
    idFactory
  )
}

describe("the band that moves", () => {
  it("renders all three, with nothing left unhonoured", () => {
    const { markup, diagnostics } = render(motionPage(EDITORIAL))

    expect(diagnostics).toEqual([])
    expect(markup).toContain("<iframe")
    expect(markup).toContain("Loom in ninety seconds")
    expect(markup).toContain("Revision 3")
    expect([...markup.matchAll(/class="loom-marquee[ "]/g)]).toHaveLength(3)
  })

  it("runs the row twice when the page is published, and once when it is being edited", () => {
    /**
     * The property the whole design turns on, asserted from both sides. A
     * seamless loop needs the run rendered twice, and `loom.logo-cloud` refused
     * to scroll for exactly that reason: two copies of a node mean two elements
     * carrying one `data-loom-node`, which is what 0051 rejected.
     *
     * The echo therefore exists only where identity attributes do not.
     */
    const published = render(motionPage(EDITORIAL)).markup
    const editing = render(motionPage(EDITORIAL), true).markup

    expect([...splitStylesheet(published).tree.matchAll(/loom-marquee-echo/g)]).toHaveLength(3)
    expect([...splitStylesheet(editing).tree.matchAll(/loom-marquee-echo/g)]).toHaveLength(0)
    expect([...splitStylesheet(editing).tree.matchAll(/loom-marquee-still/g)]).toHaveLength(3)
  })

  it("never renders one node id twice, on any fixture, in edit mode", () => {
    /**
     * The invariant the still rendering exists to protect, held against every
     * fixture in this file rather than against the marquee alone — a second
     * primitive that decided to duplicate its children would fail here.
     */
    for (const page of [motionPage, samplePage, marketingPage, cataloguePage, technicalPage]) {
      const ids = [...render(page(EDITORIAL), true).markup.matchAll(/data-loom-node="([^"]+)"/g)].map(
        (match) => match[1]
      )

      expect(ids.length).toBeGreaterThan(0)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it("hides the echo from assistive technology and from the tab order", () => {
    const markup = render(motionPage(EDITORIAL)).markup
    const echoes = [...markup.matchAll(/<div class="loom-marquee-run loom-marquee-echo"[^>]*>/g)].map(
      ([tag]) => tag
    )

    expect(echoes).toHaveLength(3)
    for (const echo of echoes) {
      expect(echo).toContain('aria-hidden="true"')
      expect(echo).toContain("inert")
    }
  })

  it("takes its pace from the item count rather than from a prop in the tree", () => {
    const { markup } = render(motionPage(EDITORIAL))
    const { stylesheet } = splitStylesheet(markup)

    /**
     * 0055 refuses a duration in the tree, and a fixed duration makes six logos
     * drift while twenty sprint. `:has(> * > :nth-child(n))` is the only thing
     * in CSS that can count, so the duration is enumerated once per count and
     * the last matching rule wins.
     */
    expect(propsOfType("loom.marquee")).toEqual(["density", "direction", "edges"])
    expect(stylesheet).toContain(".loom-marquee-track:has(> * > :nth-child(7))")
    expect(stylesheet).toContain(".loom-marquee-track:has(> * > :nth-child(16))")
    expect(stylesheet).not.toContain(":nth-child(17)")
    /** Every duration is a multiple of a theme variable, never a literal. */
    expect(stylesheet).not.toMatch(/animation-duration:\s*\d/)
  })

  it("sets nothing about the track inline, because three rules have to reach it", () => {
    const { tree } = splitStylesheet(render(motionPage(EDITORIAL)).markup)
    const track = tree.slice(tree.indexOf('class="loom-marquee-track'))
    const opening = track.slice(0, track.indexOf(">"))

    /**
     * The trap `stylesheet.ts` names, in the primitive that would suffer most
     * from it: the duration is chosen by the item count, and the width and the
     * animation are cancelled twice over — by the still variant and by reduced
     * motion. An inline style beats all three.
     */
    expect(opening).not.toContain("style=")
  })

  it("stops the band under a pointer and under a focus, and stops it entirely for reduced motion", () => {
    const { stylesheet } = splitStylesheet(render(motionPage(EDITORIAL)).markup)

    expect(stylesheet).toContain(".loom-marquee:focus-within .loom-marquee-track")
    expect(stylesheet).toContain("animation-play-state: paused")
    /**
     * Reduced motion does not merely stop the loop: a stopped loop is a row
     * clipped at the band's edge showing whichever items happened to be inside
     * it. The run wraps, the echo goes, and the edge fade goes with it, because
     * a horizontal fade across wrapped rows is not what it meant.
     */
    const reduced = stylesheet.slice(stylesheet.indexOf("@media (prefers-reduced-motion"))
    expect(reduced).toContain(".loom-marquee-echo")
    expect(reduced).toContain("mask-image: none")
  })

  it("fades its edges with a mask, so it does not have to know what it is sitting on", () => {
    const { stylesheet, tree } = splitStylesheet(render(motionPage(EDITORIAL)).markup)

    /**
     * The 24 August finding about `loom.table`'s scroll edge, answered here
     * rather than there: a gradient to the page's colour needs a ground a
     * primitive cannot know, and a mask fades opacity instead. So a band inside
     * a card fades to the card.
     */
    expect(stylesheet).toContain(".loom-marquee-faded")
    expect(stylesheet).toContain("mask-image: linear-gradient")
    expect([...tree.matchAll(/loom-marquee-faded/g)]).toHaveLength(2)
  })

  it("caps an item against the band it is in rather than against the viewport", () => {
    const { stylesheet } = splitStylesheet(render(motionPage(EDITORIAL)).markup)

    /**
     * A quote card's natural width is around 580px, which on a 390px phone is a
     * card whose borders are both off-screen and which reads as loose text on
     * the page. The cap is in `cqi` against the band's own inline size, not in
     * `vw`: `loom.mosaic` reads the viewport where it should read its container
     * and this lane filed that against itself on 21 August, so the second
     * primitive to want a container measurement takes the container.
     */
    expect(stylesheet).toContain("container-type: inline-size")
    expect(stylesheet).toContain("max-inline-size: min(32rem, 80cqi)")
    expect(stylesheet).not.toContain("vw)")
  })

  it("draws every overlay on the wipe as a fill with a ring, because it cannot see what is under it", () => {
    const { tree } = splitStylesheet(render(motionPage(EDITORIAL)).markup)

    /**
     * The defect this shipped with for an hour on 25 August: a single line in
     * `bg-surface`, which under `bold` is near-black and vanished against a
     * dark screenshot. No palette slot contrasts with a photograph, so the
     * divider, the handle and the two chips are all a surface fill inside an
     * ink ring — one of the two always reads.
     */
    const rings = [...tree.matchAll(/box-shadow:0 0 0 1px var\(--loom-fg-default\)/g)]

    /** Two dividers, two handles, and the two chips on the labelled one. */
    expect(rings).toHaveLength(6)
  })

  it("frames a third-party document with a name, a sandbox and a ratio", () => {
    const { markup } = render(motionPage(EDITORIAL))
    const frames = [...markup.matchAll(/<iframe[^>]*>/g)].map(([tag]) => tag)

    expect(frames).toHaveLength(2)
    for (const frame of frames) {
      expect(frame).toContain('title="')
      expect(frame).toContain('sandbox="allow-scripts allow-same-origin allow-presentation"')
      /** HTML attribute names are case-insensitive, which is why React's camel spelling is correct here. */
      expect(frame).toContain('referrerPolicy="strict-origin-when-cross-origin"')
      expect(frame).toContain("allowFullScreen")
      expect(frame).toContain('loading="lazy"')
    }

    /** The ratio is the wrapper's, so the box holds its shape before the document arrives. */
    expect(markup).toMatch(/aspect-ratio:16 \/ 9/)
    expect(markup).toMatch(/aspect-ratio:1 \/ 1/)
  })

  it("refuses a frame with no accessible name and one with a scheme that is not http", () => {
    const embed = registry.primitives.find((primitive) => primitive.type === "loom.embed")

    expect(embed?.validate({ src: "https://example.com/x", title: "" }).outcome).toBe("invalid")
    expect(embed?.validate({ src: "javascript:alert(1)", title: "A frame" }).outcome).toBe("invalid")
    expect(embed?.validate({ src: "https://example.com/x", title: "A frame" }).outcome).toBe("valid")
  })

  it("clips the before side rather than narrowing it, and takes its height from the after side", () => {
    const { tree } = splitStylesheet(render(motionPage(EDITORIAL)).markup)

    /**
     * A width would squeeze or crop the before picture and the two would no
     * longer be the same picture at the same scale, which is the entire point
     * of superimposing them.
     */
    expect(tree).toContain("clip-path:inset(0 58% 0 0)")
    expect(tree).toContain("clip-path:inset(0 50% 0 0)")
    expect(propsOfType("loom.before-after")).toEqual([
      "afterLabel",
      "aspect",
      "beforeLabel",
      "position",
    ])
  })

  it("bounds the wipe well inside its own ends, because a wipe at nothing is one picture", () => {
    const wipe = registry.primitives.find((primitive) => primitive.type === "loom.before-after")

    expect(wipe?.validate({ position: 0 }).outcome).toBe("invalid")
    expect(wipe?.validate({ position: 100 }).outcome).toBe("invalid")
    expect(wipe?.validate({ position: 42.5 }).outcome).toBe("invalid")
    expect(wipe?.validate({ position: 5 }).outcome).toBe("valid")
  })

  it("places the copy control it declares, and declares the strings that name it", () => {
    const audited = auditRegistry(registry)
    const code = registry.primitives.find((primitive) => primitive.type === "loom.code")

    /**
     * 0086's first consumer in this library, closing the finding this lane
     * filed on 21 August. The control is built by the runtime and placed here;
     * a declared behaviour nobody places is reported the same way a declared
     * slot nobody renders is.
     */
    expect(code?.behaviours).toEqual(["copy"])
    expect(Object.keys(code?.text ?? {}).sort()).toEqual(["copied", "copy"])
    expect(audited.unplacedBehaviours).toEqual([])
  })

  it("gives every code panel a bar, because that is where the button goes", () => {
    const { markup } = render(technicalPage(EDITORIAL))

    /**
     * It used to appear only for a terminal or a named language. A button
     * floated over the code would sit on the first line of a snippet whose
     * whitespace is its content, so the bar arrives with the button — and a
     * copyable panel now always has somewhere to say what it is.
     */
    const bars = [...markup.matchAll(/border-block-end:1px solid var\(--loom-border-subtle\)/g)]
    expect([...markup.matchAll(/<pre/g)]).toHaveLength(3)
    expect(bars).toHaveLength(3)
  })

  it("renders the same under every palette, with no colour of its own", () => {
    for (const theme of [EDITORIAL, BOLD, MINIMAL]) {
      const { markup, diagnostics } = render(motionPage(theme))
      const tree = splitStylesheet(markup).tree
      const body = tree.slice(tree.indexOf(">"))

      expect(diagnostics).toEqual([])
      expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
    }
  })

  it("changes nothing but the root's variables when the palette changes", () => {
    const editorial = splitStylesheet(render(motionPage(EDITORIAL)).markup).tree
    const bold = splitStylesheet(render(motionPage(BOLD)).markup).tree
    const strip = (markup: string): string => markup.slice(markup.indexOf("</style>") + 1).replace(/style="[^"]*"/, "")

    expect(strip(editorial)).toBe(strip(bold))
  })
})

/**
 * A page built to be looked at where nothing can hover and the window is a
 * phone: a bar with more links than fit, four linked cards, a linked tile, and
 * a mosaic inside a column much narrower than the screen.
 *
 * Every band in it is one this library already had. What is new is the
 * question — *what does this say to somebody who cannot point at it* — which is
 * the one three separate lanes filed against this one and no fixture asked.
 */
const phonePage = (theme: Record<string, string>, idFactory: IdFactory = sequentialIdFactory()): LoomTree => {
  const text = (value: string) => buildText(idFactory, value)

  const nav = buildElement(idFactory, {
    type: "loom.nav",
    props: { position: "sticky", tone: "surface", align: "end" },
    children: [
      buildElement(idFactory, {
        type: "loom.link",
        props: { href: "https://example.com/product", scale: "small", current: true },
        children: [text("Product")],
      }),
      buildElement(idFactory, {
        type: "loom.link",
        props: { href: "https://example.com/docs", scale: "small" },
        children: [text("Documentation")],
      }),
      buildElement(idFactory, {
        type: "loom.link",
        props: { href: "https://example.com/demo", scale: "small" },
        children: [text("The demo")],
      }),
      buildSlot(idFactory, "brand", [
        buildElement(idFactory, { type: "loom.logo", props: { name: "Loom", href: "https://example.com/" } }),
      ]),
      buildSlot(idFactory, "actions", [
        buildElement(idFactory, {
          type: "loom.action",
          props: { href: "https://example.com/start", variant: "primary", scale: "small" },
          children: [text("Start building")],
        }),
      ]),
    ],
  })

  /** A card title: level 3 under a level-2 section, sized as though it were level 5. */
  const destination = (title: string, blurb: string, href: string, media: boolean) =>
    buildElement(idFactory, {
      type: "loom.card",
      props: { href, tone: "surface" },
      children: [
        ...(media
          ? [
              buildSlot(idFactory, "media", [
                buildElement(idFactory, {
                  type: "loom.media",
                  props: { src: "https://example.com/shot.png", alt: `A screenshot of ${title}`, aspect: "wide" },
                }),
              ]),
            ]
          : []),
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 3, scale: 5 },
          children: [text(title)],
        }),
        buildElement(idFactory, {
          type: "loom.prose",
          props: { size: "small", tone: "muted" },
          children: [text(blurb)],
        }),
      ],
    })

  const destinations = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Where to go" },
    children: [
      buildSlot(idFactory, "heading", [
        buildElement(idFactory, {
          type: "loom.heading",
          props: { level: 2 },
          children: [text("Four ways in")],
        }),
      ]),
      buildElement(idFactory, {
        type: "loom.grid",
        props: { columns: "two" },
        children: [
          destination("Read the thesis", "Why a tree and a delta.", "https://example.com/thesis", false),
          destination("Watch it change", "One page, adapting.", "https://example.com/demo", true),
          buildElement(idFactory, {
            type: "loom.feature",
            props: {
              title: "Take the course",
              body: "Seventeen lessons, each one a running page.",
              icon: "📘",
              href: "https://example.com/course",
            },
          }),
          buildElement(idFactory, {
            type: "loom.feature",
            props: { title: "Nothing to click", body: "A tile that is not a link, for contrast.", icon: "🧱" },
          }),
        ],
      }),
    ],
  })

  /** The mosaic that used to lay six columns across a column this narrow. */
  const narrow = buildElement(idFactory, {
    type: "loom.split",
    props: { ratio: "start-wide", align: "start" },
    children: [
      buildSlot(idFactory, "start", [
        buildElement(idFactory, {
          type: "loom.prose",
          children: [text("The band beside this one is measured against the column it was given.")],
        }),
      ]),
      buildSlot(idFactory, "end", [
        buildElement(idFactory, {
          type: "loom.mosaic",
          props: { rhythm: "lead" },
          children: [
            buildElement(idFactory, { type: "loom.stat", props: { value: "4", label: "operations" } }),
            buildElement(idFactory, { type: "loom.stat", props: { value: "2", label: "axes" } }),
            buildElement(idFactory, { type: "loom.stat", props: { value: "1", label: "tree" } }),
          ],
        }),
      ]),
    ],
  })

  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [nav, destinations, narrow],
    }),
    idFactory
  )
}

describe("what a phone can see", () => {
  const openingOf = (markup: string, pattern: RegExp): string => (pattern.exec(markup) ?? [""])[0] ?? ""

  it("places the disclosure control before the links, which is what the rule requires", () => {
    const { markup, diagnostics } = render(phonePage(EDITORIAL))
    const bar = markup.slice(markup.indexOf("<nav"), markup.indexOf("</nav>"))

    expect(diagnostics).toEqual([])

    /**
     * A sibling combinator only looks forward, so the order in the markup is
     * load-bearing rather than incidental. Where the button *appears* is the
     * stylesheet's business — it carries an `order` — which is the whole reason
     * the two can differ.
     */
    expect(bar.indexOf(`class="${LIBRARY_CLASS.navToggle}"`)).toBeLessThan(
      bar.indexOf(`class="${LIBRARY_CLASS.navMenu}"`)
    )
    expect(markup).toContain(`.${LIBRARY_CLASS.navToggle}:has([data-loom-disclosed="false"]) ~ .${LIBRARY_CLASS.navMenu}`)
  })

  it("renders no button on the server, so a page with no scripting keeps its menu", () => {
    const { markup } = render(phonePage(EDITORIAL))
    const bar = markup.slice(markup.indexOf("<nav"), markup.indexOf("</nav>"))

    /**
     * 0092's bargain, and the direction of the rule is the whole safety
     * argument. The control appears from an effect once scripting is proven, so
     * the server's markup has an empty wrapper: no button, no attribute,
     * nothing matching the rule, and every link reachable. Written the other way
     * round — hidden by default, revealed by the button — that visitor gets a
     * menu behind a control that never arrives.
     */
    expect(bar).toContain(`<span class="${LIBRARY_CLASS.navToggle}"></span>`)
    expect(bar).not.toContain("data-loom-disclosed")
    expect(bar).toContain("Documentation")
  })

  it("keeps the menu's display in the stylesheet, because the rule has to take it away", () => {
    const { markup } = render(phonePage(EDITORIAL))
    const menu = openingOf(markup, new RegExp(`<div class="${LIBRARY_CLASS.navMenu}"[^>]*>`))

    /**
     * Mechanic 1 in `stylesheet.ts`, met head on. An inline `display:flex` here
     * would beat every rule in the file and the menu could never be collapsed —
     * which is exactly why the runtime's own button, which does set its display
     * inline, had to be wrapped rather than placed bare.
     */
    expect(menu).not.toContain("display:flex")
    expect(markup).toMatch(new RegExp(`\\.${LIBRARY_CLASS.navMenu} \\{[^}]*display: flex`))
  })

  it("puts the menu back and the button away once there is room for the bar", () => {
    const { markup } = render(phonePage(EDITORIAL))
    const wide = markup.slice(markup.indexOf("@media (min-width: 48rem)"))
    const block = wide.slice(0, wide.indexOf("\n}"))

    expect(block).toMatch(new RegExp(`\\.${LIBRARY_CLASS.navToggle} \\{\\s*display: none;`))
    expect(block).toContain(`.${LIBRARY_CLASS.navMenu} {`)
    /** The closed state loses to the width, or a laptop would show a menu it cannot open. */
    expect(block).toMatch(/~ \.loom-nav-menu \{\s*display: flex;/)
  })

  it("declares one name for the control and says the bar is a target", () => {
    const nav = registry.primitives.find((primitive) => primitive.type === "loom.nav")

    /** One name open and closed; `aria-expanded` carries the state (0092). */
    expect(nav?.behaviours).toEqual(["disclose"])
    expect(nav?.text["disclose"]).toBe("Menu")
    expect(nav?.text["closed"]).toBeUndefined()
    expect(nav?.interactive).toBe("always")
  })

  it("sizes a card title off one level and outlines it at another", () => {
    const { markup } = render(phonePage(EDITORIAL))

    /**
     * The marketing lane's finding, closed. Level 3 is step 6 — 32px in a card
     * about 290px wide, where all four titles wrapped to two lines and the
     * navigation band came out louder than the argument above it. `scale: 5`
     * takes step 4 and leaves the `h3` alone, so the outline is unharmed.
     */
    const title = openingOf(markup, /<h3[^>]*>/)

    expect(title).toContain("var(--loom-scale-4)")
    expect(title).not.toContain("var(--loom-scale-6)")
    expect(markup).toContain("Read the thesis")
  })

  it("changes nothing for a heading that does not ask, which is what a default has to mean", () => {
    const withScale = buildElement(sequentialIdFactory(), { type: "loom.heading", props: { level: 2 } })

    expect(withScale.props["scale"]).toBeUndefined()

    /** The section heading sets no `scale`, so it is still its level's own step. */
    const { markup } = render(phonePage(EDITORIAL))
    const section = openingOf(markup, /<h2[^>]*>/)

    expect(section).toContain("var(--loom-scale-7)")
  })

  it("refuses a scale the ramp of levels does not hold", () => {
    const heading = registry.primitives.find((primitive) => primitive.type === "loom.heading")

    /**
     * Bounded to the same 1–6 as `level`, on purpose. The obvious alternative —
     * naming the ramp step directly, 1 to 8 — reads backwards beside the prop
     * above it, because `level: 1` is the largest heading and step 1 is the
     * smallest text on the ramp.
     */
    expect(heading?.validate({ level: 3, scale: 8 }).outcome).toBe("invalid")
    expect(heading?.validate({ level: 3, scale: 0 }).outcome).toBe("invalid")
    expect(heading?.validate({ level: 3, scale: 5 }).outcome).toBe("valid")
  })

  it("marks a linked tile at rest, and leaves an unlinked one unmarked", () => {
    const { markup } = render(phonePage(EDITORIAL))

    /**
     * Two linked cards and one linked feature tile; the fourth tile is not a
     * link and must stay unmarked, or the mark means nothing. Hover is not in
     * this assertion at all, which is the point of the run: this is what a
     * screenshot and a touch device see.
     */
    expect([...markup.matchAll(new RegExp(`class="${LIBRARY_CLASS.arrow}"`, "g"))]).toHaveLength(3)
    expect(markup).toContain("Nothing to click")
    expect(markup).toContain(`>${LINK_MARK}</span>`)
  })

  it("draws the mark as a fill inside a ring, so it reads over a photograph", () => {
    const { markup } = render(phonePage(EDITORIAL))
    const rule = markup.slice(markup.indexOf(`.${LIBRARY_CLASS.arrow} {`))
    const block = rule.slice(0, rule.indexOf("}"))

    /**
     * `loom.before-after`'s lesson, reused. A card with a media region puts this
     * over an image the primitive did not choose and cannot sample, and no
     * palette slot contrasts with a photograph — so the chip carries both a
     * solid fill and a ring, and one of the two always reads.
     *
     * The fill is the **accent** rather than the surface, which the first
     * screenshot decided: `bg-surface` inside `border-subtle` vanishes into a
     * card that is itself `bg-surface`, leaving a hairline. The accent differs
     * from every card tone by construction.
     */
    expect(block).toContain("background: var(--loom-accent-subtle)")
    expect(block).toContain("border: 1px solid var(--loom-border-accent)")
    /**
     * And the glyph is the **ink**, not the accent. An accent arrow on an
     * accent tint is one hue at two lightnesses, and under `minimal` — a pale
     * mint — it vanished inside its own chip. `tokens.ts` warns about exactly
     * this: a token promises the value comes from the theme and promises
     * nothing about it differing from the one beside it.
     */
    expect(block).toContain("color: var(--loom-fg-default)")
    expect(block).not.toContain("color: var(--loom-accent-strong)")
    expect(block).toContain(`width: ${LINK_MARK_SIZE}`)
    expect(block).toContain("pointer-events: none")
  })

  it("never lets the mark become a second target inside the first", () => {
    const { markup } = render(phonePage(EDITORIAL))
    const mark = openingOf(markup, new RegExp(`<span[^>]*class="${LIBRARY_CLASS.arrow}"[^>]*>`))

    /** The anchor is already named by the card's content; an arrow after it is noise. */
    expect(mark).toContain('aria-hidden="true"')
    expect(mark).not.toContain("href")
  })

  it("reserves room for the mark over words, and not over a picture", () => {
    const { markup } = render(phonePage(EDITORIAL))

    /**
     * The card with a media region draws the mark on the picture, where there
     * is no line to collide with, so its body keeps even padding on four sides.
     * The card without one draws it over the body and buys the room first.
     */
    const bodies = [...markup.matchAll(/padding-inline-end:calc\(1\.75rem \+ var\(--loom-spacing-3\)\)/g)]

    /** Two: the card with no media, and the linked feature tile, which never has any. */
    expect(bodies).toHaveLength(2)
  })

  it("keeps the mark under reduced motion and takes only its movement", () => {
    const { markup } = render(phonePage(EDITORIAL))
    const calmed = markup.slice(markup.indexOf("@media (prefers-reduced-motion: reduce)"))

    /**
     * The one hover treatment in that block which is also present at rest.
     * Switching it off entirely would take the affordance away from the reader
     * most likely to be on a device that cannot hover in the first place.
     */
    expect(calmed).toContain(`.${LIBRARY_CLASS.arrow} {\n    transition: none;`)
    expect(calmed).toMatch(/a:hover > \.loom-arrow[^{]*\{\s*transform: none;/)
  })

  it("measures the mosaic against the column it was given, not against the window", () => {
    const { markup, diagnostics } = render(phonePage(EDITORIAL))

    /**
     * The 21 August finding this lane filed against itself, closed. This mosaic
     * sits in the end region of a `loom.split`, which is a fraction of the page
     * — under a `@media` query it laid six columns there because the *window*
     * was wide.
     */
    expect(diagnostics).toEqual([])
    expect(markup).toContain("@container (min-width: 48rem)")
    expect(markup).toMatch(new RegExp(`\\.${LIBRARY_CLASS.mosaic} \\{\\s*container-type: inline-size;`))
  })

  it("renders under every palette with no literal colour below the root", () => {
    for (const theme of [EDITORIAL, BOLD, MINIMAL]) {
      const { markup, diagnostics } = render(phonePage(theme))
      const tree = splitStylesheet(markup).tree
      const body = tree.slice(tree.indexOf(">"))

      expect(diagnostics).toEqual([])
      expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
    }
  })

  it("changes nothing but the root's variables when the palette changes", () => {
    const editorial = splitStylesheet(render(phonePage(EDITORIAL)).markup).tree
    const bold = splitStylesheet(render(phonePage(BOLD)).markup).tree
    const strip = (markup: string): string => markup.slice(markup.indexOf("</style>") + 1).replace(/style="[^"]*"/, "")

    expect(strip(editorial)).toBe(strip(bold))
  })
})
