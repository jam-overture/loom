import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import {
  createFrameOriginRegistry,
  type FrameOriginDefinition,
  type FrameOriginRegistry,
} from "../frame/origin.js"
import { sequentialIdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { createPrimitiveRegistry, describeRegistryError } from "../sdk/registry.js"
import { definePrimitive, type PrimitiveEntry } from "../sdk/definition.js"
import { buildElement } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { describeRenderDiagnostic } from "./diagnostics.js"
import { staticPrimitiveResolver, type LoomPrimitiveProps } from "./primitive.js"
import { renderLoomTree } from "./render.js"

/**
 * An embed that tells the two states apart. A refusal is a page that says so;
 * it is not an empty box, and it is certainly not the frame rendered anyway.
 */
const embed = definePrimitive({
  type: "loom.embed",
  description: "A third-party document, framed",
  props: z.object({ src: z.string() }).strict(),
  frames: ["src"],
  component: ({ loom }: LoomPrimitiveProps<{ src: string }>) => {
    const frame = loom.frames.src

    if (!frame || frame.status === "refused") {
      return createElement("p", { "data-state": "refused" }, frame?.refusal.reason ?? "no-answer")
    }

    return createElement("iframe", {
      "data-state": "framed",
      "data-same-origin": String(frame.sameOrigin),
      src: frame.url,
      title: "",
    })
  },
})

const page = definePrimitive({
  type: "loom.page",
  description: "The root",
  props: z.object({}).strict(),
  component: ({ children }: LoomPrimitiveProps) => createElement("main", null, children),
})

const registryOf = (...entries: readonly PrimitiveEntry[]) => {
  const built = createPrimitiveRegistry(entries)
  if (!built.ok) throw new Error(describeRegistryError(built.error))

  return built.value
}

const originsOf = (...definitions: readonly FrameOriginDefinition[]): FrameOriginRegistry => {
  const built = createFrameOriginRegistry(definitions)
  if (!built.ok) throw new Error(`fixture origins refused: ${built.error.code}`)

  return built.value
}

const VIMEO: FrameOriginDefinition = {
  origin: "https://player.vimeo.com",
  description: "Vimeo player embeds",
}

const treeFraming = (props: JsonObject): LoomTree => {
  const idFactory = sequentialIdFactory()

  const node = buildElement(idFactory, { type: "loom.embed", props: props as never })

  return createTree(buildElement(idFactory, { type: "loom.page", children: [node] }), idFactory)
}

const render = (tree: LoomTree, origins?: FrameOriginRegistry) => {
  const resolver = registryOf(page, embed)

  return renderLoomTree(tree, {
    resolver,
    validator: resolver,
    ...(origins ? { origins } : {}),
  })
}

describe("a framed URL", () => {
  it("reaches the primitive when its origin is registered, and says nothing", () => {
    const rendered = render(
      treeFraming({ src: "https://player.vimeo.com/video/42" }),
      originsOf(VIMEO)
    )

    const markup = renderToStaticMarkup(rendered.element)

    expect(markup).toContain('src="https://player.vimeo.com/video/42"')
    expect(markup).toContain('data-state="framed"')
    expect(rendered.diagnostics).toEqual([])
  })

  /**
   * The point of the seam in one assertion. Both URLs pass 0053's scheme
   * allowlist; one of them is a document the deployment agreed to run inside
   * its own pages and the other is not, and nothing before this could tell.
   */
  it("is refused when nobody registered its origin, and never reaches the markup", () => {
    const rendered = render(
      treeFraming({ src: "https://evil.example/steal?token=abc" }),
      originsOf(VIMEO)
    )

    const markup = renderToStaticMarkup(rendered.element)

    expect(markup).toContain('data-state="refused"')
    expect(markup).not.toContain("evil.example")
    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["frame-refused"])
  })

  it("is refused when the deployment wired no allowlist at all", () => {
    const rendered = render(treeFraming({ src: "https://player.vimeo.com/video/42" }))

    expect(renderToStaticMarkup(rendered.element)).toContain("no-registry")
    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["frame-refused"])
  })

  /**
   * The half of the finding the primitive could not answer for itself: a
   * sandbox of `allow-scripts` beside `allow-same-origin` is only a boundary
   * between two origins, and nothing in a render could previously tell that it
   * was framing itself.
   */
  it("is permitted and reported when it is the deployment's own origin", () => {
    const rendered = render(
      treeFraming({ src: "https://app.example/tour" }),
      originsOf(VIMEO, { origin: "https://app.example", description: "us", self: true })
    )

    expect(renderToStaticMarkup(rendered.element)).toContain('data-same-origin="true"')

    const [diagnostic] = rendered.diagnostics
    if (!diagnostic) throw new Error("the same-origin frame reported nothing")

    expect(diagnostic.code).toBe("frame-same-origin")
    expect(describeRenderDiagnostic(diagnostic)).toContain("https://app.example")
  })

  it("says which prop was refused, so a page with two frames names the right one", () => {
    const rendered = render(treeFraming({ src: "https://evil.example/x" }), originsOf(VIMEO))
    const [diagnostic] = rendered.diagnostics
    if (!diagnostic) throw new Error("the refused frame reported nothing")

    expect(diagnostic.code === "frame-refused" && diagnostic.prop).toBe("src")
    expect(describeRenderDiagnostic(diagnostic)).toContain("evil.example")
  })

  /**
   * A primitive that declares no framable prop pays nothing and is told
   * nothing, which is every primitive but one.
   */
  it("leaves an undeclaring primitive's own props alone", () => {
    const idFactory = sequentialIdFactory()
    const plain = definePrimitive({
      type: "loom.media",
      description: "A picture",
      props: z.object({ src: z.string() }).strict(),
      component: ({ loom, props }: LoomPrimitiveProps<{ src: string }>) =>
        createElement("img", {
          src: props.src,
          alt: "",
          "data-frames": String(Object.keys(loom.frames).length),
        }),
    })

    const node = buildElement(idFactory, {
      type: "loom.media",
      props: { src: "https://evil.example/x.png" } as never,
    })
    const tree = createTree(
      buildElement(idFactory, { type: "loom.page", children: [node] }),
      idFactory
    )

    const resolver = registryOf(page, plain)
    const rendered = renderLoomTree(tree, { resolver, validator: resolver })

    const markup = renderToStaticMarkup(rendered.element)

    expect(markup).toContain('src="https://evil.example/x.png"')
    expect(markup).toContain('data-frames="0"')
    expect(rendered.diagnostics).toEqual([])
  })

  /**
   * A host resolving from a plain map has registered nothing that could declare
   * a framable prop, so there is nothing to check and nothing to report.
   */
  it("is inert for a resolver that is not a registry", () => {
    const rendered = renderLoomTree(treeFraming({ src: "https://player.vimeo.com/video/42" }), {
      resolver: staticPrimitiveResolver({
        "loom.page": ({ children }: LoomPrimitiveProps) => createElement("main", null, children),
        "loom.embed": ({ loom }: LoomPrimitiveProps) =>
          createElement("p", null, String(Object.keys(loom.frames).length)),
      }),
    })

    expect(renderToStaticMarkup(rendered.element)).toContain(">0<")
    expect(rendered.diagnostics).toEqual([])
  })
})

describe("registering a primitive that frames", () => {
  it("refuses a declaration naming a prop the schema does not declare", () => {
    const drifted = definePrimitive({
      type: "loom.drifted",
      description: "Frames a prop it no longer has",
      props: z.object({ source: z.string() }).strict(),
      frames: ["src"],
      component: () => null,
    })

    const built = createPrimitiveRegistry([drifted])

    expect(built.ok).toBe(false)
    if (built.ok) return

    expect(built.error.code).toBe("undeclared-frame-prop")
    expect(describeRegistryError(built.error)).toContain("src")
  })

  it("carries the declaration through to the resolver the walk reads", () => {
    const registry = registryOf(page, embed)

    expect(registry.framePropsFor(embed.type as never)).toEqual(["src"])
    expect(registry.framePropsFor(page.type as never)).toEqual([])
  })
})
