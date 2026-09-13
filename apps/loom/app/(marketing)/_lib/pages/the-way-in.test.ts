import type { ElementNode, LoomNode, SlotNode } from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { BAND } from "../bands"
import { SIGN_IN_LABEL } from "../chrome"
import { treeFor } from "../render"
import {
  doorOf,
  HOME,
  PORTAL,
  PRODUCT_SURFACES,
  surfaceHref,
  THE_RECORD,
  DEFAULT_THEME,
  type Surface,
} from "../site"

/**
 * What the site says about the one door on it.
 *
 * The portal is the only guarded surface, and since 25 August this site has
 * offered it four ways without any of them saying **whose portal it is**: the
 * bar's *Sign in*, the front door's band of cards, the footer's map, and the
 * record page's last band. A stranger reads an account as something this site
 * can give them, and it cannot — a portal belongs to the Loom site it is part
 * of, and who may sign in is a list whoever runs that site writes. On this
 * deployment that list does not exist yet, so the door the front door's only
 * action points at answers *This portal isn't set up yet*.
 *
 * **The assertions here are scoped to the band that does the offering**, not to
 * the page it is on. The sentence was on the site until 25 August and left in
 * an edit that was defensible on its own; a page-wide `toContain` would have
 * gone on passing for every arrangement of the page that keeps the words
 * anywhere on it, which is the same latitude that let the band's own note go on
 * promising a property the band had lost.
 */

const ORIGIN = "https://loom.example"

/**
 * Every element under a node, **through the slots** rather than stopping at
 * them. A card's cost is in its `footer` slot, so a walk that only followed
 * element children would report a page whose costs had all vanished as fine.
 */
const elementsIn = (node: LoomNode): readonly ElementNode[] =>
  node.kind === "text"
    ? []
    : node.kind === "element"
      ? [node, ...node.children.flatMap(elementsIn)]
      : node.children.flatMap(elementsIn)

/** And the slots themselves, which is where a card pins the line of costs. */
const slotsIn = (node: LoomNode, name: string): readonly SlotNode[] =>
  node.kind === "text"
    ? []
    : [
        ...(node.kind === "slot" && node.name === name ? [node] : []),
        ...node.children.flatMap((child) => slotsIn(child, name)),
      ]

const textIn = (node: LoomNode): string =>
  node.kind === "text" ? node.value : node.children.map(textIn).join(" ")

const rootOf = (route: typeof HOME) =>
  treeFor(route, { origin: ORIGIN, theme: DEFAULT_THEME }).root

/** The card in the front door's band of ways in that points at this surface. */
const cardFor = (surface: Surface): ElementNode => {
  const href = surfaceHref(ORIGIN, surface)
  const found = elementsIn(rootOf(HOME)).find(
    (node) => node.type === "loom.card" && node.props["href"] === href
  )

  if (found === undefined) throw new Error(`loom: ${surface.path} has no card on the front door`)

  return found
}

const bandOf = (route: typeof HOME, holds: (found: ElementNode) => boolean): ElementNode => {
  const found = elementsIn(rootOf(route)).find(holds)

  if (found === undefined) throw new Error(`loom: ${route.path} has no such band`)

  return found
}

describe("a surface with a door", () => {
  /**
   * The general form, so a second guarded surface inherits the guarantee rather
   * than needing this file edited. `door` is required by the type, and this is
   * the other half: a sentence nothing renders is a sentence that will drift.
   */
  const guarded = PRODUCT_SURFACES.filter((surface) => surface.guarded)

  it("is not a category with nothing in it", () => {
    expect(guarded.length).toBeGreaterThan(0)
  })

  it.each(guarded)("$label says whose it is on its own card, not merely on the page", (surface) => {
    const door = doorOf(surface)

    expect(door).toBeDefined()
    expect(textIn(cardFor(surface))).toContain(door)
  })

  it.each(PRODUCT_SURFACES.filter((surface) => !surface.guarded))(
    "$label has no door to describe, and says nothing about one",
    (surface) => {
      expect(doorOf(surface)).toBeUndefined()
    }
  )

  /**
   * The specific sentence that was wrong, held negatively.
   *
   * *Costs you an account* was the portal's cost line from 25 August. The other
   * three costs name something the reader can spend; this one named something
   * only somebody else can grant, on a line four cards are compared along. A
   * run that puts it back passes every other assertion in this file.
   */
  it("does not offer an account as a thing the reader can spend", () => {
    const said = textIn(rootOf(HOME))

    expect(said).not.toContain("Costs you an account")
    expect(said).toContain(PORTAL.cost)
  })
})

describe("the front door's questions band", () => {
  const questions = bandOf(HOME, (found) => found.type === "loom.faq-list")

  const answers = elementsIn(questions)
    .filter((node) => node.type === "loom.faq")
    .map((node) => ({
      question: String(node.props["question"] ?? ""),
      answer: String(node.props["answer"] ?? ""),
    }))

  const aboutAccounts = answers.find((entry) => entry.question.includes("account"))

  it("answers the question the bar's button puts in a stranger's head", () => {
    expect(aboutAccounts).toBeDefined()
  })

  /**
   * Both halves composed rather than typed. The answer names a button by the
   * button's own word and a door by the door's own sentence, so re-wording
   * either cannot leave this describing a page that no longer exists.
   */
  it("names the button by the word the bar actually carries", () => {
    expect(aboutAccounts?.answer).toContain(SIGN_IN_LABEL)
    expect(textIn(bandOf(HOME, (found) => found.type === "loom.nav"))).toContain(SIGN_IN_LABEL)
  })

  it("gives the same account of the door as the card below it", () => {
    expect(aboutAccounts?.answer).toContain(PORTAL.door)
  })
})

describe("the record page's last band", () => {
  /**
   * The sharper of the two placements. *The same record, on a page of your own*
   * is the band's heading and the button under it opened a portal that is not
   * the reader's — the one place on the site where *yours* and *this
   * deployment's* stood a sentence apart and read as the same thing.
   */
  const closing = bandOf(
    THE_RECORD,
    (found) => found.type === "loom.section" && found.props["tone"] === "accent"
  )

  it("offers the portal", () => {
    expect(
      elementsIn(closing).some((node) => node.props["href"] === surfaceHref(ORIGIN, PORTAL))
    ).toBe(true)
  })

  it("says whose portal it is offering, in the band that offers it", () => {
    expect(textIn(closing)).toContain(PORTAL.door)
  })
})

describe("the band of ways in", () => {
  /**
   * The band still reads as a row, which is the thing a longer card could cost.
   * The costs are pinned to the cards' footers precisely so unequal bodies do
   * not disturb the line a reader compares along, so the door sentence is in the
   * body and the four costs stay in the order they are offered.
   */
  const band = bandOf(HOME, (found) => found.props["eyebrow"] === BAND.waysIn)

  it("keeps every cost on the line the reader compares along", () => {
    const said = slotsIn(band, "footer").map(textIn)

    for (const surface of PRODUCT_SURFACES) {
      expect(said.some((line) => line.includes(surface.cost))).toBe(true)
    }
  })

  it("does not put the door in the footer, where the costs are read", () => {
    const footers = slotsIn(band, "footer").map(textIn)

    for (const footer of footers) expect(footer).not.toContain(PORTAL.door)
  })
})
