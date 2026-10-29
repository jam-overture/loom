import type { IdFactory, LoomNode } from "@jam-overture/loom"

/**
 * Children and slots.
 *
 * The page assembles a hero out of pieces it introduced in the paragraph above,
 * which is the right way round for a reader and leaves the pieces themselves
 * unwritten. They are declared here rather than built, because what the page is
 * teaching is the *shape* of the call — and a node is a node however it was
 * made.
 *
 * `createElement` and `LoomPrimitiveProps` are not the story's either, and they
 * are re-exported from where they really live so the page's component is
 * checked against the real signatures. They are allowed to stay here because
 * the only blocks that use them are the inside of an object — you cannot write
 * an `import` in the middle of an object literal. `buildElement` and `buildSlot`
 * are called from blocks that *could* carry one, so the page carries it;
 * `lent.ts` is what tells the two cases apart.
 */

/** The id factory the page made two sections ago. */
export declare const ids: IdFactory

export declare const hero: LoomNode
export declare const features: LoomNode
export declare const pricing: LoomNode
export declare const primaryAction: LoomNode
export declare const secondaryAction: LoomNode

/** Two shorthands the page uses so the shape of the call stays readable. */
export declare const heading: (ids: IdFactory, level: number, text: string) => LoomNode
export declare const prose: (ids: IdFactory, text: string) => LoomNode

export { createElement } from "react"
export type { LoomPrimitiveProps } from "@jam-overture/loom/react"
