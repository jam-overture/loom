import { act, fireEvent, render, screen } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  buildElement,
  buildText,
  sequentialIdFactory,
  type DeltaId,
  type ProposalId,
  type Provenance,
  type TreeOperation,
} from "@jam-overture/loom"
import type { StoredRevision } from "@jam-overture/loom/store"

import { foldVersions, type Version } from "@/app/(portal)/_lib/progression"
import { seedTree } from "@/app/(portal)/_lib/seed"
import { portalFile, screenSource } from "@/app/(portal)/_lib/screen-source"

import { VersionPlayer } from "./version-player"

const PROVENANCE: Provenance = {
  origin: "user-instruction",
  actor: "ana@loom.local",
  interpreter: "scripted",
  authoredBy: "model",
  confidence: 0.9,
  interpretedAt: "2026-08-09T00:00:00.000Z",
}

const scope = seedTree().treeId

/**
 * One change that a reader could see with their own eyes: a line of prose added
 * to the page.
 *
 * A `configure` would be a smaller fixture and a worse one. What this test has to
 * prove is that stepping changes the **picture**, so the change has to be one
 * that shows up in what the page says — which is also how a person tells two
 * versions of their own page apart.
 */
const addLine = (revision: number, words: string): StoredRevision => {
  const ids = sequentialIdFactory(`add${revision}`)

  return {
    treeId: scope,
    revision,
    proposalId: `p_${revision}` as ProposalId,
    delta: {
      deltaId: `d_${revision}` as DeltaId,
      treeId: scope,
      baseRevision: revision - 1,
      operations: [
        {
          op: "insert",
          parentId: seedTree().root.id,
          index: revision,
          node: buildElement(ids, {
            type: "loom.prose",
            children: [buildText(ids, words)],
          }),
        },
      ] as readonly TreeOperation[],
    },
    provenance: PROVENANCE,
    appliedAt: "2026-08-09T09:04:00.000Z",
  }
}

/** What the page says at the version this fixture's Nth change produced. */
const lineAt = (revision: number): string => `Added at version ${revision}`

/**
 * Real versions, folded by the real fold from the deployment's own starting
 * shape. A hand-written array of trees would let this test pass on a player that
 * draws whatever it is handed while the thing it is handed is wrong.
 */
const versionsUpTo = (highest: number): readonly Version[] =>
  foldVersions(
    seedTree(),
    Array.from({ length: highest }, (_, at) => addLine(at + 1, lineAt(at + 1)))
  ).versions

/** Every line the drawn page says, so a picture is compared rather than probed. */
const linesOnStage = (container: HTMLElement): readonly string[] =>
  Array.from(container.querySelectorAll("[data-stage] p")).map(
    (element) => element.textContent ?? ""
  )

describe("VersionPlayer", () => {
  it("opens on the newest one, because that is the page a reader recognises", () => {
    render(<VersionPlayer versions={versionsUpTo(3)} newest={3} />)

    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Version 3")
    expect(screen.getByText("This is the newest one.")).not.toBeNull()
  })

  /**
   * The picture is the page, drawn from that version's own tree. Asserting the
   * *change* between two versions rather than that something rendered is what
   * separates a progression from three copies of one screenshot.
   */
  it("draws each version from its own tree, so stepping back changes the picture", () => {
    const { container } = render(<VersionPlayer versions={versionsUpTo(2)} newest={2} />)

    expect(linesOnStage(container)).toContain(lineAt(2))
    expect(linesOnStage(container)).toContain(lineAt(1))

    fireEvent.click(screen.getByRole("button", { name: /Go back one/u }))
    expect(linesOnStage(container)).not.toContain(lineAt(2))
    expect(linesOnStage(container)).toContain(lineAt(1))

    fireEvent.click(screen.getByRole("button", { name: /Go back one/u }))
    expect(linesOnStage(container)).not.toContain(lineAt(1))
  })

  it("moves with the slider, one version per step and nothing between two", () => {
    const { container } = render(<VersionPlayer versions={versionsUpTo(3)} newest={3} />)
    const slider = screen.getByRole("slider")

    expect(slider.getAttribute("step")).toBe("1")
    expect(slider.getAttribute("max")).toBe("3")

    fireEvent.change(slider, { target: { value: "1" } })
    expect(linesOnStage(container)).toContain(lineAt(1))
    expect(linesOnStage(container)).not.toContain(lineAt(2))
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Version 1")
  })

  it("will not step past either end", () => {
    render(<VersionPlayer versions={versionsUpTo(1)} newest={1} />)

    expect(screen.getByRole("button", { name: /Go forward one/u }).hasAttribute("disabled")).toBe(
      true
    )
    fireEvent.click(screen.getByRole("button", { name: /Go back one/u }))
    expect(screen.getByRole("button", { name: /Go back one/u }).hasAttribute("disabled")).toBe(true)
  })

  /**
   * The one obvious action, and what it does: jump to the oldest version this
   * screen holds and run forward. Pressing it from the newest version has to go
   * back to the beginning first, or the button would do nothing at all on the
   * version the screen opens on — which is every reader's first press.
   */
  describe("watching it change", () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it("goes back to the beginning and runs forward one version at a time", () => {
      const { container } = render(<VersionPlayer versions={versionsUpTo(2)} newest={2} />)

      fireEvent.click(screen.getByRole("button", { name: "Watch it change" }))
      expect(linesOnStage(container)).not.toContain(lineAt(1))

      act(() => void vi.advanceTimersByTime(1000))
      expect(linesOnStage(container)).toContain(lineAt(1))
      expect(linesOnStage(container)).not.toContain(lineAt(2))

      act(() => void vi.advanceTimersByTime(1000))
      expect(linesOnStage(container)).toContain(lineAt(2))
    })

    it("stops itself at the newest one rather than looping", () => {
      const { container } = render(<VersionPlayer versions={versionsUpTo(1)} newest={1} />)

      fireEvent.click(screen.getByRole("button", { name: "Watch it change" }))
      act(() => void vi.advanceTimersByTime(10_000))

      expect(linesOnStage(container)).toContain(lineAt(1))
      expect(screen.getByRole("button", { name: "Watch it change" })).not.toBeNull()
    })

    /** One button through all three of its states, where the reader last pressed. */
    it("offers the way to stop where the reader pressed play", () => {
      render(<VersionPlayer versions={versionsUpTo(4)} newest={4} />)

      fireEvent.click(screen.getByRole("button", { name: "Watch it change" }))
      expect(screen.getByRole("button", { name: "Stop" })).not.toBeNull()

      fireEvent.click(screen.getByRole("button", { name: "Stop" }))
      act(() => void vi.advanceTimersByTime(10_000))
      expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Version 0")
    })

    it("stops playing the moment a reader takes the slider", () => {
      render(<VersionPlayer versions={versionsUpTo(4)} newest={4} />)

      fireEvent.click(screen.getByRole("button", { name: "Watch it change" }))
      fireEvent.change(screen.getByRole("slider"), { target: { value: "3" } })
      act(() => void vi.advanceTimersByTime(10_000))

      expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Version 3")
    })
  })

  /**
   * A page that has only ever been one thing has nothing to watch, and a control
   * that does nothing is worse than no control.
   */
  it("offers nothing to play when there is only one version", () => {
    render(<VersionPlayer versions={versionsUpTo(0)} newest={0} />)

    expect(screen.queryByRole("button", { name: /Watch it/u })).toBeNull()
    expect(screen.getByText(/This is where the page started/u)).not.toBeNull()
  })

  /**
   * The oldest version of a window that has slid was made by a change, and the
   * window does not hold the version before it. Saying *this is as far back as
   * this screen goes* is different from saying *this is where the page began*,
   * and a reader is owed the one that is true.
   */
  it("tells a window's oldest version apart from the page's beginning", () => {
    const folded = foldVersions(
      seedTree(),
      [1, 2, 3].map((revision) => addLine(revision, lineAt(revision))),
      2
    )

    render(<VersionPlayer versions={folded.versions} newest={folded.newest} />)
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0" } })

    expect(screen.getByText(/as far back as this screen goes/u)).not.toBeNull()
    expect(screen.queryByText(/where the page started/u)).toBeNull()
  })

  it("says the newest one it holds is not the newest there is", () => {
    const folded = foldVersions(
      seedTree(),
      [1, 2, 3].map((revision) => addLine(revision, lineAt(revision))),
      2
    )

    render(<VersionPlayer versions={folded.versions} newest={folded.newest} />)
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0" } })

    expect(screen.getByText("The newest one is 3.")).not.toBeNull()
  })

  /**
   * **It must not smooth**, which is `docs/portal.md` phase 3 stated as a
   * property rather than as taste. A version is a discrete state and anything
   * between two of them is a picture of something that never existed — so a
   * cross-fade is not a nicety here, it is a drawing of a page that never
   * existed. It is also the first thing anybody would reach for to make this feel
   * finished, which is why it is pinned in the source rather than only reviewed.
   */
  it("never transitions, tweens or animates the picture", () => {
    const source = readFileSync(
      portalFile("portal", "pages", "[treeId]", "versions", "_components", "version-player.tsx"),
      "utf8"
    ).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu, "")

    for (const forbidden of ["transition", "animate-", "duration-", "ease-", "motion-safe"]) {
      expect([forbidden, source.includes(forbidden)]).toEqual([forbidden, false])
    }
  })

  /** Guards the guard: the sweep has to be reading the component it names. */
  it("is read by that sweep", () => {
    const source = screenSource(
      portalFile("portal", "pages", "[treeId]", "versions", "_components", "version-player.tsx")
    )

    expect(source).toContain("VersionPlayer")
  })
})
