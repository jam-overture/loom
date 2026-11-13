import { sequentialIdFactory } from "../../src/ids.js"
import { buildElement, buildText } from "../../src/tree/builders.js"
import type { ElementNode } from "../../src/tree/node.js"
import { createTree, withRoot, type LoomTree } from "../../src/tree/tree.js"

import type { SimGoal } from "./page.js"

/**
 * A home page in bands, for the simulation's tests: the same parts in two
 * orders, so a change moves the goal's part and nothing else.
 */

const ids = sequentialIdFactory("sim")

const text = (value: string) => buildText(ids, value)

const element = (type: string, ...children: ElementNode["children"]): ElementNode =>
  buildElement(ids, { type, children })

const section = (...children: ElementNode["children"]): ElementNode =>
  element("loom.section", ...children)

const LONG_COPY = Array.from(
  { length: 30 },
  () => "Loom keeps every change reviewable and reversible."
).join(" ")

const startButton = element("loom.button", text("Start free"))

const signIn = element("loom.link", text("Sign in"))

const bands = {
  hero: section(
    element("loom.heading", text("Make your web page dynamic with AI and Loom")),
    element("loom.prose", text("Your readers tell Loom what works. Loom proposes the change."))
  ),
  features: section(
    element("loom.heading", text("What it does")),
    element("loom.prose", text(LONG_COPY)),
    element("loom.link", text("Read the docs"))
  ),
  code: section(
    element("loom.heading", text("Two calls")),
    element("loom.code", text("pnpm add @jam-overture/loom"))
  ),
  pricing: section(
    element("loom.heading", text("Pricing")),
    element("loom.prose", text("$29 a month for a project.")),
    element("loom.button", text("See plans"))
  ),
  start: section(startButton),
  footer: element("loom.footer", signIn, element("loom.link", text("Docs"))),
}

const pageOf = (...children: readonly ElementNode[]): ElementNode => ({
  ...element("loom.page"),
  children,
})

/** The goal's part last but one: after the long copy, the code and the price. */
export const STARTS_LOW: LoomTree = createTree(
  pageOf(bands.hero, bands.features, bands.code, bands.pricing, bands.start, bands.footer),
  ids
)

/** The same page with the goal's part moved up under the hero. */
export const STARTS_HIGH: LoomTree = withRoot(
  STARTS_LOW,
  pageOf(bands.hero, bands.start, bands.features, bands.code, bands.pricing, bands.footer)
)

export const START_GOAL: SimGoal = { kind: "activated", nodeId: startButton.id }

export const SIGN_IN_GOAL: SimGoal = { kind: "activated", nodeId: signIn.id }
