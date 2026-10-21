import { describe, expect, it } from "vitest"

import {
  faultFor,
  hostFrom,
  nameFromRepository,
  readHost,
  readRegistration,
  readRename,
  repositoryFrom,
} from "./registering"

describe("the host somebody typed", () => {
  it("takes a bare host as it is", () => {
    expect(hostFrom("shop.example.com")).toBe("shop.example.com")
  })

  /**
   * The case the field exists to be kind about. People paste addresses, and a
   * form that refuses `https://shop.example.com/` is refusing the right answer
   * in the wrong clothes.
   */
  it("takes a pasted address and keeps the host out of it", () => {
    expect(hostFrom("https://shop.example.com/pricing?from=email")).toBe("shop.example.com")
  })

  it("keeps a port, which is a real thing to run on", () => {
    expect(hostFrom("localhost:3000")).toBe("localhost:3000")
  })

  it("lowercases, because a host is not case sensitive and a list is", () => {
    expect(hostFrom("Shop.Example.COM")).toBe("shop.example.com")
  })

  it("is absent when nothing was typed", () => {
    expect(hostFrom("   ")).toBeUndefined()
  })
})

describe("a host on its own, as the Connect screen reads it", () => {
  it("takes the host out of what was pasted", () => {
    expect(readHost("https://www.loomjs.org/docs")).toEqual({ ok: true, value: "www.loomjs.org" })
  })

  /** An empty box is the absence of a host, which the action turns into *any site*. */
  it("reads an empty box as no host", () => {
    expect(readHost("  ")).toEqual({ ok: true, value: undefined })
    expect(readHost(null)).toEqual({ ok: true, value: undefined })
  })

  it("says what is wrong with something that is not a host", () => {
    expect(readHost("not a host")).toEqual({
      ok: false,
      detail: "That does not look like a host. Something like shop.example.com.",
    })
  })
})

describe("the repository somebody typed", () => {
  it("takes owner/name as it is", () => {
    expect(repositoryFrom("jam-overture/loom")).toBe("jam-overture/loom")
  })

  /**
   * All three spellings are one repository, and the uniqueness 0292 asks for
   * is only as good as the spelling: a field that accepted the middle one
   * alone would let the same repository be claimed twice by two people who
   * pasted differently.
   */
  it("takes the ones people actually paste", () => {
    for (const typed of [
      "https://github.com/jam-overture/loom",
      "github.com/jam-overture/loom",
      "https://github.com/jam-overture/loom.git",
      "https://github.com/jam-overture/loom/",
      "  jam-overture/loom  ",
    ]) {
      expect(repositoryFrom(typed)).toBe("jam-overture/loom")
    }
  })

  it("reads an empty box as no repository rather than as a fault", () => {
    expect(repositoryFrom("")).toBeUndefined()
    expect(repositoryFrom("   ")).toBeUndefined()
  })

  it("takes the name out of it", () => {
    expect(nameFromRepository("jam-overture/loom")).toBe("loom")
  })
})

describe("what somebody filled in", () => {
  it("takes a name on its own", () => {
    const read = readRegistration({ name: "Storefront", host: "" })

    expect(read.ok && read.value).toEqual({
      name: "Storefront",
      host: undefined,
      repository: undefined,
    })
  })

  it("takes a repository, a name and a host", () => {
    const read = readRegistration({
      name: "Storefront",
      host: "shop.example.com",
      repository: "https://github.com/jam-overture/shop",
    })

    expect(read.ok && read.value).toEqual({
      name: "Storefront",
      host: "shop.example.com",
      repository: "jam-overture/shop",
    })
  })

  /**
   * One field, which is what 0296 buys a person registering: name a repository
   * and the project is named after it.
   */
  it("takes the name from the repository when the name is blank", () => {
    const read = readRegistration({ name: "", host: "", repository: "jam-overture/loom" })

    expect(read.ok && read.value.name).toBe("loom")
  })

  it("prefers a name somebody typed over the repository's", () => {
    const read = readRegistration({
      name: "The marketing site",
      host: "",
      repository: "jam-overture/loom",
    })

    expect(read.ok && read.value.name).toBe("The marketing site")
  })

  /**
   * Blank and blank is the one combination that cannot be resolved: nothing
   * has supplied a name. The message says both ways out rather than demanding
   * the field it happens to be attached to.
   */
  it("refuses a blank name with no repository to take one from", () => {
    const read = readRegistration({ name: "", host: "" })

    expect(read.ok).toBe(false)
    expect(!read.ok && faultFor(read.faults, "name")).toContain("name a repository")
  })

  it("refuses a repository that is not one", () => {
    const read = readRegistration({ name: "Storefront", host: "", repository: "not a repo" })

    expect(read.ok).toBe(false)
    expect(!read.ok && faultFor(read.faults, "repository")).toContain("jam-overture/loom")
  })

  it("reports every fault rather than the first", () => {
    const read = readRegistration({ name: "", host: "not a host", repository: "also not one" })

    expect(read.ok).toBe(false)
    if (read.ok) return

    expect(read.faults.map((fault) => fault.field).sort()).toEqual(["host", "name", "repository"])
  })

  it("refuses a name longer than a list can show", () => {
    const read = readRegistration({ name: "n".repeat(201), host: "" })

    expect(read.ok).toBe(false)
    expect(!read.ok && faultFor(read.faults, "name")).toContain("200")
  })
})

/**
 * Renaming, which is registering minus the project and must not disagree with
 * it about anything else.
 *
 * The rules are shared rather than restated, so these tests are mostly about
 * the one place the two operations genuinely differ: an empty host box.
 */
describe("what an application may be renamed to", () => {
  it("takes a name and a host", () => {
    const read = readRename({ name: "  The shop  ", host: "https://shop.example.com/pricing" })

    expect(read.ok && read.value).toEqual({ name: "The shop", host: "shop.example.com" })
  })

  /**
   * An empty box is reported as empty, and what that means is the action's
   * business — `ApplicationStore.rename` cannot clear a host today, so the
   * screen has to say so rather than quietly do nothing.
   */
  it("reports an emptied host as empty rather than guessing what it meant", () => {
    const read = readRename({ name: "The shop", host: "   " })

    expect(read.ok && read.value.host).toBeUndefined()
  })

  it("refuses a name it would have refused at registration", () => {
    const registered = readRegistration({ name: "", host: "" })
    const renamed = readRename({ name: "", host: "" })

    expect([registered.ok, renamed.ok]).toEqual([false, false])
    expect(!renamed.ok && faultFor(renamed.faults, "name")).toBeDefined()
  })

  it("refuses a host it would have refused at registration", () => {
    const read = readRename({ name: "Fine", host: "not a host" })

    expect(read.ok).toBe(false)
    expect(!read.ok && faultFor(read.faults, "host")).toBeDefined()
  })

  it("does not fall over on fields that are not strings", () => {
    const read = readRename({ name: 7, host: null })

    expect(read.ok).toBe(false)
  })
})
