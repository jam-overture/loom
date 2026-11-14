import { describe, expect, it } from "vitest"

import { READER_WINDOWS, WINDOW_LENGTH, readReaderWindow } from "./reader-windows"

describe("readReaderWindow", () => {
  it("takes each of the four choices", () => {
    expect(READER_WINDOWS.map((window) => readReaderWindow(window))).toEqual(
      READER_WINDOWS.map((window) => ({ ok: true, value: window }))
    )
  })

  it.each([null, undefined, "", "2h", "30d", "OFF", 1])("refuses %j with a sentence", (sent) => {
    expect(readReaderWindow(sent)).toEqual({ ok: false, error: "Choose one of the four." })
  })
})

describe("WINDOW_LENGTH", () => {
  it("holds nobody when Off and nobody longer than seven days", () => {
    expect(WINDOW_LENGTH.off).toBe(0)
    expect(Math.max(...Object.values(WINDOW_LENGTH))).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it("grows with each choice, in the order Settings lists them", () => {
    const lengths = READER_WINDOWS.map((window) => WINDOW_LENGTH[window])

    expect(lengths).toEqual([...lengths].sort((left, right) => left - right))
    expect(new Set(lengths).size).toBe(READER_WINDOWS.length)
  })
})
