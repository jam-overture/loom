import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { citationsIn, surfaceText, unplainWordsIn } from "./_lib/plain-language"

import ErrorBoundary from "./error"

const reset = () => {}

describe("the error boundary", () => {
  it("shows the digest, which is the only part of a server error that crosses to the browser", () => {
    const error = Object.assign(new Error("connection terminated unexpectedly"), {
      digest: "3016938765",
    })

    render(<ErrorBoundary error={error} reset={reset} />)

    expect(document.body.textContent).toContain("3016938765")
  })

  it("does not invent a digest when there is none to quote", () => {
    render(<ErrorBoundary error={new Error("boom")} reset={reset} />)

    expect(document.body.textContent).toContain("The page did not finish loading.")
    expect(document.body.textContent).not.toContain("undefined")
    expect(document.body.textContent).not.toContain("identifier is the whole of what crosses")
  })

  /*
   * The message itself is deliberately not rendered. Next replaces a server
   * error's message with a digest before it reaches the browser precisely so an
   * internal failure cannot leak through a UI, and a boundary that printed
   * `error.message` would be reintroducing that on the client-thrown path.
   */
  it("never prints the error's own message", () => {
    const error = Object.assign(new Error("password authentication failed for user 'loom'"), {
      digest: "77",
    })

    render(<ErrorBoundary error={error} reset={reset} />)

    expect(document.body.textContent).not.toContain("password authentication failed")
  })

  it("offers a retry, because most of what throws here is a read", () => {
    const onReset = vi.fn()

    render(<ErrorBoundary error={new Error("boom")} reset={onReset} />)
    screen.getByRole("button", { name: "Try again" }).click()

    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it("says the failure was on the way in, so a reader knows nothing was half-written", () => {
    render(<ErrorBoundary error={new Error("boom")} reset={reset} />)

    expect(document.body.textContent).toContain("Nothing was written")
    expect(screen.getByRole("status")).toBeInstanceOf(HTMLElement)
  })

  /**
   * This screen cited 0017 at a reader — the record saying every write goes
   * through one server-side path — on the one surface somebody reaches while
   * something has already gone wrong, and the record is the last thing they are
   * in a position to go and read. The reassurance the citation supported is
   * still the first sentence; the number is in a comment.
   */
  it("reassures without citing a document the reader has not read", () => {
    const { container } = render(<ErrorBoundary error={new Error("boom")} reset={reset} />)
    const surface = surfaceText(container)

    expect(surface).toContain("Nothing was written")
    expect(citationsIn(surface)).toEqual([])
    expect(unplainWordsIn(surface)).toEqual([])
  })
})
