import { createPrimitiveRegistry, describeRegistryError } from "@loom/runtime/sdk"

import { loomCard } from "./primitives/loom.card"
import { loomHeading } from "./primitives/loom.heading"
import { loomPage } from "./primitives/loom.page"
import { loomProse } from "./primitives/loom.prose"

/**
 * The portal registers primitives exactly as any host would — through the public
 * SDK entry point, with no privileged access (0018). This registry is both the
 * renderer's resolver and its prop validator, and it is what bounds what a model
 * may build here (0013).
 */
const built = createPrimitiveRegistry([loomPage, loomCard, loomHeading, loomProse])

if (!built.ok) {
  throw new Error(`loom: the primitive registry was refused — ${describeRegistryError(built.error)}`)
}

export const portalRegistry = built.value
