import { describe, expect, it } from "vitest"

import { DEFAULT_DIRECTORY, parseArguments } from "./args.js"
import type { CliCommand, CliError } from "./plan.js"

const commandOf = (...argv: readonly string[]): CliCommand => {
  const parsed = parseArguments(argv)
  if (!parsed.ok) throw new Error(`expected a command, got ${parsed.error.code}`)

  return parsed.value
}

const errorOf = (...argv: readonly string[]): CliError => {
  const parsed = parseArguments(argv)
  if (parsed.ok) throw new Error(`expected a refusal, got ${parsed.value.kind}`)

  return parsed.error
}

describe("parseArguments", () => {
  it("treats no arguments and every spelling of help as a request for usage", () => {
    for (const argv of [[], ["help"], ["--help"], ["-h"]]) {
      expect(parseArguments(argv)).toEqual({ ok: true, value: { kind: "help" } })
    }
  })

  it("defaults the directory rather than requiring it", () => {
    expect(commandOf("init")).toEqual({ kind: "init", directory: DEFAULT_DIRECTORY })
  })

  it("takes the directory from --dir, before or after the command", () => {
    expect(commandOf("init", "--dir", "app/loom")).toEqual({ kind: "init", directory: "app/loom" })
    expect(commandOf("--dir", "app/loom", "init")).toEqual({ kind: "init", directory: "app/loom" })
  })

  it("parses a primitive to add", () => {
    expect(commandOf("add", "primitive", "commerce.product-card")).toEqual({
      kind: "add-primitive",
      directory: DEFAULT_DIRECTORY,
      type: "commerce.product-card",
    })
  })

  it("refuses --dir with nothing after it, including another flag", () => {
    expect(errorOf("init", "--dir")).toEqual({ code: "missing-argument", argument: "--dir" })
    expect(errorOf("init", "--dir", "--help")).toEqual({ code: "missing-argument", argument: "--dir" })
  })

  it("refuses add without a type", () => {
    expect(errorOf("add", "primitive")).toEqual({ code: "missing-argument", argument: "<type>" })
  })

  it("refuses a subject other than primitive", () => {
    expect(errorOf("add", "widget", "x")).toEqual({ code: "unknown-command", given: "add widget" })
    expect(errorOf("add")).toEqual({ code: "unknown-command", given: "add" })
  })

  it("refuses an unknown command and an unknown flag rather than ignoring them", () => {
    expect(errorOf("deploy")).toEqual({ code: "unknown-command", given: "deploy" })
    expect(errorOf("init", "--force")).toEqual({ code: "unknown-command", given: "--force" })
  })

  it("refuses a type the tree schema would not accept, before touching a directory", () => {
    expect(errorOf("add", "primitive", "Commerce.ProductCard")).toEqual({
      code: "invalid-primitive-type",
      type: "Commerce.ProductCard",
    })
  })

  /**
   * `registry` and `registry.test` are valid primitive types, so without this a
   * primitive named either one would be written over the file that registers it.
   */
  it("refuses the two types whose modules would collide with generated files", () => {
    for (const type of ["registry", "registry.test"]) {
      expect(errorOf("add", "primitive", type)).toEqual({ code: "reserved-primitive-type", type })
    }
  })

  /**
   * The scaffold used to write `loom.page`, which is also a starter primitive —
   * so following the documentation in order produced a registry that refused
   * itself. The namespace is refused whole rather than the names taken today.
   */
  it("refuses the framework's namespace, and offers a name of the host's own", () => {
    for (const type of ["loom", "loom.page", "loom.product-card"]) {
      expect(errorOf("add", "primitive", type)).toEqual({ code: "framework-namespace", type })
    }
  })

  it("leaves a name that merely begins with the same letters alone", () => {
    expect(commandOf("add", "primitive", "loomish.card").kind).toBe("add-primitive")
  })

  /** Silently ignoring a stray argument is how someone loses a typo'd type name. */
  it("refuses arguments it has no use for", () => {
    expect(errorOf("init", "extra")).toEqual({ code: "unexpected-argument", given: "extra" })
    expect(errorOf("add", "primitive", "app.card", "extra")).toEqual({
      code: "unexpected-argument",
      given: "extra",
    })
  })
})
