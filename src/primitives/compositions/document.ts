import type { Composition } from "./composition.js"

/**
 * The regions of an interior document, in the order a reader meets them.
 *
 * ## Why there is a second tuple at all
 *
 * [0183](../../../decisions/0183-a-page-for-another-kind-of-business-is-the-same-sequence-with-different-nodes-in-it.md)
 * declined to open a second page sequence and declined it **with its trigger
 * named**: *"a second sequence is earned by a page whose regions come in a
 * different order, which is a documentation page or a reference, not a shop."*
 *
 * A reference page has **no hero**. It opens with where the reader is and goes
 * straight into the text, and three of its regions have nowhere to go on a
 * landing page — which is 0171's test passed rather than argued around.
 * [0245](../../../decisions/0245-a-second-page-sequence-is-earned-by-regions-in-a-different-order-and-the-sites-own-regions-are-shared.md)
 * works all three against the twenty-two and is `Proposed`: **what is on this
 * branch does not change the meaning of one existing export**, so review can
 * answer *one phrasebook or one per page kind* either way for the cost of a
 * rename.
 *
 * ## `nav` and `footer` are here and are not redrawn
 *
 * They belong to the **site** rather than to the page, so both sequences name
 * the same bands and {@link DOCUMENT_SEQUENCE} resolves them out of the landing
 * catalogue. A second sequence that redrew its own header would put two designs
 * of one region in the catalogue that must never diverge, and the first
 * deployment to edit one of them would ship a site whose pages have different
 * navigation.
 *
 * The rule is derived rather than listed: a part in both tuples resolves from
 * the landing catalogue, a part in this one alone resolves from
 * {@link DOCUMENT_COMPOSITIONS}.
 *
 * ## Adding a member here costs what adding one to `COMPOSITION_PARTS` costs
 *
 * 0171's price applies unchanged — every part is a band on the canonical
 * document, so {@link DOCUMENT_SEQUENCE} gets one longer and a part with no
 * canonical design is a red test rather than a page with a hole in it. The one
 * candidate this run considered and rejected is **`contents`**: an *On this
 * page* rail is a real region of a reference page and it cannot be a band,
 * because `loom.page` stacks its children in one column and a region beside the
 * text is not a sibling of it. It is a `loom.split` inside the `document` band.
 */
export const DOCUMENT_PARTS = ["nav", "trail", "document", "onward", "footer"] as const

export type DocumentPart = (typeof DOCUMENT_PARTS)[number]

/**
 * A band of an interior document.
 *
 * Every field means what {@link Composition}'s means; only `part` is drawn from
 * a different tuple. It is a separate type rather than a widening of
 * `Composition` so that `compositions.test.ts`' *every band declares a part the
 * page sequence knows* stays green **unweakened** — a document band is not a
 * design of a landing region and a test that had to admit one would have
 * stopped saying anything.
 */
export type DocumentComposition = Omit<Composition, "part"> & { readonly part: DocumentPart }
