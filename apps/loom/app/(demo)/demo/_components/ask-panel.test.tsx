import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { DEMO_LEADING_PRESET, DEMO_PRESETS, type DemoPresetId } from "@/app/(demo)/_lib/presets"
import {
  ASKS_HEADING,
  ASKS_HEADING_WHILE_WAITING,
  type SetAside,
} from "@/app/(demo)/_lib/set-aside"

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

const labelOf = (id: DemoPresetId): string => DEMO_PRESETS.find((preset) => preset.id === id)!.label

describe("the ask panel", () => {
  it("gives the primary slot to the preset the table nominates", () => {
    render(<AskPanel revision={0} available={ALL} modelConfigured={false} />)

    const buttons = screen.getAllByRole("button")

    expect(buttons[0]?.textContent).toBe(labelOf(DEMO_LEADING_PRESET))
  })

  /**
   * The lead is a change the Gate holds, so the first press moves nothing on
   * the page — and a stranger who was not told that has pressed the one control
   * this surface invited them to press and watched it do nothing.
   *
   * What is asserted is the claim rather than the sentence: that before any
   * button exists to press, the panel has already said some asks wait for an
   * answer. `pipeline.test.ts` holds the other half — that the lead really is
   * one of them — and the two together are the whole of this run.
   */
  it("says some asks will wait for you, before offering anything to press", () => {
    const { container } = render(<AskPanel revision={0} available={ALL} modelConfigured={false} />)

    const frame = screen.getByText(/won’t make without asking you/i)
    const primary = screen.getAllByRole("button")[0]

    expect(frame).toBeTruthy()
    expect(primary).toBeDefined()
    expect(
      frame.compareDocumentPosition(primary!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(container.textContent).toContain("it writes down what it did")
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
     * The labels are read off the table rather than written out here — see
     * `labelOf` above. What this test is about is that the panel honours
     * `available`, and spelling the labels a second time made a retune of the
     * *copy* fail a test about the *filter*, which it did the run the specimen
     * page stopped being Loom's own.
     */
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
    expect(
      disclosure.contains(screen.getByRole("button", { name: labelOf(DEMO_LEADING_PRESET) }))
    ).toBe(false)
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

/**
 * The second state, which is the one a stranger reaches on their second press.
 *
 * Measured at 1280×900 against a real `next build`: press the green button,
 * then press the first entry under *or ask for one of these*, and the question
 * the demo has just asked comes back `Nothing changed`. `set-aside.ts` holds the
 * measurement and the argument; these are the properties the markup has to keep.
 */
describe("the ask panel, while a question is waiting", () => {
  const WAITING: SetAside = {
    questions: 1,
    recordId: "i_held",
    sentence: "One question is still waiting on you. Anything else you ask for moves the page on.",
    answerLabel: "Answer it first",
  }

  const open = () =>
    render(<AskPanel revision={3} available={ALL} modelConfigured={true} waiting={WAITING} />)

  /**
   * There is exactly one `bg-affirm` control on this rail at a time and it is
   * always the demo's next step: *Take the numbers off* with nothing open, and
   * **Apply this change** once something is (`record-card.tsx`, which holds the
   * other half of this). Two greens at once is the panel competing with the
   * question it just produced.
   */
  it("gives up its green button while the question below has one", () => {
    const { container } = open()

    expect(container.querySelector(".bg-affirm")).toBeNull()
  })

  it("keeps its green button when nothing is waiting", () => {
    const { container } = render(<AskPanel revision={3} available={ALL} modelConfigured={true} />)

    expect(container.querySelector(".bg-affirm")).toBeTruthy()
  })

  /**
   * The lead steps into the list rather than out of the panel. Withdrawing an
   * ask would narrow the demo at exactly the moment a visitor is exploring,
   * which is the shape of this fix the lane argued against — the other asks
   * really do work, and a stranger who wants to see the page move twice is
   * allowed to.
   */
  it("still offers every ask, the demoted lead included", () => {
    open()

    for (const preset of DEMO_PRESETS) {
      expect(screen.getByRole("button", { name: new RegExp(preset.label, "i") })).toBeTruthy()
      expect(screen.getByRole("button", { name: new RegExp(preset.label, "i") }).hasAttribute("disabled")).toBe(false)
    }
  })

  /**
   * Above every control it is true of, and that includes the free-text box: a
   * sentence posted to the model moves the page exactly as a preset does. The
   * assertion is document order rather than a class, because what makes a
   * caution a caution is that it is read first.
   */
  it("says what the press would cost before anything is there to press", () => {
    const { container } = open()

    const caution = screen.getByText(WAITING.sentence)
    const controls = [...container.querySelectorAll("button"), ...container.querySelectorAll("textarea")]

    expect(controls.length).toBeGreaterThan(0)
    for (const control of controls) {
      expect(caution.compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  /**
   * The property the first version of this lost, and the reason it is a class
   * rather than a look: pressing the lead sends `AnswerInView` to bring the
   * 503px card into the rail, and `block: "nearest"` leaves the scroller at a
   * scrollTop of about 400 — which carries a statically placed caution off the
   * top and leaves four live buttons on screen with nothing between them and the
   * question they would kill.
   */
  it("stays on screen while the controls it is about are", () => {
    open()

    const pinned = screen.getByText(WAITING.sentence).closest("div")?.parentElement

    expect(pinned?.className).toContain("sticky")
    expect(pinned?.className).toContain("top-0")
  })

  it("says nothing of the kind when nothing is waiting", () => {
    render(<AskPanel revision={3} available={ALL} modelConfigured={true} />)

    expect(screen.queryByText(WAITING.sentence)).toBeNull()
    expect(screen.queryByRole("link", { name: /answer it first/i })).toBeNull()
  })

  /**
   * The way out goes to the card carrying **Apply this change**, because that is
   * where the question is in sight. `record-card.tsx` puts the record id on the
   * card's own element, which is what this fragment lands on.
   */
  it("offers the way down to the question, by the card's own id", () => {
    open()

    const link = screen.getByRole("link", { name: /answer it first/i })

    expect(link.getAttribute("href")).toBe(`#${WAITING.recordId}`)
  })

  /**
   * *“or ask for one of these”* is the second half of a sentence whose first
   * half is the green button. With the button gone, the *or* points at nothing.
   */
  it("stops calling the list an alternative to a button that is no longer there", () => {
    open()

    expect(screen.getByText(ASKS_HEADING_WHILE_WAITING)).toBeTruthy()
    expect(screen.queryByText(ASKS_HEADING)).toBeNull()
  })

  it("carries the revision on every form, the demoted lead's included", () => {
    const { container } = open()

    const forms = [...container.querySelectorAll("form")]

    expect(forms.length).toBe(DEMO_PRESETS.length + 1)
    for (const form of forms) {
      expect(form.querySelector('input[name="baseRevision"]')?.getAttribute("value")).toBe("3")
    }
  })
})
