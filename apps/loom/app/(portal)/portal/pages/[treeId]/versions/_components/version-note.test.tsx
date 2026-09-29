import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { nodeIdSchema } from "@jam-overture/loom"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import type { VersionChange } from "@/app/(portal)/_lib/progression"

import { provenanceReading, VersionNote } from "./version-note"

const change = (over: Partial<VersionChange> = {}): VersionChange => ({
  view: {
    who: "ana@loom.local asked for this.",
    allowed: "sam@loom.local said yes to it.",
    sure: "The AI said it was fairly sure.",
    changes: [
      { before: "Set ", subject: { name: "the card “Autumn arrivals”", nodeId: "n_card" }, after: "’s look to “prominent”." },
    ],
  },
  when: "9 August 2026, 09:04 UTC",
  at: "2026-08-09T09:04:00.000Z",
  onTheRecord: "revision 4",
  operations: [{ op: "remove", nodeId: nodeIdSchema.parse("n_card") }],
  ...over,
})

describe("provenanceReading", () => {
  /**
   * The whole sentence, not any of the three. A component that dropped one of
   * them would pass every `toContain` anybody would write about the other two,
   * and this shape exists because the failure it prevents is a dropped clause.
   */
  it("reads as the three facts in order, as one sentence", () => {
    expect(provenanceReading(change())).toBe(
      "ana@loom.local asked for this. sam@loom.local said yes to it. The AI said it was fairly sure."
    )
  })

  /**
   * A record that does not know who let a change through is a normal state, not
   * an edge one: a change nobody had to approve and one a host approved without
   * naming the approver are indistinguishable, and the portal has been
   * deliberately silent about which since long before this screen existed.
   */
  it("leaves no gap when the record does not know who let it through", () => {
    const said = provenanceReading(change({ view: { ...change().view, allowed: undefined } }))

    expect(said).toBe("ana@loom.local asked for this. The AI said it was fairly sure.")
    expect(said).not.toContain("  ")
  })
})

describe("VersionNote", () => {
  /**
   * The whole line, read off the element that holds it. A `getByText` cannot see
   * this: the sentence reaches the screen as three pieces with the part's words
   * and its id in spans of their own, and that split is the point of
   * `PlainSentence` — so what is asserted is the reading, which is where a
   * dropped piece or a missing space shows up.
   */
  it("leads with what the change did, as a sentence with the part named in it", () => {
    const { container } = render(<VersionNote change={change()} />)

    expect(container.querySelector("li")?.textContent).toBe(
      "Set the card “Autumn arrivals” n_card’s look to “prominent”."
    )
  })

  /**
   * The words are body text and only the id is monospace. A subject set entirely
   * in monospace undoes the naming — a reader skims monospace as machinery and
   * skips it — which is why `PlainSentence` exists and why this renders through
   * it rather than spreading the line by hand.
   */
  it("sets the part's name as words and only its id as machinery", () => {
    const { container } = render(<VersionNote change={change()} />)
    const mono = Array.from(container.querySelectorAll(".font-mono")).map(
      (element) => element.textContent
    )

    expect(mono).toContain("n_card")
    expect(mono).not.toContain("the card “Autumn arrivals”")
  })

  it("dates the change, and keeps the instant a machine reads beside it", () => {
    const { container } = render(<VersionNote change={change()} />)
    const time = container.querySelector("time")

    expect(time?.textContent).toBe("9 August 2026, 09:04 UTC")
    expect(time?.getAttribute("dateTime")).toBe("2026-08-09T09:04:00.000Z")
  })

  /**
   * **Plain language is the default and the record is one click away.** The
   * runtime's own name for the version and the operations themselves are both
   * here and neither is on the surface — which is the governing principle in one
   * assertion, at the only place on this screen where the operations exist at
   * all.
   */
  it("keeps the runtime's own record behind a disclosure, and nothing of it outside", () => {
    const { container } = render(<VersionNote change={change()} />)
    const record = container.querySelector("details")

    expect(record?.textContent).toContain("revision 4")
    expect(record?.textContent).toContain('"op":"remove"')

    const surface = container.cloneNode(true) as HTMLElement
    for (const details of Array.from(surface.querySelectorAll("details"))) details.remove()

    expect(runtimeWordsIn(surface.textContent ?? "")).toEqual([])
  })

  it("is closed until a reader asks", () => {
    const { container } = render(<VersionNote change={change()} />)

    expect(container.querySelector("details")?.hasAttribute("open")).toBe(false)
  })
})
