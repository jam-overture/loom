import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderHeld } from "./held-render"
import { ONLY } from "./held"
import { buildFragment, prose } from "./loom"

/**
 * A held fragment, over the wire and back.
 *
 * The round trip through JSON is the test, not scenery: what the reader
 * receives is a static file, parsed by a browser, and the tree in it was
 * serialised by a build that has since finished. Everything in this file goes
 * through `JSON.parse(JSON.stringify(...))` for that reason — a tree that
 * renders in the process that built it and not in the one that fetched it is
 * exactly the failure this split could introduce.
 */

const sent = (text: string): unknown =>
  JSON.parse(JSON.stringify({ slots: { [ONLY]: buildFragment((ids) => [prose(ids, text)], "held") } }))

describe("rendering what arrived", () => {
  it("renders the slot it was asked for, through the course's own registry", () => {
    render(<>{renderHeld(sent("Because there is no path back into the function."), ONLY)}</>)

    expect(screen.getByText(/no path back into the function/)).toBeTruthy()
  })

  it("refuses a document with no such slot rather than rendering nothing", () => {
    expect(() => renderHeld(sent("An answer."), "3")).toThrow(/no slot "3"/)
  })

  it("refuses anything that is not a tree, because it did not build what it was sent", () => {
    expect(() => renderHeld({ slots: { [ONLY]: { root: "not a node" } } }, ONLY)).toThrow(
      /did not parse/
    )
  })

  it("refuses a response that is not a held document at all", () => {
    expect(() => renderHeld("<html>a login page</html>", ONLY)).toThrow(/without any slots/)
  })
})
