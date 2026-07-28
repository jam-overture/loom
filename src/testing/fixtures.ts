import { sequentialIdFactory, type NodeId } from "../ids.js"
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
