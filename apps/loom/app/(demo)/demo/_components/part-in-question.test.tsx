import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { randomIdFactory, type LoomTree, type TreeDelta } from "@jam-overture/loom"
import { LOOM_NODE_ATTRIBUTE, renderLoomTree } from "@jam-overture/loom/react"

import { partInQuestion, type PartInQuestion } from "@/app/(demo)/_lib/in-question"
import { demoPageTree } from "@/app/(demo)/_lib/page-tree"
import { presetById } from "@/app/(demo)/_lib/presets"
import { demoRegistry, demoThemes } from "@/app/(demo)/_lib/registry"

import { PartInQuestionView } from "./part-in-question"

/**
 * What the question shows about the part it is asking about.
 *
 * The assertion that carries this file is the first one, and it is the defect
 * the whole unit was built for: the clinic's own figures are held as **props**
 * on `loom.stat` rather than as text nodes, so every account of this change the
 * card had to offer named two registered types and not one word off the page.
 * A visitor on a phone, five screens above the band, was deciding on that.
 *
 * These render for real — same registry, same validator, same components the
 * stage resolves — because a preview that rendered through anything else would
 * be a second copy of the clinic's page and would drift from the first one.
 */

const page = (): LoomTree => demoPageTree()

const deltaFor = (presetId: string, against: LoomTree): TreeDelta => {
  const preset = presetById(presetId)
  if (!preset) throw new Error(`no preset ${presetId}`)

  const operations = preset.plan(against, randomIdFactory)
  if (operations === undefined) throw new Error(`${presetId} has nothing to do to this tree`)

  return {
    deltaId: randomIdFactory.deltaId(),
    treeId: against.treeId,
    baseRevision: against.revision,
    operations,
  }
}

const partFor = (presetId: string, against: LoomTree): PartInQuestion => {
  const part = partInQuestion(against, deltaFor(presetId, against))
  if (part === undefined) throw new Error(`${presetId} has no part to preview`)

  return part
}

/** The page's own resolved theme, taken the way the page takes it. */
const themeOf = (against: LoomTree) =>
  renderLoomTree(against, { resolver: demoRegistry, validator: demoRegistry, themes: demoThemes }).theme

describe("the part in question", () => {
  it("shows the words the page shows there, which no account of the change contains", () => {
    const tree = page()
    const { container } = render(<PartInQuestionView part={partFor("trim", tree)} />)
    const words = container.textContent ?? ""

    expect(words).toContain("3,400")
    expect(words).toContain("appointments last year")
    expect(words).toContain("years on the same street")
  })

  /**
   * The insert's subject is not on the page, so this is the one preview that
   * cannot be a screenshot of anything. It is the delta's own node, rendered.
   */
  it("shows a band that is not on the page yet", () => {
    const tree = page()
    const { container } = render(<PartInQuestionView part={partFor("band", tree)} />)

    expect(container.textContent).toContain("Where to find us")
    expect(container.textContent).toContain("14 Harbourline Walk")
  })

  it("says what would happen to it, above it", () => {
    const tree = page()
    const { container } = render(<PartInQuestionView part={partFor("trim", tree)} />)
    const heading = container.querySelector("h4")

    expect(heading?.textContent).toBe("This is what would come off the page.")
  })

  /**
   * The theme is resolved from the root's reserved props and handed to the root
   * *primitive* (`render.ts`), so an excerpt rooted at a band gets none —
   * `loom.stat-grid` never reads `loom.theme`. Without the frame carrying it,
   * every `var(--loom-…)` in the preview falls back and the clinic's page
   * appears inside Loom's question in a typeface and palette it does not own.
   */
  it("wears the page's own theme, taken from the render that already resolved it", () => {
    const tree = page()
    const theme = themeOf(tree)

    expect(theme).toBeDefined()

    const { container } = render(
      <PartInQuestionView part={partFor("trim", tree)} {...(theme ? { theme } : {})} />
    )
    const frame = container.querySelector(".demo-part-stage")

    expect(frame?.getAttribute("style")).toContain("--loom-")
  })

  it("renders without a theme, the way the stage would", () => {
    const tree = page()
    const { container } = render(<PartInQuestionView part={partFor("trim", tree)} />)

    expect(container.querySelector(".demo-part-stage")?.getAttribute("style")).toBeNull()
    expect(container.textContent).toContain("3,400")
  })

  /**
   * Edit mode off, and it is load-bearing. The mark on the stage is a
   * stylesheet keyed on `data-loom-node` (`_lib/spotlight.ts`), so a preview
   * carrying that attribute would match the same rule and draw a second amber
   * ring — and a second chip reading *This would be removed* — inside the card
   * that is asking about the first one.
   */
  it("carries no node attribute, so the mark on the stage cannot land on it", () => {
    const tree = page()
    const { container } = render(<PartInQuestionView part={partFor("trim", tree)} />)

    expect(container.querySelector(`[${LOOM_NODE_ATTRIBUTE}]`)).toBeNull()
  })

  /**
   * The frame is what the stylesheet clips, fades and removes on a wide screen,
   * and the two class names are the whole contract between this component and
   * `globals.css`. Held here because a rename on either side is silent.
   */
  it("hands the stylesheet the two hooks it clips and hides by", () => {
    const tree = page()
    const { container } = render(<PartInQuestionView part={partFor("trim", tree)} />)

    expect(container.querySelector(".demo-part")).not.toBeNull()
    expect(container.querySelector(".demo-part-stage.loom-stage")).not.toBeNull()
  })
})
