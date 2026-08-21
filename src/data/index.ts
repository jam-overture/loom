/**
 * Questions a tree asks and cannot answer itself.
 *
 * A node names a source, the source is resolved once per request before the render
 * walk, and the answer — or a named reason there is none — reaches the primitive.
 */

export * from "./adapter.js"
export * from "./binding.js"
export * from "./catalogue.js"
export * from "./plan.js"
export * from "./resolution.js"
export * from "./resolve.js"
export * from "./source.js"
