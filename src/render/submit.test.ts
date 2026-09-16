import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { SUBMIT_PROP_KEY } from "../reserved-props.js"
import { err, ok } from "../result.js"
import {
  createEndpointRegistry,
  defineEndpoint,
  type EndpointEntry,
  type EndpointRegistry,
} from "../submit/endpoint.js"
import { EMPTY_SUBMISSION_RESOLUTION } from "../submit/resolution.js"
import { resolveTreeSubmissions } from "../submit/resolve.js"
import { buildElement } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { describeRenderDiagnostic, type RenderDiagnostic } from "./diagnostics.js"
import { staticPrimitiveResolver, type LoomPrimitive, type LoomPrimitiveProps } from "./primitive.js"
import { renderLoomTree } from "./render.js"
import { renderRequest, type TreeSource } from "./request.js"

/**
 * A form primitive that tells the three states apart. "Nobody said where this
 * posts", "we cannot take it right now" and "here is where it goes" are three
 * different pages, which is the whole reason `loom.submit` is absent, or
 * `unavailable` with a reason, or `ready` — never a maybe.
 */
const formPrimitive: LoomPrimitive = ({ loom }: LoomPrimitiveProps) => {
  if (!loom.submit) return createElement("form", { "data-state": "untargeted" })

  if (loom.submit.status === "unavailable") {
    return createElement(
      "form",
      { "data-state": "unavailable" },
      loom.submit.unavailable.reason
    )
  }

  const { action, method, fields } = loom.submit.target

  return createElement(
    "form",
    { "data-state": "ready", action, method },
    fields.map((field) =>
      createElement("input", { key: field.name, type: "hidden", name: field.name, value: field.value })
    )
  )
}

const resolver = staticPrimitiveResolver({
  "loom.page": ({ children }: LoomPrimitiveProps) => createElement("main", null, children),
  "loom.contact-form": formPrimitive,
})

const treePosting = (declared?: unknown): LoomTree => {
  const idFactory = sequentialIdFactory()

  const form = buildElement(idFactory, {
    type: "loom.contact-form",
    props: (declared === undefined ? {} : { [SUBMIT_PROP_KEY]: declared }) as never,
  })

  return createTree(buildElement(idFactory, { type: "loom.page", children: [form] }), idFactory)
}

const registryOf = (...entries: readonly EndpointEntry[]): EndpointRegistry => {
  const registry = createEndpointRegistry(entries)
  if (!registry.ok) throw new Error(`test registry refused: ${registry.error.code}`)

  return registry.value
}

const enquiryEndpoint = defineEndpoint({
  id: "contact.enquiry",
  description: "Receives a contact enquiry",
  endpoint: {
    target: () =>
      Promise.resolve(
        ok({
          action: "/api/contact",
          method: "post" as const,
          fields: [{ name: "csrf", value: "t0ken" }],
        })
      ),
  },
})

const renderWith = async (tree: LoomTree, registry: EndpointRegistry) => {
  const submissions = await resolveTreeSubmissions(tree, { registry })

  return renderLoomTree(tree, { resolver, submissions })
}

describe("a primitive's submission target", () => {
  it("reaches the form that named the endpoint", async () => {
    const rendered = await renderWith(
      treePosting({ to: "contact.enquiry" }),
      registryOf(enquiryEndpoint)
    )

    const markup = renderToStaticMarkup(rendered.element)

    expect(markup).toContain('action="/api/contact"')
    expect(markup).toContain('method="post"')
    expect(markup).toContain('name="csrf"')
    expect(rendered.diagnostics).toEqual([])
  })

  /**
   * The point of the seam in one assertion: the address the browser posts to is
   * nowhere in the document the model wrote, and nowhere in the delta that would
   * change it.
   */
  it("keeps the address out of the tree entirely", async () => {
    const tree = treePosting({ to: "contact.enquiry" })

    expect(JSON.stringify(tree)).not.toContain("/api/contact")
    expect(JSON.stringify(tree)).not.toContain("t0ken")

    const rendered = await renderWith(tree, registryOf(enquiryEndpoint))

    expect(renderToStaticMarkup(rendered.element)).toContain('action="/api/contact"')
  })

  it("hands nothing to a form that named no endpoint", () => {
    const rendered = renderLoomTree(treePosting(), { resolver })

    expect(renderToStaticMarkup(rendered.element)).toContain('data-state="untargeted"')
    expect(rendered.diagnostics).toEqual([])
  })

  it("still renders the form when its endpoint could not answer", async () => {
    const rendered = await renderWith(
      treePosting({ to: "contact.enquiry" }),
      registryOf(
        defineEndpoint({
          id: "contact.enquiry",
          description: "is down",
          endpoint: {
            target: () => Promise.resolve(err({ code: "unavailable", detail: "token store down" })),
          },
        })
      )
    )

    const markup = renderToStaticMarkup(rendered.element)

    expect(markup).toContain('data-state="unavailable"')
    expect(markup).not.toContain("action=")
    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["submit-unavailable"])
  })

  it("reports an endpoint nobody registered, and renders the rest of the page", async () => {
    const rendered = await renderWith(
      treePosting({ to: "nobody.registered" }),
      registryOf(enquiryEndpoint)
    )

    expect(renderToStaticMarkup(rendered.element)).toContain("<main>")
    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["submit-unavailable"])
  })

  it("reports a malformed declaration and renders the form untargeted", async () => {
    const rendered = await renderWith(
      treePosting({ to: "Contact_Enquiry" }),
      registryOf(enquiryEndpoint)
    )

    expect(renderToStaticMarkup(rendered.element)).toContain('data-state="untargeted"')
    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["submit-misdeclared"])
  })

  it("says so when the tree names an endpoint and the render was given no resolution", () => {
    const rendered = renderLoomTree(treePosting({ to: "contact.enquiry" }), { resolver })

    expect(renderToStaticMarkup(rendered.element)).toContain('data-state="untargeted"')
    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["submit-unresolved"])
    expect(rendered.diagnostics[0]).toMatchObject({ resolution: "absent" })
  })

  /**
   * The data seam's silent route, in the seam nobody had looked at. A form whose
   * target went missing this way rendered a submit button pointing nowhere, and
   * the deployment was told nothing at all.
   */
  describe("a render with no target for a form that named one", () => {
    it("says so when the resolution was built from a different tree's plan", () => {
      const rendered = renderLoomTree(treePosting({ to: "contact.enquiry" }), {
        resolver,
        submissions: EMPTY_SUBMISSION_RESOLUTION,
      })

      expect(renderToStaticMarkup(rendered.element)).toContain('data-state="untargeted"')
      expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
        "submit-unresolved",
      ])
      expect(rendered.diagnostics[0]).toMatchObject({ resolution: "unrelated" })
    })

    it("sends a reader to the composition root rather than to the registry", () => {
      const { diagnostics } = renderLoomTree(treePosting({ to: "contact.enquiry" }), {
        resolver,
        submissions: EMPTY_SUBMISSION_RESOLUTION,
      })

      expect(describeRenderDiagnostic(diagnostics[0] as RenderDiagnostic)).toContain(
        "a different plan than this tree"
      )
    })

    it("stays silent for a node that named no endpoint", () => {
      const rendered = renderLoomTree(treePosting(), {
        resolver,
        submissions: EMPTY_SUBMISSION_RESOLUTION,
      })

      expect(rendered.diagnostics).toEqual([])
    })

    it("says it once for a malformed declaration a real resolution already reported", async () => {
      const rendered = await renderWith(treePosting({ to: 42 }), registryOf(enquiryEndpoint))

      expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
        "submit-misdeclared",
      ])
    })

    it("stays silent when the target is the one this tree asked for", async () => {
      const rendered = await renderWith(
        treePosting({ to: "contact.enquiry" }),
        registryOf(enquiryEndpoint)
      )

      expect(rendered.diagnostics).toEqual([])
      expect(renderToStaticMarkup(rendered.element)).toContain('data-state="ready"')
    })
  })

  /**
   * A reserved key the runtime does not read is reported. `loom:submit` is read
   * before the walk, so it must not be — the regression a new reserved key
   * invites.
   */
  it("does not report the reserved key it reads as unrecognised", async () => {
    const rendered = await renderWith(
      treePosting({ to: "contact.enquiry" }),
      registryOf(enquiryEndpoint)
    )

    expect(
      rendered.diagnostics.some((diagnostic) => diagnostic.code === "reserved-prop-unrecognised")
    ).toBe(false)
  })

  it("keeps the reserved key out of the props the primitive sees", async () => {
    const seen: unknown[] = []

    const watching = staticPrimitiveResolver({
      "loom.page": ({ children }: LoomPrimitiveProps) => createElement("main", null, children),
      "loom.contact-form": ({ props }: LoomPrimitiveProps) => {
        seen.push(props)

        return createElement("form")
      },
    })

    const tree = treePosting({ to: "contact.enquiry" })
    const submissions = await resolveTreeSubmissions(tree, { registry: registryOf(enquiryEndpoint) })

    renderToStaticMarkup(renderLoomTree(tree, { resolver: watching, submissions }).element)

    expect(seen).toEqual([{}])
  })
})

describe("renderRequest", () => {
  const sourceOf = (tree: LoomTree): TreeSource => ({
    load: () => Promise.resolve(ok(JSON.parse(JSON.stringify(tree)) as unknown)),
  })

  it("resolves submissions before the walk when a registry is wired", async () => {
    const tree = treePosting({ to: "contact.enquiry" })

    const rendered = await renderRequest(
      { treeId: tree.treeId, editMode: false },
      { source: sourceOf(tree), resolver, endpoints: registryOf(enquiryEndpoint) }
    )

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    expect(renderToStaticMarkup(rendered.value.element)).toContain('action="/api/contact"')
    expect(rendered.value.diagnostics).toEqual([])
  })

  it("says so when a tree names an endpoint and no registry was wired", async () => {
    const tree = treePosting({ to: "contact.enquiry" })

    const rendered = await renderRequest(
      { treeId: tree.treeId, editMode: false },
      { source: sourceOf(tree), resolver }
    )

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    expect(rendered.value.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "submit-unresolved",
    ])
  })

  it("passes the request's host context down to the endpoint", async () => {
    const seen: unknown[] = []
    const tree = treePosting({ to: "contact.enquiry" })

    const watching = defineEndpoint({
      id: "contact.enquiry",
      description: "receives enquiries",
      endpoint: {
        target: (request) => {
          seen.push(request.context)

          return Promise.resolve(ok({ action: "/api/contact", method: "post", fields: [] }))
        },
      },
    })

    await renderRequest(
      { treeId: tree.treeId, editMode: false, context: { tenant: "acme" } },
      { source: sourceOf(tree), resolver, endpoints: registryOf(watching) }
    )

    expect(seen).toEqual([{ tenant: "acme" }])
  })
})
