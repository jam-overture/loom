import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { docsOrder } from "@/app/(docs)/_lib/nav"

import { Pager } from "./pager"

const pathname = vi.hoisted(() => ({ current: "/" }))

vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }))

const at = (href: string) => {
  pathname.current = href

  return render(<Pager />)
}

describe("the pager at the foot of a page", () => {
  it("offers the next page and no previous one on the first", () => {
    const first = docsOrder[0]
    const { container } = at(first?.href ?? "")

    expect(container.textContent).not.toContain("Previous")
    expect(container.textContent).toContain(docsOrder[1]?.page.title ?? "")
  })

  it("offers both in the middle", () => {
    const second = docsOrder[1]
    const { container } = at(second?.href ?? "")

    expect(container.textContent).toContain("Previous")
    expect(container.textContent).toContain("Next")
  })

  it("stops at the last page", () => {
    const last = docsOrder[docsOrder.length - 1]
    const { container } = at(last?.href ?? "")

    expect(container.textContent).toContain("Previous")
    expect(container.textContent).not.toContain("Next")
  })

  it("renders nothing where there is nothing to page to", () => {
    const { container } = at("/docs/somewhere/else")

    expect(container.firstChild).toBeNull()
  })
})
