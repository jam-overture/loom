import { walkTree, type LoomTree, type PrimitiveType } from "@jam-overture/loom"
import type { PrimitiveRegistry } from "@jam-overture/loom/sdk"

import { capitalised, nounOf } from "./part-name"

/**
 * What this deployment governs, read as one thing.
 *
 * ## The question nothing answered
 *
 * The maintainer's verdict on 1 October was that the portal is *"a disorganized
 * mess — I don't know what I should be looking for, what I should be looking at,
 * or what I am looking at"*, and the sentence after it is the brief: **Loom is a
 * governance model and the portal should reflect that.**
 *
 * Every fact a person needs to answer *what am I looking at* was already in this
 * portal and no screen held two of them at once. `/portal/pieces` lists what the
 * AI may build with. `/portal/pages` lists what it has built. `/portal/rules`
 * lists what it is allowed to do. Three screens, three nouns, and nothing that
 * says they are three views of **one app** — so a person arriving had to already
 * know the model in order to find the screens that describe it.
 *
 * This module is that one thing: the app, its pages, the pieces they are built
 * from, and which registered pieces nothing has used yet.
 *
 * ## "Which apps have I registered" has nothing behind it, and this says so
 *
 * The first thing the maintainer asked for was a list of his apps. **Loom has no
 * concept of an app.** A deployment is one registry, one policy source and one
 * store, wired at a composition root; `PolicySource` can vary a policy per tree
 * and per ask, and nothing above a tree groups anything.
 *
 * So this assembles the **single-app** answer and the screen says it is one,
 * rather than drawing a list of one and implying a second could appear. What an
 * app would have to be for there to be several is `0220`, `Proposed` — it is
 * §1's business and not this lane's to invent.
 *
 * ## Why the usage count is the valuable half
 *
 * *Which pieces are registered* is a list a repository already has — it is the
 * composition root, in source. **Which of them your pages actually use** is not
 * in any repository, because it is a fact about trees that were never written as
 * markup. A piece registered and never used is a thing the AI is being offered
 * every time it is asked for a change and has never once reached for, which is
 * either a gap in the pages or a gap in the catalogue, and no other tool in the
 * ecosystem can tell a developer which pieces those are.
 */

/**
 * How many pages the app tree draws at once.
 *
 * Every drawn page's whole tree is in the payload, because selecting a part and
 * seeing it rendered has to be instant — the same decision `picked-parts.tsx`
 * argues for one page, and the only one that survives a second click.
 *
 * It is a **window with a stated size**, not a sample: a sample has holes and a
 * reader has no way to tell a hole from a page that is not there. Twelve is the
 * number of pages a person can take in without scrolling past the thing they
 * came to look at, and the screen says how many there are in all.
 */
export const MOST_PAGES_DRAWN = 12

export type PieceUsage = {
  /** The runtime's own name for it — `loom.card`. Identity, so it stays. */
  readonly type: PrimitiveType
  /** What a person would call one. `Card`, `Heading`, `Band`. */
  readonly name: string
  /** The registry's own sentence, which is also what the model is told. */
  readonly description: string
  /** How many parts across every drawn page are one of these. */
  readonly used: number
}

/**
 * Every registered piece, in registration order, with how often the app uses it.
 *
 * Registration order rather than by usage, and the reason is what the list is
 * for: it is the catalogue a model is handed (0013), and a reader comparing this
 * screen against `/portal/pieces` or against the composition root should find
 * the same list in the same order. Sorting by popularity would make the same set
 * look like a different one on every screen that showed it.
 *
 * Counted over the trees it is handed rather than over the store, so a windowed
 * view counts the window. The screen says which it is; a count that silently
 * spanned pages the reader cannot see would be the one number here nobody could
 * check.
 */
export const pieceUsage = (
  registry: PrimitiveRegistry,
  trees: readonly LoomTree[]
): readonly PieceUsage[] => {
  const tally = new Map<string, number>()

  for (const tree of trees) {
    for (const node of walkTree(tree.root)) {
      if (node.kind !== "element") continue

      tally.set(node.type, (tally.get(node.type) ?? 0) + 1)
    }
  }

  return registry.primitives.map((primitive) => ({
    type: primitive.type,
    name: capitalised(nounOf(primitive.type)),
    description: primitive.description,
    used: tally.get(primitive.type) ?? 0,
  }))
}

/**
 * The pieces nothing on any drawn page is built from.
 *
 * Derived rather than counted a second time, which is the whole of why it is a
 * function and not a field: two passes over one tally is how a screen comes to
 * say *14 registered, 9 used* above a list of six.
 */
export const unusedPieces = (pieces: readonly PieceUsage[]): readonly PieceUsage[] =>
  pieces.filter((piece) => piece.used === 0)

const plural = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? "" : "s"}`

/**
 * What the app is, in one sentence, for the top of the screen.
 *
 * It is one sentence rather than a row of figures because the figures mean
 * nothing apart: *14 pieces* is trivia, and *your pages are built from 9 of the
 * 14 kinds of piece you registered* is the governance fact — it says what the AI
 * may reach for and how much of that it has ever reached for.
 *
 * The runtime's words are kept out of it entirely. A reader meets *piece* and
 * *page*, which are the two nouns the rest of this portal already uses in the
 * middle of a sentence.
 */
export const appSummary = (
  pages: number,
  pieces: readonly PieceUsage[]
): string => {
  const used = pieces.length - unusedPieces(pieces).length

  if (pieces.length === 0) {
    return "Nothing is registered here yet, so there is nothing the AI could put on a page."
  }

  if (pages === 0) {
    return `You have registered ${plural(pieces.length, "kind")} of piece and no pages yet. The AI is handed that exact list every time you ask for a change.`
  }

  /**
   * *All four* rather than *4 of the 4*, which is what the first draft said and
   * what a screenshot refused. A fraction whose halves are equal is a reader
   * doing arithmetic to arrive at "all of them", on the sentence that is supposed
   * to tell them what they have — and it is the ordinary case on a small app,
   * which is every app on its first day.
   */
  return used === pieces.length
    ? `${capitalised(plural(pages, "page"))}, built from all ${plural(pieces.length, "kind")} of piece you registered.`
    : `${capitalised(plural(pages, "page"))}, built from ${used} of the ${plural(pieces.length, "kind")} of piece you registered.`
}

/**
 * How much of the app the tree below is showing, said only when it is not all of
 * it.
 *
 * `null` on a deployment inside the window, so the line appears exactly when a
 * reader would otherwise be looking at part of their app believing it was the
 * whole of it.
 */
export const windowNote = (drawn: number, total: number): string | null =>
  drawn >= total
    ? null
    : `These are ${drawn} of your ${plural(total, "page")}. The counts above are for these ${drawn}.`

/**
 * The pieces Loom ships that this app has not registered.
 *
 * ## Why a portal should say this at all
 *
 * A registry is a **decision**: a host says what the AI may build with, and
 * everything it does not say is something the AI cannot put on a page however
 * well it would fit. That decision is invisible from inside the deployment — the
 * catalogue screen lists what was chosen and has no way to show what was
 * declined, so a developer looking at four registered pieces cannot tell whether
 * four is all there is.
 *
 * It is the other half of the same governance fact as `unusedPieces`. One says
 * *you are offering the AI something it never reaches for*; this says *the AI
 * cannot reach for something Loom could have drawn*. Both are choices rather than
 * defects, and both are choices nobody can review while they are invisible.
 *
 * **The wording that goes with it has to stay neutral**, and the screen's does:
 * registering fewer pieces is how a host keeps a page on-brand, and a portal
 * nagging somebody to register ninety components would be worse than one that
 * said nothing. The number is the news; what to do about it is not this screen's
 * opinion to have.
 */
export const notRegistered = (
  registry: PrimitiveRegistry,
  /**
   * Structurally typed on the one field this reads, rather than on
   * `PrimitiveEntry` or on `RegisteredPrimitive`. The library ships the first and
   * a registry holds the second; their `type` fields are the same string and one
   * of them is branded, so naming either would make this function take a library
   * and refuse a registry, or the reverse. What it actually needs is a list of
   * things with a type on them.
   */
  shipped: readonly { readonly type: string }[]
): readonly { readonly type: string; readonly name: string }[] => {
  const registered = new Set<string>(registry.primitives.map((primitive) => primitive.type))

  return shipped
    .filter((primitive) => !registered.has(primitive.type))
    .map((primitive) => ({ type: primitive.type, name: capitalised(nounOf(primitive.type)) }))
}

/**
 * How much of what Loom ships this app has turned on, as a sentence.
 *
 * `null` when the app has registered everything the library has, which is a real
 * state and not a rounding of the others: a line reading *0 of them are not
 * registered* is a sentence about arithmetic rather than about the app.
 */
export const libraryNote = (ships: number, registered: number): string | null =>
  ships <= registered
    ? null
    : `Loom ships ${plural(ships, "piece")} out of the box. This app has turned ${registered} of them on — the rest cannot appear on a page here, whatever anyone asks for.`
