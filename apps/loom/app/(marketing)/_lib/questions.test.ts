import type { ElementNode } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { elementsIn, runsIn } from "./measure"
import { siteQuestions } from "./questions"
import { treeFor } from "./render"
import { HOME } from "./site"

/**
 * The shape of the questions band, because the shape is what went wrong with
 * it and no existing check could see a shape.
 *
 * `schema.test.ts` holds the questions against the `FAQPage` a search engine is
 * handed, which is the other reader of `questions.ts` and is about the words.
 * `balance.test.ts` holds a row of cards to saying about the same amount in
 * each cell, which is about how much is written. **Neither is about how the
 * band is laid out**, and the band was laid out wrongly for as long as it has
 * had two columns.
 *
 * ## What it was
 *
 * One `loom.faq-list` with `columns: "two"`, which is a CSS grid. Five
 * questions are five cells in three rows, and a grid row is as tall as the
 * tallest cell in it. The first question is open on arrival, so measured on a
 * production build at 1280:
 *
 * | | box | content | empty |
 * | --- | --- | --- | --- |
 * | *Can the AI write code into my page?* (open) | 172px | 172px | 0 |
 * | *What stops a bad change from landing?* (closed, beside it) | 172px | 51px | **121px** |
 *
 * And it moved under the reader. Pressing *Is this a page builder?* in the left
 * column took *What happens when a change is wrong?* in the right column from
 * 51px to 145px: **94px of empty space opened inside a closed question by a
 * press on the other side of the page.**
 *
 * ## Why a threshold could not have caught it
 *
 * `balance.test.ts` finds a hole by comparing how many words each cell of a row
 * says. A question that opens says a different amount from one moment to the
 * next, and the amount it will say is not in the tree at render time. There is
 * no word count that would have reported this band, which is why the rule over
 * there is a **refusal** — a disclosure may not share a grid row — rather than
 * a measurement.
 *
 * ## What it is
 *
 * Two lists, each read downward, in a grid that does not stretch them. The
 * cases below are the three claims that makes:
 *
 * - every question is still on the page, once, in `questions.ts`' order, so the
 *   band and the `FAQPage` cannot drift apart because of how the band is split;
 * - neither list asks for a second column, which is the thing that drew the
 *   hole;
 * - the grid holding them says `align: "start"`, which is the thing that stops
 *   the two **columns** being stretched to each other the way the two cells
 *   were.
 *
 * The third is the one worth having a case for. Taking `align: "start"` off
 * would move the hole up a level rather than removing it — the shorter column
 * would carry the difference — and the page would look almost right, which is
 * the kind of regression that survives a glance.
 */

const LISTS = "loom.faq-list"
const ASKED = "loom.faq"

const frontDoor = () => treeFor(HOME, { theme: "minimal" })

const listsOnTheFrontDoor = () =>
  elementsIn(frontDoor().root).filter((element) => element.type === LISTS)

const questionsIn = (list: ElementNode): readonly ElementNode[] =>
  elementsIn(list).filter((element) => element.type === ASKED)

describe("the front door's questions band", () => {
  it("asks every question in `questions.ts`, once, in that order", () => {
    const asked = elementsIn(frontDoor().root)
      .filter((element) => element.type === ASKED)
      .map((element) => element.props["question"])

    expect(asked).toEqual(siteQuestions().map((entry) => entry.question))
  })

  it("answers each of them with that entry's answer", () => {
    const answers = elementsIn(frontDoor().root)
      .filter((element) => element.type === ASKED)
      .map((element) => element.props["answer"])

    expect(answers).toEqual(siteQuestions().map((entry) => entry.answer))
  })

  /**
   * The split is derived rather than typed, so a sixth question needs no
   * decision from whoever adds it, and a fifth taken away cannot leave an empty
   * list standing in a column.
   *
   * **The smaller half goes first**, which is the one judgement in the band and
   * it is about the open answer rather than about the count: the first question
   * arrives open and is four lines taller than any heading beside it. Measured
   * at 1280, two and three put a 223px column beside a 153px one; three and two
   * put 274px beside 102px.
   */
  it("splits them into two lists, the smaller half first", () => {
    const lists = listsOnTheFrontDoor()
    const asked = siteQuestions().length

    expect(asked).toBeGreaterThan(1)
    expect(lists.map((list) => questionsIn(list).length)).toEqual([
      Math.floor(asked / 2),
      Math.ceil(asked / 2),
    ])
  })

  /**
   * The defect itself, stated as the thing that is now false.
   *
   * `balance.test.ts` holds the same claim over every page of this site. It is
   * repeated here against this band by name, because this is the band that had
   * it wrong and a sweep that goes green tells you nothing about which instance
   * it was watching.
   */
  it("asks no list to lay its questions out in columns", () => {
    for (const list of listsOnTheFrontDoor()) {
      expect(list.props["columns"]).toBeUndefined()
    }
  })

  it("holds the two lists in a grid that does not stretch them to each other", () => {
    const holding = runsIn(frontDoor().root).filter((run) => run.cell === LISTS)

    expect(holding).toHaveLength(1)
    expect(holding[0]?.container).toBe("loom.grid")
    expect(holding[0]?.props["columns"]).toBe("two")
    expect(holding[0]?.props["align"]).toBe("start")
  })

  /**
   * One question is open when a reader arrives, which is the band's own call
   * and is why the hole was visible without anybody pressing anything. It stays
   * — an FAQ whose every row is shut shows a reader five headings and no
   * answer — and it is now a thing the layout can carry.
   */
  it("arrives with exactly one answer already open, and it is the first", () => {
    const open = elementsIn(frontDoor().root)
      .filter((element) => element.type === ASKED)
      .filter((element) => element.props["open"] === true)
      .map((element) => element.props["question"])

    expect(open).toEqual([siteQuestions()[0]?.question])
  })
})
