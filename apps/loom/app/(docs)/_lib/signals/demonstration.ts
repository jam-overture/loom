/**
 * What the live block on *What your readers do* broadcasts with.
 *
 * It sat inside the client component that starts the broadcaster, which was
 * right while the broadcaster was the only thing that read it. It is here
 * because the claim the prose makes about it — *`viewed` for the two sections
 * and the questions band* — was held against the constant **by a regular
 * expression over the component's source**, which was the only way to reach a
 * value private to a `"use client"` module. A regex over source could not see
 * the constant move, so a reader of that test learned *the live block no longer
 * has a TYPES constant* rather than anything about the claim.
 *
 * The notice section that also wanted this object is not on this branch (see
 * `notice.ts`). The move stands on its own: a claim about a value is better held
 * against the value.
 *
 * A client component may import from here; nothing here may import from one.
 */

/**
 * What the demonstration asks for, and why it is not simply everything.
 *
 * It is the shape the ski prototype wanted and could not have until 0136 was
 * amended: time on screen for the things that *are* the page, and activations
 * for the things inside them a reader aims at. Asking for all four kinds on all
 * types would bury the interesting signals under a `dwelled` for every link on
 * screen, several times a minute — which is the cost the amendment was about.
 */
export const DEMONSTRATION_KINDS = ["viewed", "dwelled", "activated", "disclosed"] as const

export const DEMONSTRATION_TYPES = {
  viewed: ["loom.section", "loom.faq-list"],
  dwelled: ["loom.section"],
  activated: ["loom.action", "loom.link"],
  disclosed: ["loom.faq"],
} as const
