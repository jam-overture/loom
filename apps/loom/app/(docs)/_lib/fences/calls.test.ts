import { describe, expect, it } from "vitest"

import { calls, namesCalledIn } from "./calls"

/**
 * **A name a block uses is one it reads, not one it spells.**
 *
 * The two cases that justify a parse over a regular expression are the first
 * two below, and both are real pages. A doc comment on *A primitive of your
 * own* says *"it cannot invent `on fire`"*, which a word search reads as a call
 * to `it` from `vitest` — a demand for an import to serve a sentence. And
 * `const name = "createTree"` is not a call to anything, which is the direction
 * that would mark a reader as served when they are not.
 */
describe("the names a block reads", () => {
  const reads = (code: string) => namesCalledIn(code, "ts")

  it("does not read a word in a comment", () => {
    expect(reads("/** A model may move it; it cannot invent one. */\nconst a = 1").has("it")).toBe(false)
  })

  it("does not read a name inside a string", () => {
    expect(reads('const name = "createTree"').has("createTree")).toBe(false)
  })

  it("reads a call", () => {
    expect(calls("it", 'it("holds the price", () => {})', "ts")).toBe(true)
    expect(calls("createTree", "const tree = createTree(ids)", "ts")).toBe(true)
  })

  it("reads a name used as a type", () => {
    expect(calls("LoomTree", "const tree: LoomTree = read()", "ts")).toBe(true)
  })

  /*
   * `api/mentions.ts` excludes the same thing for the same reason: `result.ok`
   * is a property read on a value, and the `ok` this package exports is the
   * function that made it. They share a spelling and nothing else.
   */
  it("does not read the part of an expression after a dot", () => {
    expect(calls("ok", "if (!outcome.ok) return", "ts")).toBe(false)
    expect(calls("outcome", "if (!outcome.ok) return", "ts")).toBe(true)
  })

  it("does not read the key of an object literal", () => {
    expect(calls("price", "const props = { price: 1 }", "ts")).toBe(false)
  })

  it("does read a shorthand key, which is a name in scope", () => {
    expect(calls("price", "const props = { price }", "ts")).toBe(true)
  })

  it("does not read a name the block declares for itself", () => {
    expect(calls("tree", "const tree = 1", "ts")).toBe(false)
    expect(calls("markFor", "const markFor = (resolved: string) => resolved", "ts")).toBe(false)
    expect(calls("resolved", "const markFor = (resolved: string) => resolved", "ts")).toBe(true)
  })

  it("does not read the name an import binds, which is the door rather than the call", () => {
    expect(calls("createTree", 'import { createTree } from "@jam-overture/loom"', "ts")).toBe(false)
  })

  it("reads a component in tsx, which is a name that needs a door like any other", () => {
    expect(calls("Stat", "const bar = <Stat value={1} />", "tsx")).toBe(true)
    expect(calls("value", "const bar = <Stat value={1} />", "tsx")).toBe(false)
  })

  /*
   * A fragment is not a program and its parse is full of errors it declared it
   * would have. That costs nothing: what is being excluded — comments and
   * strings — is lexical rather than grammatical.
   */
  it("reads a fragment, which does not parse as a program", () => {
    expect(namesCalledIn('props: {\n  "loom:theme": { palette: minimalPalette },\n}', "ts")).toContain(
      "minimalPalette"
    )
  })
})
