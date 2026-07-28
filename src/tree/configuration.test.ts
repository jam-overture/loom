import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"

import { buildElement, buildSlot, buildText } from "./builders.js"
import { configurationOf, configureNode } from "./configuration.js"

const idFactory = sequentialIdFactory()

const element = () => buildElement(idFactory, { type: "loom.card", props: { variant: "outlined" } })
const text = () => buildText(idFactory, "hello")
const slot = () => buildSlot(idFactory, "main")

describe("configurationOf", () => {
  it("exposes each kind's settable surface as a JSON record", () => {
    expect(configurationOf(element())).toEqual({ variant: "outlined" })
    expect(configurationOf(text())).toEqual({ value: "hello" })
    expect(configurationOf(slot())).toEqual({ name: "main" })
  })
})

describe("configureNode on an element", () => {
  it("merges set keys and drops unset keys", () => {
    const node = element()
    const result = configureNode(node, { set: { elevation: 2 }, unset: ["variant"] })

    expect(result.ok && result.value.kind === "element" && result.value.props).toEqual({
      elevation: 2,
    })
  })

  it("leaves the original node untouched", () => {
    const node = element()
    configureNode(node, { set: { variant: "filled" }, unset: [] })

    expect(node.props).toEqual({ variant: "outlined" })
  })

  it("accepts arbitrary prop keys, since the primitive owns their meaning", () => {
    const result = configureNode(element(), { set: { anything: { nested: [1, 2] } }, unset: [] })
    expect(result.ok).toBe(true)
  })
})

describe("configureNode on a text node", () => {
  it("sets the value", () => {
    const result = configureNode(text(), { set: { value: "goodbye" }, unset: [] })
    expect(result.ok && result.value.kind === "text" && result.value.value).toBe("goodbye")
  })

  it("rejects keys other than value", () => {
    const result = configureNode(text(), { set: { variant: "loud" }, unset: [] })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.code).toBe("unconfigurable-key")
  })

  it("rejects unsetting the required value", () => {
    const result = configureNode(text(), { set: {}, unset: ["value"] })
    expect(!result.ok && result.error.code).toBe("invalid-configuration")
  })

  it("rejects a non-string value", () => {
    const result = configureNode(text(), { set: { value: 42 }, unset: [] })
    expect(!result.ok && result.error.code).toBe("invalid-configuration")
  })
})

describe("configureNode on a slot", () => {
  it("renames the slot", () => {
    const result = configureNode(slot(), { set: { name: "secondary" }, unset: [] })
    expect(result.ok && result.value.kind === "slot" && result.value.name).toBe("secondary")
  })

  it("rejects a name that is not camelCase", () => {
    const result = configureNode(slot(), { set: { name: "Not Camel" }, unset: [] })
    expect(!result.ok && result.error.code).toBe("invalid-configuration")
  })
})

describe("patch validation", () => {
  it("rejects a key that appears in both set and unset", () => {
    const result = configureNode(element(), { set: { variant: "filled" }, unset: ["variant"] })
    expect(!result.ok && result.error.code).toBe("invalid-configuration")
  })
})
