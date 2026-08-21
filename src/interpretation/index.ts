/**
 * Asking a model what to change, and reading the answer.
 *
 * The client seam, the prompt a proposal is built from, and the parse that turns a
 * reply into a delta the tree can be asked to apply — or a refusal that says why
 * it could not be read.
 */

export * from "./client.js"
export * from "./draft.js"
export * from "./interpreter.js"
export * from "./materialize.js"
export * from "./prompt.js"
export * from "./render.js"
export * from "./schema.js"
