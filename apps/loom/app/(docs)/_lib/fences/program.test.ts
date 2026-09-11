import { describe, expect, it } from "vitest"

import { fencesIn } from "./extract"
import { type Fence } from "./model"
import { assemble, contextExportsIn } from "./program"

/**
 * A page, read as one program.
 *
 * Everything here is a repair the assembly has to make, and each one exists
 * because prose is written for a person. A page repeats an import so a reader
 * arriving halfway down knows where a name came from; a page's last block
 * declares something the prose then discusses rather than uses; a page shows the
 * inside of a handler, imports and all. None of those is a fault in the page,
 * and every one of them is a compiler error if the blocks are simply
 * concatenated.
 */

const programOf = (source: string, context?: Parameters<typeof assemble>[2]): string =>
  assemble(fencesIn(source, "a page"), "", context).source

describe("assembling a page", () => {
  it("keeps the blocks in reading order, and says which line each came from", () => {
    const program = programOf("```ts\nconst a = 1\n```\n\ntext\n\n```ts\nconst b = a\n```")

    expect(program).toContain("// page.mdx:1 — a program")
    expect(program).toContain("// page.mdx:7 — a program")
    expect(program.indexOf("const a = 1")).toBeLessThan(program.indexOf("const b = a"))
  })

  it("merges an import a page makes twice, rather than declaring the name twice", () => {
    const program = programOf(
      '```ts\nimport { a } from "x"\n\na()\n```\n\n```ts\nimport { a, b } from "x"\n\nb(a)\n```'
    )

    expect(program).toContain('import { a, b } from "x"')
    expect(program.match(/^import /gm)).toHaveLength(1)
  })

  it("keeps a type-only import type-only, because verbatimModuleSyntax means it matters", () => {
    const program = programOf('```ts\nimport type { T } from "x"\nimport { v } from "x"\n\nconst n: T = v\n```')

    expect(program).toContain('import { v } from "x"')
    expect(program).toContain('import type { T } from "x"')
  })

  /**
   * Ten markers on this site were being dropped, and every one of them belonged
   * to a block that opened with an import. Written above the block, the marker is
   * the *import's* leading comment — and imports are hoisted and merged, so the
   * comment went with it. The blocks that lost theirs were the ones a reader is
   * most likely to copy whole, and a compiler error in one named no page line.
   */
  it("marks a block that opens with an import, where the marker used to be lost", () => {
    const program = programOf('```ts\nimport { f } from "x"\n\nconst a = f()\n```')

    expect(program).toContain("// page.mdx:1 — a program")
    expect(program.indexOf('import { f } from "x"')).toBeLessThan(program.indexOf("// page.mdx:1"))
  })

  it("exports what the page declared, so a name the prose discusses is not an unused local", () => {
    const program = programOf("```ts\nconst answer = 1\n\ntype Answer = number\n```")

    expect(program).toContain("export { answer }")
    expect(program).toContain("export type { Answer }")
  })

  it("exports a name the page took apart, one per binding", () => {
    expect(programOf("```ts\nconst { one, two } = f()\n```")).toContain("export { one, two }")
  })

  it("exports an imported name too, so a page may show an import and nothing else", () => {
    const program = programOf('```ts\nimport { createStarterPrimitiveRegistry } from "x"\n```')

    expect(program).toContain("export { createStarterPrimitiveRegistry }")
  })

  it("does not export a name the page already exported itself", () => {
    const program = programOf("```ts\nexport const stat = 1\n\nconst other = 2\n```")

    expect(program).toContain("export { other }")
    expect(program).not.toContain("export { stat")
  })

  it("puts the outside back on the inside of an object literal", () => {
    const program = programOf("```ts object-body\nlevel: 1,\n```")

    expect(program).toContain("const objectAtLine1 = {\nlevel: 1,\n}")
  })

  it("puts the outside back on the inside of a function, so a return is legal", () => {
    const program = programOf("```ts function-body\nreturn 1\n```")

    expect(program).toContain("const functionAtLine1 = async () => {\nreturn 1\n}")
  })

  it("lifts an import out of a function body, where it would be a syntax error", () => {
    const program = programOf('```ts function-body\nimport { f } from "x"\n\nreturn f()\n```')

    expect(program.indexOf('import { f } from "x"')).toBeLessThan(program.indexOf("const functionAtLine1"))
    expect(program).toContain("async () => {\nreturn f()\n}")
  })

  it("leaves a sketch out of the program entirely", () => {
    expect(programOf("```ts sketch\nf(…)\n```")).not.toContain("f(…)")
  })

  it("is a .tsx file when one block on the page has JSX in it", () => {
    const ts = assemble(fencesIn("```ts\nconst a = 1\n```", "a page"), "")
    const tsx = assemble(fencesIn("```tsx function-body\nreturn <p />\n```", "a page"), "")

    expect(ts.extension).toBe("ts")
    expect(tsx.extension).toBe("tsx")
  })
})

/**
 * What a page borrows from its story.
 *
 * The narrowing is the point: a context file that offered ten names to a page
 * using two would import eight unused locals, which the application compiles
 * with as an error. So the import is the intersection, and a context export that
 * no page uses is dead weight `compiled.test.ts` refuses separately.
 */
describe("the story a page assumes", () => {
  const context = {
    specifier: "../context/a-page",
    exports: [
      { name: "session", isType: false },
      { name: "unused", isType: false },
      { name: "Given", isType: true },
    ],
  }

  it("imports only the names the page actually uses", () => {
    const program = programOf("```ts\nconst who: Given = session\n```", context)

    expect(program).toContain('import { session } from "../context/a-page"')
    expect(program).toContain('import type { Given } from "../context/a-page"')
    expect(program).not.toContain("unused")
  })

  it("does not import a name that only looks like one, inside a longer word", () => {
    expect(programOf("```ts\nconst a = sessionStorage\n```", context)).not.toContain("../context/a-page")
  })

  it("stands back from a name the page declares for itself", () => {
    const program = programOf("```ts\nconst session = { userId: \"u1\" }\n\nconst who = session.userId\n```", context)

    expect(program).not.toContain("../context/a-page")
    expect(program).toContain('const session = { userId: "u1" }')
  })

  it("reads what a context file offers, declarations and re-exports alike", () => {
    const offered = contextExportsIn(
      [
        'import type { LoomTree } from "@loom/runtime"',
        "export declare const page: LoomTree",
        "const hidden = 1",
        'export { buildElement } from "@loom/runtime"',
        'export type { EditIntent } from "@loom/runtime"',
      ].join("\n"),
      "a-page.ts"
    )

    expect(offered).toEqual([
      { name: "page", isType: false },
      { name: "buildElement", isType: false },
      { name: "EditIntent", isType: true },
    ])
  })
})

/**
 * A block that redoes the block above it.
 *
 * *Going to production* names three stores, wires them to memory, and then wires
 * the same three names to Postgres — because swapping one for the other being a
 * line of wiring is the whole lesson. Read as one program that is three
 * redeclarations, and the only vocabulary that existed for it was `sketch`,
 * which would have left the deployment half of the page unchecked.
 *
 * So an alternative is assembled on its own. What it must still be able to see
 * is what the page had already established, which is why the blocks before it
 * come along — for their imports, not their code.
 */
describe("an alternative", () => {
  const page = [
    '```ts',
    'import { one } from "x"',
    "",
    "const store = one()",
    "```",
    "",
    "```ts alternative",
    'import { two } from "y"',
    "",
    "const store = two(one)",
    "```",
  ].join("\n")

  const fences = fencesIn(page, "a page")
  const alternative = fences[1] as Fence

  it("is a program of its own, not a continuation of the one above it", () => {
    const program = assemble([alternative], "", undefined, fences.slice(0, 1)).source

    expect(program).toContain("const store = two(one)")
    expect(program).not.toContain("const store = one()")
    expect(program.match(/const store/g)).toHaveLength(1)
  })

  it("inherits an import the page made before it, because the page will not repeat it", () => {
    const program = assemble([alternative], "", undefined, fences.slice(0, 1)).source

    expect(program).toContain('import { two } from "y"')
    expect(program).toContain('import { one } from "x"')
  })

  it("inherits only what it reaches for", () => {
    const before = fencesIn('```ts\nimport { one, spare } from "x"\n\nconst a = one(spare)\n```', "a page")
    const program = assemble([alternative], "", undefined, before).source

    expect(program).toContain('import { one } from "x"')
    expect(program).not.toContain("spare")
  })

  it("says in its own words what it is, so a compiler error names the right block", () => {
    expect(assemble([alternative], "", undefined, fences.slice(0, 1)).source).toContain(
      "// page.mdx:7 — the same job as the block above, done differently"
    )
  })
})
