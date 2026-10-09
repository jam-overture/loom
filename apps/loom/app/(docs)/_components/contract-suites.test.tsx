import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { contractSuites } from "@/app/(docs)/_lib/proving/contracts"

import { ContractSuites } from "./contract-suites"

/**
 * The ready-made suites on `/docs/building-with-loom/testing-what-you-built`,
 * rendered.
 *
 * Same argument as `entry-points.test.tsx`: the list is derived and held by
 * `_lib/proving/contracts.test.ts`, and none of that notices if the block
 * prints nothing. A reader who is being told *there is one of these for each
 * seam you can implement yourself* and then shown an empty box has been told
 * the opposite of the truth.
 *
 * So this reads the words back out of the document, and holds the block's own
 * count against the derivation's and against being more than one — because
 * every check below walks the same list, and an empty list satisfies all of
 * them at once.
 */

const block = () => render(<ContractSuites />).container

const items = (container: HTMLElement): readonly HTMLElement[] => [
  ...container.querySelectorAll<HTMLElement>("li"),
]

describe("the contract suites block", () => {
  it("prints one entry per published suite", () => {
    expect(contractSuites().length).toBeGreaterThan(1)
    expect(items(block())).toHaveLength(contractSuites().length)
  })

  it("names each suite, its seam and its call", () => {
    const printed = items(block()).map((item) => item.textContent ?? "")

    for (const [index, suite] of contractSuites().entries()) {
      const text = printed[index] ?? ""

      expect(text, `${suite.name} is not in entry ${index}`).toContain(suite.name)
      expect(text, `${suite.seam} is not in entry ${index}`).toContain(suite.seam)
      expect(text, `the call is not in entry ${index}`).toContain(suite.call)
    }
  })

  /**
   * The block is a list of names and signatures rather than this page's prose,
   * and `not-prose` is what keeps the stylesheet's markdown rules out of it —
   * the same barrier `prose-barrier.test.ts` holds the stylesheet to.
   */
  it("draws itself rather than letting the prose rules reach in", () => {
    const list = block().querySelector("ul")

    expect(list?.className).toContain("not-prose")
  })

  it("can be named by a screenshot or a test", () => {
    expect(block().querySelector("[data-contract-suites]")).not.toBeNull()
  })
})
