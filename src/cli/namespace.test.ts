import { describe, expect, it } from "vitest"

import {
  FRAMEWORK_NAMESPACE,
  HOST_NAMESPACE,
  hostAlternativeFor,
  isFrameworkNamespaced,
} from "./namespace.js"

describe("isFrameworkNamespaced", () => {
  it("claims the namespace root and everything beneath it", () => {
    for (const type of ["loom", "loom.page", "loom.product-card", "loom.a.b"]) {
      expect(isFrameworkNamespaced(type), type).toBe(true)
    }
  })

  it("leaves every other name to the host", () => {
    for (const type of ["app.page", "commerce.product-card", "page", "loomish", "my.loom.card"]) {
      expect(isFrameworkNamespaced(type), type).toBe(false)
    }
  })

  /**
   * `loomish` is the one a prefix check gets wrong, and it is a real name — the
   * rule is a namespace, not a spelling, so only the separator ends it.
   */
  it("does not claim a name that merely starts with the same letters", () => {
    expect(isFrameworkNamespaced(`${FRAMEWORK_NAMESPACE}ish`)).toBe(false)
  })
})

describe("hostAlternativeFor", () => {
  it("re-namespaces the name somebody actually typed", () => {
    expect(hostAlternativeFor("loom.card")).toBe("app.card")
    expect(hostAlternativeFor("loom.product-card")).toBe("app.product-card")
  })

  it("answers a bare namespace with a bare namespace", () => {
    expect(hostAlternativeFor(FRAMEWORK_NAMESPACE)).toBe(HOST_NAMESPACE)
  })

  it("offers something the CLI would itself accept", () => {
    for (const type of ["loom", "loom.card", "loom.a.b"]) {
      expect(isFrameworkNamespaced(hostAlternativeFor(type)), type).toBe(false)
    }
  })
})
