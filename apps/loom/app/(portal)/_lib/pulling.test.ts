import { describe, expect, it } from "vitest"

import { err, ok } from "@jam-overture/loom"
import { DEFAULT_APPLICATION_ID, applicationIdSchema } from "@jam-overture/loom/store"

import { runtimeWordsIn } from "../_test/plain-language"
import {
  connectionWords,
  keepingOf,
  NOT_KEPT_AFTER_MS,
  pullingOf,
  pullingWords,
  QUIET_AFTER_MS,
  type Keeping,
  type Pulling,
} from "./pulling"

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

describe("whether the site keeps the newest pages it is given", () => {
  const newest = (first: number, last: number, kept: boolean, anyKept = true) =>
    ok({ first, last, kept, anyKept })

  it("says it cannot tell when that record cannot be read", () => {
    expect(keepingOf(err({ detail: "no column" }))).toEqual({ kind: "unreadable" })
  })

  it("says nothing against a site that never pulled", () => {
    expect(keepingOf(ok(null))).toEqual({ kind: "keeps" })
  })

  it("says nothing against a site that named the newest pages back", () => {
    expect(keepingOf(newest(FIRST, FIRST + 2 * NOT_KEPT_AFTER_MS, true))).toEqual({
      kind: "keeps",
    })
  })

  it("is not keeping them once given them for ten minutes and never naming them back", () => {
    expect(keepingOf(newest(FIRST, FIRST + NOT_KEPT_AFTER_MS, false))).toEqual({
      kind: "not-kept",
      since: FIRST,
    })
    expect(keepingOf(newest(FIRST, FIRST + NOT_KEPT_AFTER_MS - 1, false))).toEqual({
      kind: "keeps",
    })
  })

  it("says nothing against a site that has never named any pages back, which it cannot be read on", () => {
    expect(keepingOf(newest(FIRST, LAST, false, false))).toEqual({ kind: "keeps" })
  })
})

describe("what Connect your site says about pulling and keeping", () => {
  const pulling = (quiet: boolean): Pulling => ({
    kind: "pulling",
    first: FIRST,
    last: LAST,
    quiet,
  })
  const notKept: Keeping = { kind: "not-kept", since: FIRST }

  it("says only whether the site pulls while nothing says it does not keep its pages", () => {
    expect(connectionWords(pulling(false), { kind: "keeps" })).toEqual(pullingWords(pulling(false)))
  })

  it("says the site is not keeping its newest pages, since when, and what usually fixes it", () => {
    expect(connectionWords(pulling(false), notKept)).toEqual({
      title: "Your site pulls, and is not keeping its newest pages",
      lines: [
        "Since 1 November 2026 at 09:00 UTC it has been given pages it has not kept: it goes on asking for the ones it had before, so a change accepted since then has not reached readers.",
        "The usual cause is that the version of Loom installed on your site cannot read them. Updating it there lets your site take them on its next pull.",
        "It last pulled on 7 November 2026 at 12:30 UTC.",
      ],
    })
  })

  it("tells a site that has gone quiet that first, since nothing reaches it either way", () => {
    expect(connectionWords(pulling(true), notKept)).toEqual(pullingWords(pulling(true)))
  })

  it("adds that keeping could not be read, and keeps what it knows about pulling", () => {
    const words = connectionWords(pulling(false), { kind: "unreadable" })

    expect(words.title).toBe("Your site pulls its pages")
    expect(words.lines.slice(0, -1)).toEqual(pullingWords(pulling(false)).lines)
    expect(words.lines.at(-1)).toMatch(/could not be read/)
  })

  it("asks nothing about keeping of a site that does not pull", () => {
    expect(connectionWords({ kind: "never" }, notKept)).toEqual(pullingWords({ kind: "never" }))
  })

  it("speaks to a person, not to the runtime, in every state", () => {
    const keepings: readonly Keeping[] = [{ kind: "keeps" }, { kind: "unreadable" }, notKept]

    for (const keeping of keepings) {
      const { title, lines } = connectionWords(pulling(false), keeping)

      expect(runtimeWordsIn([title, ...lines].join(" "))).toEqual([])
    }
  })
})
