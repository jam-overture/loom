import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { transformSync } from "esbuild"
import { JSDOM } from "jsdom"
import { afterEach, describe, expect, it } from "vitest"

import { PINNED_PRESSES } from "./pin.js"

/**
 * The artefact, not the module.
 *
 * Both functions in `pin.ts` are serialised with
 * `Function.prototype.toString` and run in a page, and `start-state.ts`'s
 * header says what that costs a test that asks Vitest what the module does:
 * Vitest's transform is not `tsx`'s, so the string under test is a different
 * string from the one that ships. So this file compiles the module the way the
 * harness compiles it — esbuild with `keepNames`, which is the setting that
 * injects `__name` — and takes its subjects out of *that*.
 *
 * It is a plain Node environment with a `JSDOM` built by hand rather than a
 * `jsdom` test environment, and the reason is the compiler: esbuild cannot run
 * under jsdom, because its `TextEncoder` is not Node's and the invariant check
 * at the top of the library refuses. One file needs both, so the DOM is a
 * value here rather than the globals.
 */
const harnessCompiled = (): Record<string, unknown> => {
  const source = readFileSync(fileURLToPath(new URL("./pin.ts", import.meta.url)), "utf8")
  const compiled = transformSync(source, { loader: "ts", format: "cjs", keepNames: true })
  const module_: { exports: Record<string, unknown> } = { exports: {} }
  new Function("exports", "module", compiled.code)(module_.exports, module_)
  return module_.exports
}

const shipped = harnessCompiled()
const pinNavigation = shipped["pinNavigation"] as () => void
const readPinnedPresses = shipped["readPinnedPresses"] as () => readonly string[]

const PAGE =
  `<!doctype html><html><body>` +
  `<a id="fragment" href="#the-bar">to the bar</a>` +
  `<a id="fragment-nested" href="#the-bar"><span id="inside">to the bar</span></a>` +
  `<a id="empty-fragment" href="#">to the top</a>` +
  `<a id="bare" href="">this page</a>` +
  `<a id="same-path" href="/docs/page?x=1#the-bar">this page again</a>` +
  `<a id="other-path" href="/docs/elsewhere">another page</a>` +
  `<a id="other-query" href="/docs/page?x=2">the same page, asked differently</a>` +
  `<a id="other-origin" href="https://example.test/docs/page">another site</a>` +
  `<a id="mail" href="mailto:nobody@example.test">write to us</a>` +
  `<a id="unresolvable" href="https://">nothing can parse this</a>` +
  `<span id="not-a-link">no link anywhere above me</span>` +
  `</body></html>`

/**
 * What the page supplies and this process does not.
 *
 * The pin reads four bare globals, which is what a function that runs in a
 * page is for. Named once so the teardown removes exactly what the setup put
 * there, and no more: deleting a global this file did not install takes it
 * away from every test after it.
 */
const STUBBED = ["window", "document", "location", "Element"] as const

/**
 * One document per case, with the pin already on it.
 *
 * `location.href` carries a path *and* a query, because two of the three
 * comparisons the pin makes are invisible against a bare origin: a page served
 * at `/` cannot tell a path check from an origin check, and a page with no
 * query cannot tell a query check from either.
 */
const pinnedPage = (): JSDOM => {
  const dom = new JSDOM(PAGE, { url: "https://loom.test/docs/page?x=1#top" })
  const globals = globalThis as unknown as Record<string, unknown>
  const from = dom.window as unknown as Record<string, unknown>
  /**
   * `URL` is deliberately not among them: the pin resolves a `location.href`
   * that is a string either way, and Node's own constructor is the one the
   * page's would be a copy of. Replacing it would be the test asserting
   * against its own double.
   */
  for (const name of STUBBED) globals[name] = from[name]
  pinNavigation()
  return dom
}

/**
 * Press it, and say whether the press survived.
 *
 * `defaultPrevented` and not an observed navigation: jsdom does not navigate,
 * and what the pin does is exactly one thing to the event. The listener is
 * capture-phase on the document, so the event has to be dispatched on the
 * element and allowed to bubble, which is how a real press reaches it.
 */
const press = (dom: JSDOM, id: string): boolean => {
  const element = dom.window.document.getElementById(id)
  if (element === null) throw new Error(`no #${id} in the page`)
  const event = new dom.window.MouseEvent("click", { bubbles: true, cancelable: true })
  element.dispatchEvent(event)
  return !event.defaultPrevented
}

afterEach(() => {
  const globals = globalThis as unknown as Record<string, unknown>
  for (const name of STUBBED) delete globals[name]
})

describe("the pin, as the page receives it", () => {
  /**
   * The finding this was written for, from the lane that lost a picture to it:
   * a press of a contents row produced a shot byte-identical to one that did
   * nothing, twice, with a 400ms wait and then a 2,500ms one.
   */
  it("lets a press of a same-page fragment through", () => {
    const dom = pinnedPage()

    expect(press(dom, "fragment")).toBe(true)
    expect(readPinnedPresses()).toEqual([])
  })

  /**
   * The press a reader actually makes. A contents row's text is in a `span`
   * inside the anchor, so the event's target is never the anchor itself and
   * the whole comparison hangs off `closest`.
   */
  it("lets a press through when the target is inside the anchor rather than the anchor", () => {
    const dom = pinnedPage()

    expect(press(dom, "inside")).toBe(true)
    expect(readPinnedPresses()).toEqual([])
  })

  it("lets the same address with a fragment on it through", () => {
    const dom = pinnedPage()

    expect(press(dom, "same-path")).toBe(true)
  })

  /**
   * `#` and `""` both resolve to this document, so both are the browser's own
   * *scroll to the top* and neither leaves the page. A page that hangs a
   * script on one of them is a page whose script runs, which is the behaviour
   * being photographed rather than a thing to protect a lane from.
   */
  it("lets an empty fragment and a bare href through, which are both this document", () => {
    const dom = pinnedPage()

    expect(press(dom, "empty-fragment")).toBe(true)
    expect(press(dom, "bare")).toBe(true)
    expect(readPinnedPresses()).toEqual([])
  })

  it("still refuses a press that would leave for another path", () => {
    const dom = pinnedPage()

    expect(press(dom, "other-path")).toBe(false)
    expect(readPinnedPresses()).toEqual(["https://loom.test/docs/elsewhere"])
  })

  /**
   * The same path asked a different way is a different page, and the server
   * decides that rather than the pin. `?x=2` is a navigation whatever the
   * document does with it.
   */
  it("refuses a press that keeps the path and changes the query", () => {
    const dom = pinnedPage()

    expect(press(dom, "other-query")).toBe(false)
    expect(readPinnedPresses()).toEqual(["https://loom.test/docs/page?x=2"])
  })

  it("refuses a press that would leave for another origin", () => {
    const dom = pinnedPage()

    expect(press(dom, "other-origin")).toBe(false)
    expect(readPinnedPresses()).toEqual(["https://example.test/docs/page"])
  })

  /**
   * A scheme that is not a page is still a thing that takes the reader out of
   * the document, and the comparison catches it without naming it: nothing
   * about `mailto:` is special-cased, its resolved origin simply is not this
   * one.
   */
  it("refuses a press on a scheme that is not this document", () => {
    const dom = pinnedPage()

    expect(press(dom, "mail")).toBe(false)
    expect(readPinnedPresses()).toEqual(["mailto:nobody@example.test"])
  })

  /**
   * The safe reading of a thing nothing can classify. An address that will not
   * parse is not evidence that the press would stay, and the property worth
   * keeping is that a press never changes the subject of a shot — so it is
   * refused, and recorded as the lane wrote it rather than as a resolution
   * that does not exist.
   */
  it("refuses a press whose href will not resolve, and records it as written", () => {
    const dom = pinnedPage()

    expect(press(dom, "unresolvable")).toBe(false)
    expect(readPinnedPresses()).toEqual(["https://"])
  })

  it("leaves a press that is not inside a link alone", () => {
    const dom = pinnedPage()

    expect(press(dom, "not-a-link")).toBe(true)
    expect(readPinnedPresses()).toEqual([])
  })

  /** In order, and only the ones that were refused. */
  it("records every refused press in the order they were made", () => {
    const dom = pinnedPage()

    press(dom, "other-path")
    press(dom, "fragment")
    press(dom, "other-origin")

    expect(readPinnedPresses()).toEqual([
      "https://loom.test/docs/elsewhere",
      "https://example.test/docs/page",
    ])
  })

  /**
   * A reading taken before any pin was installed, which is what a `do` list of
   * steps that press nothing leaves behind — and what every shot in a document
   * the pin could not reach would ask.
   */
  it("reads an empty list when nothing has pinned the page", () => {
    const dom = new JSDOM(PAGE, { url: "https://loom.test/docs/page?x=1" })
    const globals = globalThis as unknown as Record<string, unknown>
    globals["window"] = dom.window

    expect(readPinnedPresses()).toEqual([])
  })

  /** A second `act` on one document starts its own list rather than appending. */
  it("starts a fresh list each time it is installed", () => {
    const dom = pinnedPage()
    press(dom, "other-path")
    expect(readPinnedPresses()).toHaveLength(1)

    pinNavigation()

    expect(readPinnedPresses()).toEqual([])
  })
})

describe("the source that ships, compiled the way the harness compiles it", () => {
  /**
   * The defect `start-state.ts` was rewritten around, met from the other
   * direction and pinned here because this file is the one place that holds
   * the artefact rather than the module.
   *
   * `tsx` compiles with `keepNames`, which wraps every *named* inner function
   * in `__name(…)` — a helper that does not exist in the page. The listener
   * would never be added, the first press would navigate, and what came back
   * would be a correct-looking photograph of somewhere else. So neither body
   * may contain a named inner function, and that is a property of the
   * compiled string rather than a style rule a reader has to remember.
   */
  it("carries no `__name` wrapper into either function the page runs", () => {
    expect(pinNavigation.toString()).not.toContain("__name")
    expect(readPinnedPresses.toString()).not.toContain("__name")
  })

  /**
   * Both bodies inline the key as a literal, because a serialised function
   * arrives in the page without the module around it. The export is what the
   * two literals are held to, so a rename that reaches one of them fails here
   * rather than in a shot whose refusals came back empty.
   */
  it("writes and reads the same place, which is the exported name", () => {
    expect(pinNavigation.toString()).toContain(PINNED_PRESSES)
    expect(readPinnedPresses.toString()).toContain(PINNED_PRESSES)
  })
})
