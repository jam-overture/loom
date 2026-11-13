import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { SegmentForm, type SegmentDraft } from "./segment-form"

vi.mock("../actions", () => ({ saveSegmentAction: vi.fn() }))

const pages = [
  { treeId: "t_home", name: "Welcome home" },
  { treeId: "t_pricing", name: "Pricing" },
]

const NEW: SegmentDraft = { word: "", conditions: "", on: "every" }

const drawn = (draft: SegmentDraft, changing: boolean) => {
  const { container } = render(
    <SegmentForm projectId="prj_shop" pages={pages} draft={draft} changing={changing} />
  )
  const field = <T extends Element>(selector: string): T => {
    const found = container.querySelector<T>(selector)

    if (found === null) throw new Error(`no ${selector}`)

    return found
  }

  return {
    container,
    word: field<HTMLInputElement>('input[name="word"]'),
    conditions: field<HTMLTextAreaElement>('textarea[name="conditions"]'),
    on: field<HTMLSelectElement>('select[name="on"]'),
  }
}

describe("the segment form", () => {
  it("offers every page first, then each page the site published by its name", () => {
    const { on, word } = drawn(NEW, false)

    expect([...on.options].map((option) => [option.value, option.textContent])).toEqual([
      ["every", "Every page"],
      ["t_home", "Welcome home"],
      ["t_pricing", "Pricing"],
    ])
    expect(on.value).toBe("every")
    expect(word.readOnly).toBe(false)
  })

  it("opens a segment being changed with its own word, conditions and page, the word fixed", () => {
    const { word, conditions, on } = drawn(
      { word: "phone", conditions: "device = phone", on: "t_pricing" },
      true
    )

    expect(word.value).toBe("phone")
    expect(word.readOnly).toBe(true)
    expect(conditions.value).toBe("device = phone")
    expect(on.value).toBe("t_pricing")
  })

  it("says, beside the conditions, that a segment is a group and never a person", () => {
    const { container } = drawn(NEW, false)

    expect(container.textContent).toContain("A segment is a group of readers, never one person.")
  })
})
