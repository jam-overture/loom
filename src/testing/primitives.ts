import { createElement } from "react"

import type { LoomPrimitive, LoomPrimitiveProps } from "../render/primitive.js"
import { staticPrimitiveResolver, type PrimitiveResolver } from "../render/primitive.js"

/**
 * A host primitive set covering `sampleTree`, so renderer tests assert against
 * real markup rather than a mock's call log.
 *
 * Each one does what a well-behaved primitive does: reads the props it declares
 * out of the bag, spreads `loom.editable` onto its own root element, applies
 * `loom.theme` as its style, places every region it was handed, and adds no
 * element of its own to carry any of it.
 *
 * A real primitive names the regions it places; these are generic over any tag,
 * so they place whatever arrived, in tree order.
 */

const hostPrimitive = (tag: string): LoomPrimitive => {
  const Primitive = ({ loom, props, children }: LoomPrimitiveProps) =>
    createElement(
      tag,
      { ...loom.editable, style: loom.theme, "data-props": JSON.stringify(props) },
      children,
      Object.keys(loom.slots).map((name) => loom.slots[name])
    )

  Primitive.displayName = `host(${tag})`

  return Primitive
}

/** A primitive that ignores `loom.editable` — the failure mode §4 has to catch. */
export const undecoratedPrimitive: LoomPrimitive = ({ children }: LoomPrimitiveProps) =>
  createElement("div", null, children)

export const testPrimitives: Readonly<Record<string, LoomPrimitive>> = {
  "loom.page": hostPrimitive("main"),
  "loom.header": hostPrimitive("header"),
  "loom.card": hostPrimitive("article"),
  "loom.footer": hostPrimitive("footer"),
}

export const testPrimitiveResolver: PrimitiveResolver = staticPrimitiveResolver(testPrimitives)
