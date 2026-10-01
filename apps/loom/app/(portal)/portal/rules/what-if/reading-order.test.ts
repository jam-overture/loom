import { describe, expect, it } from "vitest"

import { WHAT_IF_NAME, WHAT_IF_PATH } from "@/app/(portal)/_lib/levers"
import { portalFile, screenSource } from "@/app/(portal)/_lib/screen-source"

/**
 * The order a reader meets this screen in, and the three things it must never
 * become.
 *
 * Reading order is decided in exactly one place — the source — and no component
 * test can see it: every one of them renders its own component in isolation and
 * would pass with the page assembled backwards.
 *
 * The three refusals are what keep a simulation from turning into a control
 * surface by accident. This screen may not write, may not offer a control that
 * cannot be replayed, and may not take its policy from anywhere but the module
 * the write path is built from.
 */
const file = portalFile("portal", "rules", "what-if", "page.tsx")
const source = screenSource(file)

const at = (needle: string): number => {
  const index = source.indexOf(needle)
  expect(index, `expected the screen to contain ${needle}`).toBeGreaterThan(-1)

  return index
}

describe("the reading order", () => {
  it("names the screen before it says anything else about it", () => {
    expect(at("<h1")).toBeLessThan(at("Change a setting here"))
  })

  /**
   * The 390px defect three screens in this lane have each paid for once: a way
   * out placed beside a heading wraps between the heading and its own sentence
   * on a phone, so a reader meets "what else can I do" before "what this is".
   */
  it("puts the heading's own sentence before the way back", () => {
    expect(at("Change a setting here")).toBeLessThan(at("What Loom is allowed to do here"))
    expect(source).not.toContain("justify-between")
  })

  /**
   * Dials before the answer, because on arrival there is no answer: the
   * sentence under them is an instruction to move one. Opening on an empty box
   * is how a screen reads as one that failed to load, which this lane has now
   * found three separate ways.
   */
  it("asks what you are thinking of changing before it says what would differ", () => {
    expect(at("What are you thinking of changing?")).toBeLessThan(
      at("What would have been different")
    )
  })

  it("gives the answer before the changes it is an answer about", () => {
    expect(at("verdictOf(plan, moved)")).toBeLessThan(at("<MovedGroup"))
  })

  it("ends on what to do about it", () => {
    expect(at("<MovedGroup")).toBeLessThan(at("<PolicyPatch"))
  })

  it("puts the technical record after everything a reader meets unasked", () => {
    expect(at("<PolicyPatch")).toBeLessThan(source.lastIndexOf("<TechnicalDetail"))
  })

  /**
   * An empty deployment is where a new person starts, and the one thing to do
   * about it is not on this screen. The notice carries the way to end the state
   * rather than describing it — which `StateNotice` makes a type error to
   * forget, and which is asserted here because the type cannot see *which*
   * action.
   */
  it("sends a reader with nothing on the record somewhere that gets them something", () => {
    const empty = at('tone="empty"')
    const action = at("/portal/pages")

    expect(action).toBeGreaterThan(empty)
    expect(source).toContain("Nothing has been judged under these rules yet")
  })
})

describe("what this screen may never become", () => {
  /**
   * 0200 would allow a lever here and this screen still ends in a block of
   * code. Nothing on it submits, because a policy lives in the host's
   * repository where a change to it is reviewed like any other — which is what
   * `/portal/rules` already tells a reader in those words.
   */
  it("offers nothing to press and writes nothing", () => {
    expect(source).not.toContain("<form")
    expect(source).not.toContain("<button")
    expect(source).not.toContain("use server")
    expect(source).not.toContain("portalStore")
    /*
     * `action=` is not asserted against, deliberately: `StateNotice` requires
     * one on an empty state, and it is a link to somewhere rather than a
     * submission. What a write would actually need is a server action module,
     * and this lane keeps those in an `actions.ts` beside the screen.
     */
    expect(source).not.toMatch(/from "\.{1,2}\/actions"/u)
  })

  /**
   * The self-check is the whole reason the numbers on this screen can be
   * believed, and it only works if the replay is run against the deployment's
   * own policy. Replaying against the asked-for one would reproduce nothing in
   * particular and set aside every change a dial moved.
   */
  it("checks itself against the policy that really judged, and plays the one being asked about", () => {
    expect(source).toContain("replayFrom(episodesOf(page.value.records), portalPolicy)")
    expect(source).toContain("gameplanOf(replay, asked)")
  })

  it("reads the same policy the write path is built with", () => {
    expect(source).toContain("portalPolicy")
    expect(source).not.toContain("defaultGatePolicy")
  })

  /**
   * A reader who is told the arithmetic did not reproduce is being told this
   * screen misread one of their rules. It is a failure notice rather than a
   * line in the disclosure, and it comes before anything it would undermine.
   */
  it("says so loudly when it could not reproduce the record", () => {
    expect(at("readsTheRulesWrong(replay)")).toBeLessThan(at("What are you thinking of changing?"))
    expect(source).toContain('tone="failure"')
  })

  it("is guarded like every other screen behind the sign-in", () => {
    expect(source).toContain("requireActor(")
  })
})

describe("the screen's own name", () => {
  it("is read from one place rather than written here", () => {
    expect(source).toContain("{WHAT_IF_NAME}")
    expect(source).not.toContain(`<h1 className="text-2xl tracking-tight">What if`)
  })

  /**
   * The case rule in `every-screen.test.ts` skips a heading that renders a
   * value, because a source read cannot case-check an interpolation. This is
   * that rule, applied where the value is known.
   */
  it("starts with a capital and is not an identifier", () => {
    expect(WHAT_IF_NAME.slice(0, 1)).toBe(WHAT_IF_NAME.slice(0, 1).toUpperCase())
    expect(WHAT_IF_NAME).not.toContain("_")
  })

  it("is where the one link to it says it is", () => {
    const rules = screenSource(portalFile("portal", "rules", "page.tsx"))

    expect(rules).toContain("{WHAT_IF_NAME}")
    expect(rules).toContain("WHAT_IF_PATH")
    expect(WHAT_IF_PATH).toBe("/portal/rules/what-if")
  })
})
