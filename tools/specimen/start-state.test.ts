// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest"

import { BLOCK_STORAGE_SCRIPT, scriptFor, seedStorageScript } from "./start-state.js"

/**
 * The half a lane cannot see, run the way the browser runs it.
 *
 * Everywhere else in this directory the browser is a double and what is
 * asserted is that the adapter *asked* for the right thing. This is the thing
 * itself, and it is evaluated from its source rather than called as a
 * function, because source is what ships. A start state that fails in the page
 * fails silently: the init script throws where nothing is listening and what
 * comes back is a correct-looking photograph of the ordinary load.
 */
const run = (script: string): void => {
  new Function(script)()
}

/**
 * `BLOCK_STORAGE_SCRIPT` replaces the accessor on the document it runs in, and
 * in a real run that document goes away with the context. Here it is shared
 * with every test after it, so the original is put back — which also happens
 * to exercise the `configurable` flag the script is careful to set.
 */
const working = Object.getOwnPropertyDescriptor(window, "localStorage")

beforeEach(() => {
  if (working !== undefined) Object.defineProperty(window, "localStorage", working)
  window.localStorage.clear()
})

describe("what the browser starts with", () => {
  it("puts every key a shot named where the page will read it", () => {
    run(seedStorageScript({ "loom.lessons.progress.v1": "{{{", "loom.theme": "dark" }))

    expect(window.localStorage.getItem("loom.lessons.progress.v1")).toBe("{{{")
    expect(window.localStorage.getItem("loom.theme")).toBe("dark")
  })

  /** A record carried from another machine overwrites whatever was there. */
  it("overwrites a key the document already had, and leaves one it did not name", () => {
    window.localStorage.setItem("loom.lessons.progress.v1", "{}")
    window.localStorage.setItem("kept", "1")

    run(seedStorageScript({ "loom.lessons.progress.v1": '{"3":"done"}' }))

    expect(window.localStorage.getItem("loom.lessons.progress.v1")).toBe('{"3":"done"}')
    expect(window.localStorage.getItem("kept")).toBe("1")
  })

  /**
   * A record is a lane's arbitrary text and a shot list is JSON, so a quote,
   * a backslash and a newline all reach here intact. The failure this prevents
   * is not a wrong picture: it is a value that ends the literal and becomes
   * program.
   */
  it("carries a value that would end the literal, without becoming program", () => {
    const awkward = '{"note":"she said \\"no\\"","path":"C:\\\\tmp","line":"a\\nb"}'

    run(seedStorageScript({ "loom.lessons.progress.v1": awkward }))

    expect(window.localStorage.getItem("loom.lessons.progress.v1")).toBe(awkward)
  })

  it("carries a key that would end the literal too", () => {
    run(seedStorageScript({ 'a"b\\c': "1" }))

    expect(window.localStorage.getItem('a"b\\c')).toBe("1")
  })

  /**
   * Legal inside a JSON string, and a line terminator inside a JavaScript one
   * until ES2019. Escaped anyway, because the cost is one `replace` and the
   * failure is a syntax error in a page nothing is watching.
   */
  it("escapes the two characters JSON is allowed to leave raw", () => {
    const script = seedStorageScript({ k: "a\u2028b\u2029c" })

    expect(script).not.toMatch(/[\u2028\u2029]/)
    run(script)
    expect(window.localStorage.getItem("k")).toBe("a\u2028b\u2029c")
  })

  /**
   * On the access, not on `getItem`. A page that guards the call and not the
   * property is exactly the page worth photographing, and a block that only
   * threw from `getItem` would photograph it working.
   */
  it("makes reaching for storage throw a SecurityError, which is the name a page looks at", () => {
    run(BLOCK_STORAGE_SCRIPT)

    expect(() => window.localStorage).toThrow(DOMException)
    try {
      void window.localStorage
      expect.unreachable("reaching for blocked storage should have thrown")
    } catch (thrown) {
      expect((thrown as DOMException).name).toBe("SecurityError")
    }
  })

  /**
   * A non-configurable accessor makes the document unrecoverable inside its
   * own context, which is the instrument leaking into the subject — and, here,
   * a test that poisons every test after it.
   */
  it("leaves the accessor replaceable, so the block is the shot's and not the run's", () => {
    run(BLOCK_STORAGE_SCRIPT)

    expect(Object.getOwnPropertyDescriptor(window, "localStorage")?.configurable).toBe(true)
  })

  it("gives each member of a start state its own script, and nothing else", () => {
    expect(scriptFor({ storage: { a: "1" } })).toBe(seedStorageScript({ a: "1" }))
    expect(scriptFor({ storageBlocked: true })).toBe(BLOCK_STORAGE_SCRIPT)
  })

  it("ships source that names nothing a compiler would have had to supply", () => {
    for (const script of [BLOCK_STORAGE_SCRIPT, seedStorageScript({ a: "1" })]) {
      expect(script).not.toMatch(/\b__\w+\b/)
      expect(() => new Function(script)).not.toThrow()
    }
  })
})
