import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { SUBMIT_PROP_KEY } from "../reserved-props.js"
import { buildElement } from "../tree/builders.js"
import type { ElementNode } from "../tree/node.js"

import { describeRedirectedSubmission, redirectedSubmissionsBetween } from "./redirection.js"

/**
 * Both trees are built with one id factory so a node keeps its id across the
 * pair — which is the whole property this module reads. Two independently built
 * trees would have different ids and nothing would ever look redirected.
 */
const pageWith = (...declarations: readonly (JsonObject | undefined)[]) => {
  const idFactory = sequentialIdFactory("red")
  const forms = declarations.map((declared) =>
    buildElement(idFactory, {
      type: "loom.form",
      props: declared === undefined ? {} : { [SUBMIT_PROP_KEY]: declared },
    })
  )

  return { page: buildElement(idFactory, { type: "loom.page", children: forms }), forms }
}

/** The same page, with each form's declaration replaced in place. */
const repointed = (
  page: ElementNode,
  declarations: readonly (JsonObject | undefined)[]
): ElementNode => ({
  ...page,
  children: page.children.map((child, index) => {
    const declared = declarations[index]

    return {
      ...(child as ElementNode),
      props: declared === undefined ? {} : { [SUBMIT_PROP_KEY]: declared },
    }
  }),
})

const to = (endpoint: string): JsonObject => ({ to: endpoint })

describe("redirectedSubmissionsBetween", () => {
  it("reports a form that now posts somewhere else, naming both ends", () => {
    const { page, forms } = pageWith(to("newsletter.subscribe"))
    const after = repointed(page, [to("contact.enquiry")])

    const redirected = redirectedSubmissionsBetween(page, after)

    expect(redirected).toEqual([
      { nodeId: forms[0]?.id, from: "newsletter.subscribe", to: "contact.enquiry" },
    ])
  })

  it("says nothing when the destination is unchanged", () => {
    const { page } = pageWith(to("newsletter.subscribe"))

    expect(redirectedSubmissionsBetween(page, repointed(page, [to("newsletter.subscribe")]))).toEqual(
      []
    )
  })

  it("treats a form that gains a destination as a new form, not a redirected one", () => {
    const { page } = pageWith(undefined)

    expect(redirectedSubmissionsBetween(page, repointed(page, [to("contact.enquiry")]))).toEqual([])
  })

  it("treats a form that loses its destination as a loss, not a redirection", () => {
    const { page } = pageWith(to("contact.enquiry"))

    expect(redirectedSubmissionsBetween(page, repointed(page, [undefined]))).toEqual([])
  })

  it("treats a declaration that stops parsing as a loss, because the page does too", () => {
    const { page } = pageWith(to("contact.enquiry"))
    const after = repointed(page, [{ to: "contact.enquiry", action: "https://elsewhere.test" }])

    expect(redirectedSubmissionsBetween(page, after)).toEqual([])
  })

  it("does not read a destination out of a declaration that never parsed", () => {
    const { page } = pageWith({ to: "not a valid id" })

    expect(redirectedSubmissionsBetween(page, repointed(page, [to("contact.enquiry")]))).toEqual([])
  })

  it("reports every form that moved, and none of the ones that did not", () => {
    const { page, forms } = pageWith(
      to("newsletter.subscribe"),
      to("contact.enquiry"),
      to("careers.apply")
    )
    const after = repointed(page, [to("careers.apply"), to("contact.enquiry"), to("contact.enquiry")])

    expect(redirectedSubmissionsBetween(page, after)).toEqual([
      { nodeId: forms[0]?.id, from: "newsletter.subscribe", to: "careers.apply" },
      { nodeId: forms[2]?.id, from: "careers.apply", to: "contact.enquiry" },
    ])
  })

  it("finds nothing in a page that posted nowhere to begin with", () => {
    const { page } = pageWith(undefined, undefined)

    expect(redirectedSubmissionsBetween(page, repointed(page, [to("contact.enquiry")]))).toEqual([])
  })
})

describe("describeRedirectedSubmission", () => {
  it("names the node and both endpoints, which is what a reviewer has to check", () => {
    const { page, forms } = pageWith(to("newsletter.subscribe"))
    const [redirected] = redirectedSubmissionsBetween(page, repointed(page, [to("contact.enquiry")]))

    expect(redirected && describeRedirectedSubmission(redirected)).toBe(
      `${forms[0]?.id} from newsletter.subscribe to contact.enquiry`
    )
  })
})
