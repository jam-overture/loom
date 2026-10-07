// @vitest-environment jsdom

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { sequentialIdFactory, type IdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { PRESENTED_ATTRIBUTE } from "../render/behaviour.js"
import { renderLoomTree } from "../render/render.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { describeRegistryError, type PrimitiveRegistry } from "../sdk/registry.js"
import { createThemeRegistry } from "../theme/registry.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import type { ElementNode } from "../tree/node.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { ctaBookingBand } from "./compositions/cta-booking-band.js"
import { navMenusBand } from "./compositions/nav-menus-band.js"
import { createStarterPrimitiveRegistry } from "./index.js"
import { LIBRARY_CLASS } from "./stylesheet.js"

/**
 * The word a tree writes onto a control —
 * [0234](../../decisions/0234-a-primitive-may-name-a-control-from-the-tree-and-its-declared-string-is-the-floor.md),
 * from the taking end.
 *
 * The seam landed on 5 October with no consumer in the library. `loom.dialog`
 * and `loom.menu` are the first two, so **the two registry refusals 0234
 * specifies had never been exercised by a real declaration** until this run, and
 * neither had the resolution order its fourth and fifth clauses turn on.
 *
 * Everything here needs a mounted root rather than `renderToStaticMarkup`. A
 * control returns `null` until an effect has proved scripting runs, so a static
 * render of a named control is a render of the page the control never reached —
 * which is also, separately, the finding this run filed about `copy`.
 *
 * The assertions are deliberately split into three groups, because they fail for
 * three different reasons:
 *
 * 1. **The word arrives** — the prop reaches the button at all.
 * 2. **The floor holds** — a node that said nothing gets a real name rather than
 *    a hole, for every shape of *nothing* clause 5 lists.
 * 3. **Two of one primitive are two different buttons** — the case that was
 *    broken before the seam moved, and the one a reader actually suffers.
 */

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const registryOf = (): PrimitiveRegistry => {
  const built = createStarterPrimitiveRegistry()
  if (!built.ok) throw new Error(describeRegistryError(built.error))

  return built.value
}

const registry = registryOf()
const themes = createThemeRegistry()

const EDITORIAL = { palette: "editorial", fontPack: "editorial-serif", stylePreset: "comfortable" }
const BOLD = { palette: "bold", fontPack: "bold-sans", stylePreset: "airy-modern" }

/** Both starter palettes, because a primitive is only ever shipped under both. */
const PALETTES = [
  ["editorial", EDITORIAL],
  ["bold", BOLD],
] as const

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => {
    root.unmount()
  })
  container.remove()
  globalThis.IS_REACT_ACT_ENVIRONMENT = undefined
})

const pageOf = (theme: Record<string, string>, band: (ids: IdFactory) => ElementNode): LoomTree => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [band(ids)],
    }),
    ids
  )
}

/**
 * The mounted page below its own root element, with the root's opening tag
 * removed.
 *
 * The removal is the whole helper and it is `bound.test.ts`' lesson reused: the
 * root is where the theme writes its palette as seventeen literal hexes, which
 * is the point of a theme and is exactly what an assertion about literal colour
 * must not read. `container.firstElementChild` is that root, so its `innerHTML`
 * is everything below it — no `indexOf` and nothing to return `-1`.
 */
const bodyBelowTheRoot = (): string => {
  const root = container.firstElementChild

  expect(root).not.toBeNull()

  return root?.innerHTML ?? ""
}

const mount = async (tree: LoomTree): Promise<void> => {
  const rendered = renderLoomTree(tree, {
    resolver: registry,
    validator: registry,
    themes,
    editMode: false,
  })

  await act(async () => {
    root.render(rendered.element)
  })
}

/**
 * Every present-control on the page, in document order, by the name a reader is
 * announced.
 *
 * `textContent` rather than `aria-label`, and the difference is the point of the
 * record: a trigger renders its name as a child, which is why 0234's last
 * consequence says the icon-only case is still unreachable. The cross is the
 * other way round and `presentation.test.ts` asserts that one.
 */
const triggerNames = (): readonly string[] =>
  Array.from(container.querySelectorAll("button.loom-control-present"), (button) => button.textContent ?? "")

/**
 * A dialog on its own, with whatever props the case under test needs.
 *
 * `props` is deliberately typed as the loose bag rather than the primitive's
 * inferred shape: half the cases below pass a `label` that is **not a string**,
 * which is exactly what clause 5 enumerates and what a tree is capable of
 * carrying.
 */
const dialogWith = (props: JsonObject) => (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.dialog",
    props,
    children: [
      buildElement(ids, {
        type: "loom.prose",
        children: [buildText(ids, "Twenty minutes, against a page you already have.")],
      }),
    ],
  })

describe("the word a tree writes onto a control", () => {
  for (const [name, palette] of PALETTES) {
    it(`puts a dialog's own call to action on its trigger — ${name}`, async () => {
      await mount(pageOf(palette, dialogWith({ label: "Book a call", title: "Twenty minutes" })))

      expect(triggerNames()).toEqual(["Book a call"])
    })

    it(`puts a menu's own name on its button — ${name}`, async () => {
      await mount(
        pageOf(palette, (ids) =>
          buildElement(ids, {
            type: "loom.menu",
            props: { label: "Product" },
            children: [
              buildElement(ids, {
                type: "loom.link",
                props: { href: "/why" },
                children: [buildText(ids, "Why Loom")],
              }),
            ],
          })
        )
      )

      expect(triggerNames()).toEqual(["Product"])
    })
  }

  /**
   * The floor, which is clause 3 and the reason a named control is still a
   * translatable one. Nothing in this tree names anything, and the reader is
   * announced a real word in the deployment's language rather than meeting a
   * button with no name.
   */
  it("falls back to the primitive's declared string when the node names nothing", async () => {
    await mount(pageOf(EDITORIAL, dialogWith({ title: "Twenty minutes" })))

    expect(triggerNames()).toEqual(["More"])
  })

  /**
   * Clause 5, and **this is where the clause and this library meet rather than
   * agree.** The record enumerates five shapes of *this node said nothing* —
   * absent, `null`, a number, an object, whitespace — and says each falls back
   * to the declared string with no diagnostic.
   *
   * That is the runtime's contract, and only **two of the five can reach it
   * through this primitive**, because `label` is declared `z.string().min(1)`.
   * A tree carrying `null`, a number, an object or a blank string is a tree the
   * schema refuses first: the node is `invalid-props`, nothing is drawn, and the
   * fallback is never consulted.
   *
   * Both halves are asserted because both are the primitive's behaviour, and
   * the refusing half is the stronger one. A dialog whose `label` arrived as an
   * object is a tree somebody generated wrongly; drawing it with a button
   * reading *More* would be a page that works and a defect nobody is told
   * about. Filed, because the gap between the clause and the reachable cases is
   * worth somebody knowing before they write the next named control.
   */
  const SAID_NOTHING: readonly (readonly [string, JsonObject])[] = [
    ["an absent label", { title: "Twenty minutes" }],
    ["a label of whitespace", { label: "   ", title: "Twenty minutes" }],
  ]

  for (const [shape, props] of SAID_NOTHING) {
    it(`treats ${shape} as having said nothing, and gives the reader the floor`, async () => {
      await mount(pageOf(EDITORIAL, dialogWith(props)))

      expect(triggerNames()).toEqual(["More"])
    })
  }

  const REFUSED: readonly (readonly [string, unknown])[] = [
    ["blank", ""],
    ["null", null],
    ["a number", 42],
    ["an object", { words: "Book a call" }],
  ]

  for (const [shape, value] of REFUSED) {
    it(`refuses a label of ${shape} at the schema, before any fallback`, async () => {
      /**
       * Cast at the boundary on purpose. `JsonObject` is the shape a tree may
       * hold, and three of these four are outside it — which is the case under
       * test: a tree assembled by something other than this file's builders can
       * carry them, and the schema is what has to refuse them.
       */
      const tree = pageOf(
        EDITORIAL,
        dialogWith({ label: value, title: "Twenty minutes" } as unknown as JsonObject)
      )
      const { diagnostics } = renderLoomTree(tree, {
        resolver: registry,
        validator: registry,
        themes,
        editMode: false,
      })

      expect(diagnostics).toHaveLength(1)
      expect(diagnostics[0]).toMatchObject({ code: "invalid-props", type: "loom.dialog" })

      await mount(tree)
      /** Nothing drawn at all, which is the point: no button and no panel. */
      expect(triggerNames()).toEqual([])
      expect(container.querySelector(`.${LIBRARY_CLASS.dialog}`)).toBeNull()
    })
  }

  /**
   * The case 0234's consequences name, and the whole reason the seam moved.
   *
   * Before it, `loom.menu` declared *Menu* and resolved it per type, so this bar
   * was two buttons a screen reader announced identically — stated as a
   * permanent limit in `loom.menu`'s own doc comment and in
   * `nav-centred-band`'s, both retracted on this branch.
   *
   * Asserted against the shipped band rather than a fixture, so the band losing
   * a `label` in a future edit fails here rather than looking fine.
   */
  it("gives a bar with two menus two different buttons", async () => {
    await mount(pageOf(EDITORIAL, navMenusBand.build))

    const names = triggerNames()

    expect(names).toEqual(["Product", "Account"])
    expect(new Set(names).size).toBe(names.length)
  })

  /**
   * And the regression that matters more than the equality above: if `names`
   * were dropped from `loom.menu`'s declaration, both buttons would read the
   * declared floor and this is the assertion that notices. It is written as
   * *neither is the floor* rather than as *both are these two strings*, so it
   * keeps working when somebody rewords the band.
   */
  it("leaves neither of the two menus reading the declared floor", async () => {
    await mount(pageOf(BOLD, navMenusBand.build))

    for (const name of triggerNames()) expect(name).not.toBe("Menu")
  })

  /**
   * The band end to end: the trigger carries the page's words, and what opens is
   * a form rather than a string, which is the pairing of 0234 with 0051 that
   * this band exists to demonstrate.
   */
  it("opens a form from the closing band's own call to action", async () => {
    await mount(pageOf(EDITORIAL, ctaBookingBand.build))

    expect(triggerNames()).toEqual(["Book a call"])

    const dialog = container.querySelector(`.${LIBRARY_CLASS.dialog}`)

    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute(PRESENTED_ATTRIBUTE)).toBe("false")

    const button = container.querySelector<HTMLButtonElement>("button.loom-control-present")

    await act(async () => {
      button?.click()
    })

    expect(dialog?.getAttribute(PRESENTED_ATTRIBUTE)).toBe("true")
    /** The body is nodes: a real form, with the fields the band inserted. */
    expect(dialog?.querySelectorAll("input").length).toBe(2)
    expect(dialog?.querySelector("form")).not.toBeNull()
  })

  /**
   * The trigger is the thing on the page, so it is left where the runtime paints
   * it — unlike the lightbox's chip, which the primitive positions from the
   * sheet because it belongs over the corner of a tile.
   *
   * Written as *the sheet says nothing about this control* rather than as a
   * geometry assertion, because jsdom computes no layout and a geometry
   * assertion here would be a test of nothing.
   */
  it("positions a dialog's trigger from nowhere, because the band already placed it", () => {
    const sheet = Array.from(document.querySelectorAll("style"), (style) => style.textContent ?? "").join("\n")

    expect(sheet).not.toContain(`.${LIBRARY_CLASS.dialog} > .loom-control-present`)
  })

  /**
   * Both palettes, below the root, byte for byte — the library's standing rule,
   * and asserted here with a **positive** check alongside it for the reason this
   * lane filed on 6 October: a helper that narrows a subject before asserting on
   * it is a silent `true` whenever the narrowing finds nothing, and every
   * assertion of the form *X is absent from the narrowed thing* then passes.
   *
   * So `toContain` goes first. It is the only assertion in this block that could
   * fail if the narrowing broke.
   */
  it("draws a dialog identically under both palettes, with no colour of its own", async () => {
    const bodies: string[] = []

    for (const [, palette] of PALETTES) {
      await mount(pageOf(palette, dialogWith({ label: "Book a call", title: "Twenty minutes" })))
      bodies.push(bodyBelowTheRoot())
    }

    const [editorial, bold] = bodies

    /**
     * The positive assertions first, and they are not decoration. This block
     * narrows its subject before asserting absence, which is the shape this
     * lane filed on 6 October: a narrowing that finds nothing makes every
     * *X is absent* assertion below it a silent `true`. The first version of
     * this test compared `container.innerHTML` — the root's style attribute
     * included — and failed on the theme's own seventeen hexes, which is how
     * the narrowing came to be here at all.
     */
    expect(editorial).toContain(LIBRARY_CLASS.dialogPanel)
    expect(editorial).toContain(LIBRARY_CLASS.dialogFrame)
    expect(editorial).toContain("Book a call")
    expect(editorial).toBe(bold)
    expect(editorial).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(editorial).not.toMatch(/\b(rgba?|hsla?)\(/)
  })

  /**
   * The scroll lock, 0210's second instance. Asserted on the sheet because that
   * is where it lives and jsdom will not compute it — and asserted as *scoped*,
   * because the one thing that would make this rule a defect is its reaching the
   * document element while no Loom region is open.
   */
  it("locks the page's scroll only while a dialog is open", () => {
    const sheet = Array.from(document.querySelectorAll("style"), (style) => style.textContent ?? "").join("\n")
    const rule = `html:has(.${LIBRARY_CLASS.dialog}[${PRESENTED_ATTRIBUTE}="true"])`

    expect(sheet).toContain(rule)
    /** Never unscoped, and never keyed on the shut state. */
    expect(sheet).not.toContain(`html:has(.${LIBRARY_CLASS.dialog})`)
    expect(sheet).not.toContain(`html:has(.${LIBRARY_CLASS.dialog}[${PRESENTED_ATTRIBUTE}="false"])`)
  })
})

/**
 * A dialog places one region, so it takes children — and a tree that puts its
 * body in a slot instead loses it.
 *
 * **This is a characterisation test for a framework finding, not an approval of
 * the behaviour.** A slot handed to a primitive that declares none is dropped
 * with its whole subtree and **no diagnostic of any kind**: there is no
 * `unhonoured-slot` code in the render seam, so the page comes out as an empty
 * dialog and nothing anywhere says a paragraph went missing. Every `data-`
 * diagnostic in the seam exists for exactly this class of failure — something
 * arrived and was not drawn — and this one has none.
 *
 * Filed against the render seam rather than worked around here, because a
 * primitive cannot see its own dropped slots.
 *
 * What is asserted is only the measurable half — **the content does not reach
 * the page** — and deliberately *not* that `diagnostics` is empty. The day the
 * seam starts reporting it, this test should still pass; it is the silence that
 * is the defect, and the silence is not this file's to assert as correct.
 */
describe("what a dialog does with a region it was never asked to place", () => {
  it("drops a slot it never declared, with the words inside it", () => {
    const ids = sequentialIdFactory()
    const tree = createTree(
      buildElement(ids, {
        type: "loom.page",
        props: { [THEME_PROP_KEY]: EDITORIAL, width: "wide", fills: true },
        children: [
          buildElement(ids, {
            type: "loom.dialog",
            props: { label: "Book a call" },
            children: [buildSlot(ids, "body", [buildText(ids, "A slot this primitive never declared")])],
          }),
        ],
      }),
      ids
    )

    const { element } = renderLoomTree(tree, {
      resolver: registry,
      validator: registry,
      themes,
      editMode: false,
    })
    const markup = renderToStaticMarkup(element)

    /** The dialog is drawn — so this is a loss inside a page that looks fine. */
    expect(markup).toContain(LIBRARY_CLASS.dialogPanel)
    expect(markup).not.toContain("A slot this primitive never declared")
  })
})
