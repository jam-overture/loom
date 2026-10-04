import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { findNode, randomIdFactory, type LoomTree, type TreeDelta } from "@jam-overture/loom"
import { LOOM_NODE_ATTRIBUTE, renderLoomTree } from "@jam-overture/loom/react"

import { pageGround } from "@/app/(demo)/_lib/ground"
import { partInQuestion, type PartInQuestion } from "@/app/(demo)/_lib/in-question"
import { partTheRecordKept } from "@/app/(demo)/_lib/kept"
import { partTheAskWouldTouch } from "@/app/(demo)/_lib/before-the-press"
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
 * The same excerpt as the ask's, taken from the function the rail takes it
 * from.
 *
 * Not `{ ...partFor(id), where: "ask" }`. The moment is decided in
 * `in-question.ts` by which caller asked, and a test that spreads its own
 * answer over that one is a test of the spread.
 */
const askFor = (presetId: string, against: LoomTree): PartInQuestion => {
  const preset = presetById(presetId)
  if (!preset) throw new Error(`no preset ${presetId}`)

  const part = partTheAskWouldTouch(against, randomIdFactory, preset)
  if (part === undefined) throw new Error(`${presetId} has no part to preview`)

  return part
}

/**
 * And the part a landed change is holding, taken from the function the rail
 * takes it from — for the reason `askFor` gives about the ask's.
 *
 * The tree it is read against is one the band has been taken off, because that
 * is the only tree the reading is allowed to answer for: `partTheRecordKept`
 * refuses a node the page still has.
 */
const keptFor = (against: LoomTree): { readonly part: PartInQuestion; readonly tree: LoomTree } => {
  const operations = deltaFor("trim", against).operations
  const first = operations[0]
  if (first?.op !== "remove") throw new Error("trim is not a removal")

  const band = findNode(against.root, first.nodeId)
  if (band === null) throw new Error("this page has no numbers band")

  const without: LoomTree = {
    ...against,
    revision: against.revision + 1,
    root: { ...against.root, children: against.root.children.filter((child) => child !== band) },
  }

  const part = partTheRecordKept(without, {
    recordId: "i_kept",
    askedAt: "2026-09-28T09:00:00.000Z",
    utterance: "Take the numbers band off the page.",
    origin: "user-instruction",
    outcome: "applied",
    revision: { produced: 1, replaced: 0 },
    repaired: false,
    touched: [],
    reversibility: {
      reversible: true,
      retainedNodeCount: 4,
      reasons: [],
      inverseOperations: [],
      inverse: [{ op: "insert", parentId: without.root.id, index: 0, node: band }],
    },
  })
  if (part === undefined) throw new Error("the record kept nothing to draw")

  return { part, tree: without }
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

/**
 * The two moments the same excerpt stands in, and everything that differs
 * between them is a class name — which is the claim worth holding, because the
 * alternative every run reaches for first is a second component.
 *
 * `globals.css` hangs two rules off the modifier: the wide-screen `display:
 * none`, which is the question's and not the ask's, and the window height. A
 * rename on either side is silent, so both hooks are named here.
 */
describe("the moment it is standing in", () => {
  it("marks a question's excerpt as a question's, which is what the wide-screen rule hides", () => {
    const tree = page()
    const { container } = render(<PartInQuestionView part={partFor("trim", tree)} />)

    expect(container.querySelector(".demo-part.demo-part--question")).not.toBeNull()
    expect(container.querySelector(".demo-part--ask")).toBeNull()
  })

  /**
   * **The one that matters.** If an ask's excerpt carried the question's
   * modifier it would be hidden at exactly the width the maintainer judges this
   * surface at, and every assertion above would still pass: the markup would be
   * right and the arrival screen would be back to a button naming a band
   * nobody can see.
   */
  it("marks an ask's excerpt as an ask's, which no rule hides", () => {
    const tree = page()
    const { container } = render(<PartInQuestionView part={askFor("trim", tree)} />)

    expect(container.querySelector(".demo-part.demo-part--ask")).not.toBeNull()
    expect(container.querySelector(".demo-part--question")).toBeNull()
  })

  /**
   * Same fact, different element — and the element is the claim about the
   * document. In the card the lead is a sibling of the card's own heading; in
   * the ask panel the nearest heading is the rail's `h1`, two levels up, so an
   * `h4` there announces a subsection of nothing.
   *
   * **The panel's used to be a paragraph and is now a control**, which is the
   * same decision carried one step further: the ask's excerpt is the one that
   * arrives shut, so its sentence is the thing you press and a `<summary>`
   * announces no subsection at all.
   */
  it("says what would happen as a heading in a card and as a control in the panel", () => {
    const tree = page()
    const lead = "This is what would come off the page."

    const asked = render(<PartInQuestionView part={askFor("trim", tree)} />)

    expect(asked.container.querySelector("h4")).toBeNull()
    expect(asked.container.querySelector("summary")?.textContent).toBe(
      "Show what would come off the page"
    )

    const questioned = render(<PartInQuestionView part={partFor("trim", tree)} />)

    expect(questioned.container.querySelector("h4")?.textContent).toBe(lead)
    expect(questioned.container.querySelector("summary")).toBeNull()
  })

  /**
   * **And the kept excerpt takes the card's markup, not the panel's** — which
   * is the assertion that made the condition name the ask.
   *
   * It read `where === "question" ? h4 : p` while there were two moments, and
   * a third that is also in a card would have silently inherited the panel's
   * paragraph: a level-four heading demoted on the one card where it has a
   * sibling to be level with, with nothing else going red.
   */
  it("says what came off as a heading, because it is in a card too", () => {
    const { part } = keptFor(page())
    const { container } = render(<PartInQuestionView part={part} />)

    expect(container.querySelector(".demo-part.demo-part--kept")).not.toBeNull()
    expect(container.querySelector("h4")?.textContent).toBe(
      "This is what came off the page. The record is still holding it."
    )
  })

  /**
   * And it is the band, in full, after the page has stopped having it. This is
   * the one excerpt on this surface whose content is on no screen at any
   * width, which is why no rule may hide it.
   */
  it("draws the band the page no longer has, word for word", () => {
    const tree = page()
    const { part } = keptFor(tree)

    const kept = render(<PartInQuestionView part={part} />)
    const questioned = render(<PartInQuestionView part={partFor("trim", tree)} />)

    expect(kept.container.querySelector(".demo-part-stage")?.textContent).toBe(
      questioned.container.querySelector(".demo-part-stage")?.textContent
    )
    expect(kept.container.querySelector(".demo-part--question")).toBeNull()
    expect(kept.container.querySelector(".demo-part--ask")).toBeNull()
  })

  /** Neither moment is operable: it is a second rendering of somebody else's page. */
  it("is the same excerpt either way, down to the words in it", () => {
    const tree = page()
    const asked = render(<PartInQuestionView part={askFor("trim", tree)} />)
    const questioned = render(<PartInQuestionView part={partFor("trim", tree)} />)

    expect(asked.container.querySelector(".demo-part-stage")?.textContent).toBe(
      questioned.container.querySelector(".demo-part-stage")?.textContent
    )
    expect(asked.container.textContent).toContain("3,400")
  })
})

/**
 * ## The arrival screen's excerpt arrives shut
 *
 * Measured on a production build at 1280×900, before this unit: the rail's
 * scroller is **857px**, the excerpt under the green button is **358px** of it,
 * and the four asks carrying the Gate's own verdict about themselves — *GOES
 * AHEAD*, *ASKS YOU FIRST* — begin at **797**. The arrival screen stated a
 * counted claim and put every piece of its evidence under the fold.
 *
 * So the ask's excerpt is a `<details>`. These assertions are about the three
 * things that makes true and the one it must not: the band is still in the
 * document and still the same band, the control carries the sentence, and
 * **nothing is removed** — which on a surface whose whole argument is that the
 * record is complete is the property that outranks the pixels it bought.
 */
describe("the one excerpt that arrives shut", () => {
  it("is a disclosure on the ask and a section everywhere else", () => {
    const tree = page()

    const asked = render(<PartInQuestionView part={askFor("trim", tree)} />)

    expect(asked.container.querySelector("details.demo-part--ask")).not.toBeNull()
    expect(asked.container.querySelector("section")).toBeNull()

    const questioned = render(<PartInQuestionView part={partFor("trim", tree)} />)

    expect(questioned.container.querySelector("details")).toBeNull()
    expect(questioned.container.querySelector("section.demo-part--question")).not.toBeNull()

    const { part } = keptFor(tree)
    const kept = render(<PartInQuestionView part={part} />)

    expect(kept.container.querySelector("details")).toBeNull()
    expect(kept.container.querySelector("section.demo-part--kept")).not.toBeNull()
  })

  /**
   * **Shut, and not a second thing to press that is already open.** A
   * `<details>` rendered with `open` reclaims nothing and leaves a control on
   * the screen whose only effect is to take the band away — the worst of both
   * and the easiest thing to reach for when a picture of the open state is
   * wanted.
   */
  it("arrives shut, which is the whole of what it reclaims", () => {
    const tree = page()
    const { container } = render(<PartInQuestionView part={askFor("trim", tree)} />)

    expect(container.querySelector<HTMLDetailsElement>("details")?.open).toBe(false)
  })

  /**
   * **Nothing is removed**, and this is the assertion that says so. The band is
   * in the document, with the clinic's own figures in it, behind a control the
   * browser supplies — not conditionally rendered, not fetched on open, and not
   * a `display: none` on a wide screen, which `globals.test.ts` sweeps for
   * separately.
   *
   * Word for word the same band the question's excerpt draws, because it is the
   * same band: one tree, rendered twice, which is the demo's own claim about
   * itself.
   */
  it("keeps the band in the document, byte for byte, behind the control", () => {
    const tree = page()
    const asked = render(<PartInQuestionView part={askFor("trim", tree)} />)
    const questioned = render(<PartInQuestionView part={partFor("trim", tree)} />)

    const band = asked.container.querySelector("details > .demo-part-stage")

    expect(band).not.toBeNull()
    expect(band?.textContent).toBe(
      questioned.container.querySelector(".demo-part-stage")?.textContent
    )
    expect(asked.container.textContent).toContain("3,400")
    expect(asked.container.textContent).toContain("92%")
  })

  /**
   * The control is the sentence and there is no second copy of it. An excerpt
   * that printed its lead inside as well would open onto *Show what would come
   * off the page* above *This is what would come off the page*, which is the
   * stutter the `<p>` became the moment the fold went in.
   */
  it("says it once, on the control, and not again inside", () => {
    const tree = page()
    const { container } = render(<PartInQuestionView part={askFor("trim", tree)} />)

    expect(container.querySelector("summary")?.textContent).toBe(
      "Show what would come off the page"
    )
    expect(container.textContent).not.toContain("This is what would come off the page.")
  })

  /**
   * And the control's own hook, which `globals.css` rotates the chevron by.
   * `group-open:` is a Tailwind variant on the `<details>`, so the class has to
   * be on the element the browser toggles `open` on and nowhere else.
   */
  it("puts the group on the element the browser marks open", () => {
    const tree = page()
    const { container } = render(<PartInQuestionView part={askFor("trim", tree)} />)
    const details = container.querySelector("details")

    expect(details?.classList.contains("group")).toBe(true)
    expect(details?.querySelector("summary svg")).not.toBeNull()
  })
})
