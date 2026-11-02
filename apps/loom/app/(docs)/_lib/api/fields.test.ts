import { describe, expect, it } from "vitest"

import {
  cutDeclarations,
  declaredNamesIn,
  isJargon,
  publishedFields,
  publishedFieldsIn,
} from "./fields"
import { publishedNames } from "./mentions"
import { apiEntries } from "./reference"

/**
 * **The second vocabulary a reader can be handed and cannot look up.**
 *
 * Split the way `plain.test.ts` and `weight.test.ts` are: the **rule** is held
 * against the real reference, and the **reader** against signatures written
 * here to exercise it. A reader held only against whatever the package
 * publishes this week is a reader whose rules are whatever today's declarations
 * happen to do.
 */
describe("the names a published type declares inside itself", () => {
  /**
   * The claim the whole module rests on, and the one worth stating as a test
   * rather than as a paragraph: **camelCase is a fact about a spelling.**
   */
  describe("what makes a name jargon by construction", () => {
    it("is a capital letter after a lowercase one", () => {
      expect(isJargon("baseRevision")).toBe(true)
      expect(isJargon("idFactory")).toBe(true)
      expect(isJargon("atMs")).toBe(true)
    })

    it("is not true of one lowercase word, which is how an English word gets out", () => {
      expect(isJargon("disposition")).toBe(false)
      expect(isJargon("summary")).toBe(false)
      expect(isJargon("body")).toBe(false)
    })

    /**
     * A Pascal name is a declaration's own name far more often than a field's,
     * and where it is an export the export rule already has it. Left out here
     * so the two sets stay one set each.
     */
    it("is not true of a Pascal name, which the export rule is about", () => {
      expect(isJargon("TreeDelta")).toBe(false)
    })
  })

  describe("the reader, against signatures written to exercise it", () => {
    const signature = [
      "type Example = {",
      "    readonly baseRevision: string;",
      "    idFactory?: () => string;",
      "    whenProps(): void;",
      "} | {",
      "    nodeId: string;",
      "}",
    ].join("\n")

    it("reads a member however it is declared, and both sides of a union", () => {
      expect(declaredNamesIn(signature)).toEqual([
        "baseRevision",
        "idFactory",
        "whenProps",
        "nodeId",
      ])
    })

    it("does not read the declaration's own name, which is the door", () => {
      expect(declaredNamesIn(signature)).not.toContain("Example")
    })

    /**
     * The stated cost of counting lines instead of writing a parser, asserted
     * rather than described so that nobody later reads it as a bug. A reader who
     * meets `renderOptions` in the first sentence of a page is equally lost
     * whether it is a field or an argument.
     */
    it("reads a parameter on its own line too, which is the price of no parser", () => {
      const fn = ["type F = (", "    treeId: string,", "    renderOptions: RenderOptions", ") => void"].join("\n")

      expect(declaredNamesIn(fn)).toEqual(["treeId", "renderOptions"])
    })

    it("reads nothing from a declaration that fits on one line", () => {
      expect(declaredNamesIn("type Revision = string")).toEqual([])
    })
  })

  describe("the set, against the reference the site really renders", () => {
    it("holds a few hundred names rather than none, so finding none elsewhere means something", () => {
      expect(publishedFields.size).toBeGreaterThan(200)
    })

    /**
     * The brief's own example of the failure names three things. This is the
     * second of them, and before this module existed nothing on this site could
     * see it.
     */
    it("holds `baseRevision`, which is two of the brief's three names between it and the export rule", () => {
      expect(publishedNames.has("TreeDelta")).toBe(true)
      expect(publishedFields.has("baseRevision")).toBe(true)
    })

    /**
     * The stated limit, held as a test so the next reader of this module finds
     * the gap asserted rather than has to notice it. `disposition` is a field on
     * four published types and is exactly the noun the brief complains about;
     * the rule that would catch it is the rule that also flags *body*.
     */
    it("does not hold `disposition`, which is the half of the brief it cannot reach", () => {
      expect(publishedFields.has("disposition")).toBe(false)
      expect(publishedFields.has("summary")).toBe(false)
      expect(publishedFields.has("body")).toBe(false)
      expect(publishedFields.has("code")).toBe(false)
      expect(publishedFields.has("theme")).toBe(false)
    })

    it("holds no name that is already an export, so nothing is reported twice", () => {
      expect([...publishedFields].filter((name) => publishedNames.has(name))).toEqual([])
    })

    /**
     * The measured property that makes the narrow rule safe where the wide one
     * was not. `loom` and `primitives` are both field names on something this
     * package publishes, so a rule over the whole field set fires on a summary
     * that writes a package specifier in backticks.
     */
    it("holds no segment of any specifier, so an import in backticks is not a fault", () => {
      const segments = apiEntries.flatMap((entry) =>
        entry.specifier.split(/[^A-Za-z0-9_$]+/).filter((segment) => segment !== "")
      )

      expect(segments).toContain("primitives")
      expect(segments.filter((segment) => publishedFields.has(segment))).toEqual([])
      expect(publishedFieldsIn("`@jam-overture/loom/signals/broadcast`")).toEqual([])
    })

    /**
     * A `value`'s insides are its contents rather than a vocabulary, and reading
     * them is how another package's internals reach this site's rules.
     */
    it("holds nothing from a published map or a third party's column", () => {
      expect(publishedFields.has("railBody")).toBe(false)
      expect(publishedFields.has("coverLink")).toBe(false)
      expect(publishedFields.has("isAutoincrement")).toBe(false)
      expect(publishedFields.has("driverParam")).toBe(false)
    })
  })

  describe("what counts as naming one", () => {
    it("reads an identifier in code", () => {
      expect(publishedFieldsIn("const r = delta.baseRevision")).toEqual([])
      expect(publishedFieldsIn("baseRevision")).toEqual(["baseRevision"])
    })

    /**
     * `api/mentions.ts` owns the identifier rule and both vocabularies read
     * through it, so `delta.baseRevision` cannot fire for one and not the other.
     */
    it("does not read a name behind a dot, for the reason `result.ok` does not", () => {
      expect(publishedFieldsIn("Read `delta.baseRevision` to see which revision it was against")).toEqual([])
    })
  })

  /**
   * The limit that has a number instead of a sentence: the names below a cut
   * declaration are not in the file this module reads, so they are names it will
   * never flag.
   */
  describe("the declarations it is only shown part of", () => {
    it("names the eleven that are cut, and how many lines each one hides", () => {
      expect(cutDeclarations.length).toBe(11)
      expect(cutDeclarations.map(({ name }) => name)).toContain("RenderDiagnostic")
      expect(cutDeclarations.every(({ hidden }) => hidden > 0)).toBe(true)
    })

    it("hides enough lines to be worth saying out loud", () => {
      expect(cutDeclarations.reduce((total, { hidden }) => total + hidden, 0)).toBeGreaterThan(400)
    })
  })
})
