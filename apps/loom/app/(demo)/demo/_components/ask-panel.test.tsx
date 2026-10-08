import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  DEMO_LEADING_PRESET,
  DEMO_PRESETS,
  leadingAsk,
  type DemoPresetId,
} from "@/app/(demo)/_lib/presets"
import {
  ASKS_HEADING,
  ASKS_HEADING_WHILE_WAITING,
  type SetAside,
} from "@/app/(demo)/_lib/set-aside"
import { PUTS_IT_BACK, STANDING_ROW } from "@/app/(demo)/_lib/what-each-row-says"

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

/**
 * What `rail.ts` hands this panel when nothing is waiting, built the way the
 * rail builds it.
 *
 * **The nomination is no longer the panel's**, and that is the point of the
 * helper rather than a spelling of `{ leading: { preset: "trim" } }`: the rail
 * calls `leadingAsk` and so does this, so a change to which ask is primary
 * moves both without either being edited. What the tests below assert is the
 * half that is still the panel's — that it gives the green button to the ask it
 * is handed, and lays everything else out around it.
 *
 * No `part`, because a preview is an element the server rendered through the
 * registry and this is a render test of the panel. `part-in-question.test.tsx`
 * holds the excerpt; the one assertion here is that whatever it is handed is
 * put on the page.
 */
const led = (available: readonly DemoPresetId[]) => {
  const preset = leadingAsk(available)

  return preset === undefined ? {} : { leading: { preset: preset.id } }
}

describe("the ask panel", () => {
  it("gives the primary slot to the preset the table nominates", () => {
    render(<AskPanel revision={0} available={ALL} modelConfigured={false} {...led(ALL)} />)

    const buttons = screen.getAllByRole("button")

    /*
     * The accessible name rather than `textContent`. The primary carries a
     * decorative arrow beside its label — `aria-hidden`, so it is outside the
     * name and inside the text — and the claim being made here is about which
     * preset is *offered* in the primary slot, which is the name a screen
     * reader announces and the words a visitor reads.
     */
    expect(buttons[0]).toBe(screen.getByRole("button", { name: labelOf(DEMO_LEADING_PRESET) }))
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
    const { container } = render(<AskPanel revision={0} available={ALL} modelConfigured={false} {...led(ALL)} />)

    const frame = screen.getByText(/won’t make without asking you/i)
    const primary = screen.getAllByRole("button")[0]

    expect(frame).toBeTruthy()
    expect(primary).toBeDefined()
    expect(
      frame.compareDocumentPosition(primary!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(container.textContent).toContain("it writes down what it did")
  })

  /**
   * **The other half of the sentence above, and it is about the screen rather
   * than the document.**
   *
   * The assertion before this one says the frame sentence precedes the press in
   * the markup, and that is still exactly true — a screen reader, a crawler and
   * that test all meet it first. What it never said, and could not, is where a
   * sighted visitor's eye lands, and on the arrival screen that was the whole
   * problem: measured at 348 × 465, the first control sat 398px down, so a
   * visitor inside the front door's embed on a phone met a bar, a heading and
   * three paragraphs and 67px of a green button.
   *
   * So the opening block lays the same two children out in the other order
   * below `lg`. `flex-col-reverse` moves boxes and not the document, which is
   * what lets both properties be true at once — and it is asserted here because
   * a `flex-col` typed by habit would silently put the wall of prose back.
   */
  it("puts the press above the sentence on a narrow screen, and below it on a wide one", () => {
    render(<AskPanel revision={0} available={ALL} modelConfigured={false} {...led(ALL)} />)

    const opening = screen.getByText(/won’t make without asking you/i).parentElement

    expect(opening?.className).toContain("flex-col-reverse")
    expect(opening?.className).toContain("lg:flex-col")
  })

  /**
   * What the reversal must never separate. The promise is a fact about *this*
   * button — "the appointments, the years and the waiting time come off the
   * page" — so it travels inside the form rather than beside it, and stays
   * under the button it is about at both widths.
   */
  it("keeps each button's promise welded to the button", () => {
    render(<AskPanel revision={0} available={ALL} modelConfigured={false} {...led(ALL)} />)

    const lead = DEMO_PRESETS.find((preset) => preset.id === DEMO_LEADING_PRESET)!
    const promise = screen.getByText(lead.promise)
    const primary = screen.getAllByRole("button")[0]

    expect(promise.closest("form")).toBe(primary!.closest("form"))
  })

  it("tells a visitor what pressing each one will do to the page", () => {
    render(<AskPanel revision={0} available={ALL} modelConfigured={false} {...led(ALL)} />)

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
    render(<AskPanel revision={0} available={["palette", "trim"]} modelConfigured={false} {...led(["palette", "trim"])} />)

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
    render(<AskPanel revision={0} available={ALL} modelConfigured={false} {...led(ALL)} />)

    expect(screen.queryByRole("button", { name: /send it to the model/i })).toBeNull()
    expect(screen.getByPlaceholderText(/No model is configured/)).toBeTruthy()

    for (const button of screen.getAllByRole("button")) {
      expect(button.hasAttribute("disabled")).toBe(false)
    }
  })

  it("offers the model when there is one", () => {
    render(<AskPanel revision={0} available={ALL} modelConfigured={true} {...led(ALL)} />)

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
    const { container } = render(<AskPanel revision={0} available={ALL} modelConfigured={true} {...led(ALL)} />)

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
  /**
   * **What the press is about, on the screen the press is on.**
   *
   * *Take the numbers off* names a part of the page a stranger arriving has
   * never seen — below the fold at 1280×900, about four thousand pixels down at
   * 390×844. The rail renders the excerpt through the registry and hands it
   * over; what is the panel's is putting it on the page and putting it in the
   * right place.
   */
  it("shows what the press is about, when it is handed one", () => {
    render(
      <AskPanel
        revision={0}
        available={ALL}
        modelConfigured={false}
        leading={{ preset: DEMO_LEADING_PRESET, part: <p>the band itself</p> }}
      />
    )

    expect(screen.getByText("the band itself")).toBeTruthy()
  })

  /**
   * **After the opening block, not inside it**, and this is the assertion the
   * placement needs rather than the rendering.
   *
   * Inside, the excerpt would ride the `flex-col-reverse` above and push
   * `WHAT_EVERY_ASK_MEETS` down by the height of a band — off the narrow first
   * screen, which is the one property that block exists to hold. A stranger who
   * has not read that sentence and presses a change the Gate holds has watched
   * a button do nothing.
   */
  it("keeps the frame sentence ahead of the excerpt, at every width", () => {
    render(
      <AskPanel
        revision={0}
        available={ALL}
        modelConfigured={false}
        leading={{ preset: DEMO_LEADING_PRESET, part: <p>the band itself</p> }}
      />
    )

    const frame = screen.getByText(/won’t make without asking you/i)
    const excerpt = screen.getByText("the band itself")

    expect(frame.parentElement?.contains(excerpt)).toBe(false)
    expect(
      frame.compareDocumentPosition(excerpt) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  /**
   * ## What the Gate says about the button, before anybody presses it
   *
   * The arrival screen's whole argument used to be the half of this product
   * everybody else has — *an AI can rewrite this page* — with the Gate present
   * only as a hedge covering every ask ever made. `what-it-will-say.ts`
   * computes the other half for the one ask this panel invites, and these are
   * the properties the panel owes it.
   */
  const WILL_HOLD = {
    lead: "Pressing this raises a question, not a change.",
    detail: "Some risk — so Loom asks you before the page moves, and writes down what you decide.",
    moves: false,
    standing: "asks-you",
  } as const

  /**
   * One verdict, keyed to the ask it is about.
   *
   * The prop became a set on 2 October and these five rows did not change
   * meaning: a set holding only the lead's answer is a panel with a verdict
   * under its button and no split to count, which is exactly the state they
   * were written against.
   */
  const ONLY_THE_LEAD = { [DEMO_LEADING_PRESET]: WILL_HOLD } as const

  it("says what the Gate will do about the ask it is offering", () => {
    render(
      <AskPanel
        revision={0}
        available={ALL}
        modelConfigured={false}
        {...led(ALL)}
        willSay={ONLY_THE_LEAD}
      />
    )

    expect(screen.getByText(WILL_HOLD.lead)).toBeTruthy()
    expect(screen.getByText(/asks you before the page moves/)).toBeTruthy()
  })

  /**
   * **Welded to the button, not to the panel**, which is what survives the
   * narrow layout's reversal: the press, what it does to the page and what
   * Loom does about it are three facts about one control, and a verdict
   * reordered away from the button it is about is a verdict about nothing.
   */
  it("keeps the verdict inside the form it is about", () => {
    const { container } = render(
      <AskPanel
        revision={0}
        available={ALL}
        modelConfigured={false}
        {...led(ALL)}
        willSay={ONLY_THE_LEAD}
      />
    )

    const form = container.querySelector(`form:has(input[value="${DEMO_LEADING_PRESET}"])`)

    expect(form).toBeTruthy()
    expect(form?.contains(screen.getByText(WILL_HOLD.lead))).toBe(true)
  })

  /**
   * And it follows the promise rather than leading it. The promise is about
   * the page — *the appointments, the years and the waiting time come off* —
   * and the verdict is about what Loom does with that. Read the other way
   * round, a stranger is told a decision about a change they have not been
   * told the shape of.
   */
  it("puts the verdict under the promise, not over it", () => {
    render(
      <AskPanel
        revision={0}
        available={ALL}
        modelConfigured={false}
        {...led(ALL)}
        willSay={ONLY_THE_LEAD}
      />
    )

    const promise = screen.getByText(leadingAsk(ALL)!.promise)
    const verdict = screen.getByText(WILL_HOLD.lead)

    expect(
      promise.compareDocumentPosition(verdict) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  /**
   * The hedge gives way to the fact, and only to the fact.
   *
   * *"Some changes it makes on its own, some it won't make without asking you
   * first"* is a stand-in for something the surface could not state. With the
   * statement directly below it, the stand-in is three lines of *maybe* over a
   * line of *this one will* — so the claim stays and the hedge goes.
   */
  it("drops the hedge when it has the fact, and keeps the claim", () => {
    render(
      <AskPanel
        revision={0}
        available={ALL}
        modelConfigured={false}
        {...led(ALL)}
        willSay={ONLY_THE_LEAD}
      />
    )

    expect(screen.queryByText(/won’t make without asking you/i)).toBeNull()
    expect(screen.getByText(/weighs every ask before it lands/i)).toBeTruthy()
    expect(screen.getByText(/writes down what it did/i)).toBeTruthy()
  })

  /**
   * And restores it when there is nothing to foretell. Nothing is removed from
   * this surface: a deployment whose leading ask never reaches a verdict shows
   * the sentence exactly as it has always shown it.
   */
  it("keeps the whole sentence when the Gate has said nothing", () => {
    render(<AskPanel revision={0} available={ALL} modelConfigured={false} {...led(ALL)} />)

    expect(screen.getByText(/won’t make without asking you/i)).toBeTruthy()
  })

  /**
   * A re-theme is one configure against the page root, and an excerpt of the
   * root is the whole page rendered a second time inside the rail beside it. It
   * comes over absent, and absent has to render as nothing rather than as an
   * empty frame under a lead sentence about it.
   */
  it("shows no excerpt for an ask that has none", () => {
    const { container } = render(
      <AskPanel
        revision={0}
        available={ALL}
        modelConfigured={false}
        leading={{ preset: DEMO_LEADING_PRESET }}
      />
    )

    expect(container.querySelector(".demo-part")).toBeNull()
    expect(screen.getByRole("button", { name: labelOf(DEMO_LEADING_PRESET) })).toBeTruthy()
  })

  it("carries the revision the visitor was looking at on every form", () => {
    const { container } = render(<AskPanel revision={7} available={ALL} modelConfigured={true} {...led(ALL)} />)

    const forms = [...container.querySelectorAll("form")]

    expect(forms.length).toBe(DEMO_PRESETS.length + 1)
    for (const form of forms) {
      expect(form.querySelector('input[name="baseRevision"]')?.getAttribute("value")).toBe("7")
    }
  })
})

/**
 * What a stranger reads before they have pressed anything, and the one claim on
 * this surface the next press checks.
 *
 * The verdicts are real elsewhere (`what-it-will-say.test.ts`), the count is
 * right elsewhere (`how-many-wait-for-you.test.ts`) and the count matches the
 * write path elsewhere (`pipeline.test.ts`). What is held here is that the
 * panel shows them — the sentence in place of the claim, a word at the end of
 * every row that has one, and the old behaviour intact wherever a verdict is
 * missing.
 */
describe("the ask panel, telling a stranger what Loom will do about each ask", () => {
  const says = (standings: Partial<Record<DemoPresetId, "on-its-own" | "asks-you">>) =>
    Object.fromEntries(
      Object.entries(standings).map(([id, standing]) => [
        id,
        {
          lead: "…",
          detail: "…",
          moves: standing === "on-its-own",
          standing,
          /** The direction is a separate fact and has its own suite below. */
          putsBack: false,
        },
      ])
    )

  /** Two of the five go ahead, three wait — the shipped table, as it stands. */
  const AS_SHIPPED = says({
    palette: "on-its-own",
    backdrop: "on-its-own",
    band: "asks-you",
    trim: "asks-you",
    promote: "asks-you",
  })

  /**
   * The sentence that replaced *"Loom weighs every ask before it lands"* — a
   * claim true of every ask ever made, and therefore a claim about none of
   * them.
   */
  it("leads with the split rather than with a claim about asks in general", () => {
    render(
      <AskPanel
        revision={0}
        available={ALL}
        modelConfigured={false}
        {...led(ALL)}
        willSay={AS_SHIPPED}
      />
    )

    expect(
      screen.getByText(
        "You can ask for 5 changes here. Loom will make 2 on its own and ask you first about 3."
      )
    ).toBeTruthy()
    expect(screen.queryByText(/weighs every ask before it lands/i)).toBeNull()
  })

  /**
   * And the rows are what make it checkable. A count a stranger cannot verify
   * is another promise; four rows that visibly do not read the same is the
   * product.
   */
  it("says at the end of every other ask what Loom will do about that one", () => {
    render(
      <AskPanel
        revision={0}
        available={ALL}
        modelConfigured={false}
        {...led(ALL)}
        willSay={AS_SHIPPED}
      />
    )

    expect(screen.getAllByText("Goes ahead")).toHaveLength(2)
    expect(screen.getAllByText("Asks you first")).toHaveLength(2)
  })

  /**
   * Two, not three: the lead is not in the list. Its own verdict is the two
   * sentences under the green button, and a row for it would be the same fact
   * twice on one screen in two vocabularies.
   */
  it("keeps the lead out of the rows it marks", () => {
    const { container } = render(
      <AskPanel
        revision={0}
        available={ALL}
        modelConfigured={false}
        {...led(ALL)}
        willSay={AS_SHIPPED}
      />
    )

    const lead = container.querySelector(`li form:has(input[value="${DEMO_LEADING_PRESET}"])`)

    expect(lead).toBeNull()
    expect(screen.getAllByText(/Goes ahead|Asks you first/)).toHaveLength(4)
  })

  /**
   * The sentence counts the panel, not the table. `already-asked.ts` withdraws
   * an ask while its question is open, and a sentence that went on saying
   * *five* over four rows would be the first thing on this screen a stranger
   * could catch out.
   */
  it("shrinks with the list it describes", () => {
    const fewer = ALL.filter((id) => id !== "palette" && id !== "band")

    render(
      <AskPanel
        revision={0}
        available={fewer}
        modelConfigured={false}
        {...led(fewer)}
        willSay={AS_SHIPPED}
      />
    )

    expect(screen.getByText(/You can ask for 3 changes here/)).toBeTruthy()
    expect(screen.queryByText(/ask for 5 changes/)).toBeNull()
  })

  /**
   * Nothing removed, at either size of absence. An ask with no verdict wears
   * no word and is not counted; a panel with no verdicts at all reads exactly
   * as it did before any of this existed.
   */
  it("says nothing about an ask that reached no verdict, and counts it in nothing", () => {
    render(
      <AskPanel
        revision={0}
        available={ALL}
        modelConfigured={false}
        {...led(ALL)}
        willSay={says({ palette: "on-its-own", backdrop: "on-its-own", trim: "asks-you" })}
      />
    )

    expect(screen.getByText(/You can ask for 3 changes here/)).toBeTruthy()
    expect(screen.getAllByText(/Goes ahead|Asks you first/)).toHaveLength(2)
    expect(screen.getByText(labelOf("band"))).toBeTruthy()
  })

  it("keeps the whole claim when nothing has been answered", () => {
    render(
      <AskPanel revision={0} available={ALL} modelConfigured={false} {...led(ALL)} willSay={{}} />
    )

    expect(screen.getByText(/won’t make without asking you/i)).toBeTruthy()
    expect(screen.queryByText(/You can ask for/)).toBeNull()
    expect(screen.queryByText(/Goes ahead|Asks you first/)).toBeNull()
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
   * The green on this rail belongs to the demo's next step, and once a question
   * exists that step is not a new ask: *Take the numbers off* with nothing open,
   * **Apply this change** once something is (`record-card.tsx` holds the other
   * half — a waiting card carries exactly one). A green here at the same time is
   * the panel competing with the question it just produced, at the size that
   * wins, for the press that costs the visitor the question.
   */
  it("gives up its green button while the question below has one", () => {
    const { container } = open()

    expect(container.querySelector(".bg-affirm")).toBeNull()
  })

  it("keeps its green button when nothing is waiting", () => {
    const { container } = render(<AskPanel revision={3} available={ALL} modelConfigured={true} {...led(ALL)} />)

    expect(container.querySelector(".bg-affirm")).toBeTruthy()
  })

  /**
   * **The panel offers what it is handed, and nothing it is handed is disabled.**
   * That is the whole of its contract about the list, and it is asserted here with
   * every preset in `available` because it must not quietly narrow the demo on its
   * own: the other asks really do work while a question is open, and a stranger
   * who wants to see the page move twice is allowed to.
   *
   * Which ids reach it is the page's call. `already-asked.ts` takes out the one
   * whose question is already on screen — a fact about the store, which this
   * component cannot see — and the test below is the panel's half of that.
   */
  it("offers every ask it is handed, none of them disabled", () => {
    open()

    for (const preset of DEMO_PRESETS) {
      expect(screen.getByRole("button", { name: new RegExp(preset.label, "i") })).toBeTruthy()
      expect(screen.getByRole("button", { name: new RegExp(preset.label, "i") }).hasAttribute("disabled")).toBe(false)
    }
  })

  /**
   * The list a visitor sees after the first press, assembled the way the page
   * assembles it: the lead's question is open, so the page has already taken the
   * lead out of `available`.
   *
   * The panel then has no primary and four secondary asks — which is the list that
   * was on screen *before* the press, unmoved. Before this, the lead dropped back
   * in at its table position and pushed the last ask down under the visitor's
   * cursor.
   */
  it("shows the list unchanged by the press when the page has withdrawn the lead", () => {
    const { container } = render(
      <AskPanel
        revision={3}
        available={ALL.filter((id) => id !== DEMO_LEADING_PRESET)}
        modelConfigured={true}
        waiting={WAITING}
      />
    )

    expect(container.querySelector(".bg-affirm")).toBeNull()
    expect(
      screen.queryByRole("button", { name: new RegExp(labelOf(DEMO_LEADING_PRESET), "i") })
    ).toBeNull()

    for (const preset of DEMO_PRESETS.filter((one) => one.id !== DEMO_LEADING_PRESET)) {
      expect(screen.getByRole("button", { name: new RegExp(preset.label, "i") })).toBeTruthy()
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
   * rather than a look: a statically placed caution is carried off the top of
   * the rail by any scroll that brings the record into view, leaving four live
   * buttons on screen with nothing between them and the question they would
   * kill.
   *
   * Sticking is what keeps it there, and it is also why `arrival.ts` had to
   * take the card to the top of the scroller: pinned, this strip is the whole
   * of what a visitor sees at the top of the rail, so a landing that left the
   * panel on screen put a warning over the question rather than over the
   * controls. The two decisions are one, and they are held apart on purpose —
   * this file owns *on screen with the controls*, that one owns *not on screen
   * without them*.
   */
  it("stays on screen while the controls it is about are", () => {
    open()

    const pinned = screen.getByText(WAITING.sentence).closest("div")?.parentElement

    expect(pinned?.className).toContain("sticky")
    expect(pinned?.className).toContain("top-0")
  })

  it("says nothing of the kind when nothing is waiting", () => {
    render(<AskPanel revision={3} available={ALL} modelConfigured={true} {...led(ALL)} />)

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

/**
 * The row that stopped being true, and the one sentence on it that changes.
 *
 * A toggle is applicable again the moment it has been applied, so it comes
 * straight back onto this list — and the promise it shipped with then describes
 * a change the page is about to be moved *away* from. Measured on a production
 * build at 1280 × 900, that row sat eleven pixels above a card reading *"Put it
 * back" undoes it*: two controls, the same effect, and only one of them said so.
 *
 * `what-it-will-say.test.ts` holds that the reading is right. What is held here
 * is that the **panel prints it**, in both sizes the sentence has, and that
 * nothing else on the row moves with it.
 */
describe("the ask panel, saying which way a press would go", () => {
  const goesAhead = (putsBack: boolean) => ({
    lead: "Pressing this changes the page straight away.",
    detail: "Low risk — so Loom does it without stopping to ask, and writes down what it did.",
    moves: true,
    standing: "on-its-own" as const,
    putsBack,
  })

  const promiseOfPreset = (id: DemoPresetId): string =>
    DEMO_PRESETS.find((preset) => preset.id === id)!.promise

  /** The shipped table, every row going on rather than back. */
  const NOTHING_GOES_BACK = Object.fromEntries(
    DEMO_PRESETS.map((preset) => [preset.id, goesAhead(false)])
  )

  it("replaces a row's promise once the press would only put the last change back", () => {
    render(
      <AskPanel
        revision={0}
        available={ALL}
        modelConfigured={false}
        {...led(ALL)}
        willSay={{ palette: goesAhead(true) }}
      />
    )

    expect(screen.getByText(PUTS_IT_BACK)).toBeTruthy()
    expect(screen.queryByText(promiseOfPreset("palette"))).toBeNull()
  })

  /**
   * And the verdict beside it is untouched, which is the whole restraint: the
   * Gate weighs a press that puts something back exactly as it weighs any
   * other, so the chip keeps saying what the Gate said. Swapping it for a
   * direction word would trade a fact the Gate produced for one the history
   * did, and leave the count above the list describing rows that no longer
   * carry what it counted.
   */
  it("leaves the row's label and the Gate's own word exactly as they were", () => {
    render(
      <AskPanel
        revision={0}
        available={ALL}
        modelConfigured={false}
        {...led(ALL)}
        willSay={{ palette: goesAhead(true) }}
      />
    )

    expect(screen.getByText(labelOf("palette"))).toBeTruthy()
    expect(screen.getAllByText(STANDING_ROW["on-its-own"]).length).toBe(1)
  })

  /**
   * The same substitution on the green button, and it is never hypothetical:
   * the lead is whichever ask is left after the spent ones are withdrawn, so
   * once *Take the numbers off* has been answered the primary control is a
   * toggle — and its second press puts the page back at the loudest size this
   * panel has.
   */
  it("replaces the lead's promise too, at the size the lead carries it", () => {
    const left: readonly DemoPresetId[] = ["palette", "backdrop"]
    const lead = leadingAsk(left)!

    render(
      <AskPanel
        revision={0}
        available={left}
        modelConfigured={false}
        {...led(left)}
        willSay={{ [lead.id]: goesAhead(true) }}
      />
    )

    const promise = screen.getByText(PUTS_IT_BACK)
    const primary = screen.getAllByRole("button")[0]

    expect(promise.closest("form")).toBe(primary!.closest("form"))
    expect(screen.queryByText(lead.promise)).toBeNull()
  })

  /**
   * And every row the history has not falsified keeps the sentence it shipped
   * with — which is the assertion that stops this becoming a surface that
   * describes every press the same way.
   */
  it("keeps the shipped promise on every other row", () => {
    render(
      <AskPanel
        revision={0}
        available={ALL}
        modelConfigured={false}
        {...led(ALL)}
        willSay={{ palette: goesAhead(true), backdrop: goesAhead(false) }}
      />
    )

    expect(screen.getByText(promiseOfPreset("backdrop"))).toBeTruthy()
    expect(screen.getAllByText(PUTS_IT_BACK).length).toBe(1)
  })

  /**
   * The arrival screen is untouched, and it is asserted rather than left to a
   * screenshot: nothing has happened, so no press can put anything back, and
   * all five rows read exactly as they were written.
   */
  it("says nothing about direction on the screen a stranger arrives at", () => {
    render(
      <AskPanel
        revision={0}
        available={ALL}
        modelConfigured={false}
        {...led(ALL)}
        willSay={NOTHING_GOES_BACK}
      />
    )

    expect(screen.queryByText(PUTS_IT_BACK)).toBeNull()
    for (const preset of DEMO_PRESETS) expect(screen.getByText(preset.promise)).toBeTruthy()
  })
})
