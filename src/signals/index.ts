/**
 * Reader signals: what a published page may say about how it is being read.
 *
 * The vocabulary and its parser are safe to import anywhere. The broadcaster
 * touches the DOM only when it is called, so this entry point also loads on a
 * server that merely parses batches (0136).
 */

export * from "./broadcast.js"
export * from "./signal.js"
