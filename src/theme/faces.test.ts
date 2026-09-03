import { describe, expect, it } from "vitest"

import {
  declaredFaces,
  facesForRole,
  familiesWithoutSource,
  familyStackForRole,
  FACE_ROLES,
  fontFaceRules,
  GENERIC_FAMILIES,
  isGenericFamily,
  leadingFamily,
} from "./faces.js"
import {
  ADDITIONAL_FONT_PACKS,
  interUiFontPack,
  monoFontPack,
  workhorseFontPack,
} from "./font-packs.js"
import { minimalSansFontPack, STARTER_FONT_PACKS } from "./library.js"
import { fontFaceSchema, fontPackSchema, type FontPack } from "./theme.js"

const withFaces = (faces: readonly unknown[]): FontPack =>
  fontPackSchema.parse({
    ...interUiFontPack,
    id: "under-test",
    faces,
  })

describe("leadingFamily", () => {
  it("takes the family a stack is actually about", () => {
    expect(leadingFamily("Inter, system-ui, sans-serif")).toBe("Inter")
  })

  /**
   * The quotes are the stack's syntax, not part of the name. A `@font-face`
   * rule and a renderer's font table both want `Space Grotesk`, so stripping
   * them here is what lets one declaration answer both.
   */
  it("strips the quotes a multi-word family is written with", () => {
    expect(leadingFamily("'Space Grotesk', system-ui")).toBe("Space Grotesk")
    expect(leadingFamily('"Geist Sans", ui-sans-serif')).toBe("Geist Sans")
  })

  it("reads a one-family stack, and an empty one", () => {
    expect(leadingFamily("serif")).toBe("serif")
    expect(leadingFamily("")).toBe("")
  })
})

describe("isGenericFamily", () => {
  it("knows every generic it lists, however it is cased or spaced", () => {
    for (const generic of GENERIC_FAMILIES) {
      expect(isGenericFamily(generic)).toBe(true)
      expect(isGenericFamily(` ${generic.toUpperCase()} `)).toBe(true)
    }
  })

  it("does not mistake a named face for a generic", () => {
    expect(isGenericFamily("Inter")).toBe(false)
    expect(isGenericFamily("Helvetica Neue")).toBe(false)
  })
})

describe("familyStackForRole", () => {
  it("answers for all three roles, and undefined where a pack declined mono", () => {
    expect(familyStackForRole(monoFontPack, "heading")).toBe(monoFontPack.headingFamily)
    expect(familyStackForRole(monoFontPack, "body")).toBe(monoFontPack.bodyFamily)
    expect(familyStackForRole(monoFontPack, "mono")).toBe(monoFontPack.monoFamily)
    expect(familyStackForRole(interUiFontPack, "mono")).toBeUndefined()
  })

  it("names every role the pack has a family field for", () => {
    expect([...FACE_ROLES]).toEqual(["heading", "body", "mono"])
  })
})

describe("declaredFaces", () => {
  /**
   * The property the starter library is meant to have, asserted rather than
   * described. Every pack it ships renders with no network at all, which is
   * what makes it safe on a host whose egress is closed — and this is the test
   * that fails the day somebody adds a CDN address to one.
   */
  it("is empty for every pack the starter library ships", () => {
    for (const pack of [...STARTER_FONT_PACKS, ...ADDITIONAL_FONT_PACKS]) {
      expect(declaredFaces(pack)).toEqual([])
    }
  })

  it("hands back what a host declared, in order", () => {
    const pack = withFaces([
      { family: "Inter", weight: 400, source: "/fonts/inter-400.woff2", format: "woff2" },
      { family: "Inter", weight: 650, source: "/fonts/inter-650.woff2", format: "woff2" },
    ])

    expect(declaredFaces(pack).map((face) => face.weight)).toEqual([400, 650])
  })
})

describe("facesForRole", () => {
  const pack = withFaces([
    { family: "Inter", weight: 400, source: "/fonts/inter-400.woff2" },
    { family: "Inter", weight: 650, source: "/fonts/inter-650.woff2" },
    { family: "Fraunces", weight: 700, source: "/fonts/fraunces-700.woff2" },
  ])

  it("gives a role every weight declared for the family it leads with", () => {
    expect(facesForRole(pack, "heading").map((face) => face.weight)).toEqual([400, 650])
  })

  /**
   * Matched on family rather than role, so one declaration serves every role
   * asking for that face. `inter-ui` sets heading and body to the same stack,
   * and a host should not have to say so twice.
   */
  it("answers the same for two roles that lead with one family", () => {
    expect(facesForRole(pack, "body")).toEqual(facesForRole(pack, "heading"))
  })

  it("is empty for a role the pack declares no family for", () => {
    expect(facesForRole(pack, "mono")).toEqual([])
  })

  it("is empty for a declared face no role asks for", () => {
    const unused = declaredFaces(pack).filter((face) => face.family === "Fraunces")

    expect(unused).toHaveLength(1)
    expect(FACE_ROLES.flatMap((role) => facesForRole(pack, role))).not.toContainEqual(unused[0])
  })
})

describe("familiesWithoutSource", () => {
  /**
   * The question a renderer actually has. A browser finds `Source Sans 3` or
   * falls back through the stack and the page still reads; something drawing
   * text itself has neither the face nor the fallback, so each entry here is a
   * silent substitution waiting to happen.
   */
  it("names the faces a pack asks for and does not address", () => {
    expect(familiesWithoutSource(workhorseFontPack)).toEqual([
      "Source Sans 3",
      "Source Serif 4",
      "Source Code Pro",
    ])
  })

  it("says nothing about a generic, which has no address to give", () => {
    const systemOnly = fontPackSchema.parse({
      ...interUiFontPack,
      id: "system-only",
      headingFamily: "system-ui, sans-serif",
      bodyFamily: "serif",
      monoFamily: "monospace",
    })

    expect(familiesWithoutSource(systemOnly)).toEqual([])
  })

  it("names a family once however many roles lead with it", () => {
    expect(familiesWithoutSource(interUiFontPack)).toEqual(["Inter"])
  })

  it("drops a family the moment the pack says where it is", () => {
    const sourced = withFaces([
      { family: "Inter", weight: 400, source: "/fonts/inter-400.woff2" },
    ])

    expect(familiesWithoutSource(interUiFontPack)).toEqual(["Inter"])
    expect(familiesWithoutSource(sourced)).toEqual([])
  })

  it("is unmoved by how a family is cased or quoted", () => {
    const sourced = fontPackSchema.parse({
      ...minimalSansFontPack,
      id: "cased",
      faces: [{ family: "geist", weight: 400, source: "/fonts/geist.woff2" }],
    })

    expect(familiesWithoutSource(minimalSansFontPack)).toContain("Geist")
    expect(familiesWithoutSource(sourced)).not.toContain("Geist")
  })
})

describe("fontFaceRules", () => {
  it("is empty for a pack that declares no faces, so nothing has a case to handle", () => {
    expect(fontFaceRules(interUiFontPack)).toBe("")
  })

  it("writes a rule a browser can read, with the format when one is given", () => {
    const pack = withFaces([
      { family: "Inter", weight: 400, source: "/fonts/inter-400.woff2", format: "woff2" },
    ])

    expect(fontFaceRules(pack)).toBe(
      [
        "@font-face {",
        '  font-family: "Inter";',
        "  font-style: normal;",
        "  font-weight: 400;",
        '  src: url("/fonts/inter-400.woff2") format("woff2");',
        "}",
      ].join("\n")
    )
  })

  it("omits the format hint when the pack did not give one", () => {
    const pack = withFaces([{ family: "Inter", weight: 400, source: "/fonts/inter.woff2" }])

    expect(fontFaceRules(pack)).toContain('src: url("/fonts/inter.woff2");')
  })

  it("separates two faces into two rules", () => {
    const pack = withFaces([
      { family: "Inter", weight: 400, source: "/a.woff2" },
      { family: "Inter", weight: 650, source: "/b.woff2", format: "woff2" },
    ])

    expect(fontFaceRules(pack).match(/@font-face/g)).toHaveLength(2)
    expect(fontFaceRules(pack)).toContain('src: url("/a.woff2");')
    expect(fontFaceRules(pack)).toContain('src: url("/b.woff2") format("woff2");')
  })

  it("carries an italic through as the style it is", () => {
    const pack = withFaces([
      { family: "Inter", weight: 400, style: "italic", source: "/i.woff2" },
    ])

    expect(fontFaceRules(pack)).toContain("font-style: italic;")
  })
})

describe("fontFaceSchema", () => {
  it("defaults a face to upright, because most are", () => {
    expect(fontFaceSchema.parse({ family: "Inter", weight: 400, source: "/i.woff2" }).style).toBe(
      "normal"
    )
  })

  /**
   * Both fields are interpolated into CSS by `fontFaceRules`, so a quote or a
   * brace in either would close the declaration and let whatever follows be
   * read as rules. Refused at the schema rather than escaped at the writer:
   * a pack is registered once and rendered repeatedly.
   */
  it("refuses a family or a source that could close a CSS declaration", () => {
    for (const bad of ['In"ter', "In'ter", "Inter}", "Inter{", "Inter;", "In\nter"]) {
      expect(fontFaceSchema.safeParse({ family: bad, weight: 400, source: "/i.woff2" }).success).toBe(
        false
      )
      expect(fontFaceSchema.safeParse({ family: "Inter", weight: 400, source: bad }).success).toBe(
        false
      )
    }
  })

  it("refuses a weight that is not a positive whole number", () => {
    for (const weight of [0, -400, 400.5]) {
      expect(
        fontFaceSchema.safeParse({ family: "Inter", weight, source: "/i.woff2" }).success
      ).toBe(false)
    }
  })
})
