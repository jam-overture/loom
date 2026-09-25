import { describe, expect, it } from "vitest"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"

import { versionHeading, versionMention, versionOnTheRecord } from "./version"

describe("what the portal calls a revision", () => {
  it("names the number without the runtime's word", () => {
    expect(versionMention(12)).toBe("version 12")
    expect(versionHeading(4)).toBe("Version 4")
  })

  /**
   * The rule this module exists to make keepable, asserted on the module
   * itself. Both surface forms are judged by the same list every other plain
   * sentence in this lane is judged by, and `runtimeWordsIn` takes no
   * exemption here — which is the whole point.
   */
  it.each([
    ["mention", versionMention(12)],
    ["heading", versionHeading(4)],
  ])("reads plainly as a %s", (_form, said) => {
    expect(runtimeWordsIn(said), said).toEqual([])
  })

  /**
   * The other half, and it is a requirement rather than a tolerance: the
   * record behind the disclosure has to use the runtime's own word, or a
   * reader matching a screen against the log has nothing to match.
   */
  it("keeps the runtime's word for the record", () => {
    expect(versionOnTheRecord(4)).toBe("revision 4")
    expect(runtimeWordsIn(versionOnTheRecord(4))).toEqual(["revision"])
  })

  /** The number is identity and survives every form of it — the 22 August rule. */
  it.each([0, 1, 12, 4096])("keeps the number %i on the surface", (revision) => {
    expect(versionMention(revision)).toContain(String(revision))
    expect(versionHeading(revision)).toContain(String(revision))
    expect(versionOnTheRecord(revision)).toContain(String(revision))
  })
})
