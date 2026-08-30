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
} from "@loom/runtime"

import { describeAudit } from "@/app/(portal)/_lib/audit-view"

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
    render(<CheckupVerdictPanel report={diverged(2)} treeId={TREE} coverage={null} />)

    expect(screen.getByText("This page does not match its own history.")).toBeInstanceOf(
      HTMLElement
    )
    expect(screen.getByText(/The parts listed below are where the two disagree/)).toBeInstanceOf(
      HTMLElement
    )
  })

  it("keeps the runtime's own reading, one click down and word for word", () => {
    const report = diverged(2)
    const { container } = render(<CheckupVerdictPanel report={report} treeId={TREE} coverage={null} />)

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
    const { container } = render(<CheckupVerdictPanel report={report} treeId={TREE} coverage={null} />)

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
    const { container } = render(<CheckupVerdictPanel report={report} treeId={TREE} coverage={null} />)

    const open = container.querySelector("details > summary")?.parentElement
    const surface = container.textContent ?? ""
    const hidden = open?.textContent ?? ""

    for (const difference of report.differences) {
      expect(surface).toContain(difference.nodeId)
      expect(surface.replace(hidden, "")).toContain(difference.nodeId)
    }
  })

  it("keeps one disclosure for the whole list rather than one per row", () => {
    const { container } = render(<CheckupVerdictPanel report={diverged(4)} treeId={TREE} coverage={null} />)

    /* The verdict's own reading, plus one for the list. Never one per row. */
    expect(container.querySelectorAll("details")).toHaveLength(2)
  })

  it("says how many differences it did not list, in a person's noun", () => {
    const report = { ...diverged(2), omitted: 7 }
    const { container } = render(<CheckupVerdictPanel report={report} treeId={TREE} coverage={null} />)

    expect(container.textContent).toContain("7 further parts differ")
  })

  /**
   * The case the plain layer exists to get right. The fold agreed, so the
   * verdict is green — and a green verdict reading "nothing to do" above a
   * warning would be the exact failure this whole redirection is against.
   */
  it("does not claim there is nothing to do while it is showing a warning", () => {
    const { container } = render(
      <CheckupVerdictPanel report={agreeing([recyclingOf("n_4")])} treeId={TREE} coverage={null} />
    )

    expect(screen.getByText("Everything on this page adds up.")).toBeInstanceOf(HTMLElement)
    expect(container.textContent).not.toContain("Nothing to do.")
    expect(
      screen.getByText("One name is used for more than one part of this page.")
    ).toBeInstanceOf(HTMLElement)
  })

  it("keeps the term for it, and why it is not the verdict, one click down", () => {
    const { container } = render(
      <CheckupVerdictPanel report={agreeing([recyclingOf("n_4")])} treeId={TREE} coverage={null} />
    )

    expect(container.textContent).toContain("recycled ids")
    expect(container.textContent).toContain("0038")
  })

  it("says nothing to do when a clean fold found nothing to look at", () => {
    render(<CheckupVerdictPanel report={agreeing()} treeId={TREE} coverage={null} />)

    expect(screen.getByText("Nothing to do.")).toBeInstanceOf(HTMLElement)
  })

  /**
   * Coverage qualifies a green verdict, and a green verdict is the one a reader
   * stops at — so the number goes on the surface and the mechanism behind it
   * goes one click down. A limit that needs a click is a limit nobody meets.
   */
  it("says on the surface how much of the starting shape it could check", () => {
    const { container } = render(
      <CheckupVerdictPanel
        report={agreeing()}
        treeId={TREE}
        coverage={{ started: 12, checked: 9, dropped: 3 }}
      />
    )

    const disclosures = Array.from(container.querySelectorAll("details"))
    const hidden = disclosures.map((element) => element.textContent ?? "").join("")
    const surface = (container.textContent ?? "").replace(hidden, "")

    expect(surface).toContain("3 parts of the 12 this page started with have been removed since")
    expect(surface).toContain("cannot vouch for")
  })

  it("says so when the whole starting shape was still there to check", () => {
    render(
      <CheckupVerdictPanel
        report={agreeing()}
        treeId={TREE}
        coverage={{ started: 12, checked: 12, dropped: 0 }}
      />
    )

    expect(
      screen.getByText("All 12 parts this page started with are still on it, and every one was checked.")
    ).toBeInstanceOf(HTMLElement)
  })

  /**
   * A coverage figure this run could not establish is left out rather than
   * guessed at — the same rule the verdict follows. What must survive its
   * absence is the sentence naming the starting shape as an assumption, because
   * that is the half that stops the screen overclaiming on its own.
   */
  it("prints no coverage line when it could not be established", () => {
    const { container } = render(
      <CheckupVerdictPanel report={agreeing()} treeId={TREE} coverage={null} />
    )

    expect(container.textContent).not.toContain("this page started with")
    expect(container.textContent).toContain("starting from the shape it has on file")
  })

  /**
   * The finding this unit closes, asserted at the surface. `Loom lessons` filed
   * it on 25 August: an audit compares two end states, so the screen must not
   * promise the reader a fact about the page's history.
   */
  it("never tells a reader that a clean checkup leaves nothing unexplained", () => {
    const { container } = render(
      <CheckupVerdictPanel
        report={agreeing()}
        treeId={TREE}
        coverage={{ started: 4, checked: 4, dropped: 0 }}
      />
    )

    expect(container.textContent).not.toContain("nothing on it is unexplained")
  })

  it("explains behind a disclosure how a wrong starting shape can pass", () => {
    const { container } = render(
      <CheckupVerdictPanel
        report={agreeing()}
        treeId={TREE}
        coverage={{ started: 4, checked: 4, dropped: 0 }}
      />
    )

    const opened = Array.from(container.querySelectorAll("details"))

    expect(opened.every((element) => element.open === false)).toBe(true)
    expect(container.textContent).toContain("What a checkup cannot tell you")
    expect(container.textContent).toContain("It does not compare two histories")
    expect(container.textContent).toContain("seed.ts")
  })

  /** Only an agreeing verdict gets the caveat; the other two have worse news. */
  it("does not offer the caveat where nothing was compared", () => {
    const { container } = render(
      <CheckupVerdictPanel report={diverged(2)} treeId={TREE} coverage={null} />
    )

    expect(container.textContent).not.toContain("What a checkup cannot tell you")
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
        coverage={null}
      />
    )

    const link = screen.getByRole("link", { name: "revision 7" })

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
        coverage={null}
      />
    )

    expect(container.textContent).toContain("1 part was removed and put back unchanged")
    expect(container.textContent).toContain("is not a fault")
    expect(screen.getByText("Nothing to do.")).toBeInstanceOf(HTMLElement)
  })
})
