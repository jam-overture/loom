import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { produceActions } from "@/app/(docs)/_lib/submit/actions"
import {
  produceFormNotices,
  produceResolvedTarget,
  produceSharedPlan,
  produceTrouble,
  produceWhatAModelSees,
} from "@/app/(docs)/_lib/submit/answers"
import { produceFormVerdicts, produceRefusedDeclaration } from "@/app/(docs)/_lib/submit/proposals"

import {
  AnAddressInTheTree,
  TheConnectedForm,
  WhatAModelMayName,
  WhatAnActionMayBe,
  WhatTheVisitorReads,
  WhenThereIsNoTarget,
  WhoMayMoveAForm,
} from "./submit-seam"

/**
 * Seven produced blocks on *What a form posts to*, and the thing all seven can
 * do wrong.
 *
 * Everything these blocks say is a real run of the submission seam, and
 * `_lib/submit/seam.test.tsx` next door is thorough about the runs. What it
 * cannot see is the presentation: **the data was true and arrived, and the
 * component printed some of it.** A dropped row is a way a form ends up with
 * nowhere to post that a reader never learns exists; a caption counting the rows
 * it is above is wrong the moment the two disagree, and a reader has no way to
 * tell which of the two to trust.
 *
 * So each block below is held against the producer it reads, on the two things:
 * every row is there, and the number in the caption is the number of rows. It is
 * the sibling of `operations.test.tsx` and `write-endings.test.tsx` and was
 * written for the same reason.
 */

const captionOf = (): string => document.querySelector("p")?.textContent ?? ""

const rowsIn = (attribute: string): readonly (string | null)[] =>
  [...document.querySelectorAll(`[${attribute}]`)].map((cell) => cell.getAttribute(attribute))

const columnsIn = (): readonly string[] =>
  [...document.querySelectorAll("th")].map((header) => header.textContent ?? "")

const bodyRows = (): number => document.querySelectorAll("tbody tr").length

/**
 * The table, and only the table.
 *
 * Two of these blocks print an endpoint id in the rows *and* in the sentence
 * under them, which is the point of the sentence — so a query over the whole
 * document finds it twice and says the component is broken.
 */
const table = () => {
  const body = document.querySelector("tbody")

  if (body === null) throw new Error("the block rendered no table body at all")

  return within(body as HTMLElement)
}

describe("the same form, on a deployment that answered", () => {
  it("renders the form the resolution produced rather than describing it", async () => {
    render(await TheConnectedForm())

    const form = document.querySelector("form")

    expect(form).not.toBeNull()
    expect(form?.querySelector("fieldset")?.hasAttribute("disabled")).toBe(false)
  })

  it("prints the address the endpoint answered with, beside the form that posts there", async () => {
    const target = await produceResolvedTarget()

    render(await TheConnectedForm())

    expect(document.querySelector("form")?.getAttribute("action")).toBe(target.action)
    expect(document.querySelector(`[data-action="${target.action}"]`)).not.toBeNull()
  })

  it("prints every hidden field the deployment added, which nobody typed into the tree", async () => {
    const target = await produceResolvedTarget()

    render(await TheConnectedForm())

    expect(target.fields.length).toBeGreaterThan(0)

    for (const field of target.fields) {
      expect(document.body.textContent, `${field.name} is not shown`).toContain(
        `hidden: ${field.name}=${field.value}`
      )
    }
  })

  it("names the destination the tree declared, in the caption and in the table", async () => {
    const target = await produceResolvedTarget()

    render(await TheConnectedForm())

    expect(captionOf()).toContain(target.declared)
    expect(document.body.textContent).toContain(`"loom:submit": ${target.declared}`)
  })

  /**
   * A render diagnostic would be the most interesting thing on the page, so the
   * component shows them rather than swallowing them. Today there are none,
   * which is the assertion: a warning strip appearing on this page is a change
   * somebody should have to notice.
   */
  it("shows no warning strip, because the render it ran produced no diagnostics", async () => {
    render(await TheConnectedForm())

    expect(document.querySelector("ul.bg-warning-surface")).toBeNull()
  })
})

describe("every way a form ends up with nowhere to post", () => {
  it("prints one row per way, and counts them in the caption", async () => {
    const trouble = await produceTrouble()

    render(await WhenThereIsNoTarget())

    expect(trouble.length).toBeGreaterThan(1)
    expect(rowsIn("data-reason")).toEqual(trouble.map((row) => row.reason))
    expect(captionOf()).toContain(`${trouble.length} ways`)
  })

  it("prints the sentence each one writes, not only the reason code", async () => {
    const trouble = await produceTrouble()

    render(await WhenThereIsNoTarget())

    for (const row of trouble) {
      expect(document.body.textContent, `${row.reason} lost its sentence`).toContain(row.sentence)
    }
  })
})

describe("the sentences a visitor may be shown", () => {
  it("prints every one the primitive declares, with its key", () => {
    const notices = produceFormNotices()

    render(<WhatTheVisitorReads />)

    expect(notices.length).toBeGreaterThan(0)
    expect(bodyRows()).toBe(notices.length)
    expect(captionOf()).toContain(`${notices.length} sentences`)

    for (const notice of notices) {
      expect(screen.getByText(notice.sentence)).toBeDefined()
      expect(screen.getByText(notice.key)).toBeDefined()
    }
  })
})

describe("what the seam will carry as an address", () => {
  it("prints every candidate and marks which of them reached the form", async () => {
    const actions = await produceActions()

    render(await WhatAnActionMayBe())

    expect(rowsIn("data-accepted")).toEqual(actions.map((action) => String(action.accepted)))
  })

  it("counts the carried ones in the caption, which is the number a reader takes away", async () => {
    const actions = await produceActions()
    const carried = actions.filter((action) => action.accepted)

    render(await WhatAnActionMayBe())

    expect(carried.length).toBeGreaterThan(0)
    expect(carried.length).toBeLessThan(actions.length)
    expect(captionOf()).toContain(`${actions.length} strings`)
    expect(captionOf()).toContain(`${carried.length} of them reach the form`)
  })

  /**
   * One candidate is the empty string, which is a legal `action` meaning *post
   * back to this address*. It is printed as a non-breaking space so the cell has
   * something in it, and a reader who sees a blank cell reads a row that failed
   * to render rather than a candidate with no address.
   *
   * Asserted on the **cell** and not on the row, which is the second version of
   * this test. The first asked whether the row had any text in it, and the row
   * has two other cells — so it passed against a component that printed the
   * empty candidate as nothing at all. Not trimmed, because `String.trim`
   * removes a non-breaking space and would put the hole straight back.
   */
  it("leaves no address cell looking empty, including the candidate that is an empty string", async () => {
    const actions = await produceActions()

    render(await WhatAnActionMayBe())

    expect(actions.some((action) => action.action === "")).toBe(true)

    const addresses = [...document.querySelectorAll("tbody tr")].map(
      (row) => row.querySelector("td span")?.textContent ?? ""
    )

    expect(addresses).toHaveLength(actions.length)

    for (const address of addresses) expect(address.length).toBeGreaterThan(0)
  })
})

describe("who may move a form", () => {
  it("prints both asks with the Gate's own verdict on each", async () => {
    const verdicts = await produceFormVerdicts()

    render(await WhoMayMoveAForm())

    expect(rowsIn("data-kind")).toEqual(verdicts.map((verdict) => verdict.kind))

    for (const verdict of verdicts) {
      expect(document.body.textContent, `${verdict.ask} lost its reason`).toContain(verdict.reasonCode)
      expect(document.body.textContent, `${verdict.ask} lost its detail`).toContain(verdict.detail)
    }
  })

  it("names the two columns a reader reads across", async () => {
    render(await WhoMayMoveAForm())

    expect(columnsIn()).toEqual(["The ask", "What it comes to", "What the Gate said"])
  })
})

describe("everything a model is told", () => {
  it("prints every destination with the line it receives", () => {
    const seen = produceWhatAModelSees()

    render(<WhatAModelMayName />)

    expect(seen.destinations.length).toBeGreaterThan(0)
    expect(bodyRows()).toBe(seen.destinations.length)

    for (const destination of seen.destinations) {
      expect(table().getByText(destination.id)).toBeDefined()
      expect(table().getByText(destination.description)).toBeDefined()
    }
  })

  it("counts the destinations, the posting primitives and the library in one caption", () => {
    const seen = produceWhatAModelSees()

    render(<WhatAModelMayName />)

    expect(captionOf()).toContain(`${seen.destinations.length} destinations`)
    expect(captionOf()).toContain(`${seen.posting.length} of the library's ${seen.primitives} primitives`)
  })

  it("says what two forms naming one endpoint come to, in the numbers the planner gave", () => {
    const shared = produceSharedPlan()

    render(<WhatAModelMayName />)

    const foot = [...document.querySelectorAll("p")].at(-1)?.textContent ?? ""

    expect(foot).toContain(`${shared.declaring} forms`)
    expect(foot).toContain(`${shared.asked} question`)
    expect(foot).toContain(shared.endpoints.join(", "))
  })
})

describe("an address written into the tree", () => {
  it("prints what was written and what the planner did with it", () => {
    const refused = produceRefusedDeclaration()

    render(<AnAddressInTheTree />)

    expect(screen.getByText(refused.declared)).toBeDefined()
    expect(document.body.textContent).toContain(refused.sentence)
    expect(document.querySelector(`[data-planned="${refused.planned}"]`)).not.toBeNull()
  })

  it("says the form renders disabled, because no endpoint was planned", () => {
    const refused = produceRefusedDeclaration()

    render(<AnAddressInTheTree />)

    expect(refused.planned).toBe(0)
    expect(document.body.textContent).toContain("so the form has no target and renders disabled")
  })
})
