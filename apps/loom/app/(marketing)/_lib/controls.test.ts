import {
  colourDifference,
  JUST_NOTICEABLE_DIFFERENCE,
  STARTER_PALETTES,
  type ElementNode,
  type LoomNode,
  type LoomTree,
  type Palette,
  type PaletteSlot,
} from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { ASKS } from "./adapt/asks"
import { askRunFor, treeFor } from "./render"
import {
  HOW_IT_WORKS,
  SITE_ROUTES,
  SITE_THEMES,
  SITE_THEME_NAMES,
  type SiteThemeName,
} from "./site"

/**
 * Whether a visitor can tell that a control is a control.
 *
 * Every band on this site ends in a row of them, and `control.ts` paints a row
 * in three tiers: a filled pill for the thing you came to do, an outlined one
 * for the thing beside it, and `quiet` for the thing after that. A quiet
 * control is `background: transparent`, `border: 1px solid transparent` and
 * `color: accent`. **One colour is the whole of what it has to say with.**
 *
 * On the palette this site is served under, that colour is the colour of the
 * sentence next to it. `minimal` sets `accent` and `fg-default` to the same
 * `#0a0a0a`, deliberately — `src/theme/library.ts` records the black accent as
 * the maintainer's call after seeing it green — so what was left of six
 * controls on three pages was that they were **bold**, which is the mark
 * `loom.emphasis` puts on a stressed word. Standing in a row beside a filled
 * pill and an outlined one, they read as captions. That is what the
 * photographs showed and it is what this file now prevents.
 *
 * **The framework had already measured it and nothing had read the measurement
 * next to the site.** `src/theme/separation.ts` declares `fg-default` against
 * `accent` as a `colour-only` pairing and its own comment calls it *"the row
 * that fails"*. The gap was never the instrument; it was that a composition
 * could lean its whole affordance on a pair the library had written down as
 * collapsing, and no test anywhere joined the two.
 *
 * So the premise is asserted rather than described. Each rule below states the
 * measurement it rests on, which means **this file goes red on the day the
 * reasoning stops holding** rather than outliving it as a comment: a palette
 * change that separates the two slots fails `the premise`, and the ban it
 * justifies can be lifted in the same commit that makes it wrong.
 */

const ORIGIN = "https://loom.example"

const isElement = (node: LoomNode): node is ElementNode => node.kind === "element"

const elementsOf = (node: LoomNode): readonly ElementNode[] => [
  ...(isElement(node) ? [node] : []),
  ...(node.kind === "text" ? [] : node.children.flatMap(elementsOf)),
]

/**
 * The two primitives `control.ts` paints, which are one object to a reader.
 *
 * `loom.action` goes somewhere and `loom.button` sends something (0065), and
 * they share their paint and their sizing. A rule about the paint that named
 * only the one this site happens to use today would be a rule with a hole in
 * it the first time a band grows a form.
 */
const CONTROLS = ["loom.action", "loom.button"]

const controlsIn = (page: LoomTree): readonly ElementNode[] =>
  elementsOf(page.root).filter((node) => CONTROLS.includes(node.type))

const paletteOf = (theme: SiteThemeName): Palette => {
  const id = SITE_THEMES[theme].selection["palette"]
  const palette = STARTER_PALETTES.find((candidate) => candidate.id === id)

  if (palette === undefined) {
    throw new Error(`loom: ${theme} names a palette the starter set does not have: ${String(id)}`)
  }

  return palette
}

/**
 * How far apart two slots of one palette are, in the units the library judges
 * a collapse in.
 *
 * `colourDifference` is undefined for a value it cannot read, and a slot it
 * cannot read is a slot this file cannot answer for — so it throws rather than
 * passing. A palette that silently stopped being measurable would otherwise
 * turn every rule below green.
 */
const apart = (palette: Palette, first: PaletteSlot, second: PaletteSlot): number => {
  const one = palette.slots[first]
  const other = palette.slots[second]
  const difference =
    one === undefined || other === undefined ? undefined : colourDifference(one, other)

  if (difference === undefined) {
    throw new Error(`loom: ${palette.id} cannot be measured for ${first} against ${second}`)
  }

  return difference
}

/** Every page of this site, in every state a visitor can put it in. */
const everyState = async (): Promise<readonly LoomTree[]> => {
  const published = SITE_THEME_NAMES.flatMap((theme) =>
    SITE_ROUTES.map((route) => treeFor(route, { origin: ORIGIN, theme }))
  )

  /**
   * The states only a request produces, which is where three of the six were.
   *
   * The notice at the top of the page and the panel's own row exist only once
   * the visitor has asked for something, so a sweep over the published pages
   * alone would have reported this site clean while half of it was wrong. Each
   * ask is run with the visitor's yes, because that is the state the controls
   * under it are drawn in.
   */
  const asked = await Promise.all(
    ASKS.map(async (ask) => {
      const context = { origin: ORIGIN, theme: "minimal" as SiteThemeName, ask: ask.id, approve: true }
      const run = await askRunFor(context)

      return treeFor(HOW_IT_WORKS, {
        ...context,
        ...(run === undefined ? {} : { record: run.record }),
        ...(run?.undone === undefined ? {} : { undone: run.undone }),
      })
    })
  )

  return [...published, ...asked]
}

describe("the premise", () => {
  /**
   * The measurement the rule below rests on, stated as an assertion.
   *
   * It is deliberately about *the palettes this site offers* rather than about
   * `minimal` by name: the footer's switcher is built from `SITE_THEME_NAMES`,
   * so a fourth palette is a fourth page a visitor can be reading, and one of
   * them collapsing is enough to decide what the composition may lean on.
   */
  it("has at least one palette where a quiet control is the colour of the text beside it", () => {
    const collapsed = SITE_THEME_NAMES.filter(
      (theme) => apart(paletteOf(theme), "fg-default", "accent") < JUST_NOTICEABLE_DIFFERENCE
    )

    expect(collapsed).not.toEqual([])
    /** The default, which is every screenshot and every visitor who changes nothing. */
    expect(collapsed).toContain("minimal")
  })

  /**
   * Why the replacement is `secondary` and not a second guess.
   *
   * An outline is only an affordance if the palette draws it, and this
   * repository has already shipped a hairline nobody could see: `border-subtle`
   * is under the floor on four of the starter palettes, filed on 29 September.
   * `border-strong` is the tier `secondary` asks for, and it is checked here
   * against both grounds a control is stood on rather than against the one it
   * was designed for.
   */
  it("draws a secondary control's edge on every palette this site offers", () => {
    for (const theme of SITE_THEME_NAMES) {
      const palette = paletteOf(theme)

      for (const ground of ["bg-canvas", "bg-surface"] as const) {
        expect(
          apart(palette, "border-strong", ground),
          `${theme}: border-strong against ${ground}`
        ).toBeGreaterThan(JUST_NOTICEABLE_DIFFERENCE)
      }
    }
  })
})

describe("every control a visitor can reach", () => {
  /**
   * The rule, over the tree rather than over the four files it was broken in.
   *
   * Stated this way it holds for the band nobody has written yet, which is the
   * property that matters: the mistake was not that somebody chose the wrong
   * variant six times, it was that choosing it looked right and nothing could
   * say otherwise.
   */
  it("is drawn with something other than a colour the palette collapses", async () => {
    const offending = (await everyState()).flatMap((page) =>
      controlsIn(page)
        .filter((control) => control.props["variant"] === "quiet")
        .map((control) => `${control.type} ${control.id}`)
    )

    expect(offending).toEqual([])
  })

  /**
   * And it is not an empty rule, which is the half a sweep like this usually
   * forgets.
   *
   * A test asserting that a list contains nothing passes just as well when the
   * list was never built — a selector that stopped matching, a route map that
   * came back empty, an `ASKS` that shrank to nothing. So the sweep says how
   * much it looked at, and the floor is the row this unit was about: three
   * pages that each end in one.
   */
  it("is found at all, on every page and in every state", async () => {
    const states = await everyState()

    expect(states.length).toBe(SITE_ROUTES.length * SITE_THEME_NAMES.length + ASKS.length)
    expect(states.every((page) => controlsIn(page).length > 0)).toBe(true)
  })
})
