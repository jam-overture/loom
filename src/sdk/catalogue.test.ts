import { createElement } from "react"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { registryOf, testDefinitions } from "../testing/definitions.js"

import { catalogueOf } from "./catalogue.js"
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

  it("holds nothing that cannot be serialised", () => {
    const catalogue = catalogueOf(registryOf(testDefinitions))

    expect(JSON.parse(JSON.stringify(catalogue))).toEqual(catalogue)
  })
})
