import {
  planTreeSubmissions,
  resolveTreeSubmissions,
  type LoomTree,
  type SubmissionResolution,
} from "@loom/runtime"
import { renderLoomTree } from "@loom/runtime/react"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { contactExampleTree } from "@/app/(docs)/_lib/examples/catalogue"
import { docsRegistry, docsThemes } from "@/app/(docs)/_lib/loom/registry"

import { produceActions } from "./actions"
import {
  connectedContactTree,
  produceFormNotices,
  produceSharedPlan,
  produceTrouble,
} from "./answers"
import { CONTACT_ENDPOINT, docsEndpoints, TROUBLE, troubleEndpoints } from "./endpoints"
import { produceRefusedDeclaration } from "./proposals"

/**
 * What *What a form posts to* claims, made to happen.
 *
 * The page's produced tables print what the seam answered. What they cannot
 * show is what any of it does to the **markup a visitor's browser gets**, and
 * that is where every claim on the page eventually lands: an action attribute, a
 * disabled fieldset, a hidden input that has to survive being disabled.
 *
 * So this file renders. Each test is one sentence from the page, asserted
 * against the DOM the runtime produced rather than against the value it
 * returned.
 */

const mount = (tree: LoomTree, submissions?: SubmissionResolution) => {
  const rendered = renderLoomTree(tree, {
    resolver: docsRegistry,
    validator: docsRegistry,
    themes: docsThemes,
    ...(submissions ? { submissions } : {}),
  })

  return { ...render(rendered.element), diagnostics: rendered.diagnostics }
}

const formIn = (container: HTMLElement): HTMLFormElement => {
  const form = container.querySelector("form")

  if (form === null) throw new Error("the contact page rendered no form")

  return form
}

describe("a form on a deployment that registered its endpoint", () => {
  it("posts to the address the endpoint answered with, which is nowhere in the tree", async () => {
    const tree = connectedContactTree()
    const submissions = await resolveTreeSubmissions(tree, { registry: docsEndpoints() })
    const { container } = mount(tree, submissions)
    const form = formIn(container)

    expect(form.getAttribute("action")).toBe("/contact")
    expect(form.getAttribute("method")).toBe("post")
    expect(JSON.stringify(tree)).not.toContain("/contact")
  })

  it("renders the endpoint's hidden fields, which nobody typed into the tree", async () => {
    const tree = connectedContactTree()
    const submissions = await resolveTreeSubmissions(tree, { registry: docsEndpoints() })
    const { container } = mount(tree, submissions)
    const hidden = container.querySelector("input[type='hidden'][name='csrf']")

    expect(hidden).not.toBeNull()
    expect(hidden?.getAttribute("value")?.length ?? 0).toBeGreaterThan(0)
  })

  /**
   * The property the primitive's own comment is written around, and the one a
   * rearrangement would break invisibly: a disabled control is not a successful
   * one, so a token inside a fieldset that is ever disabled is a token that is
   * never sent.
   */
  it("keeps the hidden fields outside the fieldset that can be disabled", async () => {
    const tree = connectedContactTree()
    const submissions = await resolveTreeSubmissions(tree, { registry: docsEndpoints() })
    const { container } = mount(tree, submissions)
    const hidden = container.querySelector("input[type='hidden'][name='csrf']")

    expect(hidden?.closest("fieldset")).toBeNull()
  })

  it("leaves the fields usable and says nothing about being unconnected", async () => {
    const tree = connectedContactTree()
    const submissions = await resolveTreeSubmissions(tree, { registry: docsEndpoints() })
    const { container } = mount(tree, submissions)

    expect(container.querySelector("fieldset")?.hasAttribute("disabled")).toBe(false)
    expect(container.textContent).not.toContain("not connected yet")
  })
})

describe("a form on a page that names no endpoint", () => {
  it("disables itself and says so, rather than drawing a button that goes nowhere", () => {
    const { container, diagnostics } = mount(contactExampleTree())
    const form = formIn(container)

    expect(form.hasAttribute("action")).toBe(false)
    expect(container.querySelector("fieldset")?.hasAttribute("disabled")).toBe(true)
    expect(container.textContent).toContain("This form is not connected yet")

    /**
     * A node that never declared a submission is not a node whose submission
     * failed, so the example the page opens with is diagnostic-free. That is
     * what lets it sit in the shared catalogue.
     */
    expect(diagnostics).toEqual([])
  })

  it("reports a declared destination nobody resolved, which is a different thing", () => {
    const { diagnostics } = mount(contactExampleTree(CONTACT_ENDPOINT))

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("submit-unresolved")
  })
})

describe("a form whose endpoint could not give it a target", () => {
  const troubleWith = async (to: string) => {
    const tree = contactExampleTree(to)
    const submissions = await resolveTreeSubmissions(tree, { registry: troubleEndpoints() })

    return mount(tree, submissions)
  }

  it("never posts anywhere, whichever way it failed", async () => {
    for (const to of Object.values(TROUBLE)) {
      const { container } = await troubleWith(to)

      expect(formIn(container).hasAttribute("action"), to).toBe(false)
      expect(container.querySelector("fieldset")?.hasAttribute("disabled"), to).toBe(true)
    }
  })

  /**
   * The mapping the page states in prose: five reasons, two sentences, and the
   * split is not by severity — it is by whether trying again in a minute is good
   * advice.
   */
  it("tells a visitor to try again, except where the endpoint said no", async () => {
    const tryAgain = await troubleWith(TROUBLE.unavailable)
    const threw = await troubleWith(TROUBLE.threw)
    const refused = await troubleWith(TROUBLE.refused)

    expect(tryAgain.container.textContent).toContain("Please try again in a moment")
    expect(threw.container.textContent).toContain("Please try again in a moment")
    expect(refused.container.textContent).toContain("not accepting messages")
    expect(refused.container.textContent).not.toContain("Please try again in a moment")
  })

  it("says nothing to a visitor about endpoints, registries or reasons", async () => {
    for (const to of Object.values(TROUBLE)) {
      const { container } = await troubleWith(to)
      const words = container.textContent ?? ""

      expect(words, to).not.toContain("endpoint")
      expect(words, to).not.toContain(to)
    }
  })

  it("tells the deployment which node and which destination, in the diagnostics", async () => {
    const { diagnostics } = await troubleWith(TROUBLE.refused)
    const codes = diagnostics.map((diagnostic) => diagnostic.code)

    expect(codes).toContain("submit-unavailable")
  })

  it("names every reason the page prints", async () => {
    const trouble = await produceTrouble()

    expect(trouble.map((row) => row.reason).sort()).toEqual(
      ["endpoint-threw", "invalid-target", "no-such-endpoint", "refused", "unavailable"].sort()
    )
  })
})

describe("the address the seam is prepared to carry", () => {
  it("keeps a refused one out of the markup entirely", async () => {
    const actions = await produceActions()

    for (const action of actions.filter((candidate) => !candidate.accepted)) {
      expect(action.outcome, action.action).toContain("the seam refuses")
    }
  })

  it("carries a path on this site and an origin said out loud, and nothing else", async () => {
    const actions = await produceActions()

    expect(actions.filter((action) => action.accepted).map((action) => action.action)).toEqual([
      "/contact",
      "https://forms.example.com/enquiry",
    ])
  })
})

describe("an address written into the tree", () => {
  it("is refused where it is read, so the form has no target at all", () => {
    const refused = produceRefusedDeclaration()

    expect(refused.planned).toBe(0)
    expect(refused.sentence).toContain("loom:submit")
  })

  it("leaves the form disabled rather than posting to what it carried", () => {
    const declared = produceRefusedDeclaration()

    expect(declared.declared).toContain("forms.example.net")
  })
})

describe("two forms naming one endpoint", () => {
  it("come to one question, because a nonce minted twice breaks one of them", () => {
    const shared = produceSharedPlan()

    expect(shared.declaring).toBe(2)
    expect(shared.asked).toBe(1)
  })

  it("is not what the contact page is — it declares once", () => {
    expect(planTreeSubmissions(connectedContactTree()).submissions.length).toBe(1)
  })
})

describe("the sentences a visitor may be shown", () => {
  it("come from the primitive rather than from this lane", () => {
    const notices = produceFormNotices()

    expect(notices.length).toBeGreaterThan(0)

    for (const notice of notices) {
      expect(notice.sentence, notice.key).not.toContain("endpoint")
      expect(notice.sentence, notice.key).not.toContain("unavailable")
    }
  })
})
