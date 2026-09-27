import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { randomIdFactory, type LoomTree, type TreeDelta } from "@loom/runtime"
import { LOOM_NODE_ATTRIBUTE, renderLoomTree } from "@loom/runtime/react"

import { pageGround } from "@/app/(demo)/_lib/ground"
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

/**
 * A hex as the DOM reports it back. `style.backgroundColor` is serialised by the
 * browser, so asserting against the palette's own `#111827` compares a colour to
 * a spelling of it.
 */
const hexToRgb = (hex: string): string => {
  const channels = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16))

  return `rgb(${channels.join(", ")})`
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

  /**
   * **The ground, and this is the assertion the unit was built for.**
   *
   * `.loom-stage` paints `--surface-stage`, which is the demo chrome's white.
   * With the page on a dark palette the frame kept painting it and kept taking
   * its ink from the theme, so the one picture of what a stranger is about to
   * lose was `#f3f4f7` on `#ffffff` — 1.10:1, measured on a production build.
   * The pair is now read off one palette in `_lib/ground.ts`, and the contrast
   * sweep over all of them lives in `ground.test.ts`.
   */
  it("paints the page's own ground, not the demo's", () => {
    const tree = page()
    const theme = themeOf(tree)
    const ground = pageGround(theme)

    expect(ground).toBeDefined()

    const { container } = render(
      <PartInQuestionView part={partFor("trim", tree)} {...(theme ? { theme } : {})} />
    )
    const frame = container.querySelector<HTMLElement>(".demo-part-stage")

    expect(frame?.style.backgroundColor).toBe(hexToRgb(ground?.backgroundColor ?? ""))
    expect(frame?.style.color).toBe(hexToRgb(ground?.color ?? ""))
    expect(frame?.style.colorScheme).toBe(ground?.colorScheme)
  })

  /**
   * Inline rather than a class or a variable, because the rule it has to beat
   * is `.loom-stage`'s in `@layer base` and a layer beats an unlayered
   * declaration only when nothing inline is competing. A later run that moves
   * this into the stylesheet gets a white excerpt back and a red test.
   */
  it("sets the ground inline, so the stylesheet's own cannot win", () => {
    const tree = page()
    const theme = themeOf(tree)
    const { container } = render(
      <PartInQuestionView part={partFor("trim", tree)} {...(theme ? { theme } : {})} />
    )

    expect(container.querySelector(".demo-part-stage")?.getAttribute("style")).toContain(
      "background-color"
    )
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
