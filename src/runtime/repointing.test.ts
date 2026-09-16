import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { DATA_PROP_KEY } from "../reserved-props.js"
import { buildElement } from "../tree/builders.js"
import type { ElementNode } from "../tree/node.js"

import { describeRepointedBinding, repointedBindingsBetween } from "./repointing.js"

/**
 * Both trees are built with one id factory so a node keeps its id across the
 * pair, for the reason `redirection.test.ts` gives next door: two independently
 * built trees would have different ids and nothing would ever look repointed.
 */
const pageWith = (...declarations: readonly (JsonObject | undefined)[]) => {
  const idFactory = sequentialIdFactory("rep")
  const cards = declarations.map((declared) =>
    buildElement(idFactory, {
      type: "loom.card",
      props: declared === undefined ? {} : { [DATA_PROP_KEY]: declared },
    })
  )

  return { page: buildElement(idFactory, { type: "loom.page", children: cards }), cards }
}

/** The same page, with each card's declaration replaced in place. */
const rebound = (
  page: ElementNode,
  declarations: readonly (JsonObject | undefined)[]
): ElementNode => ({
  ...page,
  children: page.children.map((child, index) => {
    const declared = declarations[index]

    return {
      ...(child as ElementNode),
      props: declared === undefined ? {} : { [DATA_PROP_KEY]: declared },
    }
  }),
})

const asks = (source: string, params?: JsonObject): JsonObject => ({
  items: params === undefined ? { source } : { source, params },
})

describe("repointedBindingsBetween", () => {
  it("reports a region that now asks a different source, naming both ends", () => {
    const { page, cards } = pageWith(asks("catalogue.services"))
    const after = rebound(page, [asks("orders.mine")])

    expect(repointedBindingsBetween(page, after)).toEqual([
      {
        nodeId: cards[0]?.id,
        name: "items",
        kind: "source",
        from: "catalogue.services",
        to: "orders.mine",
      },
    ])
  })

  /**
   * The finding this module answers recommended weighing the source alone. This
   * is the case that says why it could not: the framework's own documented
   * binding selects a field of the host's data with nothing but a param, so a
   * source-only reading would let exactly the change this exists to catch
   * through unremarked (0163).
   */
  it("reports a params move on one source, because params are half the question", () => {
    const { page, cards } = pageWith(asks("profile.field", { field: "bio" }))
    const after = rebound(page, [asks("profile.field", { field: "salary" })])

    expect(repointedBindingsBetween(page, after)).toEqual([
      {
        nodeId: cards[0]?.id,
        name: "items",
        kind: "params",
        from: "profile.field",
        to: "profile.field",
      },
    ])
  })

  it("says nothing when the question is unchanged", () => {
    const { page } = pageWith(asks("catalogue.services", { limit: 6 }))
    const after = rebound(page, [asks("catalogue.services", { limit: 6 })])

    expect(repointedBindingsBetween(page, after)).toEqual([])
  })

  /** The plan's own rule that key order is not part of a question, read here. */
  it("does not call a reordered param map a repointing", () => {
    const { page } = pageWith(asks("catalogue.services", { limit: 6, kind: "a" }))
    const after = rebound(page, [asks("catalogue.services", { kind: "a", limit: 6 })])

    expect(repointedBindingsBetween(page, after)).toEqual([])
  })

  it("treats a region that gains a binding as new, not repointed", () => {
    const { page } = pageWith(undefined)

    expect(repointedBindingsBetween(page, rebound(page, [asks("orders.mine")]))).toEqual([])
  })

  it("treats a region that loses its binding as a loss, not a repointing", () => {
    const { page } = pageWith(asks("catalogue.services"))

    expect(repointedBindingsBetween(page, rebound(page, [undefined]))).toEqual([])
  })

  it("treats a declaration that stops parsing as a loss, because the page does too", () => {
    const { page } = pageWith(asks("catalogue.services"))
    const after = rebound(page, [{ items: { source: "not a valid id" } }])

    expect(repointedBindingsBetween(page, after)).toEqual([])
  })

  it("does not read a question out of a declaration that never parsed", () => {
    const { page } = pageWith({ items: { source: "not a valid id" } })

    expect(repointedBindingsBetween(page, rebound(page, [asks("orders.mine")]))).toEqual([])
  })

  /**
   * A malformed entry refuses the whole map (`parseBindings`), so the binding
   * that did not move disappears with the one that did. It reads as a loss,
   * which is the same answer the page gives.
   */
  it("reports nothing for a node whose map stopped parsing beside a good entry", () => {
    const { page } = pageWith({
      items: { source: "catalogue.services" },
      bio: { source: "profile.field" },
    })
    const after = rebound(page, [
      { items: { source: "orders.mine" }, bio: { source: "not a valid id" } },
    ])

    expect(repointedBindingsBetween(page, after)).toEqual([])
  })

  it("tells two nodes reading one name apart", () => {
    const { page, cards } = pageWith(asks("catalogue.services"), asks("catalogue.services"))
    const after = rebound(page, [asks("catalogue.services"), asks("orders.mine")])

    expect(repointedBindingsBetween(page, after)).toEqual([
      {
        nodeId: cards[1]?.id,
        name: "items",
        kind: "source",
        from: "catalogue.services",
        to: "orders.mine",
      },
    ])
  })

  it("reports one name that moved and leaves the other alone on the same node", () => {
    const { page, cards } = pageWith({
      items: { source: "catalogue.services" },
      bio: { source: "profile.field", params: { field: "bio" } },
    })
    const after = rebound(page, [
      {
        items: { source: "catalogue.services" },
        bio: { source: "profile.field", params: { field: "salary" } },
      },
    ])

    expect(repointedBindingsBetween(page, after)).toEqual([
      {
        nodeId: cards[0]?.id,
        name: "bio",
        kind: "params",
        from: "profile.field",
        to: "profile.field",
      },
    ])
  })

  it("finds nothing in a page that asked nothing to begin with", () => {
    const { page } = pageWith(undefined, undefined)

    expect(repointedBindingsBetween(page, rebound(page, [asks("orders.mine")]))).toEqual([])
  })
})

describe("describeRepointedBinding", () => {
  it("names the node, the name and both sources when the source moved", () => {
    const { page, cards } = pageWith(asks("catalogue.services"))
    const [moved] = repointedBindingsBetween(page, rebound(page, [asks("orders.mine")]))

    expect(moved && describeRepointedBinding(moved)).toBe(
      `${cards[0]?.id}.items from catalogue.services to orders.mine`
    )
  })

  /**
   * Naming one source twice would read as a change that did not happen, so the
   * params case gets its own sentence — the distinction `protectedTypeRelocated`
   * draws against `protectedTypeTouched`, for the same reason (0044).
   */
  it("says the source was asked for something else when only the params moved", () => {
    const { page, cards } = pageWith(asks("profile.field", { field: "bio" }))
    const after = rebound(page, [asks("profile.field", { field: "salary" })])
    const [moved] = repointedBindingsBetween(page, after)

    expect(moved && describeRepointedBinding(moved)).toBe(
      `${cards[0]?.id}.items asks profile.field for something else`
    )
  })
})
