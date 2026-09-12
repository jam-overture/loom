/**
 * The part of Loom that decides whether a change may happen.
 *
 * An intent becomes a proposal, the proposal is analysed for what it puts at
 * stake, and a policy turns that into one of three answers: apply it, ask a human
 * first, or refuse. What it decided, and why, is narrated as it goes.
 */

export * from "./analysis.js"
export * from "./assessment.js"
export * from "./disposition.js"
export * from "./events.js"
export * from "./gate.js"
export * from "./intent.js"
export * from "./interpreter.js"
export * from "./inverse.js"
export * from "./nesting.js"
export * from "./pipeline.js"
export * from "./policy-fingerprint.js"
export * from "./policy-source.js"
export * from "./policy.js"
export * from "./proposal.js"
export * from "./redirection.js"
export * from "./reversibility.js"
export * from "./stake-level.js"
export * from "./stakes.js"
