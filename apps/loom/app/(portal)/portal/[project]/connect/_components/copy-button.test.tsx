import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CopyButton } from "./copy-button"

const clipboard = (writeText: (text: string) => Promise<void>) =>
  vi.stubGlobal("navigator", { ...globalThis.navigator, clipboard: { writeText } })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the copy button", () => {
  it("puts exactly the text it was given on the clipboard, and says so", async () => {
    const writeText = vi.fn(() => Promise.resolve())
    clipboard(writeText)

    render(<CopyButton text="lk_0123" label="Copy the key" />)
    fireEvent.click(screen.getByRole("button", { name: "Copy the key" }))

    expect(await screen.findByText("Copied")).toBeTruthy()
    expect(writeText).toHaveBeenCalledWith("lk_0123")
  })

  /**
   * A refused write that said nothing would send somebody off to paste
   * whatever was on their clipboard before — an old key, or nothing.
   */
  it("says when the browser refused the write", async () => {
    clipboard(() => Promise.reject(new Error("denied")))

    render(<CopyButton text="lk_0123" label="Copy the key" />)
    fireEvent.click(screen.getByRole("button", { name: "Copy the key" }))

    expect(await screen.findByText("Copy failed — select it instead")).toBeTruthy()
  })
})
