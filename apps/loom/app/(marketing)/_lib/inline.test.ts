import type { ElementNode, LoomNode } from "@jam-overture/loom"
import { beforeAll, describe, expect, it } from "vitest"

import { elementsIn } from "./measure"
import { SERVED_STATE_COUNT, servedPages, type ServedPage } from "./served"
import { INLINE_TYPES, readerCopy, wordCountOf } from "./words"

/**
 * Where a phrase is allowed to be, and the two primitives that may not stand in
 * for one.
 *
 * `loom.inline-link` is the first inline element this site has ever composed.
 * It arrived in #517 answering this lane's finding of 4 October, and the whole
 * of its design is that it has no colour of its own: `color: inherit`, always,
 * with a 1px rule under it as the only thing telling a reader the words can be
 * pressed. That is why it reads on every palette in the registry and on one
 * nobody has registered yet — and it is also why **it is meaningless outside a
 * sentence.** A phrase with nothing around it to lend it a colour is a phrase
 * borrowing the colour of whatever block it landed in, underlined, at that
 * block's font size, with no words either side of it to say what it is a part
 * of.
 *
 * So the rules here are about placement rather than about the primitive, which
 * is the library's own business. Three of them, and the third is the one that
 * stops this going round again:
 *
 * - **A phrase lives in a paragraph.** Nowhere else on this site may hold one.
 * - **A phrase is part of its sentence and never the whole of it.** A link that
 *   is the entire paragraph is a control that was built out of the wrong
 *   primitive, and it would read as one underlined line where a button belongs.
 * - **A paragraph holds no control and no nav item.** `loom.link` inside a
 *   sentence is exactly the thing that was photographed, rejected and filed on
 *   4 October — no underline until it is hovered, and an accent that is the
 *   body text's own black on the palette every visitor arrives on. Now that the
 *   right primitive exists, reaching for either of the two wrong ones is what
 *   goes red.
 *
 * Swept over every state the site can be served in, for the reason `served.ts`
 * records: the mechanism page rewrites itself eleven ways, and a rule checked
 * on arrival is not a rule about the site.
 */

/** The two that are a thing on the page, and may not be inside a sentence. */
const NOT_IN_A_SENTENCE: readonly string[] = ["loom.link", "loom.action"]

type Placed = {
  readonly where: string
  readonly element: ElementNode
  /** The nearest element above it, which is the thing it is a part of. */
  readonly parent: string
}

const placed = (page: ServedPage, types: readonly string[]): readonly Placed[] => {
  const found: Placed[] = []

  const walk = (node: LoomNode, parent: string): void => {
    if (node.kind === "text") return

    if (node.kind === "element" && types.includes(node.type)) {
      found.push({ where: `${page.route.path} (${page.state})`, element: node, parent })
    }

    const here = node.kind === "element" ? node.type : parent

    node.children.forEach((child) => walk(child, here))
  }

  walk(page.tree.root, "loom.page")

  return found
}

/** The words a reader presses, which are the link's child text and nothing else. */
const wordsOn = (element: ElementNode): string =>
  element.children.map((child) => (child.kind === "text" ? child.value : "")).join("")

describe("a phrase inside a sentence", () => {
  let pages: readonly ServedPage[] = []

  beforeAll(async () => {
    pages = await servedPages()
  })

  it("sweeps every state the site can be served in", () => {
    expect(pages).toHaveLength(SERVED_STATE_COUNT)
  })

  /**
   * A sweep that found nothing passes everything. The site composes one inline
   * link, on one band of one page, in every state that page can be served in,
   * so the floor is the number of states of that page rather than a count of
   * links — an ordinary copy edit may move the phrase and must not move this.
   */
  it("is on this site at all", () => {
    const links = pages.flatMap((page) => placed(page, ["loom.inline-link"]))

    expect(links.length).toBeGreaterThanOrEqual(40)
  })

  it("is only ever inside a paragraph", () => {
    const misplaced = pages.flatMap((page) =>
      placed(page, INLINE_TYPES)
        .filter(({ parent }) => parent !== "loom.prose")
        .map(({ where, element, parent }) => `${where}: ${element.type} inside ${parent}`)
    )

    expect(misplaced).toEqual([])
  })

  /**
   * The phrase is a part of the sentence, measured against the sentence rather
   * than against a number.
   *
   * A link whose words are the whole paragraph is a control built out of the
   * wrong primitive. Held as *strictly fewer words than the paragraph it is in*
   * so it stays true of a sentence of any length, and so the failure names the
   * paragraph.
   */
  it("is never the whole of the paragraph it is in", () => {
    const wordless = pages.flatMap((page) =>
      placed(page, ["loom.inline-link"])
        .filter(({ element }) => wordCountOf(wordsOn(element)) === 0)
        .map(({ where }) => `${where}: a phrase with no words in it`)
    )

    expect(wordless).toEqual([])

    /** The other half, asked of the paragraph: it says more than its link does. */
    const outweighed = pages.flatMap((page) => {
      const paragraphs = elementsIn(page.tree.root).filter((element) => element.type === "loom.prose")

      return paragraphs.flatMap((paragraph) => {
        const links = paragraph.children.filter(
          (child): child is ElementNode => child.kind === "element" && child.type === "loom.inline-link"
        )

        if (links.length === 0) return []

        const sentence = wordCountOf(readerCopy(paragraph)[0]?.text ?? "")
        const phrase = links.reduce((total, link) => total + wordCountOf(wordsOn(link)), 0)

        return sentence > phrase
          ? []
          : [`${page.route.path} (${page.state}): ${phrase} of ${sentence} words are the link`]
      })
    })

    expect(outweighed).toEqual([])
  })

  /**
   * The 4 October finding, held from the other end so it cannot be answered
   * wrongly a second time.
   *
   * Both of these were tried on this site before the primitive existed.
   * `loom.link` was built into the sentence and taken out again, and
   * `loom.action` is what shipped instead — a button under the paragraph, which
   * is what this change removes.
   */
  it("is not a nav item and not a button", () => {
    const wrong = pages.flatMap((page) =>
      placed(page, NOT_IN_A_SENTENCE)
        .filter(({ parent }) => parent === "loom.prose")
        .map(({ where, element }) => `${where}: ${element.type} inside a sentence`)
    )

    expect(wrong).toEqual([])
  })
})

/**
 * The band the primitive was wanted for, named rather than left to the sweep.
 *
 * `naming.test.ts` makes the same move for the same band and says why: a sweep
 * reports *nothing is wrong* and never *this sentence is the reason*. What that
 * file holds is that the band offers the way to the page it names. What this one
 * holds is that the way is **inside the sentence**, and that the button which
 * used to stand in for it is gone rather than sitting beside it.
 */
describe("the sentence about the ready-made changes", () => {
  let pages: readonly ServedPage[] = []

  beforeAll(async () => {
    pages = await servedPages()
  })

  const band = (page: ServedPage): ElementNode | undefined =>
    page.tree.root.children.find(
      (child): child is ElementNode =>
        child.kind === "element" && child.props["eyebrow"] === "What leaves your server"
    )

  it("carries its link in its paragraph and no control at all", () => {
    const bands = pages
      .filter((page) => page.route.path === "/what-you-run")
      .map((page) => ({ page, found: band(page) }))

    expect(bands.length).toBeGreaterThan(0)

    for (const { page, found } of bands) {
      expect(found).toBeDefined()

      const elements = elementsIn(found as ElementNode)
      const links = elements.filter((element) => element.type === "loom.inline-link")

      expect({
        state: page.state,
        links: links.map((link) => `${wordsOn(link)} → ${new URL(String(link.props["href"])).pathname}`),
        controls: elements.filter((element) => NOT_IN_A_SENTENCE.includes(element.type)).length,
      }).toEqual({
        state: page.state,
        links: ["ready-made changes → /how-it-works"],
        controls: 0,
      })

      /** The fragment is the band's own anchor, which is what goes stale. */
      expect(String(links[0]?.props["href"])).toContain("#see-it-happen")
    }
  })

  /**
   * The register, on the real page rather than on a fixture: the sentence the
   * link splits is read whole.
   *
   * `words.test.ts` holds the reading. This holds that the page this lane
   * actually serves is the shape that reading was written for, which is the
   * half a unit test cannot say.
   */
  it("is read as one sentence by the register", () => {
    for (const page of pages.filter((page) => page.route.path === "/what-you-run")) {
      const found = band(page)
      const sentences = readerCopy(found as ElementNode).filter(({ text }) =>
        text.includes("ready-made changes")
      )

      expect(sentences).toEqual([
        {
          field: "loom.prose#text",
          text: "The ready-made changes on the How it works page do not send anything at all. They are worked out on your own server, which is why they still work on a deployment with no model configured.",
        },
      ])
    }
  })
})
