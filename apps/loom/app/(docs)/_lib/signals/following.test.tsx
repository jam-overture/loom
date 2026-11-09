import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  LOOM_NODE_ATTRIBUTE,
  LOOM_REVISION_ATTRIBUTE,
  LOOM_TYPE_ATTRIBUTE,
  addressedRootIn,
} from "@jam-overture/loom/addressed"
import { renderLoomTree } from "@jam-overture/loom/react"
import {
  type ObserveVisibility,
  broadcastReaderSignals,
} from "@jam-overture/loom/signals/broadcast"
import { render, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { docsRegistry, docsThemes } from "@/app/(docs)/_lib/loom/registry"

import { addressingSubject } from "./markup"

/**
 * What a broadcast follows, run rather than asserted about.
 *
 * **The plain version.** *What your readers do* used to end with two
 * instructions: a band that arrives late is never measured, so do not expect
 * it, and a reader who moves to another page needs the broadcaster stopped and
 * started again, so remember to do it. Both had stopped being true — the first
 * at or before 6 November, the second on 7 November when
 * [0366](../../../../../../decisions/0366-a-broadcast-handed-a-document-follows-the-page-and-a-client-side-navigation-is-a-new-page-view.md)
 * shipped the document form — and this suite was green the whole time, because
 * what it checked was that the page still said them.
 *
 * `claims.test.ts` had argued those two were the safe kind: a claim about *how
 * the broadcaster behaves*, with the behaviour in the runtime where a test can
 * reach it. Both halves of that were true and nothing ever reached it.
 * `absences.ts` could not have caught them either — it sweeps for a sentence
 * saying Loom **lacks a name**, and these were instructions with no dated word
 * in them.
 *
 * So this file is the instrument that was missing, and it is the shape the
 * rest of this directory already uses: the producers on that page print what
 * the runtime did rather than what somebody believed it does. The difference
 * is that a broadcaster needs a browser, which is why this is a `.test.tsx`
 * and not two more lines beside the prose checks.
 *
 * **Each test below is one sentence the page now writes**, and the pairing is
 * deliberate: the sentence is quoted here, so a page edited back to the old
 * advice fails beside the measurement that contradicts it rather than
 * somewhere else.
 */

/**
 * The page, off disk and from `process.cwd()` rather than `import.meta.url`.
 *
 * Not a style choice: a `.tsx` test runs in the DOM project, where Vite
 * rewrites `import.meta.url` to something `fileURLToPath` refuses. The five
 * other files in this application that read a route off disk do the same, and
 * `_components/specifier.test.tsx` is where that is written down.
 */
const page = readFileSync(
  join(process.cwd(), "app", "(docs)", "docs", "the-runtime", "what-your-readers-do", "page.mdx"),
  "utf8"
)

const flowed = page.replace(/\s+/g, " ")

/**
 * A visibility observer that observes nothing and remembers everything it was
 * asked about.
 *
 * Time on screen is the one kind that needs each element handed over
 * individually — `activated` and `disclosed` are delegated from the root and
 * reach a node that did not exist when the broadcast started on their own — so
 * the list of elements handed to this stub **is** the set of nodes the
 * broadcaster is watching for `viewed` and `dwelled`. That is the measurement
 * both of the retired sentences were about.
 *
 * jsdom has no `IntersectionObserver`, so a stub is needed here whatever it
 * records. `observeVisibility` is published for exactly this
 * (`ReaderSignalOptions`), which is why no global is patched.
 */
const watching = (): { readonly seen: readonly Element[]; readonly observeVisibility: ObserveVisibility } => {
  const seen: Element[] = []

  return {
    seen,
    observeVisibility: () => ({
      observe: (element: Element) => {
        seen.push(element)
      },
      disconnect: () => {},
    }),
  }
}

/** The page the site's own addressing block is produced from, rendered addressed into this document. */
const anAddressedPage = (): Element => {
  const rendered = renderLoomTree(addressingSubject(), {
    resolver: docsRegistry,
    validator: docsRegistry,
    themes: docsThemes,
    addressed: true,
  })

  expect(rendered.diagnostics, "the example rendered with diagnostics").toEqual([])

  const root = addressedRootIn(render(rendered.element).container)

  if (root === undefined) throw new Error("the rendered example carries no tree id")

  return root
}

/**
 * An addressed element the page did not have when the broadcast started.
 *
 * The id is spelled the way the runtime spells one — a prefix, an underscore
 * and a body of digits and lower-case letters (`src/grammar.ts`) — because the
 * broadcaster reads an element's address through that pattern and ignores an
 * element whose id does not match it. The first version of this helper used
 * `n_arrived_late`, which has an underscore in its body and is therefore not a
 * node id, and the band was correctly never watched.
 */
const aBandArrivingLate = (): Element => {
  const late = document.createElement("div")

  late.setAttribute(LOOM_NODE_ATTRIBUTE, "n_arrivedlate")
  late.setAttribute(LOOM_TYPE_ATTRIBUTE, "loom.section")

  return late
}

const started: { stop: () => void }[] = []

const broadcastFrom = (scope: Element | Document, observeVisibility: ObserveVisibility) => {
  const begun = broadcastReaderSignals(scope, {
    kinds: ["dwelled"],
    observeVisibility,
    send: () => {},
  })

  if (begun.ok) started.push(begun.value)

  return begun
}

afterEach(() => {
  for (const broadcast of started.splice(0)) broadcast.stop()
})

describe("the document, which is the argument the page tells a reader to pass", () => {
  it("finds the addressed page by itself and watches what is on it", () => {
    anAddressedPage()

    const { seen, observeVisibility } = watching()
    const begun = broadcastFrom(document, observeVisibility)

    expect(begun.ok).toBe(true)
    expect(seen.length).toBeGreaterThan(0)
  })

  it("is what the page says to hand it, in the fence and in the prose", () => {
    expect(flowed).toContain("Hand it the `document` and it finds the addressed page itself")
    expect(flowed).toContain("const started = broadcastReaderSignals(document, {")
  })

  /**
   * The failure the page's *it returns a `Result`* paragraph is about, taken
   * from the document form rather than from the element form it was written
   * against: an application with no Loom page in it yet is the case a host
   * mounting this once in a layout will actually meet.
   */
  it("refuses a document with no addressed page on it, rather than broadcasting nothing", () => {
    const { observeVisibility } = watching()
    const begun = broadcastReaderSignals(document, { observeVisibility })

    expect(begun.ok).toBe(false)
    expect(begun.ok ? undefined : begun.error.code).toBe("unaddressed")
  })
})

describe("a band that arrives after the broadcast started", () => {
  /**
   * The first retired sentence, which read: *a broadcaster watches the nodes
   * that were there when it started … a band that streams in behind a Suspense
   * boundary, or a list that grows after hydration, is never watched for
   * `viewed` or `dwelled`.*
   */
  it("is handed to the visibility observer like the rest of the page", async () => {
    const root = anAddressedPage()
    const { seen, observeVisibility } = watching()

    broadcastFrom(document, observeVisibility)

    const before = seen.length
    const late = aBandArrivingLate()

    root.appendChild(late)

    await waitFor(() => {
      expect(seen.length).toBeGreaterThan(before)
    })

    expect(seen).toContain(late)
  })

  /**
   * And it does **not** restart the reading, which is the other half of the
   * same mutation and the clause that makes a page a proposal has just
   * rewritten one page view rather than two (0366, clause 1).
   *
   * Stated as *exactly the one element arrived* rather than as a count: a
   * broadcast that had torn down and begun again would re-walk the page, so
   * everything observed the first time would appear a second time, and that is
   * what this equality refuses.
   */
  it("does not begin the reading again", async () => {
    const root = anAddressedPage()
    const { seen, observeVisibility } = watching()

    broadcastFrom(document, observeVisibility)

    const firstWalk = [...seen]
    const late = aBandArrivingLate()

    root.appendChild(late)

    await waitFor(() => {
      expect(seen.length).toBe(firstWalk.length + 1)
    })

    expect(seen.slice(firstWalk.length)).toEqual([late])
  })
})

describe("a new revision on the root, which is what a client-side navigation looks like", () => {
  /**
   * The second retired sentence, which read: *a new revision is a new
   * broadcast … `stop()` the broadcaster and start another.*
   *
   * The page no longer asks a reader to do that, so something has to show that
   * the runtime does it. A reading that began again re-walks the page it is
   * now looking at, so the elements observed the first time are observed a
   * second time — which is the same walk, and is why this asserts the lists
   * are equal rather than that the count grew.
   */
  it("begins the reading again, with nobody asked to call stop", async () => {
    const root = anAddressedPage()
    const { seen, observeVisibility } = watching()

    broadcastFrom(document, observeVisibility)

    const firstWalk = [...seen]

    expect(firstWalk.length).toBeGreaterThan(0)

    root.setAttribute(LOOM_REVISION_ATTRIBUTE, "4096")

    await waitFor(() => {
      expect(seen.length).toBe(firstWalk.length * 2)
    })

    expect(seen.slice(firstWalk.length)).toEqual(firstWalk)
  })

  it("is the rule the page states, in the words it states it in", () => {
    expect(flowed).toContain(
      "The broadcaster watches two things on the page's root: which tree it is, and which revision."
    )
    expect(flowed).toContain("A page taken down and put back at the same revision has sent the reader")
  })
})
