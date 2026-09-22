import { createElement } from "react"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { registryOf, testDefinitions } from "../testing/definitions.js"

import {
  catalogueOf,
  type CataloguedPrimitive,
  type CataloguedProp,
  type PrimitiveCatalogue,
} from "./catalogue.js"
import { definePrimitive } from "./definition.js"

const unenumerable = definePrimitive({
  type: "loom.either",
  description: "props are one shape or another",
  props: z.union([z.object({ kind: z.literal("a") }), z.object({ kind: z.literal("b") })]),
  component: ({ children }: LoomPrimitiveProps) => createElement("div", null, children),
})

describe("catalogueOf", () => {
  it("projects each registered primitive onto what a consumer outside the process can use", () => {
    const catalogue = catalogueOf(registryOf(testDefinitions))

    expect(catalogue[0]).toEqual({
      type: "loom.page",
      description: "The page shell; everything else lives inside it",
      props: [
        { name: "subtitle", required: false },
        { name: "title", required: true },
      ],
      slots: ["main"],
    })
  })

  it("keeps registration order, so the catalogue reads as the deployment declared it", () => {
    expect(catalogueOf(registryOf(testDefinitions)).map((primitive) => primitive.type)).toEqual([
      "loom.page",
      "loom.header",
      "loom.card",
      "loom.footer",
    ])
  })

  it("carries no props for a primitive whose keys cannot be enumerated", () => {
    expect(catalogueOf(registryOf([unenumerable]))[0]?.props).toBeUndefined()
  })

  /**
   * Three answers, and the projection carries all three. A consumer that
   * flattened the third into an empty list would be making a claim the
   * primitive's author did not.
   */
  it("carries what a primitive said about the bindings it reads, including having said nothing", () => {
    const catalogue = catalogueOf(
      registryOf([
        definePrimitive({
          type: "loom.feed",
          description: "A list of entries",
          props: z.object({}),
          reads: ["entries"],
          component: () => null,
        }),
        definePrimitive({
          type: "loom.rule",
          description: "A line",
          props: z.object({}),
          reads: [],
          component: () => null,
        }),
        definePrimitive({
          type: "loom.panel",
          description: "A panel whose author has not said",
          props: z.object({}),
          component: () => null,
        }),
      ])
    )

    expect(catalogue.map((primitive) => primitive.reads)).toEqual([["entries"], [], undefined])
  })

  it("holds nothing that cannot be serialised", () => {
    const catalogue = catalogueOf(registryOf(testDefinitions))

    expect(JSON.parse(JSON.stringify(catalogue))).toEqual(catalogue)
  })

  /**
   * A host writing a function over the answer should not have to import the
   * function from one entry point and the shape of its result from another. The
   * types below are imported from *this* module rather than from `../catalogue.js`
   * on purpose: that is the whole assertion, and it is a compile-time one.
   */
  it("carries the shape of its own answer, so one import serves a host writing over it", () => {
    const catalogue: PrimitiveCatalogue = catalogueOf(registryOf(testDefinitions))
    const first: CataloguedPrimitive | undefined = catalogue[0]
    const props: readonly CataloguedProp[] | undefined = first?.props

    expect(first?.type).toBe("loom.page")
    expect(props?.some((prop) => prop.name === "title")).toBe(true)
  })
})
