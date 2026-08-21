import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { compile } from "@mdx-js/mdx"
import { describe, expect, it } from "vitest"

import { docsRemarkPlugins } from "./mdx"

/**
 * The dialect a page is written in, compiled rather than asserted.
 *
 * A test that checked the plugin list contained `remarkGfm` would pass whether
 * or not the build used it. These compile real markdown through the same
 * exported list `next.config.ts` hands the loader, so what is checked is the
 * output a reader would get.
 *
 * The last case is the one that matters. A pipe table without GFM does not
 * fail — it becomes a paragraph of pipe characters, which is what
 * `/docs/the-runtime/what-the-gate-decides` had been shipping. Nothing on the
 * site could see it, so the check is here: every table typed into a page is
 * compiled, and a page whose table would arrive as prose fails.
 */

const docsRoot = fileURLToPath(new URL("../docs", import.meta.url))

type RemarkPlugins = NonNullable<NonNullable<Parameters<typeof compile>[1]>["remarkPlugins"]>

/**
 * The names the build hands the loader, resolved to the plugins they name.
 *
 * This is the half a string-keyed plugin list cannot check for itself. If
 * `remark-gfm` were misspelled, or dropped from `package.json` by a dependency
 * tidy-up, this import is what fails — and it fails here rather than as a page
 * that quietly stops having tables.
 */
const resolvePlugins = async (): Promise<RemarkPlugins> =>
  Promise.all(
    docsRemarkPlugins.map(async ([name, options]) => {
      const loaded: { readonly default: unknown } = await import(name)

      return [loaded.default, options] as RemarkPlugins[number]
    })
  )

const compiled = async (markdown: string): Promise<string> =>
  String(await compile(markdown, { remarkPlugins: [...(await resolvePlugins())] }))

const TABLE = ["| Answer | What happens |", "| --- | --- |", "| yes | the change is applied |"].join(
  "\n"
)

/** Every `page.mdx` on the site, as `<section>/<page>` and its source. */
const pages = (): readonly { readonly name: string; readonly source: string }[] =>
  readdirSync(docsRoot, { withFileTypes: true })
    .filter((section) => section.isDirectory())
    .flatMap((section) =>
      readdirSync(join(docsRoot, section.name), { withFileTypes: true })
        .filter((page) => page.isDirectory())
        .map((page) => ({ name: `${section.name}/${page.name}`, file: join(docsRoot, section.name, page.name, "page.mdx") }))
        .filter((page) => {
          try {
            readFileSync(page.file)
            return true
          } catch {
            return false
          }
        })
        .map((page) => ({ name: page.name, source: readFileSync(page.file, "utf8") }))
    )

const TABLE_ROW = /^\|.+\|\s*$/m

describe("the markdown a documentation page is written in", () => {
  it("makes a table out of a table", async () => {
    expect(await compiled(TABLE)).toContain('"table"')
  })

  it("does not leave a table as a paragraph of pipes", async () => {
    const output = await compiled(TABLE)

    expect(output).not.toContain("| Answer | What happens |")
  })

  it("links a bare URL, which a writer assumes", async () => {
    expect(await compiled("See https://example.com for more.")).toContain('"a"')
  })

  it("leaves ordinary prose as a paragraph", async () => {
    const output = await compiled("A change arrives as a written plan.")

    expect(output).toContain('"p"')
    expect(output).toContain("A change arrives as a written plan.")
  })
})

describe("every table typed into a page", () => {
  it("compiles to a table rather than to prose", async () => {
    const withTables = pages().filter((page) => TABLE_ROW.test(page.source))

    expect(withTables.length).toBeGreaterThan(0)

    for (const page of withTables) {
      const output = await compiled(page.source.replace(/^import .+$/gm, "").replace(/^export .+$/gm, ""))

      expect(output, page.name).toContain('"table"')
    }
  })
})
