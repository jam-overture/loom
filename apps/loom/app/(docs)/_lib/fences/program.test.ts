import { describe, expect, it } from "vitest"

import { fencesIn } from "./extract"
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
