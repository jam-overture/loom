import { renderLoomTree } from "@loom/runtime/react"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { docsRegistry, docsThemes } from "@/app/(docs)/_lib/loom/registry"

import { docsExamples, docsExampleIds } from "./catalogue"

/**
 * Every example on the site, mounted.
 *
 * This is the test §4c is buying with its "an example is a registry entry"
 * decision. A documentation site whose examples are snippets goes stale
 * silently — the prose keeps claiming something the library stopped doing, and
 * the only way anyone finds out is by trying it. Here the examples are trees,
 * so a primitive whose schema tightened, a prop that was renamed, or a theme id
 * that was retired takes the documentation red on the next run.
 *
 * A render diagnostic fails the suite rather than being reported. Rendering is
 * total: an unknown primitive or an invalid prop still produces an element, so
 * "it rendered" is not evidence of anything on its own.
 */

describe("the documented examples", () => {
  it("registers at least one", () => {
    expect(docsExampleIds.length).toBeGreaterThan(0)
  })

  it("keys each entry by its own id", () => {
    for (const [id, example] of docsExamples) expect(example.id).toBe(id)
  })

  for (const id of docsExampleIds) {
    const example = docsExamples.get(id)

    it(`renders "${id}" with nothing the runtime could not honour`, () => {
      if (example === undefined) throw new Error(`no example is registered as "${id}"`)

      const rendered = renderLoomTree(example.build(), {
        resolver: docsRegistry,
        validator: docsRegistry,
        themes: docsThemes,
      })

      expect(rendered.diagnostics).toEqual([])

      /**
       * A tree that names no theme renders with none of the `--loom-*`
       * properties set: legal, diagnostic-free, and indistinguishable from a
       * stylesheet that failed to load. Only the root primitive mounts a theme,
       * so this also catches an example whose root stopped being one.
       */
      expect(rendered.theme, "the example mounts no theme").toBeDefined()

      const { container } = render(rendered.element)

      expect(container.textContent?.trim().length ?? 0).toBeGreaterThan(0)
    })

    it(`builds "${id}" identically every time`, () => {
      if (example === undefined) throw new Error(`no example is registered as "${id}"`)

      expect(JSON.stringify(example.build())).toBe(JSON.stringify(example.build()))
    })
  }

  it("resolves a theme when the tree names one", () => {
    const themed = docsExamples.get("themed-tree")

    if (themed === undefined) throw new Error("the themed example is not registered")

    const rendered = renderLoomTree(themed.build(), {
      resolver: docsRegistry,
      validator: docsRegistry,
      themes: docsThemes,
    })

    expect(rendered.theme?.palette.id).toBe("bold")
  })

  it("gives every example a title and a caption", () => {
    for (const [, example] of docsExamples) {
      expect(example.title.length).toBeGreaterThan(3)
      expect(example.caption.length).toBeGreaterThan(20)
    }
  })

  it("writes captions as plain text, since a figcaption is not MDX", () => {
    for (const [id, example] of docsExamples) {
      expect(example.caption, id).not.toMatch(/[`*_]/)
    }
  })
})
