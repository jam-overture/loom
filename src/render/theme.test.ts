import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import type { PrimitiveType } from "../primitive-type.js"
import { ok } from "../result.js"
import { testPrimitiveResolver } from "../testing/primitives.js"
import { createThemeRegistry } from "../theme/registry.js"
import type { ThemeSelection } from "../theme/theme.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import type { PropsValidator, PropsVerdict } from "./props.js"
import { renderLoomTree } from "./render.js"
import { renderRequest, type TreeSource } from "./request.js"
import { partitionReservedProps, THEME_PROP_KEY } from "./theme.js"

/**
 * The render root mounting what 0049 put in the tree.
 *
 * The load-bearing assertion is the re-theme: the same tree, the same
 * primitives, a different palette id, and different colour on the page. That is
 * what says a primitive reads its colour from the slots — and it is the check
 * every ported primitive has to pass, which is why two starter palettes exist.
 */

const editorial: ThemeSelection = {
  palette: "editorial",
  fontPack: "editorial-serif",
  stylePreset: "comfortable",
} as ThemeSelection

const bold: ThemeSelection = {
  palette: "bold",
  fontPack: "bold-sans",
  stylePreset: "airy-modern",
} as ThemeSelection

const themes = createThemeRegistry()

const treeWearing = (rootProps: JsonObject, cardProps: JsonObject = {}): LoomTree => {
  const idFactory = sequentialIdFactory()

  const card = buildElement(idFactory, {
    type: "loom.card",
    props: cardProps,
    children: [buildText(idFactory, "Body copy")],
  })
  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { title: "Home", ...rootProps },
    children: [card],
  })

  return createTree(page, idFactory)
}

const render = (tree: LoomTree, registry = themes) =>
  renderLoomTree(tree, { resolver: testPrimitiveResolver, themes: registry })

describe("mounting a theme at the render root", () => {
  it("flattens the tree's theme into custom properties on the root element", () => {
    const rendered = render(treeWearing({ [THEME_PROP_KEY]: editorial }))
    const markup = renderToStaticMarkup(rendered.element)

    expect(rendered.diagnostics).toEqual([])
    expect(markup).toContain("--loom-accent:#4a5b78")
    expect(markup).toContain("--loom-bg-canvas:#fafaf7")
    expect(markup).toContain("--loom-radius-md")
  })

  it("mounts once, at the root, and nowhere below it", () => {
    const markup = renderToStaticMarkup(render(treeWearing({ [THEME_PROP_KEY]: bold })).element)

    expect(markup.match(/--loom-accent:/g)).toHaveLength(1)
    expect(markup.indexOf("--loom-accent:")).toBeLessThan(markup.indexOf("<article"))
  })

  it("re-themes a tree by changing three ids, touching no primitive and no node below the root", () => {
    const inEditorial = renderToStaticMarkup(render(treeWearing({ [THEME_PROP_KEY]: editorial })).element)
    const inBold = renderToStaticMarkup(render(treeWearing({ [THEME_PROP_KEY]: bold })).element)

    expect(inEditorial).toContain("--loom-bg-canvas:#fafaf7")
    expect(inBold).toContain("--loom-bg-canvas:#0a0a0a")
    expect(inEditorial.replace(/ style="[^"]*"/, "")).toBe(inBold.replace(/ style="[^"]*"/, ""))
  })

  it("names what it mounted, so a caller can say which palette it served", () => {
    const rendered = render(treeWearing({ [THEME_PROP_KEY]: bold }))

    expect(rendered.theme?.palette.id).toBe("bold")
    expect(rendered.theme?.fontPack.id).toBe("bold-sans")
    expect(rendered.theme?.stylePreset.id).toBe("airy-modern")
  })

  it("stays a pure function of its inputs", () => {
    const tree = treeWearing({ [THEME_PROP_KEY]: editorial })

    expect(renderToStaticMarkup(render(tree).element)).toBe(
      renderToStaticMarkup(render(tree).element)
    )
  })

  it("mounts nothing, and reports nothing, for a tree that names no theme", () => {
    const rendered = render(treeWearing({}))

    expect(rendered.theme).toBeUndefined()
    expect(rendered.diagnostics).toEqual([])
    expect(renderToStaticMarkup(rendered.element)).not.toContain("--loom-")
  })
})

describe("a theme the render cannot mount", () => {
  it("renders unstyled and reports the registry's refusal", () => {
    const rendered = render(
      treeWearing({ [THEME_PROP_KEY]: { ...editorial, palette: "midcentury" } })
    )

    expect(rendered.theme).toBeUndefined()
    expect(rendered.diagnostics).toEqual([
      {
        code: "theme-unresolved",
        nodeId: rendered.diagnostics[0]?.nodeId,
        error: { code: "unknown-palette", id: "midcentury", available: ["editorial", "bold"] },
      },
    ])
    expect(renderToStaticMarkup(rendered.element)).toContain("<main")
  })

  it("reports a selection that is not three ids", () => {
    const rendered = render(treeWearing({ [THEME_PROP_KEY]: "bold" }))

    expect(rendered.diagnostics[0]?.code).toBe("theme-unresolved")
  })

  it("says so when the tree names a theme and the host wired no registry", () => {
    const tree = treeWearing({ [THEME_PROP_KEY]: editorial })

    const rendered = renderLoomTree(tree, { resolver: testPrimitiveResolver })

    expect(rendered.theme).toBeUndefined()
    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "theme-unregistered",
    ])
  })

  it("ignores a theme below the root, and does not ignore it silently", () => {
    const rendered = render(treeWearing({}, { [THEME_PROP_KEY]: bold }))

    expect(rendered.theme).toBeUndefined()
    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["theme-misplaced"])
    expect(renderToStaticMarkup(rendered.element)).not.toContain("--loom-")
  })
})

describe("the reserved prop namespace", () => {
  it("keeps reserved keys away from the primitive", () => {
    const markup = renderToStaticMarkup(render(treeWearing({ [THEME_PROP_KEY]: editorial })).element)

    expect(markup).toContain("data-props=\"{&quot;title&quot;:&quot;Home&quot;}\"")
    expect(markup).not.toContain(THEME_PROP_KEY)
  })

  it("keeps reserved keys away from the validator, so a strict root schema still passes", () => {
    const seen: JsonObject[] = []
    const validator: PropsValidator = {
      validateProps: (_type: PrimitiveType, props: JsonObject): PropsVerdict => {
        seen.push(props)
        return { outcome: "valid" }
      },
    }

    renderLoomTree(treeWearing({ [THEME_PROP_KEY]: editorial }), {
      resolver: testPrimitiveResolver,
      themes,
      validator,
    })

    expect(seen[0]).toEqual({ title: "Home" })
  })

  it("drops a reserved key nothing reads, and reports which one", () => {
    const rendered = render(treeWearing({ "loom:weather": "sunny" }))

    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "reserved-prop-unrecognised",
    ])
    expect(renderToStaticMarkup(rendered.element)).not.toContain("weather")
  })

  it("allocates nothing for the node that carries no reserved key", () => {
    const props: JsonObject = { title: "Home" }

    expect(partitionReservedProps(props).props).toBe(props)
  })
})

describe("renderRequest", () => {
  it("resolves the theme for the request it is serving", async () => {
    const tree = treeWearing({ [THEME_PROP_KEY]: bold })
    const source: TreeSource = {
      load: () => Promise.resolve(ok(JSON.parse(JSON.stringify(tree)) as unknown)),
    }

    const rendered = await renderRequest(
      { treeId: tree.treeId, editMode: false },
      { source, resolver: testPrimitiveResolver, themes }
    )

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    expect(rendered.value.theme?.palette.id).toBe("bold")
    expect(renderToStaticMarkup(rendered.value.element)).toContain("--loom-bg-canvas:#0a0a0a")
  })
})
