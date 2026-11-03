/**
 * The second panel under *What you write*, and the one carrying the claim.
 *
 * `price-tag.tsx` beside it is the reader's own component. This is everything
 * Loom is told about it, and the site has said four times that this much is all
 * the setup there is — in the maintainer's own second step (*"Register them with
 * Loom. That is all the setup there is."*), in the second link of his chain, and
 * twice more in the bands those two point at. None of them showed it.
 *
 * ## What is in here is the shortest true version, not the smallest one
 *
 * Three fields are what `definePrimitive` needs for a component that draws
 * itself from props: a name a page can use, a check on the settings it accepts,
 * and the function that draws it. `slots` is left off because this component
 * has no regions inside it, and a field set to its own default would read as
 * ceremony to the reader this panel is for.
 *
 * **The wrapper around `PriceTag` is not padding.** `loom.editable` is how the
 * portal finds the element on the page, and the framework's own note on it says
 * a component that drops it renders correctly and becomes invisible there. A
 * panel that left it out would be showing a reader the shape that quietly costs
 * them the review screen, which is the half of this product they pay for.
 *
 * ## Everything below the marker is published
 *
 * Same arrangement as `price-tag.tsx`, for the same reason, and the imports are
 * inside the region deliberately: a reader has to be able to see which package
 * each name comes from, and a published region that omitted them would be a
 * region that does not compile on its own.
 */

// ── shown on the site ──
import { z } from "zod"

import type { LoomPrimitiveProps } from "@jam-overture/loom/react"
import { definePrimitive } from "@jam-overture/loom/sdk"

import { PriceTag } from "./price-tag"

const priceTagProps = z
  .object({ amount: z.string(), was: z.string().optional() })
  .strict()

type Settings = z.infer<typeof priceTagProps>

export const priceTag = definePrimitive({
  type: "shop.price-tag",
  description: "A price, with any earlier price beside it.",
  props: priceTagProps,
  component: ({ loom, props }: LoomPrimitiveProps<Settings>) => (
    <span {...loom.editable}>
      <PriceTag amount={props.amount} was={props.was} />
    </span>
  ),
})
