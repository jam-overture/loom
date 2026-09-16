import { sequentialIdFactory, type NodeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import { DATA_PROP_KEY, SUBMIT_PROP_KEY } from "../reserved-props.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

/**
 * A small, deterministic tree used across tests and, later, by the renderer and
 * portal for smoke fixtures. Ids come from a sequential factory so assertions
 * can name them instead of digging them out of the structure.
 */

export type SampleTree = {
  readonly tree: LoomTree
  readonly ids: {
    readonly page: NodeId
    readonly header: NodeId
    readonly headline: NodeId
    readonly main: NodeId
    readonly card: NodeId
    readonly body: NodeId
    readonly footer: NodeId
  }
}

export const sampleTree = (): SampleTree => {
  const idFactory = sequentialIdFactory()

  const headline = buildText(idFactory, "Welcome")
  const header = buildElement(idFactory, { type: "loom.header", children: [headline] })

  const body = buildText(idFactory, "Body copy")
  const card = buildElement(idFactory, {
    type: "loom.card",
    props: { variant: "outlined", elevation: 1 },
    children: [body],
  })
  const main = buildSlot(idFactory, "main", [card])

  const footer = buildElement(idFactory, { type: "loom.footer" })
  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { title: "Home" },
    children: [header, main, footer],
  })

  return {
    tree: createTree(page, idFactory),
    ids: {
      page: page.id,
      header: header.id,
      headline: headline.id,
      main: main.id,
      card: card.id,
      body: body.id,
      footer: footer.id,
    },
  }
}

export type FormTree = {
  readonly tree: LoomTree
  readonly ids: {
    readonly page: NodeId
    readonly form: NodeId
    /** A sibling that posts nowhere, so a test can move a destination onto one. */
    readonly aside: NodeId
  }
}

/**
 * A page whose form already posts somewhere. Separate from `sampleTree` rather
 * than a node added to it: every count in the stakes and analysis suites is
 * asserted against that tree's exact size, and a fixture that grows is a fixture
 * that makes unrelated tests wrong.
 */
export const formTree = (to = "newsletter.subscribe"): FormTree => {
  const idFactory = sequentialIdFactory("form")

  const form = buildElement(idFactory, {
    type: "loom.form",
    props: { [SUBMIT_PROP_KEY]: { to } },
  })
  const aside = buildElement(idFactory, { type: "loom.form" })
  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { title: "Contact" },
    children: [form, aside],
  })

  return {
    tree: createTree(page, idFactory),
    ids: { page: page.id, form: form.id, aside: aside.id },
  }
}

export type BoundTree = {
  readonly tree: LoomTree
  readonly ids: {
    readonly page: NodeId
    readonly bound: NodeId
    /** A sibling that asks nothing, so a test can put a binding onto one. */
    readonly aside: NodeId
  }
}

/**
 * A page whose card already reads from somewhere. `formTree`'s twin at the other
 * end of the pipe, separate from both for the reason that one gives: every count
 * in the stakes and analysis suites is asserted against an exact tree size, and
 * a fixture that grows makes unrelated tests wrong.
 *
 * Internal, unlike `formTree`. A published entry point is a promise (see
 * `testing/index.ts`), and nothing outside this package has asked for this one.
 */
export const boundTree = (source = "catalogue.services", params: JsonObject = {}): BoundTree => {
  const idFactory = sequentialIdFactory("bound")

  const bound = buildElement(idFactory, {
    type: "loom.card",
    props: { [DATA_PROP_KEY]: { items: { source, params } } },
  })
  const aside = buildElement(idFactory, { type: "loom.card" })
  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { title: "Services" },
    children: [bound, aside],
  })

  return {
    tree: createTree(page, idFactory),
    ids: { page: page.id, bound: bound.id, aside: aside.id },
  }
}
