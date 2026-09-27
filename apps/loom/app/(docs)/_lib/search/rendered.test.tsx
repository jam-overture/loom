import { render } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"

import { generatedPageBody } from "../api/body"

import { renderedWords } from "./rendered"

/**
 * The walker, held against a browser.
 *
 * What this module claims is strong and is the only reason the index may carry
 * its output: **the words it collects are the words a reader sees.** A test
 * comparing it to a second implementation of itself would go on passing on the
 * day both stopped reading a band, so the comparison here is against a rendered
 * document — Testing Library puts the component in a real DOM, and the words in
 * that DOM are read back out of it.
 *
 * The unit tests below it are over invented components rather than over this
 * site's, for the reason `standing.test.ts` gives: the rules are about the shape
 * of a tree, and a test that only ever saw the reference pages would pass on a
 * rule that happens to hold this week.
 */

/**
 * The words in a string, as a sequence.
 *
 * Compared as words rather than as one string because the two readers space
 * differently on purpose: the walker cannot know whether two elements sit
 * against each other or a line apart, so it joins with a space and `plainWords`
 * tidies the punctuation. What has to match is the words and their order.
 *
 * An elision is dropped from both sides: a name is `…` to the walker and absent
 * from the document, and both mean *a name was here*. Punctuation is a boundary
 * for the same reason — a document runs the last word of one paragraph into the
 * first of the next, and a reader does not read them as one word.
 */
const wordsIn = (text: string): readonly string[] =>
  text
    .split(/[^A-Za-z0-9@/_'’-]+/)
    .filter((word) => word !== "" && word !== "…" && word !== "_")

/**
 * Every run of text in a document, in the order it appears.
 *
 * `textContent` on its own would not do: it runs the last word of one paragraph
 * into the first word of the next, and the words either side of a removed name
 * into each other. Reading the text nodes and joining them is the same boundary
 * the walker draws, which is what makes the two comparable.
 */
const textRuns = (node: Node): readonly string[] =>
  node.nodeType === node.TEXT_NODE
    ? [node.textContent ?? ""]
    : [...node.childNodes].flatMap(textRuns)

/**
 * The words a reader sees, off a real document: everything except the code and
 * the regions that say they are not prose, which is the same pair of rules the
 * walker applies.
 */
const wordsShown = (node: ReactNode): readonly string[] => {
  const { container } = render(<>{node}</>)
  const shown = container.cloneNode(true) as HTMLElement

  for (const region of shown.querySelectorAll('code, pre, kbd, samp, [data-search="off"]')) {
    region.remove()
  }

  return wordsIn(textRuns(shown).join(" "))
}

const Chip = ({ name }: { readonly name: string }) => <code className="chip">{name}</code>

const Band = ({ title, body }: { readonly title: string; readonly body: string }) => (
  <section>
    <h2>{title}</h2>
    <p>{body}</p>
  </section>
)

describe("the words a component renders", () => {
  it("is the words the same component puts in a document", () => {
    const tree = (
      <>
        <Band title="No import has everything behind it" body="They add up to more than the package." />
        <ul>
          {["one", "two"].map((word) => (
            <li key={word}>
              <Chip name="planReverts" /> is number {word}
            </li>
          ))}
        </ul>
        <nav data-search="off">
          <a href="/somewhere">A link nobody should find this page by</a>
        </nav>
      </>
    )

    expect(wordsIn(renderedWords(tree))).toEqual(wordsShown(tree))
  })

  it("is the words the reference's front door puts in a document", () => {
    const body = generatedPageBody("api-reference", "")

    expect(wordsIn(renderedWords(body))).toEqual(wordsShown(body))
  })

  it("is the words a reference page puts in a document, bands, names and all", () => {
    const body = generatedPageBody("api-reference", "react")

    expect(wordsIn(renderedWords(body))).toEqual(wordsShown(body))
  })
})

describe("what the walker does with a tree", () => {
  it("reads a plain component by calling it", () => {
    expect(renderedWords(<Band title="A heading" body="A sentence." />)).toBe("A heading. A sentence.")
  })

  it("reads through a type it cannot call, to the children it was handed", () => {
    /*
     * What `next/link` is inside the server build: an opaque reference for the
     * browser to resolve, holding the words of the link. Modelled as an object
     * type rather than mocked, because the object is the thing the walker meets.
     */
    const Linkish = ({ children }: { readonly children: ReactNode }) => <a href="/x">{children}</a>

    const Reference = { $$typeof: Symbol.for("react.client.reference") } as unknown as typeof Linkish

    expect(renderedWords(<Reference>the words of the link</Reference>)).toBe("the words of the link")
  })

  it("leaves a name out, and says a word was here", () => {
    expect(renderedWords(<p>it asks the <code>ids</code> you passed</p>)).toBe("it asks the … you passed")
  })

  it("leaves a block to copy out, for the same reason", () => {
    expect(renderedWords(<div><pre>pnpm add react</pre><p>is the command.</p></div>)).toBe(
      "… is the command."
    )
  })

  it("says nothing at all for a region that says it is not prose", () => {
    expect(renderedWords(<section data-search="off"><p>a thousand signatures</p></section>)).toBe("")
  })

  it("keeps a marked region out of the sentence around it", () => {
    const tree = (
      <div>
        <p>before</p>
        <nav data-search="off">
          <p>navigation</p>
        </nav>
        <p>after</p>
      </div>
    )

    expect(renderedWords(tree)).toBe("before after")
  })

  it("stops a heading, so it does not run into the sentence under it", () => {
    expect(renderedWords(<Band title="No import has everything behind it" body="The usual shape." />)).toBe(
      "No import has everything behind it. The usual shape."
    )
  })

  it("leaves a heading that already ends in something alone", () => {
    expect(renderedWords(<Band title="Not installed it yet?" body="Installation has it." />)).toBe(
      "Not installed it yet? Installation has it."
    )
  })

  it("reads a number, which is what every count on these pages is", () => {
    expect(renderedWords(<p>there are {120} pairs</p>)).toBe("there are 120 pairs")
  })

  it("reads nothing out of what a branch decided not to render", () => {
    expect(renderedWords(<p>{null}{undefined}{false}kept</p>)).toBe("kept")
  })

  it("puts two names in a row down as one omission, as a reader reads it", () => {
    expect(renderedWords(<p><code>a</code>, <code>b</code> and <code>c</code> are peers</p>)).toBe(
      "… and … are peers"
    )
  })

  it("leaves no space in front of the punctuation a missing name left behind", () => {
    expect(renderedWords(<p>published for <code>@jam-overture/loom</code>.</p>)).toBe("published for ….")
  })

  it("has nothing to say about an empty tree, rather than something", () => {
    expect(renderedWords(null)).toBe("")
    expect(renderedWords(<div />)).toBe("")
  })
})
