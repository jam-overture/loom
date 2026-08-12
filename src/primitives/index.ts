import type { PrimitiveEntry } from "../sdk/definition.js"
import { createPrimitiveRegistry, type PrimitiveRegistry, type RegistryError } from "../sdk/registry.js"
import type { Result } from "../result.js"

import { loomAction } from "./loom.action.js"
import { loomDivider } from "./loom.divider.js"
import { loomHeading } from "./loom.heading.js"
import { loomMedia } from "./loom.media.js"
import { loomPage } from "./loom.page.js"
import { loomProse } from "./loom.prose.js"
import { loomSection } from "./loom.section.js"
import { loomSplit } from "./loom.split.js"
import { loomStat } from "./loom.stat.js"
import { loomStatGrid } from "./loom.stat-grid.js"

/**
 * The starter primitive library — ten primitives chosen to cover the
 * *contract*, not the catalogue.
 *
 * Four compose (`page`, `section`, `split`, `stat-grid`), two of them through
 * named slots. Five are leaves. One carries a rich schema with a cross-field
 * rule (`media`), one is driven by an enum that changes what is rendered
 * (`divider`), and one pair demonstrates the decomposition every remaining
 * Hermes list block will follow (`stat-grid` over `stat`).
 *
 * Proving the port pattern on ten is the point: the other sixty are mechanical
 * once these are right, and they would have been sixty repetitions of the wrong
 * shape if they had gone first.
 */

export const STARTER_PRIMITIVES: readonly PrimitiveEntry[] = [
  loomPage,
  loomSection,
  loomSplit,
  loomStatGrid,
  loomStat,
  loomHeading,
  loomProse,
  loomDivider,
  loomMedia,
  loomAction,
]

/**
 * A registry over the starter library, as a `Result` like any other — building
 * one is the same operation for this library as for a host's own, and a helper
 * that threw where the general function returns would be a second contract to
 * learn.
 */
export const createStarterPrimitiveRegistry = (
  additional: readonly PrimitiveEntry[] = []
): Result<PrimitiveRegistry, RegistryError> =>
  createPrimitiveRegistry([...STARTER_PRIMITIVES, ...additional])

export * from "./tokens.js"
export {
  loomAction,
  loomDivider,
  loomHeading,
  loomMedia,
  loomPage,
  loomProse,
  loomSection,
  loomSplit,
  loomStat,
  loomStatGrid,
}
