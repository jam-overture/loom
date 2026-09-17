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
 *
 * ## It is also what the review queue reads words out of
 *
 * Every one of these four declares `copy: []`, and the empty list is a claim
 * rather than a formality. `copyIn` distinguishes *this shows no words of its
 * own* from *nobody has said* and reports only the second (0122), and the
 * review queue now says so out loud: an undeclared type makes a deletion read
 * *"this may take away words Loom cannot show you"*.
 *
 * All four of these hold their words as children, so `[]` is the true answer
 * and the queue stays quiet about them. Leaving it off would have put that
 * caveat under every removal on this deployment — correct about the silence
 * and useless, because the silence would be ours.
 *
 * `registry.test.ts` fails on a fifth primitive registered without it, which is
 * the moment somebody still has the schema in front of them and can say.
 */
const built = createPrimitiveRegistry([loomPage, loomCard, loomHeading, loomProse])

if (!built.ok) {
  throw new Error(`loom: the primitive registry was refused — ${describeRegistryError(built.error)}`)
}

export const portalRegistry = built.value
