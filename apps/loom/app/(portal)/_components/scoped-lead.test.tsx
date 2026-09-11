import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { UNTITLED, type PageName as PageNameValue } from "@/app/(portal)/_lib/page-name"
import { scopedLead, type ScopedView } from "@/app/(portal)/_lib/page-views"
import { readingOf } from "@/app/(portal)/_lib/vocabulary"

import { ScopedLead } from "./scoped-lead"

const NAMED: PageNameValue = { name: "Autumn arrivals", treeId: "t_seed1", derived: true }
const UNNAMED: PageNameValue = { name: UNTITLED, treeId: "t_seed1", derived: false }

const SCOPED: readonly ScopedView[] = ["asked", "changed", "trust", "checkup"]

describe("ScopedLead", () => {
  /**
   * The half a `readingOf` test cannot reach: the line can be perfectly
   * assembled and the component can still drop a piece of it, and the only
   * thing that notices is a reader.
   */
  it.each(SCOPED)("renders %s exactly as the line reads", (view) => {
    const { container } = render(<ScopedLead view={view} page={NAMED} />)

    expect(container.textContent).toBe(readingOf(scopedLead(view, NAMED)))
  })

  /**
   * The defect this component was written for. Every other place the portal
   * names a page has shown the words since 6 September; the four scoped
   * sentences still opened with `t_seed1`, so the front door called a page
   * *Autumn arrivals* and its own history, two clicks away, did not.
   */
  it("leads with the words a person recognises", () => {
    const { container } = render(<ScopedLead view="changed" page={NAMED} />)

    expect(container.textContent).toContain("made to Autumn arrivals")
  })

  /**
   * And never at the id's expense. It is what a reader pastes into a URL or
   * quotes in a support thread, and it stays in monospace, which is what says
   * it is a name to be copied rather than a word to be read.
   */
  it("keeps the id beside the name, in monospace", () => {
    const { container } = render(<ScopedLead view="changed" page={NAMED} />)

    expect(container.textContent).toContain("t_seed1")
    expect(container.querySelector(".font-mono")?.textContent).toBe("t_seed1")
  })

  it("still reads as a sentence for a page that never said what it is called", () => {
    const { container } = render(<ScopedLead view="trust" page={UNNAMED} />)

    expect(container.textContent).toContain(`${UNTITLED} t_seed1`)
    expect(container.textContent).toBe(readingOf(scopedLead("trust", UNNAMED)))
  })
})
