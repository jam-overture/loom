import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { INTAKE_KEY } from "@/app/_lib/reader-signals/settings"

import { renderSitePage } from "../render"
import { DEFAULT_THEME, HOME, WHAT_READERS_DO } from "../site"

import { readersCountedHere } from "./counting"

/**
 * Whether this deployment counts its readers, and the two things that answer
 * has to keep in step.
 *
 * The switch itself is one line, and the reason it gets a test file is the
 * second half of this: the same boolean puts the addresses on the markup and
 * puts the sentence about counting in front of the reader. Those coming apart
 * is the failure with no symptom — a page that says it counts nobody while
 * broadcasting, or a page carrying every address and saying so while nothing
 * listens.
 */

const ORIGIN = "https://loom.example"

const markup = async (counting: boolean): Promise<string> =>
  renderToStaticMarkup(
    (await renderSitePage(HOME, { origin: ORIGIN, theme: DEFAULT_THEME, counting })).element
  )

const readersPage = async (counting: boolean): Promise<string> =>
  renderToStaticMarkup(
    (await renderSitePage(WHAT_READERS_DO, { origin: ORIGIN, theme: DEFAULT_THEME, counting }))
      .element
  )

describe("the switch this site reads", () => {
  it("is on for every value the endpoint accepts as on", () => {
    for (const value of ["on", "true", "1", "yes", "ON", " on "]) {
      expect(readersCountedHere({ [INTAKE_KEY]: value }), value).toBe(true)
    }
  })

  it("is off when nothing is set, which is what a deployment gets by default", () => {
    expect(readersCountedHere({})).toBe(false)
  })

  it("is off for every value the endpoint accepts as off", () => {
    for (const value of ["off", "false", "0", "no", ""]) {
      expect(readersCountedHere({ [INTAKE_KEY]: value }), value).toBe(false)
    }
  })

  /**
   * A value that is neither is reported to the operator as a mistake and keeps
   * no batch, so a page claiming to count you on the strength of it would be
   * claiming something this deployment does not do.
   */
  it("is off for a value that is neither on nor off", () => {
    expect(readersCountedHere({ [INTAKE_KEY]: "maybe" })).toBe(false)
    expect(readersCountedHere({ [INTAKE_KEY]: "yes please" })).toBe(false)
  })

  it("reads the endpoint's own key and no other", () => {
    expect(readersCountedHere({ LOOM_SIGNALS: "on" })).toBe(false)
    expect(INTAKE_KEY).toBe("LOOM_SIGNAL_INTAKE")
  })
})

describe("the page a counting deployment serves", () => {
  it("carries the tree's address, which is what a signal names", async () => {
    const page = await markup(true)

    expect(page).toContain("data-loom-tree=")
    expect(page).toContain("data-loom-revision=")
    expect(page).toContain("data-loom-node=")
    expect(page).toContain("data-loom-type=")
  })

  /**
   * A deployment that has not asked to count anybody gets back the page this
   * site served before any of this existed: not one of the four addresses,
   * anywhere in it.
   *
   * `data-loom-disclosed` survives and is deliberately not in this list. It is
   * not an address — it is how a disclose control says which state it is in, on
   * every deployment, whether or not anything is reading it — and asserting its
   * absence would be asserting that a question on this site stops working when
   * counting is off.
   */
  it("carries no address at all when nobody is being counted", async () => {
    const page = await markup(false)

    for (const attribute of ["tree", "revision", "node", "type"]) {
      expect(page, attribute).not.toContain(`data-loom-${attribute}=`)
    }
  })

  it("says in the foot of every page that it is counting, when it is", async () => {
    expect(await markup(true)).toContain("never who you are")
  })

  it("says nothing about counting anywhere on a page that counts nobody", async () => {
    const page = await markup(false)

    expect(page).not.toContain("never who you are")
    expect(page).not.toContain("counts which of its parts")
  })

  /**
   * The page whose subject this is says which of the two deployments it is
   * running on, in the band where it prints the numbers.
   */
  it("tells the reader of the readers page which deployment they are on", async () => {
    expect(await readersPage(false)).toContain("nobody reading this page has been counted")
    expect(await readersPage(true)).toContain("counting is on here")
  })
})
