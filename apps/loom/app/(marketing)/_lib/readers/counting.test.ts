import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { INTAKE_KEY } from "@/app/_lib/reader-signals/settings"

import { renderSitePage } from "../render"
import { DEFAULT_THEME, HOME, WHAT_YOU_RUN } from "../site"

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
    (await renderSitePage(WHAT_YOU_RUN, { origin: ORIGIN, theme: DEFAULT_THEME, counting }))
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

  /**
   * **The site makes no claim about whether counting is on, in either state.**
   *
   * It made two until 12 October: a line in the footer when counting was on,
   * and a sentence on `/what-you-run` saying which of the two deployments you
   * were reading. Both were written when every page was rebuilt per request,
   * so both tracked the setting for free.
   *
   * They stopped being free when the pages became stored rows (0259): a
   * sentence about the current setting freezes at the moment it is written and
   * is false from the first time anybody changes it — and *nobody reading this
   * page has been counted* is the worst of the two to be wrong about. The
   * maintainer's instruction was to take the message off the site whether it
   * is counting or not.
   *
   * **What is not removed is the explanation.** `/what-you-run` still has its
   * *what this page counts* section, which is true of a Loom page whatever any
   * deployment has switched on, and that is what the footer line used to point
   * at. Asserted below so that dropping the pointer cannot quietly become
   * dropping the subject.
   */
  it("makes no claim about whether counting is switched on, either way", async () => {
    for (const counting of [true, false]) {
      const page = await markup(counting)

      expect(page, `footer, counting=${counting}`).not.toContain("never counts who you are")
      expect(page, `footer, counting=${counting}`).not.toContain("counts which of its parts")

      const readers = await readersPage(counting)

      expect(readers, `readers page, counting=${counting}`).not.toContain(
        "nobody reading this page has been counted"
      )
      expect(readers, `readers page, counting=${counting}`).not.toContain(
        "Counting is switched on here"
      )
    }
  })

  it("still explains what a page is able to count, on the page that is about it", async () => {
    for (const counting of [true, false]) {
      expect(await readersPage(counting), `counting=${counting}`).toContain(
        "what a page is able to count"
      )
    }
  })
})
