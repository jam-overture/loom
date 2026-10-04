import type { LoomTree } from "@jam-overture/loom"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ASKS, type AskId } from "./adapt/asks"
import { ANCHOR } from "./bands"
import { elementsIn } from "./measure"
import { anchorsIn as anchorsDeclaredIn } from "./naming"
import type { PageContext } from "./pages/home"
import { pageTreeFor, renderTree } from "./render"
import { HOW_IT_WORKS } from "./site"

/**
 * A link that stays on the page, held to the one thing that can make it fail.
 *
 * Every other control on this site is a path, and a path that has gone wrong
 * announces itself: the route is missing, the build says so, `pnpm verify` goes
 * red. **A fragment fails silently.** `#see-it-happen` pointing at a band that
 * no longer declares that anchor is a button a visitor presses and nothing
 * happens — no error, no console line, no failing test, and a page that still
 * renders perfectly. It is the one class of broken link this repository could
 * not previously have reported, and the site now has two of them.
 *
 * So the assertion is not "the anchor is declared". It is **the id is in the
 * document a browser receives**, in every state the page can be in, which is
 * the only version of the claim a visitor's press depends on.
 */

const ORIGIN = "https://loom.example"

/**
 * Every state the front door can be read in, which is what makes this a sweep
 * rather than one example.
 *
 * The notice carrying the link exists only once a visitor has asked for
 * something, and what it offers changes four times after that — the ask, the
 * yes to a hold, the undo, and the yes to a hold on the undo. A link correct on
 * arrival and dropped from the approved page would pass any test that looked at
 * one of them.
 */
const STATES: readonly (readonly [string, PageContext])[] = [
  ["arrived", { origin: ORIGIN, theme: "minimal" }],
  ...ASKS.flatMap((ask): readonly (readonly [string, PageContext])[] => {
    const asked: AskId = ask.id

    return [
      [`${asked}`, { origin: ORIGIN, theme: "minimal", ask: asked }],
      [`${asked}, allowed`, { origin: ORIGIN, theme: "minimal", ask: asked, approve: true }],
      [`${asked}, put back`, { origin: ORIGIN, theme: "minimal", ask: asked, back: true }],
      [
        `${asked}, put back and allowed`,
        { origin: ORIGIN, theme: "minimal", ask: asked, back: true, backApprove: true },
      ],
    ]
  }),
]

const pageFor = async (context: PageContext): Promise<LoomTree> => pageTreeFor(HOW_IT_WORKS, context)

const markupFor = (page: LoomTree): string =>
  renderToStaticMarkup(renderTree(page, { origin: ORIGIN }).element)

/**
 * Every anchor declared in a tree, in document order and including repeats.
 *
 * The walk and the read of it both moved out on 4 October — the walk to
 * `measure.ts`, which nine test files in this route group had each written for
 * themselves, and the read to `naming.ts`, which needed the same list to check
 * that a link from one page of this site to a place on another lands on
 * something. Two readings of *where can a fragment land* would eventually
 * disagree, and the one that disagreed would be whichever was not looked at.
 */
const anchorsIn = (page: LoomTree): readonly string[] => anchorsDeclaredIn(page.root)

/**
 * Every fragment a control on this page points at, on this page.
 *
 * Only same-page links are collected, and deliberately: a fragment on somebody
 * else's address is their page's promise to keep, and a test here that checked
 * it would be this lane asserting over another lane's chrome. A control leaving
 * for `/docs#something` is out of scope by the same rule that put the way back
 * into a finding rather than into a commit.
 */
const resolved = (href: string): URL | undefined => {
  try {
    return new URL(href, `${ORIGIN}/`)
  } catch {
    return undefined
  }
}

const samePageFragmentsIn = (page: LoomTree): readonly string[] =>
  elementsIn(page.root).flatMap((element) => {
    const href = element.props["href"]

    if (typeof href !== "string") return []

    const url = resolved(href)

    if (url === undefined || url.origin !== ORIGIN) return []
    if (url.pathname !== HOW_IT_WORKS.path) return []

    return url.hash === "" ? [] : [url.hash.slice(1)]
  })

describe("the anchors this site links to", () => {
  it.each(STATES)("%s renders every anchor it declares as an id", async (_name, context) => {
    const page = await pageFor(context)
    const markup = markupFor(page)

    for (const anchor of anchorsIn(page)) {
      expect({ anchor, inDocument: markup.includes(`id="${anchor}"`) }).toEqual({
        anchor,
        inDocument: true,
      })
    }
  })

  /**
   * The assertion the site was missing, stated in the direction that fails.
   *
   * A link and an anchor drifting apart breaks the link, not the anchor, so the
   * useful question is asked of the link: whatever a control on this page points
   * at on this page, is it there? It fails the day a band is renamed, a band
   * stops being rendered in one of the states, or a new control is written
   * against a fragment nobody declared.
   */
  it.each(STATES)("%s can reach every fragment it points at", async (_name, context) => {
    const page = await pageFor(context)
    const declared = anchorsIn(page)

    for (const fragment of samePageFragmentsIn(page)) {
      expect({ fragment, declared: declared.includes(fragment) }).toEqual({
        fragment,
        declared: true,
      })
    }
  })

  /**
   * Two elements answering to one name is a link that lands on whichever the
   * browser met first, which is a page-order dependency nobody writes down.
   */
  it.each(STATES)("%s answers to each of its anchors once", async (_name, context) => {
    const declared = anchorsIn(await pageFor(context))

    expect(declared).toEqual([...new Set(declared)])
  })

  /**
   * The list in `bands.ts` is the vocabulary, so a name that has quietly left
   * the page is caught here rather than at the control pointing at it — which
   * is the same check one layer earlier, and the one that says *which* band
   * went.
   */
  it.each(Object.entries(ANCHOR))(
    "%s is on the front door in every state",
    async (_band, anchor) => {
      for (const [, context] of STATES) {
        const declared = anchorsIn(await pageFor(context))

        expect({ anchor, onThePage: declared.includes(anchor) }).toEqual({
          anchor,
          onThePage: true,
        })
      }
    }
  )
})

describe("the way back to what happened", () => {
  /**
   * The control itself, and the premise underneath it: it is offered exactly
   * when there is something to go back to.
   *
   * A visitor who has not asked for anything is not looking at a notice, so a
   * link to the record of their change would be a link to a panel with nothing
   * in it.
   */
  it("is absent on the page a stranger arrives at", async () => {
    const page = await pageFor({ origin: ORIGIN, theme: "minimal" })

    expect(samePageFragmentsIn(page)).not.toContain(ANCHOR.seeItHappen)
  })

  it.each(STATES.filter(([name]) => name !== "arrived"))(
    "%s offers it",
    async (_name, context) => {
      const page = await pageFor(context)

      expect(samePageFragmentsIn(page)).toContain(ANCHOR.seeItHappen)
    }
  )

  /**
   * The failure this link could cause, asserted so it cannot.
   *
   * It is the only control in the notice that goes nowhere, so it must carry
   * every answer the visitor has already given. A link that dropped `back=1`
   * would put a change the visitor had just reversed back onto the page, while
   * claiming to do nothing but scroll — the site undoing an undo on the one
   * band whose whole subject is that nothing gets dropped.
   */
  it.each(STATES.filter(([name]) => name !== "arrived"))(
    "%s keeps the whole of the address the visitor is at",
    async (_name, context) => {
      const page = await pageFor(context)
      const link = elementsIn(page.root)
        .flatMap((element) =>
          typeof element.props["href"] === "string" &&
          element.props["href"].endsWith(`#${ANCHOR.seeItHappen}`)
            ? [element.props["href"]]
            : []
        )
        .at(0)

      if (link === undefined) throw new Error("loom: the notice offers no way back")

      const url = new URL(link)

      expect({
        ask: url.searchParams.get("ask"),
        approve: url.searchParams.get("approve"),
        back: url.searchParams.get("back"),
        backYes: url.searchParams.get("back-yes"),
      }).toEqual({
        ask: context.ask ?? null,
        approve: context.approve === true ? "1" : null,
        back: context.back === true ? "1" : null,
        backYes: context.backApprove === true ? "1" : null,
      })
    }
  )
})
