import type { CSSProperties } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import type { PrimitiveType } from "../primitive-type.js"
import { ok } from "../result.js"
import { testPrimitiveResolver } from "../testing/primitives.js"
import { contrastRatio, TEXT_CONTRAST_MINIMUM } from "../theme/contrast.js"
import { editorialPalette, STARTER_PALETTES } from "../theme/library.js"
import { createThemeRegistry } from "../theme/registry.js"
import { paletteSchema, type ResolvedTheme, type ThemeSelection } from "../theme/theme.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import type { PropsValidator, PropsVerdict } from "./props.js"
import { renderLoomTree } from "./render.js"
import { renderRequest, type TreeSource } from "./request.js"
import { partitionReservedProps, themeGround, THEME_PROP_KEY } from "./theme.js"

/**
 * The render root mounting what 0049 put in the tree.
 *
 * The load-bearing assertion is the re-theme: the same tree, the same
 * primitives, a different palette id, and different color on the page. That is
 * what says a primitive reads its color from the slots — and it is the check
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

/** The pack the four surfaces wear, and the only starter pack that names a mono. */
const minimal: ThemeSelection = {
  palette: "minimal",
  fontPack: "minimal-sans",
  stylePreset: "precise",
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

  /**
   * The mono family reaches the root the same way a color does, and the two
   * assertions below are the two halves of 0084's bargain: a pack that names a
   * face mounts it, and a pack that names none mounts nothing — leaving
   * `var(--loom-mono-family, <system stack>)` in the primitive to resolve to a
   * face that exists everywhere rather than to nothing at all.
   */
  it("mounts the font pack's mono family when it declares one", () => {
    const markup = renderToStaticMarkup(render(treeWearing({ [THEME_PROP_KEY]: minimal })).element)

    expect(markup).toContain("--loom-mono-family:&quot;Geist Mono&quot;")
  })

  it("mounts no mono family for a pack that declares none", () => {
    const markup = renderToStaticMarkup(render(treeWearing({ [THEME_PROP_KEY]: editorial })).element)

    expect(markup).toContain("--loom-body-family:")
    expect(markup).not.toContain("--loom-mono-family")
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
        error: {
          code: "unknown-palette",
          id: "midcentury",
          /**
           * Read off the registry rather than written out. The point of the
           * field is that a refusal tells the caller what it *could* have said,
           * so the assertion is that it matches what is registered — not that
           * the starter set is any particular length. Spelled out, this test
           * failed the day a third palette was added, which is a census
           * changing rather than a diagnostic breaking.
           */
          available: themes.catalogue().palettes.map((entry) => entry.id),
        },
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

describe("themeGround", () => {
  const resolve = (selection: ThemeSelection): ResolvedTheme => {
    const resolved = themes.resolve(selection)
    if (!resolved.ok) throw new Error(`the registry refused ${selection.palette}`)

    return resolved.value
  }

  /**
   * The pair is the palette's own body copy, both ends of it, which is what makes
   * a frame standing in for the page re-theme with the page rather than beside it.
   */
  it("paints the ground the root primitive would have painted, and the ink that reads on it", () => {
    const light = resolve(editorial)
    const dark = resolve(bold)

    expect(themeGround(light)).toEqual({
      backgroundColor: light.palette.slots["bg-canvas"],
      color: light.palette.slots["fg-default"],
      colorScheme: "light",
    })
    expect(themeGround(dark)).toEqual({
      backgroundColor: dark.palette.slots["bg-canvas"],
      color: dark.palette.slots["fg-default"],
      colorScheme: "dark",
    })
  })

  /**
   * The defect this exists for, in the shape it had.
   *
   * A host held the frame's ground as a stylesheet constant and took the ink from
   * the tree. That is legible for exactly as long as the tree names a palette the
   * constant was written for; the moment it names the other kind, the frame is a
   * light ground under light ink and nothing errors. Here the ground moves with
   * the ink, so the pair is the one the contrast bar already asserts (0074).
   */
  it("moves both ends together, so the frame is legible under every registered palette", () => {
    const grounds = STARTER_PALETTES.map((palette) =>
      themeGround({ ...resolve(editorial), palette })
    )

    expect(grounds).toHaveLength(21)
    expect(new Set(grounds.map((ground) => ground?.backgroundColor)).size).toBeGreaterThan(1)

    for (const ground of grounds) {
      expect(contrastRatio(ground?.color ?? "", ground?.backgroundColor ?? "")).toBeGreaterThan(
        TEXT_CONTRAST_MINIMUM
      )
    }
  })

  /**
   * It is a style object, and the reason to say so in a test is that its one job
   * is to be spread into one. A named type rather than `CSSProperties` because a
   * host reads the fields as well as applying them — the demo's share card hands
   * them to `ImageResponse`, which resolves no custom properties.
   */
  it("is a style object a frame can be handed whole", () => {
    const style: CSSProperties = { ...themeGround(resolve(bold)) }

    expect(style.colorScheme).toBe("dark")
  })

  it("leaves color-scheme out rather than guessing, when the pair cannot be read", () => {
    const hsl = createThemeRegistry({
      palettes: [
        paletteSchema.parse({
          ...editorialPalette,
          id: "unreadable",
          slots: Object.fromEntries(
            Object.keys(editorialPalette.slots).map((slot) => [slot, "hsl(210 30% 40%)"])
          ),
        }),
      ],
    }).resolve({ ...editorial, palette: "unreadable" } as ThemeSelection)

    expect(hsl.ok).toBe(true)
    if (!hsl.ok) return

    const ground = themeGround(hsl.value)

    expect(ground).toEqual({ backgroundColor: "hsl(210 30% 40%)", color: "hsl(210 30% 40%)" })
    expect("colorScheme" in (ground ?? {})).toBe(false)
  })
})
