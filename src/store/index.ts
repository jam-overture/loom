/**
 * Keeping trees, and the record of how they got that way.
 *
 * A store holds a snapshot and an append-only log beside it, so that any revision
 * can be replayed, attributed, or undone. Two implementations, one contract.
 */

/**
 * The project a store speaks for (0260), re-exported here rather than given an
 * entry point of its own: it is the scope every one of these reads sits
 * inside, so a caller that imports a store already needs it.
 *
 * The audience is here on the same terms (0284). It is not a scope a store
 * speaks for — it is a column on the reader tables and a field a sender may
 * set — but it is an id a host has to be able to *name*, and the alternative
 * to naming it here is a host that can read the field and not write one.
 *
 * Its rules and its composition are here for a narrower reason: the thing that
 * composes a page out of a base and the deltas an audience earned is a
 * `TreeSource` over a store (0263), and `source.js` below is where a store
 * becomes one. A host wiring the composing source needs the rule it hands it.
 */
export * from "../application/application.js"
export * from "../application/memory.js"
export * from "../audience/audience.js"
export * from "../audience/compose.js"
export * from "../audience/rule.js"
export * from "../project/project.js"
export * from "../project/memory.js"
export * from "../project/closing.js"
export * from "../project/store.js"
export * from "../application/store.js"

export * from "./attribution.js"
export * from "./cache.js"
export * from "./driver.js"
export * from "./errors.js"
export * from "./history.js"
export * from "./memory.js"
export * from "./replay.js"
export * from "./reseed.js"
export * from "./revert.js"
export * from "./source.js"
export * from "./store.js"
export * from "./undone.js"
