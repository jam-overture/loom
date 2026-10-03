import { describe, expect, it } from "vitest"

import { portalFile, screenSource } from "@/app/(portal)/_lib/screen-source"

/**
 * The order this screen reads in, which is the governance model itself.
 *
 * **What it is → what it is built from → how it is put together → what governs
 * it.** A reader who stops after the first sentence knows what they have; one
 * who stops after the second knows what the AI may reach for; one who reads to
 * the end knows the rules it is held to. Each rule below is a position, and a
 * position is the one thing a component test cannot see — every part of this
 * screen could be individually right and still arrive in an order that teaches a
 * reader nothing, which is the defect the whole screen exists to fix.
 */
const file = portalFile("portal", "app", "page.tsx")
const source = screenSource(file)

const at = (needle: string): number => {
  const index = source.indexOf(needle)
  if (index === -1) throw new Error(`the screen no longer contains ${needle}`)

  return index
}

describe("the reading order of the app screen", () => {
  it("names the app before it counts anything in it", () => {
    expect(at("<h1")).toBeLessThan(at("<PieceTally"))
  })

  it("says what it is built from before showing how it is put together", () => {
    expect(at("<PieceTally")).toBeLessThan(at("<AppComposition"))
  })

  /**
   * The rules come last and in one line. They have a screen of their own, and a
   * second copy of it here would make two screens able to describe one policy
   * differently — but a governance surface that never mentioned them would be an
   * inventory.
   */
  it("says what governs the app after it has shown the app", () => {
    expect(at("<AppComposition")).toBeLessThan(at("What it is allowed to do"))
  })

  it("names its subject before any technical record", () => {
    expect(at("<h1")).toBeLessThan(at("<TechnicalDetail"))
  })

  /**
   * How much of the app is being shown goes *after* the thing it qualifies. It is
   * only true of the tree above it, and a reader meeting it first would read it
   * as a warning about the screen rather than as a fact about their app — the
   * rule the progression screen established for exactly this shape.
   */
  it("says how much of the app it is showing after it has shown it", () => {
    expect(at("<AppComposition")).toBeLessThan(at("{note}"))
  })

  /**
   * It cannot ask for anything. This screen is the subject of the governance
   * model, not a place to act on it: a change is asked for on a page, and a
   * policy is changed on the rules screen. 0019 narrowed to the one surface where
   * widening it would be easiest.
   */
  it("offers no way to ask for a change or to alter a rule", () => {
    expect(source).not.toContain("<PromptBox")
    expect(source).not.toContain("<form")
    expect(source).not.toContain("<button")
    /**
     * A server action is the only way this route group writes anything, so not
     * importing one is the whole of the claim. `StateNotice`'s `action` prop is a
     * link and not a verb, which is why the check names the import rather than
     * the string `action=`.
     */
    expect(source).not.toContain("actions")
  })

  /**
   * Said once. A reader who has been told Loom looks after one app does not need
   * reminding in every section, and a portal that kept saying it would read as
   * apologising for it.
   */
  it("says there is one app exactly once", () => {
    expect(source.split("one app").length - 1).toBe(1)
  })
})
