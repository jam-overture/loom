// @vitest-environment jsdom

import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { z } from "zod"

import { sequentialIdFactory } from "../ids.js"
import { definePrimitive, type PrimitiveEntry } from "../sdk/definition.js"
import { registryOf } from "../testing/definitions.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { CONTROL_CLASS } from "./control.js"
import { NO_CONTROL_NAMES, resolveControlNames } from "./control-name.js"
import { renderLoomTree } from "./render.js"

/**
 * The one control whose word is the page's own, and the two halves of getting it
 * there: a prop read off a node, and a trigger that ends up announced by it.
 *
 * The second half has to be a browser test. Every control in the vocabulary
 * renders nothing until an effect proves scripting runs, so a dialog's trigger
 * does not exist in server markup at all — and the whole point of this seam is
 * what a reader is announced, which only exists once the control has mounted.
 */

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

/**
 * The primitive the seam exists for. Its trigger carries the page's call to
 * action and its cross is still *Close*, which is the asymmetry the declaration
 * is shaped to express: one control named from the tree, one from the library.
 */
const dialogDefinition: PrimitiveEntry = definePrimitive({
  type: "loom.dialog",
  description: "A panel opened by the page's own call to action",
  props: z.object({ label: z.string().optional() }),
  text: { present: "Open", dismiss: "Close" },
  interactive: "always",
  behaviours: ["present", "dismiss"],
  names: { present: "label" },
  component: ({ loom, children }) =>
    createElement(
      "div",
      { ...loom.editable },
      loom.behaviours.present,
      createElement("div", { className: "panel" }, loom.behaviours.dismiss, children)
    ),
})

const pageWith = (labels: readonly (string | undefined)[]): LoomTree => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      children: labels.map((label) =>
        buildElement(ids, {
          type: "loom.dialog",
          props: label === undefined ? {} : { label },
          children: [buildText(ids, "The panel")],
        })
      ),
    }),
    ids
  )
}

const pageDefinition: PrimitiveEntry = definePrimitive({
  type: "loom.page",
  description: "A page",
  props: z.object({}),
  component: ({ loom, children }) => createElement("main", { ...loom.editable }, children),
})

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  globalThis.IS_REACT_ACT_ENVIRONMENT = undefined
})

const mount = async (tree: LoomTree): Promise<void> => {
  const registry = registryOf([pageDefinition, dialogDefinition])

  await act(async () => {
    root.render(renderLoomTree(tree, { resolver: registry, validator: registry }).element)
  })
}

const triggerNames = (): readonly string[] =>
  Array.from(
    container.querySelectorAll(`.${CONTROL_CLASS}-present`),
    (trigger) => trigger.textContent ?? ""
  )

describe("resolveControlNames", () => {
  it("answers with nothing at all for a primitive that named no prop", () => {
    expect(resolveControlNames({ label: "Watch the demo" }, {})).toBe(NO_CONTROL_NAMES)
  })

  it("reads the named prop off the node", () => {
    expect(resolveControlNames({ label: "Watch the demo" }, { present: "label" })).toEqual({
      present: "Watch the demo",
    })
  })

  it("trims what it reads, because a name is announced and not laid out", () => {
    expect(resolveControlNames({ label: "  Book a call \n" }, { present: "label" })).toEqual({
      present: "Book a call",
    })
  })

  /**
   * Four shapes, one answer. Each of them means *this node said nothing*, and
   * what that falls back to is the string the primitive declared — a real name in
   * the deployment's language rather than a hole, which is why none of these is a
   * diagnostic.
   */
  it("drops a value that is not a usable name", () => {
    const declared = { present: "label" }

    expect(resolveControlNames({}, declared)).toBe(NO_CONTROL_NAMES)
    expect(resolveControlNames({ label: null }, declared)).toBe(NO_CONTROL_NAMES)
    expect(resolveControlNames({ label: 4 }, declared)).toBe(NO_CONTROL_NAMES)
    expect(resolveControlNames({ label: "   " }, declared)).toBe(NO_CONTROL_NAMES)
  })

  it("keeps the names it could read and drops the ones it could not", () => {
    const resolved = resolveControlNames(
      { label: "Watch the demo", close: "" },
      { present: "label", dismiss: "close" }
    )

    expect(resolved).toEqual({ present: "Watch the demo" })
  })

  /**
   * A prop called `constructor` has to read as absent rather than as a function
   * off `Object.prototype`, which is the reason every map in this seam is
   * null-prototype and the reason this one is read with an own-property check.
   */
  it("reads an inherited key as absent", () => {
    expect(resolveControlNames({}, { present: "constructor" })).toBe(NO_CONTROL_NAMES)
    expect(Object.getPrototypeOf(resolveControlNames({ x: "y" }, { present: "x" }))).toBeNull()
  })
})

describe("two of one primitive on one page", () => {
  /**
   * The finding this closes, in one assertion: a header with a *Product* menu and
   * an *Account* menu used to be two buttons a screen reader announced
   * identically, because a control's name was a fact about its type.
   */
  it("announces each trigger by the words its own node carries", async () => {
    await mount(pageWith(["Watch the demo", "Book a call"]))

    expect(triggerNames()).toEqual(["Watch the demo", "Book a call"])
  })

  it("falls back to the declared string for a node that named nothing", async () => {
    await mount(pageWith(["Watch the demo", undefined]))

    expect(triggerNames()).toEqual(["Watch the demo", "Open"])
  })

  /**
   * The cross is not named from the tree, because this primitive did not say it
   * was. Stated separately so that naming one control cannot quietly start
   * naming the rest.
   */
  it("leaves every control the primitive did not name to its declared string", async () => {
    await mount(pageWith(["Watch the demo"]))

    const labels = Array.from(
      container.querySelectorAll("button"),
      (button) => button.getAttribute("aria-label") ?? button.textContent ?? ""
    )

    expect(labels).toContain("Close")
  })
})
