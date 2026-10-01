import { describe, expect, it } from "vitest"

import { walkTree } from "@jam-overture/loom"
import { STARTER_PRIMITIVES } from "@jam-overture/loom/primitives"

import {
  appSummary,
  libraryNote,
  notRegistered,
  pieceUsage,
  unusedPieces,
  windowNote,
  MOST_PAGES_DRAWN,
} from "./app-view"
import { portalRegistry } from "./registry"
import { seedTree } from "./seed"
import { runtimeWordsIn } from "../_test/plain-language"

const registered = portalRegistry.primitives.map((primitive) => primitive.type)

describe("pieceUsage", () => {
  /**
   * The list is the catalogue, in the catalogue's order, whether or not the app
   * uses any of it. A screen that showed only what was used would be unable to
   * answer the one question nothing else can.
   */
  it("names every registered piece, in registration order, used or not", () => {
    const usage = pieceUsage(portalRegistry, [])

    expect(usage.map((piece) => piece.type)).toEqual(registered)
    expect(usage.every((piece) => piece.used === 0)).toBe(true)
  })

  it("counts every part of every tree it is handed", () => {
    const usage = pieceUsage(portalRegistry, [seedTree()])
    const heading = usage.find((piece) => piece.type === "loom.heading")

    /** The seed's page has a heading at the top and one inside its card. */
    expect(heading?.used).toBe(2)
  })

  it("counts one page's parts once and two pages' twice", () => {
    const one = pieceUsage(portalRegistry, [seedTree()])
    const two = pieceUsage(portalRegistry, [seedTree(), seedTree()])
    const totalOf = (usage: ReturnType<typeof pieceUsage>): number =>
      usage.reduce((sum, piece) => sum + piece.used, 0)

    expect(totalOf(two)).toBe(totalOf(one) * 2)
  })

  /**
   * The words inside a part are a part of the tree and are not a piece — nothing
   * registered them. Counting them would make the tally disagree with the
   * catalogue it is read against.
   */
  it("counts no part for the words inside one", () => {
    const tree = seedTree()
    const usage = pieceUsage(portalRegistry, [tree])
    const counted = usage.reduce((sum, piece) => sum + piece.used, 0)
    const everyNode = [...walkTree(tree.root)].length

    /**
     * The seed is six parts holding four strings between them. The tally counts
     * the parts, because the words inside one are a part of the tree and are not
     * a *piece* — nothing registered them, and counting them would make this
     * disagree with the catalogue it is read against.
     */
    expect(counted).toBe(6)
    expect(everyNode).toBeGreaterThan(counted)
  })

  it("gives every piece a name a person would use beside the runtime's", () => {
    const usage = pieceUsage(portalRegistry, [])

    for (const piece of usage) {
      expect(piece.name).not.toContain(".")
      expect(piece.name.slice(0, 1)).toBe(piece.name.slice(0, 1).toUpperCase())
      expect(piece.type).toContain(".")
    }
  })
})

describe("unusedPieces", () => {
  /**
   * The valuable half, and the reason it is a list rather than a number: a piece
   * registered and never used is something the AI is offered every time it is
   * asked for a change and has never once reached for.
   */
  /**
   * Over a tree rather than over a hand-written tally, because the interesting
   * case is a piece the registry has and the pages do not — and on this
   * deployment every registered piece is on the seed, so the case has to be made
   * by taking a page away rather than by inventing a count.
   */
  it("names the pieces nothing on any page is built from", () => {
    const everywhere = unusedPieces(pieceUsage(portalRegistry, [seedTree()]))
    const nowhere = unusedPieces(pieceUsage(portalRegistry, []))

    expect(everywhere).toEqual([])
    expect(nowhere.map((piece) => piece.type)).toEqual(registered)
    expect(nowhere.every((piece) => piece.used === 0)).toBe(true)
  })

  it("names none when every registered piece is on a page", () => {
    const everyPiece = pieceUsage(portalRegistry, [seedTree()])

    expect(everyPiece.every((piece) => piece.used > 0)).toBe(true)
    expect(unusedPieces(everyPiece)).toEqual([])
  })
})

describe("appSummary", () => {
  it("says what the app is in one sentence, with the used count against the registered one", () => {
    const usage = pieceUsage(portalRegistry, [seedTree()])
    const partlyUsed = usage.map((piece, index) => (index === 0 ? { ...piece, used: 0 } : piece))

    expect(appSummary(1, partlyUsed)).toContain("1 page")
    expect(appSummary(1, partlyUsed)).toContain(`of the ${usage.length} kinds of piece`)
  })

  /**
   * *All four* rather than *4 of the 4*. A fraction whose halves are equal makes a
   * reader do arithmetic to arrive at "all of them", on the one sentence that is
   * supposed to tell them what they have — and it is the ordinary case on a small
   * app, which is every app on its first day. Found by reading a screenshot.
   */
  it("says all of them rather than a fraction of itself when every piece is used", () => {
    const usage = pieceUsage(portalRegistry, [seedTree()])

    expect(appSummary(1, usage)).toContain(`all ${usage.length} kinds of piece`)
    expect(appSummary(1, usage)).not.toContain(`${usage.length} of the ${usage.length}`)
  })

  it("says a different thing about an app with nothing on it yet", () => {
    const usage = pieceUsage(portalRegistry, [])

    expect(appSummary(0, usage)).toContain("no pages yet")
  })

  /**
   * A deployment that registered nothing has a different problem from one that
   * has built nothing, and only one of the two is about pages. Rounding the first
   * to the second would tell somebody to go and make a page when the AI has
   * nothing it could put on one.
   */
  it("says a different thing again about an app with nothing registered", () => {
    expect(appSummary(3, [])).toContain("nothing the AI could put on a page")
  })

  it("reads plainly, in every state", () => {
    const usage = pieceUsage(portalRegistry, [seedTree()])

    for (const sentence of [appSummary(1, usage), appSummary(0, usage), appSummary(3, [])]) {
      expect(runtimeWordsIn(sentence)).toEqual([])
    }
  })
})

describe("windowNote", () => {
  it("says nothing when the screen is showing the whole app", () => {
    expect(windowNote(4, 4)).toBeNull()
  })

  /**
   * A window with a stated size, not a sample. A reader shown four of forty pages
   * with nothing saying so is reading a count of their app that is wrong by a
   * factor of ten, and has no way to find out.
   */
  it("says how much of the app it is showing, and that the counts follow it", () => {
    const note = windowNote(12, 40)

    expect(note).toContain("12 of your 40 pages")
    expect(note).toContain("counts above are for these 12")
    expect(runtimeWordsIn(note ?? "")).toEqual([])
  })

  it("draws enough pages that a one-page deployment is never windowed", () => {
    expect(MOST_PAGES_DRAWN).toBeGreaterThan(1)
    expect(windowNote(1, 1)).toBeNull()
  })
})

describe("what this app has not turned on", () => {
  /**
   * The other half of the same governance fact. `unusedPieces` says the AI is
   * being offered something it never reaches for; this says the AI cannot reach
   * for something Loom could have drawn. Both are choices rather than defects,
   * and both are invisible from inside the deployment.
   */
  it("names what the library ships and this registry does not", () => {
    const missing = notRegistered(portalRegistry, STARTER_PRIMITIVES)

    expect(STARTER_PRIMITIVES.length).toBeGreaterThan(registered.length)
    expect(missing.length).toBe(STARTER_PRIMITIVES.length - registered.length)
    expect(missing.map((piece) => piece.type)).not.toContain("loom.card")
  })

  it("names nothing when a registry has everything the library ships", () => {
    expect(notRegistered(portalRegistry, portalRegistry.primitives)).toEqual([])
  })

  it("gives each one a name a person would use", () => {
    for (const piece of notRegistered(portalRegistry, STARTER_PRIMITIVES)) {
      expect(piece.name).not.toContain(".")
    }
  })

  it("says how much of the library is on, in a person's words", () => {
    const note = libraryNote(STARTER_PRIMITIVES.length, registered.length)

    expect(note).toContain(`${STARTER_PRIMITIVES.length} pieces`)
    expect(note).toContain(`turned ${registered.length} of them on`)
    expect(runtimeWordsIn(note ?? "")).toEqual([])
  })

  /** A real state, not a rounding of the others: there is nothing left to say. */
  it("says nothing when an app has turned everything on", () => {
    expect(libraryNote(4, 4)).toBeNull()
    expect(libraryNote(4, 9)).toBeNull()
  })
})
