/**
 * Reader signals: what a published page may say about how it is being read.
 *
 * The vocabulary and its parser are safe to import anywhere. The broadcaster
 * touches the DOM only when it is called, so this entry point also loads on a
 * server that merely parses batches (0136).
 *
 * **In a browser bundle, import the broadcaster from
 * `@loom/runtime/signals/broadcast` instead.** This entry also carries the
 * schemas, and a bundler cannot leave the schema library out once it is
 * imported — about 60 KB of it, against a broadcaster of about 5 KB.
 */

export * from "./broadcast.js"
export * from "./signal.js"
