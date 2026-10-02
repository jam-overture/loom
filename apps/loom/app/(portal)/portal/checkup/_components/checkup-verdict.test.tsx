import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  buildElement,
  buildText,
  createTree,
  sequentialIdFactory,
  type IdReturn,
  type LoomTree,
  type NodeId,
  type TreeId,
} from "@jam-overture/loom"

import { describeAudit } from "@/app/(portal)/_lib/audit-view"
import { surfaceOf } from "@/app/(portal)/_test/rendered"

import { CheckupVerdictPanel } from "./checkup-verdict"

const TREE = "t_probe" as TreeId

const pageOf = (labels: readonly string[]): LoomTree => {
  const ids = sequentialIdFactory("chk")

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      children: labels.map((label) =>
        buildElement(ids, { type: "loom.prose", children: [buildText(ids, label)] })
      ),
    }),
    ids
  )
}

/** Two trees over one id space, differing by however many leading children. */
const drifted = (count: number) => {
  const stored = pageOf(Array.from({ length: count }, (_, index) => `line ${index}`))

  return { stored, replayed: { ...stored, root: { ...stored.root, children: [] } } }
}

const recyclingOf = (nodeId: string): IdReturn => ({
  code: "recycled",
  nodeId: nodeId as NodeId,
  leftAs: "loom.card",
  returnedAs: "text",
  leftAt: 1,
  returnedAt: 9,
})

const agreeing = (idReturns: readonly IdReturn[] = []) =>
  describeAudit({ outcome: "agrees", revision: 4, idReturns })

const diverged = (count: number) =>
  describeAudit({ outcome: "diverged", revision: count, ...drifted(count), idReturns: [] })

/**
 * The rule this surface is rebuilt on, asserted rather than trusted: **nothing
 * is removed to make a screen simple.** Every sentence the old audit verdict
 * printed on the surface is still rendered — the test finds it inside a closed
 * `<details>`, which is exactly where a reader's browser find-in-page finds it.
 */
describe("CheckupVerdictPanel", () => {
  it("leads with the answer and the next move, not with the runtime's headline", () => {
    render(<CheckupVerdictPanel report={diverged(2)} treeId={TREE} />)

    expect(screen.getByText("This page does not match its own history.")).toBeInstanceOf(
      HTMLElement
    )
    expect(screen.getByText(/The parts listed below are where the two disagree/)).toBeInstanceOf(
      HTMLElement
    )
  })

  it("keeps the runtime's own reading, one click down and word for word", () => {
    const report = diverged(2)
    const { container } = render(<CheckupVerdictPanel report={report} treeId={TREE} />)

    const disclosure = container.querySelector("details")

    expect(disclosure?.open).toBe(false)
    expect(container.textContent).toContain(report.headline)
    expect(container.textContent).toContain(report.detail)
    expect(container.textContent).toContain("diverged")
  })

  /**
   * The two readings of one difference. The plain sentence is what a person
   * gets unasked; the runtime's phrasing is what a reviewer opens.
   */
  it("says what is wrong in a sentence, and keeps the runtime's phrasing behind it", () => {
    const report = diverged(1)
    const { container } = render(<CheckupVerdictPanel report={report} treeId={TREE} />)

    expect(container.textContent).toContain(
      "It is on the page people are being served, and nothing in the recorded history put it there."
    )
    expect(container.textContent).toContain("replaying the log does not produce it")
  })

  /**
   * The defect a screenshot found and no test had: four `missing` differences
   * produce four identical plain sentences, so the part's own name is the only
   * thing telling them apart. Behind a disclosure that made the list read as one
   * line repeated. Which part is identity, not technical detail — it goes on the
   * surface even though it looks like a runtime word.
   */
  it("names which part on the surface, not behind a click", () => {
    const report = diverged(4)
    const { container } = render(<CheckupVerdictPanel report={report} treeId={TREE} />)

    const open = container.querySelector("details > summary")?.parentElement
    const surface = container.textContent ?? ""
    const hidden = open?.textContent ?? ""

    for (const difference of report.differences) {
      expect(surface).toContain(difference.nodeId)
      expect(surface.replace(hidden, "")).toContain(difference.nodeId)
    }
  })

  /**
   * The defect the 12 September run filed and did not take: this list printed
   * `loom.prose` per row, in monospace, on the one screen somebody opens when
   * they already think something is wrong.
   *
   * The surface is measured with every `<details>` removed, because a registered
   * type one click down is the thing being asked for rather than a failure.
   */
  it("names every part in a person's words and prints no registered type on the surface", () => {
    const report = diverged(2)
    const { container } = render(<CheckupVerdictPanel report={report} treeId={TREE} />)

    expect(surfaceOf(container)).not.toContain("loom.")
    expect(screen.getByTitle("The prose “line 0”")).toBeInstanceOf(HTMLElement)
  })

  /**
   * The other half of the same rule, and the one that fails if a later run makes
   * this screen simpler by losing the type rather than moving it.
   */
  it("keeps the registered type it used to print, one click down", () => {
    const { container } = render(<CheckupVerdictPanel report={diverged(2)} treeId={TREE} />)

    expect(container.textContent).toContain("loom.prose")
    expect(screen.getByText(/with each part's type/)).toBeInstanceOf(HTMLElement)
  })

  /**
   * Four identical plain sentences with four different names above them. The
   * name is what tells the rows apart, so the words have to be in it — a list
   * of four rows all reading *Prose* would be the same defect with better
   * manners.
   */
  it("tells four rows apart by what each part says", () => {
    const report = diverged(4)
    const { container } = render(<CheckupVerdictPanel report={report} treeId={TREE} />)

    const surface = surfaceOf(container)

    for (const line of ["line 0", "line 1", "line 2", "line 3"]) expect(surface).toContain(line)
  })

  it("keeps one disclosure for the whole list rather than one per row", () => {
    const { container } = render(<CheckupVerdictPanel report={diverged(4)} treeId={TREE} />)

    /* The verdict's own reading, plus one for the list. Never one per row. */
    expect(container.querySelectorAll("details")).toHaveLength(2)
  })

  it("says how many differences it did not list, in a person's noun", () => {
    const report = { ...diverged(2), omitted: 7 }
    const { container } = render(<CheckupVerdictPanel report={report} treeId={TREE} />)

    expect(container.textContent).toContain("7 further parts differ")
  })

  /**
   * The case the plain layer exists to get right. The fold agreed, so the
   * verdict is green — and a green verdict reading "nothing to do" above a
   * warning would be the exact failure this whole redirection is against.
   */
  it("does not claim there is nothing to do while it is showing a warning", () => {
    const { container } = render(
      <CheckupVerdictPanel report={agreeing([recyclingOf("n_4")])} treeId={TREE} />
    )

    expect(screen.getByText("Everything on this page adds up.")).toBeInstanceOf(HTMLElement)
    expect(container.textContent).not.toContain("Nothing to do.")
    expect(
      screen.getByText("One name is used for more than one part of this page.")
    ).toBeInstanceOf(HTMLElement)
  })

  it("keeps the term for it, and why it is not the verdict, one click down", () => {
    const { container } = render(
      <CheckupVerdictPanel report={agreeing([recyclingOf("n_4")])} treeId={TREE} />
    )

    expect(container.textContent).toContain("recycled ids")
    expect(container.textContent).toContain("0038")
  })

  /**
   * The second place a registered type reached this screen's surface. Unlike a
   * difference, neither node is in the tree any more — so the label is all
   * there is, and what changes is that the surface reads the noun inside it
   * while the disclosure keeps the label whole.
   */
  it("says what the two parts were in words, and keeps the runtime's labels one click down", () => {
    const { container } = render(
      <CheckupVerdictPanel report={agreeing([recyclingOf("n_4")])} treeId={TREE} />
    )

    const surface = surfaceOf(container)

    expect(surface).toContain("was a card until")
    expect(surface).not.toContain("loom.card")
    expect(surface).not.toContain("a text from")
    expect(container.textContent).toContain("was a loom.card until 1, and a text from 9")
  })

  it("says nothing to do when a clean fold found nothing to look at", () => {
    render(<CheckupVerdictPanel report={agreeing()} treeId={TREE} />)

    expect(screen.getByText("Nothing to do.")).toBeInstanceOf(HTMLElement)
  })

  /**
   * The one place an unreplayable verdict can send anybody, and it must be a
   * door rather than a number (0043).
   */
  it("links the change a broken history stopped at", () => {
    render(
      <CheckupVerdictPanel
        report={describeAudit({
          outcome: "unreplayable",
          mismatch: { code: "revision-gap", expected: 3, found: 7 },
        })}
        treeId={TREE}
      />
    )

    const link = screen.getByRole("link", { name: "version 7" })

    expect(link.getAttribute("href")).toContain("/portal/history")
    expect(link.getAttribute("href")).toContain(TREE)
  })

  it("names a restoration as the ordinary thing it is, and not as a fault", () => {
    const { container } = render(
      <CheckupVerdictPanel
        report={describeAudit({
          outcome: "agrees",
          revision: 2,
          idReturns: [
            { code: "restored", nodeId: "n_4" as NodeId, label: "loom.card", leftAt: 1, returnedAt: 2 },
          ],
        })}
        treeId={TREE}
      />
    )

    expect(container.textContent).toContain("1 part was removed and put back unchanged")
    expect(container.textContent).toContain("is not a fault")
    expect(screen.getByText("Nothing to do.")).toBeInstanceOf(HTMLElement)
  })
})
