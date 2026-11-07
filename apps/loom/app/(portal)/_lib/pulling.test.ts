import { describe, expect, it } from "vitest"

import { err, ok } from "@jam-overture/loom"
import { DEFAULT_APPLICATION_ID, applicationIdSchema } from "@jam-overture/loom/store"

import { runtimeWordsIn } from "../_test/plain-language"
import { pullingOf, pullingWords, QUIET_AFTER_MS, type Pulling } from "./pulling"

const SHOP = applicationIdSchema.parse("app_shop")
const FIRST = Date.parse("2026-11-01T09:00:00.000Z")
const LAST = Date.parse("2026-11-07T12:30:00.000Z")

describe("whether a project's site pulls", () => {
  it("is never asked of this deployment's own site, which reads the store directly", () => {
    expect(pullingOf(DEFAULT_APPLICATION_ID, err({ detail: "down" }), LAST)).toEqual({
      kind: "own-site",
    })
  })

  it("says it cannot tell when the record cannot be read, rather than that the site never pulled", () => {
    expect(pullingOf(SHOP, err({ detail: "no table" }), LAST)).toEqual({ kind: "unreadable" })
  })

  it("is not pulling where no pull was ever recorded", () => {
    expect(pullingOf(SHOP, ok(null), LAST)).toEqual({ kind: "never" })
  })

  it("is pulling up to an hour after its last pull, and quiet after", () => {
    const span = ok({ first: FIRST, last: LAST })

    expect(pullingOf(SHOP, span, LAST + QUIET_AFTER_MS)).toEqual({
      kind: "pulling",
      first: FIRST,
      last: LAST,
      quiet: false,
    })
    expect(pullingOf(SHOP, span, LAST + QUIET_AFTER_MS + 1)).toMatchObject({ quiet: true })
  })
})

describe("what the screen says about it", () => {
  const pulling = (quiet: boolean): Pulling => ({
    kind: "pulling",
    first: FIRST,
    last: LAST,
    quiet,
  })

  it("calls a project whose site has never pulled connected for observation, in those words", () => {
    const words = pullingWords({ kind: "never" })

    expect(words.title).toBe("Your site is not pulling yet")
    expect(words.lines.join(" ")).toMatch(/connected for observation only/)
    expect(words.lines.join(" ")).toMatch(/no reader sees it/)
  })

  it("names when the site last and first pulled, as moments a person reads", () => {
    expect(pullingWords(pulling(false))).toEqual({
      title: "Your site pulls its pages",
      lines: [
        "It last pulled on 7 November 2026 at 12:30 UTC, so a change you accept is live from its next pull.",
        "It first pulled on 1 November 2026 at 09:00 UTC.",
      ],
    })
  })

  it("warns that changes may not have reached readers once the site has gone quiet", () => {
    const words = pullingWords(pulling(true))

    expect(words.title).toBe("Your site has stopped pulling")
    expect(words.lines[0]).toMatch(/may not have reached readers/)
  })

  it("speaks to a person, not to the runtime, in every state", () => {
    const states: readonly Pulling[] = [
      { kind: "own-site" },
      { kind: "unreadable" },
      { kind: "never" },
      pulling(false),
      pulling(true),
    ]

    for (const state of states) {
      const { title, lines } = pullingWords(state)

      expect(runtimeWordsIn([title, ...lines].join(" "))).toEqual([])
    }
  })
})
