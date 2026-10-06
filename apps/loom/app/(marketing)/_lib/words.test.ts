import {
  buildElement,
  buildSlot,
  buildText,
  sequentialIdFactory,
  type IdFactory,
  type JsonObject,
  type LoomNode,
} from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { INLINE_TYPES, readerCopy, sentencesOf, wordCountOf, wordsOf } from "./words"

/**
 * What the register reads, and the one thing it could not read until today.
 *
 * `words.ts` is the oldest shared module in this route group and the first one
 * every rule about copy goes through — `voice.test.ts`, `naming.test.ts`,
 * `facts.test.ts` and `budget.test.ts` all ask it what a reader reads. **It had
 * no test file of its own.** Everything holding it was a site-wide sweep, which
 * is the right instrument for *is this site clean* and the wrong one for *does
 * this reader read*: a sweep over a site whose paragraphs are all one text node
 * passes identically whether the reading joins them or not.
 *
 * That is not a theoretical gap. The paragraph on `/what-you-run` now carries a
 * `loom.inline-link`, which makes its sentence three children of one
 * `loom.prose`, and the reading that was in this module yesterday would have
 * handed every rule three fragments where a reader sees one sentence. Nothing
 * in the sweep would have failed. The 30-word ceiling would simply have stopped
 * applying to any sentence with a link in it.
 *
 * So the rules below are written against trees built here rather than against
 * the site. A fixture can be wrong on purpose; the site cannot.
 */

const ids: IdFactory = sequentialIdFactory("words")

const text = (value: string): LoomNode => buildText(ids, value)

const link = (value: string, href = "/how-it-works#see-it-happen"): LoomNode =>
  buildElement(ids, { type: "loom.inline-link", props: { href }, children: [text(value)] })

const prose = (children: readonly LoomNode[], props: JsonObject = {}): LoomNode =>
  buildElement(ids, { type: "loom.prose", props, children: [...children] })

describe("a sentence the tree has split", () => {
  /**
   * The headline rule, and the one the primitive made necessary.
   *
   * Three children, one string, and the string is the sentence byte for byte —
   * which is the assertion rather than a convenience, because a reconstruction
   * that is merely *close* is a sentence nobody wrote being linted.
   */
  it("reads a paragraph with a link in it as the one sentence a reader reads", () => {
    const sentence =
      "The ready-made changes on the How it works page do not send anything at all."

    const read = readerCopy(
      prose([
        text("The "),
        link("ready-made changes"),
        text(" on the How it works page do not send anything at all."),
      ])
    )

    expect(read).toEqual([{ field: "loom.prose#text", text: sentence }])
  })

  /**
   * The failure this change exists to prevent, written as the thing that goes
   * red.
   *
   * Forty-five words, split by a link into 13, 3 and 29. Every fragment is
   * inside the 30-word ceiling `voice.test.ts` holds, so a reading that handed
   * the rule three strings would report this sentence clean — and the sentence
   * is the thing the ceiling is about. The last fragment is one word under,
   * which is the honest version of the trap: it is not a contrived split, it is
   * a long sentence with a link a third of the way through it.
   */
  it("still measures a sentence that is over the ceiling and split under it", () => {
    const before = "It is worth saying once, slowly and without any hurry at all, that "
    const after =
      " are worked out on your own server rather than anywhere else, which is the reason they go on working on a deployment that has no model configured at all."

    const read = readerCopy(prose([text(before), link("the ready-made changes"), text(after)]))

    expect(read).toHaveLength(1)

    const only = read[0]?.text ?? ""
    const longest = Math.max(...sentencesOf(only).map(wordCountOf))

    expect(longest).toBe(45)
    expect(longest).toBeGreaterThan(30)

    /** The fragments, for contrast: each of the three is inside the ceiling. */
    expect([before, "the ready-made changes", after].map(wordCountOf)).toEqual([13, 3, 29])
  })

  /**
   * No separator, which is the half a joiner gets wrong.
   *
   * A space inserted between the parts puts one in front of this comma, and a
   * register linting *changes , which* is a register reading a typo this lane
   * did not write.
   */
  it("puts nothing between the parts, so a comma after a link stays against it", () => {
    const read = readerCopy(
      prose([text("The "), link("ready-made changes"), text(", which are planned here, send nothing.")])
    )

    expect(read[0]?.text).toBe("The ready-made changes, which are planned here, send nothing.")
    expect(read[0]?.text).not.toContain(" ,")
  })

  /**
   * The run is maximal and a block ends it.
   *
   * Two paragraphs in a band are two things a reader reads, and a reading that
   * joined across them would hand the 30-word rule one 60-word sentence and
   * fail a page that is correct. The boundary is *not inline content*, so it is
   * the same boundary for a paragraph, a control, a card or a region.
   */
  it("joins no further than the sentence, so two paragraphs stay two strings", () => {
    const read = readerCopy(
      buildElement(ids, {
        type: "loom.section",
        props: {},
        children: [
          prose([text("One. "), link("Two"), text(" three.")]),
          prose([text("Four five six.")]),
        ],
      })
    )

    expect(read).toEqual([
      { field: "loom.prose#text", text: "One. Two three." },
      { field: "loom.prose#text", text: "Four five six." },
    ])
  })

  /**
   * A control between two paragraphs is not part of either, and its own words
   * keep their own label — `loom.action#text` is a different register from
   * `loom.prose#text` and the module says so.
   */
  it("keeps a control's words out of the sentences either side of it", () => {
    const read = readerCopy(
      buildElement(ids, {
        type: "loom.section",
        props: {},
        children: [
          prose([text("Before.")]),
          buildElement(ids, {
            type: "loom.action",
            props: { href: "/how-it-works" },
            children: [text("Press me")],
          }),
          prose([text("After.")]),
        ],
      })
    )

    expect(read.map(({ field, text: value }) => `${field}: ${value}`)).toEqual([
      "loom.prose#text: Before.",
      "loom.action#text: Press me",
      "loom.prose#text: After.",
    ])
  })

  /**
   * The reading a run of one text node gets, which is every paragraph this site
   * served before the primitive arrived.
   *
   * It has to be byte-identical to what the reading gave yesterday, because the
   * numbers in four other files' sweeps are measured against it. A run of one
   * joins to itself.
   */
  it("changes nothing about a paragraph that is one text node", () => {
    expect(readerCopy(prose([text("One request, and only when somebody asks.")]))).toEqual([
      { field: "loom.prose#text", text: "One request, and only when somebody asks." },
    ])
  })

  /**
   * A region is a part of a primitive and not a thing on the page (0051), so a
   * heading in a slot is labelled with the band's own element — the rule the
   * module already had, asserted here because the walk that enforces it was
   * rewritten today.
   */
  it("labels a node in a region with the element and never the slot", () => {
    const read = readerCopy(
      buildElement(ids, {
        type: "loom.hero",
        props: { eyebrow: "Before you install anything" },
        children: [
          buildSlot(ids, "heading", [
            buildElement(ids, {
              type: "loom.heading",
              props: { level: 1 },
              children: [text("It runs in your app")],
            }),
          ]),
        ],
      })
    )

    expect(read.map(({ field }) => field)).toEqual(["loom.hero.eyebrow", "loom.heading#text"])
  })

  /**
   * An inline element's own prose props are read rather than lost with its text
   * nodes.
   *
   * None of the three inline types carries one today. A fourth that did would
   * otherwise be copy nothing on this site could see, which is the failure the
   * module's own opening note is about and not one to reintroduce one layer
   * down.
   */
  it("reads a prose prop on an inline element as well as its words", () => {
    const captioned = buildElement(ids, {
      type: "loom.emphasis",
      props: { tone: "strong", note: "said twice on purpose" },
      children: [text("delta")],
    })

    const read = readerCopy(prose([text("A change is a "), captioned, text(".")]))

    expect(read).toEqual([
      { field: "loom.prose#text", text: "A change is a delta." },
      { field: "loom.emphasis.note", text: "said twice on purpose" },
    ])
  })

  /**
   * `wordsOf` is the other reading in this module and it joins with a space, so
   * a split sentence counts the same number of words either way. Both readings
   * are asserted because a site measured one way and linted the other is two
   * numbers that eventually disagree.
   */
  it("counts the same words however the sentence is split", () => {
    const split = prose([text("The "), link("ready-made changes"), text(" send nothing at all.")])
    const whole = prose([text("The ready-made changes send nothing at all.")])

    expect(wordCountOf(wordsOf(split))).toBe(wordCountOf(wordsOf(whole)))
  })
})

describe("the types that sit inside a sentence", () => {
  /**
   * Three members and the list is closed, so adding a fourth is a decision
   * somebody writes down rather than a line that drifts in.
   */
  it("is the three inline primitives and nothing else", () => {
    expect([...INLINE_TYPES].sort()).toEqual([
      "loom.code-span",
      "loom.emphasis",
      "loom.inline-link",
    ])
  })

  /**
   * A type nobody put on the list reads as a break in a sentence, which is the
   * safe direction: the sentence is measured in halves, so it crosses the
   * ceiling sooner and never later. Asserted so the trade is a property rather
   * than a sentence in a comment.
   */
  it("breaks a sentence around a type it does not know, rather than joining it", () => {
    const unknown = buildElement(ids, {
      type: "loom.badge",
      props: {},
      children: [text("new")],
    })

    const read = readerCopy(prose([text("A "), unknown, text(" thing.")]))

    expect(read.map(({ text: value }) => value)).toEqual(["A ", "new", " thing."])
  })
})
