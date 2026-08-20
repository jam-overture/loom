import { gatePolicySchema, type GatePolicy } from "@loom/runtime"
import { interactiveTypesFor } from "@loom/runtime/sdk"

import { docsRegistry } from "../loom/registry"

/**
 * The rules the documentation's own Gate judges by.
 *
 * A policy is a **host's** choice, not the runtime's (0002), so a site that
 * demonstrates the Gate has to declare one — and the one it declares is part of
 * what it is teaching. Everything below is either a default the runtime ships or
 * a sentence this site is trying to say out loud on a page.
 *
 * **Headings are protected.** Not because a heading is dangerous, but because
 * a reader needs to see the difference between a change the Gate waves through
 * and a change it stops, and the smallest honest way to show that is to name one
 * primitive consequential. A deployment would name its checkout, its pricing, its
 * consent notice. The docs name their headings, and the pages say so rather than
 * pretending the distinction is intrinsic.
 *
 * The two levels that follow are the runtime's, not a knob this file set:
 * *reconfiguring* a protected primitive is `high` and *destroying* one is
 * `critical`, so under the default ceilings the first asks a person and the
 * second is refused outright. One vocabulary entry, two visibly different
 * outcomes.
 *
 * **The interactive vocabulary is derived, never written.** `interactiveTypesFor`
 * reads what each primitive declared about itself (0064, 0068), so the day the
 * library gives another primitive an `href` this policy already knows. A
 * hand-written copy of that map would be wrong the first time the library moved
 * and nothing would say so.
 *
 * Everything else is `defaultGatePolicy`, deliberately: the structural
 * thresholds are host-independent and the site should be showing a reader what
 * they get out of the box.
 */

export const DOCS_POLICY_ID = "loom-docs"

/**
 * Parsed rather than spread over `defaultGatePolicy`, so the branded types are
 * minted by the schema that owns them and a typo in a primitive name fails here
 * — at module load on the site's own examples — rather than by quietly matching
 * nothing at judgment time.
 */
export const docsGatePolicy: GatePolicy = gatePolicySchema.parse({
  policyId: DOCS_POLICY_ID,
  protectedPrimitiveTypes: ["loom.heading"],
  interactiveTypes: interactiveTypesFor(docsRegistry),
})
