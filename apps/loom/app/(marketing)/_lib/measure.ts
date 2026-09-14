import type { LoomNode } from "@loom/runtime"

/**
 * What a page measures out to, counted rather than characterised.
 *
 * The same argument `words.ts` makes for the register: a measurement two bands
 * print is a measurement that has to be taken one way, or the two bands
 * eventually disagree about a number a reader can compare across a click.
 *
 * `piecesIn` lived in `pages/when-it-goes-wrong.ts` until the round-trip band
 * needed it too, and a page module importing another page module is the wrong
 * direction — pages read this layer, they do not read each other. It is the
 * move `NOT_A_RULE` made on 13 September, for the same reason and on the second
 * reader rather than the first.
 */

/**
 * How many pieces a page is made of, counted by walking it.
 *
 * The site says *pieces* wherever the machinery says nodes — the front door's
 * panel has reported *"11 pieces moved"* since the band was written — so this
 * counts the same thing that sentence counts, and a reader comparing the two
 * numbers is comparing like with like.
 */
export const piecesIn = (node: LoomNode): number =>
  node.kind === "text" ? 1 : 1 + node.children.reduce((sum, child) => sum + piecesIn(child), 0)
