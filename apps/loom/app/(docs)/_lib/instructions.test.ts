import { describe, expect, it } from "vitest"

import { collapse, writtenPages, type WrittenPage } from "./cross-references"
import {
  everyPublishedName,
  instructionSentencesIn,
  NOT_AN_INSTRUCTION,
  publishedSignatureOf,
  READER_INSTRUCTIONS,
  type ReaderInstruction,
} from "./instructions"

/**
 * The instrument for the third kind of claim a page here can get wrong.
 *
 * `absences.test.ts` holds *Loom lacks a name* against the published doors.
 * This holds *the work is yours* against the same doors, because they are the
 * same claim from the reader's side and the second is the one a stranger acts
 * on.
 *
 * Three groups, in the shape `absences.test.ts` set. The first holds each
 * registered instruction against the thing that would make it unnecessary. The
 * second holds the registry against the pages in both directions. The third is
 * the sweep.
 */

const pages = writtenPages()

const pageAt = (href: string): WrittenPage => {
  const page = pages.find((candidate) => candidate.href === href)

  if (page === undefined) {
    throw new Error(
      `loom: instructions.ts registers an instruction on ${href}, which is not a written page`
    )
  }

  return page
}

const fragmentsOf = (instruction: ReaderInstruction): readonly string[] => instruction.says

const EVERY_FRAGMENT: readonly string[] = [
  ...READER_INSTRUCTIONS.flatMap(fragmentsOf),
  ...NOT_AN_INSTRUCTION.flatMap((group) => group.says),
]

describe("every registered instruction, against the thing that would make it unnecessary", () => {
  /**
   * The assertion the whole file exists for.
   *
   * It reads the published declarations, not the page, so there is nothing
   * here a prose edit can satisfy. When one goes red the fix is on the page
   * named in the failure, and `whenItLands` says what to write.
   */
  for (const instruction of READER_INSTRUCTIONS) {
    it(`${instruction.id} is still work the reader has to do`, () => {
      expect(
        instruction.found(),
        [
          `${instruction.page} tells a reader to do this and the runtime may now do it:`,
          `  ${instruction.of}`,
          `measured from ${instruction.from}.`,
          `What to write instead: ${instruction.whenItLands}`,
        ].join("\n")
      ).toEqual([])
    })
  }

  it("names each instruction once", () => {
    expect(new Set(READER_INSTRUCTIONS.map((instruction) => instruction.id)).size).toBe(
      READER_INSTRUCTIONS.length
    )
  })
})

describe("the measurements read something", () => {
  /**
   * A measurement that reads `undefined` and compares it to nothing passes
   * forever. Both accessors are asserted against a declaration this site
   * already documents, so a reference that stopped carrying signatures — or a
   * door that stopped publishing a name — fails here rather than silently
   * holding three instructions up on air.
   */
  it("reads a published signature", () => {
    expect(publishedSignatureOf("DataOutcome")).toContain("status")
  })

  it("answers nothing for a name no door publishes", () => {
    expect(publishedSignatureOf("NoSuchDeclaration")).toBeUndefined()
  })

  it("reads every published name", () => {
    expect(everyPublishedName()).toContain("renderLoomTree")
  })
})

describe("the registry and the pages, held against each other", () => {
  /**
   * An instruction whose sentence somebody rewrote is worse than no guard: it
   * passes forever, it reads as cover, and the next writer believes a sentence
   * is held when nothing is holding anything.
   */
  for (const instruction of READER_INSTRUCTIONS) {
    for (const fragment of instruction.says) {
      it(`${instruction.id} still says "${fragment}" on its page`, () => {
        expect(collapse(pageAt(instruction.page).source)).toContain(fragment)
      })
    }
  }

  /**
   * The same rule for the other list.
   *
   * A reason for a sentence nobody writes any more teaches the next reader
   * about a problem the site does not have. Swept over the whole site rather
   * than one page because these sentences move as prose is reorganised, and
   * moving one is not a reason to edit `instructions.ts`.
   */
  const everyInstructionSentence = pages.flatMap((page) => instructionSentencesIn(page.source))

  for (const group of NOT_AN_INSTRUCTION) {
    for (const fragment of group.says) {
      it(`"${fragment}" is still written somewhere`, () => {
        expect(everyInstructionSentence.some((sentence) => sentence.includes(fragment))).toBe(true)
      })
    }
  }
})

describe("the sweep", () => {
  /**
   * Every sentence that tells a reader the work is theirs is in one of the two
   * lists.
   *
   * The net cannot tell *you still check the shape yourself* from *the part
   * you cannot reconstruct later*, so it asks for both to be named and lets a
   * person say which. A new sentence costs one line in `instructions.ts` —
   * either a measurement, or a reason it does not need one.
   */
  for (const page of pages) {
    const instructions = instructionSentencesIn(page.source)
    const unregistered = instructions.filter(
      (sentence) => !EVERY_FRAGMENT.some((fragment) => sentence.includes(fragment))
    )

    it(`${page.id} registers every instruction it gives`, () => {
      expect(
        unregistered,
        [
          "A sentence here tells a reader to do work and is in neither list in",
          "`_lib/instructions.ts`. If the runtime could do it instead, add it to",
          "READER_INSTRUCTIONS with the measurement that will say when it does.",
          "If it is rhetoric, a tutorial step, or a capability rather than an",
          "obligation, add it to NOT_AN_INSTRUCTION with one line saying why.",
        ].join("\n")
      ).toEqual([])
    })
  }

  /** The sweep reads something, so an empty sweep is a broken sweep. */
  it("finds the sentences it is registered against", () => {
    expect(pages.flatMap((page) => instructionSentencesIn(page.source)).length).toBeGreaterThan(
      EVERY_FRAGMENT.length / 2
    )
  })

  it("leaves a compiled fence alone", () => {
    const source = ["before", "", "```ts", "// you have to call this yourself.", "```", "", "after"].join(
      "\n"
    )

    expect(instructionSentencesIn(source)).toEqual([])
  })

  it("keeps a heading apart from the paragraph under it", () => {
    const source = ["## What you have to do", "", "A sentence with no obligation in it."].join("\n")

    expect(instructionSentencesIn(source)).toEqual(["## What you have to do"])
  })

  /**
   * The imperative is deliberately not a marker, and this is that decision
   * written down where a run that wants to widen the net meets it.
   *
   * 97 sentences on this site open in an imperative verb and they are the
   * tutorial voice. A net that flagged them would flag a hundred sentences to
   * find three, and the three would be found by nobody.
   */
  it("does not flag the tutorial voice", () => {
    const taught = [
      "Press a chip under it and watch three things.",
      "Open **show the tree** under the frame.",
      "Run it once when you set the database up.",
      "Look at what is **not** in there.",
    ]

    expect(taught.flatMap((sentence) => instructionSentencesIn(sentence))).toEqual([])
  })

  /**
   * `by hand` is not a marker either, and for the opposite reason: every
   * sentence on this site that carries it is about the work the runtime
   * **removed**.
   */
  it("does not flag the alternative the runtime removes", () => {
    const removed = [
      "So the vocabulary is right and writing it out by hand is miserable.",
      "That list is worked out rather than kept by hand.",
      "Nothing below was typed by hand.",
    ]

    expect(removed.flatMap((sentence) => instructionSentencesIn(sentence))).toEqual([])
  })

  /** The third-person voice, which this site barely writes in. */
  it("flags a host obligation written in the third person", () => {
    const written = "Your application has to mint the token before the form posts."

    expect(instructionSentencesIn(written)).toEqual([written])
  })

  /**
   * A link's text is the name of a page, and six of this site's seven
   * third-person matches are one page's title inside somebody else's sentence.
   */
  it("reads past the title of a page it links to", () => {
    const linked = "[What your app has to do](/docs/the-runtime/what-your-app-has-to-do) is the whole list."

    expect(instructionSentencesIn(linked)).toEqual([])
  })

  /** And takes the title out without gluing the words either side together. */
  it("leaves the sentence around a link readable", () => {
    const linked = "See [What your app has to do](/docs/the-runtime/what-your-app-has-to-do) yourself."

    expect(instructionSentencesIn(linked)).toEqual(["See yourself."])
  })
})
