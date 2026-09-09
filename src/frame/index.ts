/**
 * Whose documents a page may frame.
 *
 * A tree names a URL, because which video belongs on a page is a content
 * decision. A deployment names the origins it is willing to put inside an
 * `iframe`, because who may run a script inside its pages is not. This module
 * is both halves of that seam (0095).
 */

export * from "./catalogue.js"
export * from "./origin.js"
export * from "./resolution.js"
