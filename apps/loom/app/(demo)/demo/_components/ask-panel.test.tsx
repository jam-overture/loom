import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { DEMO_PRESETS, type DemoPresetId } from "@/app/(demo)/_lib/presets"

import { AskPanel } from "./ask-panel"

/**
 * The panel's job is to give a stranger a first move, so what is tested here is
 * the ranking rather than the markup.
 *
 * The version this replaced offered five identical pills and a text box, all at
 * the same weight — which is the same as offering nothing, because a visitor
 * with sixty seconds cannot spend ten of them deciding which grey pill to try.
 * Every assertion below is one of the properties that ranking depends on, and
 * each of them is easy to lose in a refactor that still renders five buttons.
 */

/**
 * The actions are `"use server"` and reach a store; the panel is what is under
 * test. Stubbing them keeps this a render test rather than a pipeline one —
 * `pipeline.test.ts` covers the pipeline, against the real thing.
 */
vi.mock("../actions", () => ({
  askForChange: vi.fn(),
  answerHeld: vi.fn(),
  undoRevision: vi.fn(),
}))

const ALL = DEMO_PRESETS.map((preset) => preset.id)

describe("the ask panel", () => {
  it("leads with the re-theme, because it is the one change visible everywhere at once", () => {
    render(<AskPanel revision={0} available={ALL} modelConfigured={false} />)

    const buttons = screen.getAllByRole("button")

    expect(buttons[0]?.textContent).toBe("Re-theme the whole page")
  })

  it("tells a visitor what pressing each one will do to the page", () => {
    render(<AskPanel revision={0} available={ALL} modelConfigured={false} />)

    for (const preset of DEMO_PRESETS) {
      expect(screen.getByText(preset.promise)).toBeTruthy()
    }
  })

  /**
   * A chip whose only outcome is "nothing changed" is worse than no chip, and
   * `availablePresets` is what decides. The panel must honour it rather than
   * rendering the whole table and hoping.
   */
  it("offers only the asks this tree can honour", () => {
    render(<AskPanel revision={0} available={["palette", "trim"]} modelConfigured={false} />)

    /*
     * Read off the table rather than written out here. What this test is about
     * is that the panel honours `available`, and spelling the labels a second
     * time made a retune of the *copy* fail a test about the *filter* — which
     * it did, the run the specimen page stopped being Loom's own.
     */
    const labelOf = (id: DemoPresetId): string => DEMO_PRESETS.find((preset) => preset.id === id)!.label

    expect(screen.getByText(labelOf("palette"))).toBeTruthy()
    expect(screen.getByText(labelOf("trim"))).toBeTruthy()
    expect(screen.queryByText(labelOf("promote"))).toBeNull()
  })

  /**
   * The demo must work with no API key configured — that is a supported state,
   * not a degraded one. What it must not do is show a dead "send" button: the
   * old panel's most prominent control was a disabled textarea over a disabled
   * submit, on a deployment where every other control on the panel worked.
   */
  it("says why free text is off with no model, and keeps every preset working", () => {
    render(<AskPanel revision={0} available={ALL} modelConfigured={false} />)

    expect(screen.queryByRole("button", { name: /send it to the model/i })).toBeNull()
    expect(screen.getByPlaceholderText(/No model is configured/)).toBeTruthy()

    for (const button of screen.getAllByRole("button")) {
      expect(button.hasAttribute("disabled")).toBe(false)
    }
  })

  it("offers the model when there is one", () => {
    render(<AskPanel revision={0} available={ALL} modelConfigured={true} />)

    expect(screen.getByRole("button", { name: "Send it to the model" })).toBeTruthy()
    expect(screen.getByLabelText(/what would you like changed/i)).toBeTruthy()
  })

  /**
   * Folded away, and the fold is what keeps the first record card on a laptop
   * screen. It is also the reason the box's accessible name is a `sr-only`
   * label rather than the summary: a visitor who never opens the disclosure
   * should not be able to tab into a textarea, and a screen-reader user who
   * does open it needs the field named, not the section.
   */
  it("keeps free text behind a disclosure, closed until it is asked for", () => {
    const { container } = render(<AskPanel revision={0} available={ALL} modelConfigured={true} />)

    const disclosure = container.querySelector("details")
    if (!disclosure) throw new Error("free text is not behind a disclosure")

    expect(disclosure.open).toBe(false)
    expect(disclosure.contains(screen.getByRole("textbox"))).toBe(true)
    expect(disclosure.contains(screen.getByRole("button", { name: "Re-theme the whole page" }))).toBe(
      false
    )
  })

  /**
   * The revision travels with every ask, on every form. It is not client
   * authority — it is the client saying what it saw, so the server can refuse a
   * change aimed at a page that has moved — and a form that forgot it would
   * send an ask with no such protection and look identical.
   */
  it("carries the revision the visitor was looking at on every form", () => {
    const { container } = render(<AskPanel revision={7} available={ALL} modelConfigured={true} />)

    const forms = [...container.querySelectorAll("form")]

    expect(forms.length).toBe(DEMO_PRESETS.length + 1)
    for (const form of forms) {
      expect(form.querySelector('input[name="baseRevision"]')?.getAttribute("value")).toBe("7")
    }
  })
})
