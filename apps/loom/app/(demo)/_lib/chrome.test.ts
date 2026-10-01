import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { CHROME, CHROME_RADIUS } from "./chrome"

const css = readFileSync(fileURLToPath(new URL("../globals.css", import.meta.url)), "utf8")

/**
 * The value a `:root` custom property is declared with — `globals.test.ts`'s
 * reader, deliberately the same one. Two ways of reading one stylesheet is how
 * two tests come to disagree about what it says.
 */
const token = (name: string): string => {
  const value = new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim()
  if (value === undefined) throw new Error(`the demo's stylesheet declares no ${name}`)

  return value
}

/**
 * A copied color is a color that can go stale, and this surface has one place
 * where copying is unavoidable: the share card is a PNG, drawn by a renderer
 * that reads no stylesheet.
 *
 * These are not assertions about taste. They are the join between the rail a
 * visitor arrives at and the picture that invited them, and the failure they
 * prevent is the one nobody on this project would ever see — a card that looks
 * right in a report and wrong beside the page a month later.
 */
describe("the colors the share card borrows", () => {
  it.each([
    ["--surface-page", CHROME.page],
    ["--border-subtle", CHROME.edge],
    ["--text-primary", CHROME.inkPrimary],
    ["--text-secondary", CHROME.inkSecondary],
    ["--text-muted", CHROME.inkMuted],
    ["--accent", CHROME.accent],
    ["--outcome-awaiting-bg", CHROME.awaitingGround],
    ["--outcome-awaiting-text", CHROME.awaitingInk],
  ])("draws %s with the value the stylesheet declares", (name, borrowed) => {
    expect(borrowed).toBe(token(name))
  })

  it("takes its radii from the stylesheet too", () => {
    expect(`${CHROME_RADIUS.medium}px`).toBe(token("--radius-medium"))
    expect(`${CHROME_RADIUS.large}px`).toBe(token("--radius-large"))
  })

  /**
   * The stage is the other lane of this picture and it is not borrowed from
   * here. A chrome token for the page being changed is exactly the confusion
   * `globals.css` exists to prevent, so the absence is asserted rather than
   * left to be noticed.
   */
  it("borrows nothing for the stage, which carries its own theme", () => {
    expect(Object.values(CHROME)).not.toContain(token("--surface-stage"))
  })
})
