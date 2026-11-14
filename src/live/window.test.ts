import { describe, expect, it } from "vitest"

import { treeIdSchema } from "../ids.js"
import { sampleTree } from "../testing/fixtures.js"
import type { LoomTree } from "../tree/tree.js"

import {
  heldVersionFor,
  PIN_COOKIE,
  pinCookieFor,
  pinIn,
  WINDOW_OFF,
  type HeldVersion,
  type LiveWindow,
} from "./window.js"

const page = sampleTree().tree
const other: LoomTree = { ...sampleTree().tree, treeId: treeIdSchema.parse("t_second") }

/** A version of a page, distinguishable from the live one by its own object identity. */
const versionOf = (of: LoomTree, until: number): HeldVersion => ({ until, tree: { ...of } })

const HOUR = 3_600_000

const windowOver = (
  held: readonly (readonly [LoomTree, readonly HeldVersion[]])[],
  over: { readonly ms?: number; readonly floor?: number; readonly number?: number } = {}
): LiveWindow => ({
  ms: over.ms ?? HOUR,
  floor: over.floor ?? 100,
  number: over.number ?? 900,
  held: new Map(held.map(([tree, versions]) => [tree.treeId, versions])),
})

describe("the pin in a request's cookies", () => {
  it("reads the number under its own name, wherever in the header it sits", () => {
    expect(pinIn(`${PIN_COOKIE}=500`)).toBe(500)
    expect(pinIn(`first=1; ${PIN_COOKIE}=500; last=2`)).toBe(500)
    expect(pinIn(`first=1;${PIN_COOKIE}=500`)).toBe(500)
    expect(pinIn(` ${PIN_COOKIE}=500 `)).toBe(500)
  })

  it("answers nothing for a reader with no cookies at all", () => {
    expect(pinIn(undefined)).toBeUndefined()
    expect(pinIn(null)).toBeUndefined()
    expect(pinIn("")).toBeUndefined()
  })

  it("answers nothing where no cookie carries its name", () => {
    expect(pinIn("session=abc; theme=dark")).toBeUndefined()
  })

  /**
   * A name that merely ends with ours is a different cookie. Matching on the
   * `=` as well is what keeps `their_loom_pin` out, and a site is free to have
   * one.
   */
  it("is not fooled by a cookie whose name ends with its own", () => {
    expect(pinIn(`their_${PIN_COOKIE}=500`)).toBeUndefined()
    expect(pinIn(`${PIN_COOKIE}x=500`)).toBeUndefined()
    expect(pinIn(`their_${PIN_COOKIE}=1; ${PIN_COOKIE}=500`)).toBe(500)
  })

  /**
   * Everything a cookie can hold that is not a whole number is a reader with no
   * usable pin, and `pinCookieFor` gives them one. `Number("")` is `0` — a real
   * pin below every floor — so the empty value is the case worth naming.
   */
  it.each([
    ["an empty value", ""],
    ["a space", " "],
    ["a word", "abc"],
    ["a fraction", "12.5"],
    ["exponent notation", "1e3"],
    ["infinity", "Infinity"],
    ["hexadecimal", "0x10"],
    ["a leading plus", "+5"],
    ["a leading zero", "0500"],
    ["a padded number", " 500 "],
    ["a number too large to be exact", "9007199254740993"],
    ["a negative number", "-1"],
    ["two numbers", "1,2"],
  ])("answers nothing for %s, which it could not have written", (_what, value) => {
    expect(pinIn(`${PIN_COOKIE}=${value}`)).toBeUndefined()
  })

  it("reads nought, which is a pin below every floor rather than no pin", () => {
    expect(pinIn(`${PIN_COOKIE}=0`)).toBe(0)
  })

  /** Two under one name have no single reading, so the first is taken. */
  it("reads the first of two values under its own name", () => {
    expect(pinIn(`${PIN_COOKIE}=500; ${PIN_COOKIE}=900`)).toBe(500)
  })
})

describe("the version a pin asks for", () => {
  const versions = [versionOf(page, 300), versionOf(page, 600)] as const

  it("answers the earliest version still live at the pin", () => {
    const window = windowOver([[page, versions]])

    expect(heldVersionFor(window, page.treeId, 200)).toBe(versions[0].tree)
    expect(heldVersionFor(window, page.treeId, 299)).toBe(versions[0].tree)
    expect(heldVersionFor(window, page.treeId, 300)).toBe(versions[1].tree)
    expect(heldVersionFor(window, page.treeId, 599)).toBe(versions[1].tree)
  })

  /** Past every version held is a reader whose pin is newer than every change. */
  it("answers nothing for a pin past every version held", () => {
    expect(heldVersionFor(windowOver([[page, versions]]), page.treeId, 600)).toBeUndefined()
    expect(heldVersionFor(windowOver([[page, versions]]), page.treeId, 700)).toBeUndefined()
  })

  it("answers nothing for a page no version is held of", () => {
    const window = windowOver([[page, versions]])

    expect(heldVersionFor(window, other.treeId, 200)).toBeUndefined()
    expect(heldVersionFor(windowOver([[page, []]]), page.treeId, 200)).toBeUndefined()
  })

  /**
   * The four readings of clause 5, each of which serves the newest live page.
   * A reader with no pin is the fifth and is every reader of a project before
   * one is chosen.
   */
  it("answers nothing where the window is off", () => {
    expect(heldVersionFor(WINDOW_OFF, page.treeId, 200)).toBeUndefined()
  })

  it("answers nothing for a reader with no pin", () => {
    expect(heldVersionFor(windowOver([[page, versions]]), page.treeId, undefined)).toBeUndefined()
  })

  it("answers nothing for a pin below the floor, which a snapshot or a revert raised", () => {
    const window = windowOver([[page, versions]], { floor: 250 })

    expect(heldVersionFor(window, page.treeId, 249)).toBeUndefined()
    expect(heldVersionFor(window, page.treeId, 250)).toBe(versions[0].tree)
  })

  it("answers nothing for a pin above the number the pages stand at", () => {
    const window = windowOver([[page, versions]], { number: 400 })

    expect(heldVersionFor(window, page.treeId, 401)).toBeUndefined()
    /* The number itself is a reader pinned at the state the pages stand in now. */
    expect(heldVersionFor(window, page.treeId, 400)).toBe(versions[1].tree)
  })

  it("answers nothing for a pin that is not a whole number", () => {
    const window = windowOver([[page, versions]])

    expect(heldVersionFor(window, page.treeId, 200.5)).toBeUndefined()
    expect(heldVersionFor(window, page.treeId, Number.NaN)).toBeUndefined()
    expect(heldVersionFor(window, page.treeId, Number.POSITIVE_INFINITY)).toBeUndefined()
  })

  /**
   * Nothing a reader is served depends on the order the door listed the
   * versions in. Reading the list's order instead would serve this reader the
   * *later* version, which is a newer page than the one they were pinned to.
   */
  it("reads the same version from a list in either order", () => {
    const [first, second] = versions
    const forwards = windowOver([[page, [first, second]]])
    const backwards = windowOver([[page, [second, first]]])

    expect(heldVersionFor(forwards, page.treeId, 200)).toBe(first.tree)
    expect(heldVersionFor(backwards, page.treeId, 200)).toBe(first.tree)
  })

  /**
   * The door answers a number at or above the floor. An answer where it is not
   * makes every pin unresolvable by this arithmetic alone, which is the reading
   * that costs a reader freshness rather than the right page.
   */
  it("serves the newest page to every pin when the number is below the floor", () => {
    const window = windowOver([[page, versions]], { floor: 500, number: 400 })

    for (const pin of [0, 399, 400, 450, 500, 501]) {
      expect(heldVersionFor(window, page.treeId, pin)).toBeUndefined()
    }
  })

  it("holds each page at its own versions", () => {
    const first = versionOf(page, 300)
    const second = versionOf(other, 500)
    const window = windowOver([
      [page, [first]],
      [other, [second]],
    ])

    expect(heldVersionFor(window, page.treeId, 200)).toBe(first.tree)
    expect(heldVersionFor(window, other.treeId, 200)).toBe(second.tree)
    expect(heldVersionFor(window, page.treeId, 400)).toBeUndefined()
    expect(heldVersionFor(window, other.treeId, 400)).toBe(second.tree)
  })
})

describe("the cookie a reader with no pin is given", () => {
  it("carries the number the pages stand at, expiring the window from now", () => {
    expect(pinCookieFor({ window: windowOver([], { ms: HOUR, number: 900 }) }, undefined)).toBe(
      `${PIN_COOKIE}=900; Max-Age=3600; Path=/; HttpOnly; Secure; SameSite=Lax`
    )
  })

  it("carries every flag 0383 clause 3 names, and no others", () => {
    const value = pinCookieFor({ window: windowOver([]) }, undefined) ?? ""
    const flags = value
      .split(";")
      .slice(1)
      .map((flag) => flag.trim())

    expect(flags).toEqual(["Max-Age=3600", "Path=/", "HttpOnly", "Secure", "SameSite=Lax"])
  })

  /**
   * The one property clause 3 is about: a cookie renewed on every visit would
   * hold a daily reader on one version for ever.
   */
  it("is never given to a reader who already has a pin", () => {
    const window = windowOver([])

    expect(pinCookieFor({ window }, 500)).toBeUndefined()
    expect(pinCookieFor({ window }, 0)).toBeUndefined()
  })

  it("is not given at all while the window is off", () => {
    expect(pinCookieFor({ window: WINDOW_OFF }, undefined)).toBeUndefined()
  })

  it("expires each of the windows a project can choose, in whole seconds", () => {
    const secondsFor = (ms: number): string | undefined =>
      pinCookieFor({ window: windowOver([], { ms }) }, undefined)
        ?.split(";")[1]
        ?.trim()

    expect(secondsFor(HOUR)).toBe("Max-Age=3600")
    expect(secondsFor(24 * HOUR)).toBe("Max-Age=86400")
    expect(secondsFor(7 * 24 * HOUR)).toBe("Max-Age=604800")
  })

  /** A cookie that is dead on arrival holds nobody and is a thing to explain. */
  it("is not given for a window that rounds to less than a second", () => {
    expect(pinCookieFor({ window: windowOver([], { ms: 999 }) }, undefined)).toBeUndefined()
    expect(pinCookieFor({ window: windowOver([], { ms: 1_000 }) }, undefined)).toBe(
      `${PIN_COOKIE}=900; Max-Age=1; Path=/; HttpOnly; Secure; SameSite=Lax`
    )
  })

  /**
   * The cookie the server writes is the cookie this client reads back, which is
   * the one round trip that has to hold for a window to work at all.
   */
  it("writes a value this client reads back as the same pin", () => {
    const window = windowOver([], { number: 1_763_000_000_000 })
    const value = pinCookieFor({ window }, undefined) ?? ""
    const sent = value.split(";")[0] ?? ""

    expect(pinIn(`session=abc; ${sent}; theme=dark`)).toBe(1_763_000_000_000)
  })
})
