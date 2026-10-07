// @vitest-environment jsdom

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { sequentialIdFactory, type IdFactory } from "../ids.js"
import {
  PRESENTED_ATTRIBUTE,
  DISMISS_EVENT,
  ADJUST_PROPERTY,
  ADJUST_RESTING_PROPERTY,
} from "../render/behaviour.js"
import { renderLoomTree } from "../render/render.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { describeRegistryError, type PrimitiveRegistry } from "../sdk/registry.js"
import { createThemeRegistry } from "../theme/registry.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import type { ElementNode } from "../tree/node.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { createStarterPrimitiveRegistry } from "./index.js"
import { LIBRARY_CLASS } from "./stylesheet.js"

/**
 * The half of a presentation that only a browser can be asked about, and the
 * one mistake 0176 says nothing in the repository can diagnose.
 *
 * > **A primitive can place the pair wrongly and nothing will say so.** If the
 * > cross is not inside the element the trigger was placed in, the event does
 * > not arrive and the button does nothing. […] it has the same non-diagnosis:
 * > the seam cannot see a primitive's layout.
 *
 * The seam cannot, and `library.test.ts` cannot either — `renderToStaticMarkup`
 * never mounts a control, so every assertion it makes about a presentation is an
 * assertion about the page where the region is simply open. The defect this file
 * exists for is invisible in exactly that render: a trigger placed one box too
 * deep publishes `data-loom-presented` on a box the hide rule is not keyed on,
 * so the rule matches nothing, the panel never closes, and the static markup is
 * byte-identical to a correct primitive's.
 *
 * So the assertions here are **the primitive's own rule run against the
 * primitive's own markup**, with the control mounted: the selector is read out
 * of the stylesheet this library emits rather than typed again here, and what is
 * checked is that it reaches the region when the region is shut and reaches
 * nothing when it is open. A primitive that wrapped its trigger fails on the
 * first of those; a primitive whose rule was written the other way round fails
 * on the second.
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
 * Mounts a tree for real — a client root rather than `renderToStaticMarkup`,
 * which is the whole point: the controls return `null` until an effect has run,
 * so a static render of any of this photographs the page the control never
 * reached.
 */
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

/** The one stylesheet this library emits, as text, however React hoisted it. */
const sheet = (): string =>
  Array.from(document.querySelectorAll("style"), (style) => style.textContent ?? "").join("\n")

/**
 * The rule that hides one region, read out of the sheet rather than retyped.
 *
 * Retyping it would make this file agree with itself and with nothing else. Read
 * out, a rule somebody renames or rewrites in the wrong direction fails here,
 * which is the only reason the extraction is worth the five lines.
 */
const hideSelectorFor = (panelClass: string): string => {
  const found = new RegExp(`([^\\n}]*\\.${panelClass})\\s*\\{\\s*display:\\s*none`).exec(sheet())

  expect(found?.[1]).toBeDefined()

  return (found?.[1] ?? "").trim()
}

const presented = (className: string): Element => {
  const element = container.querySelector(`.${className}`)

  expect(element).not.toBeNull()

  return element as Element
}

const trigger = (): HTMLButtonElement => {
  const button = container.querySelector<HTMLButtonElement>("button.loom-control-present")

  expect(button).not.toBeNull()

  return button as HTMLButtonElement
}

const link = (ids: IdFactory, label: string, href: string): ElementNode =>
  buildElement(ids, { type: "loom.link", props: { href }, children: [buildText(ids, label)] })

const shot = (ids: IdFactory, src: string, alt: string): ElementNode =>
  buildElement(ids, { type: "loom.media", props: { src, alt, aspect: "wide", corners: "none" } })

const menuBand = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.menu",
    props: {},
    children: [link(ids, "Why Loom", "/why"), link(ids, "The record", "/record")],
  })

const popoverBand = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.popover",
    props: {},
    children: [
      buildElement(ids, {
        type: "loom.prose",
        children: [buildText(ids, "Every proposal is weighed before it is applied.")],
      }),
    ],
  })

const lightboxBand = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.lightbox",
    props: { aspect: "wide", caption: "The record, in full" },
    children: [
      buildSlot(ids, "preview", [shot(ids, "https://example.com/tile.png", "The record, at tile size")]),
      buildSlot(ids, "full", [shot(ids, "https://example.com/full.png", "The record, in full")]),
    ],
  })

/**
 * The fourth presentation, and the reason it belongs in this table rather than
 * only in its own file: every assertion below is about a primitive placing the
 * pair correctly, which is the thing 0176 says nothing in the repository can
 * diagnose. `loom.dialog` is the newest place to get it wrong.
 */
const dialogBand = (ids: IdFactory): ElementNode =>
  buildElement(ids, {
    type: "loom.dialog",
    props: { label: "Watch the demo", title: "Loom in four minutes", measure: "prose" },
    children: [
      buildElement(ids, {
        type: "loom.prose",
        children: [buildText(ids, "A proposal written, weighed, applied, and recorded.")],
      }),
    ],
  })

const BANDS = [
  ["loom.menu", menuBand, LIBRARY_CLASS.menu, LIBRARY_CLASS.menuPanel],
  ["loom.popover", popoverBand, LIBRARY_CLASS.popover, LIBRARY_CLASS.popoverPanel],
  ["loom.lightbox", lightboxBand, LIBRARY_CLASS.lightbox, LIBRARY_CLASS.lightboxFrame],
  ["loom.dialog", dialogBand, LIBRARY_CLASS.dialog, LIBRARY_CLASS.dialogFrame],
] as const

describe("a region a reader opens", () => {
  for (const [type, band, rootClass, panelClass] of BANDS) {
    for (const [name, palette] of PALETTES) {
      it(`publishes ${type}'s state on the element the rule is keyed on — ${name}`, async () => {
        await mount(pageOf(palette, band))

        /**
         * The assertion the static suite cannot make. The attribute lands on
         * **the control's own parent**, so this passing is the evidence that the
         * trigger is a direct child of the primitive's root — and a trigger
         * tucked into a tile, a bar or a wrapper would put it one level down and
         * fail here with the rest of the page looking identical.
         */
        expect(presented(rootClass).getAttribute(PRESENTED_ATTRIBUTE)).toBe("false")
      })

      it(`reaches ${type}'s region with its own hide rule while it is shut — ${name}`, async () => {
        await mount(pageOf(palette, band))

        const selector = hideSelectorFor(panelClass)

        expect(Array.from(container.querySelectorAll(selector))).toEqual([presented(panelClass)])
      })

      it(`stops reaching ${type}'s region once the reader opens it — ${name}`, async () => {
        await mount(pageOf(palette, band))

        const selector = hideSelectorFor(panelClass)

        await act(async () => {
          trigger().click()
        })

        expect(presented(rootClass).getAttribute(PRESENTED_ATTRIBUTE)).toBe("true")
        expect(Array.from(container.querySelectorAll(selector))).toEqual([])
        expect(trigger().getAttribute("aria-expanded")).toBe("true")
      })
    }
  }

  /**
   * The pair, and the reason `loom.lightbox` is the one primitive in the library
   * that declares both members. A region drawn over the whole viewport puts its
   * own scrim inside the element the trigger was placed in, so a press on the
   * dark ground around the picture is an *inside* press and 0176's outside-press
   * dismissal cannot reach it. The cross is the way out, and this is the
   * assertion that it is wired — the event bubbles from the button to the root,
   * which is true only because the primitive laid the frame out inside the root.
   */
  it("closes the lightbox from the cross inside it, which is the pair agreeing through the DOM", async () => {
    await mount(pageOf(EDITORIAL, lightboxBand))

    await act(async () => {
      trigger().click()
    })

    expect(presented(LIBRARY_CLASS.lightbox).getAttribute(PRESENTED_ATTRIBUTE)).toBe("true")

    const cross = container.querySelector<HTMLButtonElement>("button.loom-control-dismiss")

    expect(cross).not.toBeNull()
    /** Inside the root, which is the whole of what makes the event arrive. */
    expect(presented(LIBRARY_CLASS.lightbox).contains(cross)).toBe(true)
    /** Named, and never as text — the glyph is a cross and the name is a label. */
    expect(cross?.getAttribute("aria-label")).toBe("Close")
    expect(cross?.textContent).toBe("×")

    await act(async () => {
      cross?.click()
    })

    expect(presented(LIBRARY_CLASS.lightbox).getAttribute(PRESENTED_ATTRIBUTE)).toBe("false")
  })

  it("closes it on Escape as well, so the one region that covers the page has two ways out", async () => {
    await mount(pageOf(BOLD, lightboxBand))

    await act(async () => {
      trigger().click()
    })

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    })

    expect(presented(LIBRARY_CLASS.lightbox).getAttribute(PRESENTED_ATTRIBUTE)).toBe("false")
  })

  /**
   * The dismiss event is scoped by bubbling and by nothing else, so two
   * lightboxes on one page are two independent presentations. A module-level
   * store keyed by node id — 0176's rejected alternative — would have closed
   * both, and this is the test that would have caught it.
   */
  it("keeps two presentations on one page independent, which is what bubbling buys", async () => {
    await mount(
      pageOf(EDITORIAL, (ids) =>
        buildElement(ids, {
          type: "loom.section",
          props: {},
          children: [lightboxBand(ids), lightboxBand(ids)],
        })
      )
    )

    const roots = Array.from(container.querySelectorAll(`.${LIBRARY_CLASS.lightbox}`))
    const triggers = Array.from(container.querySelectorAll<HTMLButtonElement>("button.loom-control-present"))

    expect(roots).toHaveLength(2)
    expect(triggers).toHaveLength(2)

    await act(async () => {
      triggers[0]?.click()
    })

    expect(roots.map((element) => element.getAttribute(PRESENTED_ATTRIBUTE))).toEqual(["true", "false"])

    const crosses = Array.from(container.querySelectorAll<HTMLButtonElement>("button.loom-control-dismiss"))

    await act(async () => {
      crosses[1]?.dispatchEvent(new CustomEvent(DISMISS_EVENT, { bubbles: true }))
    })

    /** The second lightbox's cross closed the second lightbox, which was shut. */
    expect(roots.map((element) => element.getAttribute(PRESENTED_ATTRIBUTE))).toEqual(["true", "false"])
  })

  /**
   * The scroll lock, which is the one thing a modal owes a reader that a
   * stylesheet can hold (0210). Asserted as a selector match on the document
   * element rather than as a computed style, because jsdom resolves no cascade
   * — what is being checked is that the rule's selector reaches the document
   * element exactly while a frame is open, which is the whole of the mechanism.
   */
  it("locks the page's scroll while the frame is open and releases it when it shuts", async () => {
    await mount(pageOf(EDITORIAL, lightboxBand))

    const lock = `html:has(.${LIBRARY_CLASS.lightbox}[${PRESENTED_ATTRIBUTE}="true"])`

    expect(sheet()).toContain(lock)
    expect(document.documentElement.matches(lock)).toBe(false)

    await act(async () => {
      trigger().click()
    })

    expect(document.documentElement.matches(lock)).toBe(true)

    await act(async () => {
      trigger().click()
    })

    expect(document.documentElement.matches(lock)).toBe(false)
  })
})

describe("the wipe that drags", () => {
  const wipeBand = (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.before-after",
      props: { position: 42, beforeLabel: "Revision 3", afterLabel: "Revision 4" },
      children: [
        buildSlot(ids, "before", [shot(ids, "https://example.com/before.png", "At revision three")]),
        buildSlot(ids, "after", [shot(ids, "https://example.com/after.png", "At revision four")]),
      ],
    })

  /**
   * How a reader moves it. Setting `.value` alone would be a lie — React 19
   * tracks the value it rendered, so the change is only seen if the native
   * setter is what writes it. `behaviour-adjust.test.ts` learned this first.
   */
  const dragTo = async (value: number): Promise<void> => {
    const input = slider()
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set

    await act(async () => {
      setter?.call(input, String(value))
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
  }

  const slider = (): HTMLInputElement => {
    const input = container.querySelector<HTMLInputElement>("input.loom-control-adjust")

    expect(input).not.toBeNull()

    return input as HTMLInputElement
  }

  for (const [name, palette] of PALETTES) {
    it(`publishes the slider's number on the element the clip inherits it from — ${name}`, async () => {
      await mount(pageOf(palette, wipeBand))

      /**
       * `adjust` writes a custom property, and a property resolves downwards
       * only — so the control's parent has to be an ancestor of the two
       * elements that read it. That is the root, and this is the assertion that
       * the primitive placed it there rather than in a corner of its own.
       *
       * After a drag rather than on mount, because that is when there is a
       * number to publish (0226). This test asserted `"50"` on a band declaring
       * `position: 42` and was right about where the property goes and wrong
       * about what was in it — the defect the record is named for, asserted as
       * correct for a month.
       */
      const wipe = presented(LIBRARY_CLASS.beforeAfter) as HTMLElement

      expect(wipe.style.getPropertyValue(ADJUST_PROPERTY)).toBe("")

      await dragTo(63)

      expect(wipe.style.getPropertyValue(ADJUST_PROPERTY)).toBe("63")
      expect(slider().getAttribute("aria-label")).toBe("Wipe position")
    })

    /**
     * The whole of the defect, end to end and through the real primitive: a band
     * authored at 42 renders at 42, and the handle a reader is given is at 42
     * too. Nothing here mocks the seam — the position travels from the node's
     * props to the root's `ADJUST_RESTING_PROPERTY` to the slider's own value,
     * which is the only route `build` leaves open.
     */
    it(`starts the slider where the band said, not at the midpoint — ${name}`, async () => {
      await mount(pageOf(palette, wipeBand))

      const wipe = presented(LIBRARY_CLASS.beforeAfter) as HTMLElement

      expect(wipe.style.getPropertyValue(ADJUST_RESTING_PROPERTY)).toBe("42")
      expect(slider().value).toBe("42")
    })
  }

  it("moves the wipe and the divider together, because both read the one property", async () => {
    await mount(pageOf(EDITORIAL, wipeBand))

    const wipe = presented(LIBRARY_CLASS.beforeAfter) as HTMLElement
    /**
     * The comma is not a typo and the first draft of this test did not have it.
     * `--loom-adjust-display` — the property a primitive may hide the slider
     * with — is a **prefix match** on the property the slider publishes, so a
     * search for `var(--loom-adjust` finds the control's own inline `display`
     * as well as the two things that read its value, and comes back with three.
     */
    const reading = Array.from(wipe.querySelectorAll<HTMLElement>("[style]")).filter(
      (element) =>
        element.getAttribute("style")?.includes(`var(${ADJUST_PROPERTY},`) === true
    )

    /** The clip on the before layer, and the divider's own offset. */
    expect(reading).toHaveLength(2)

    await dragTo(77)

    expect(wipe.style.getPropertyValue(ADJUST_PROPERTY)).toBe("77")
    /**
     * And the fallback is still the declared position, which is what a page
     * served without scripting renders. The property moving does not rewrite
     * the markup; that is the whole of why this was additive.
     */
    expect(reading[0]?.getAttribute("style")).toContain(`var(${ADJUST_PROPERTY}, 42)`)
  })
})
