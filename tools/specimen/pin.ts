/**
 * What a press does while a `do` list is running, and what the harness says
 * about the presses it refused.
 *
 * A file of its own, and the reason is the test rather than the tidiness. Both
 * functions below are serialised with `Function.prototype.toString` and run in
 * the page, so **the string that ships is the artefact and the module Vitest
 * compiles is not it** — `start-state.ts` states that trap at length and
 * `start-state-source.test.ts` is the shape of the test that catches it. That
 * test compiles a module with esbuild and `keepNames` and asks *that* module
 * its questions, which it can only do for a module with no imports to resolve.
 * `playwright.ts` has four.
 *
 * **Not one named function inside either body.** `tsx` compiles with esbuild's
 * `keepNames`, which wraps every named inner function in a `__name` call that
 * exists in this process and not in the page: the listener would never be
 * added, the page would navigate on the first press, and the photograph would
 * be a correct-looking picture of somewhere else. Hence the flat bodies, and
 * hence `pin.test.ts` asking the compiled artefact rather than this source.
 */

/**
 * Where the page keeps the presses the pin refused, until something reads them.
 *
 * Inlined as a literal in both bodies below, because a serialised function
 * arrives in the page without the module around it and a reference to this
 * constant would be a `ReferenceError` nobody is watching. The export exists so
 * a test can hold the two literals to it rather than to each other.
 */
export const PINNED_PRESSES = "__loomPinnedPresses"

/** The page as the instrument writes to it, which is not how a page is typed. */
type Instrumented = Record<string, string[] | undefined>

/**
 * Run in the top document before the first step of a `do` list: hold it still,
 * and let a press that does not leave the page through.
 *
 * A click on a real `a[href]` navigates, and every step after it then runs on a
 * different page — so a three-step shot silently photographs somewhere else,
 * which is the single failure mode this harness exists to prevent. A `do` list
 * is a sequence against *one* page by construction, so the navigation is
 * refused rather than the lane being asked to remember.
 *
 * **A same-page fragment is not that.** `<a href="#the-bar-above-your-page">`
 * does not leave the document: it sets `location.hash` and scrolls. Refusing it
 * bought nothing and cost the one state a contents rail exists for — a press of
 * a row, the page moved, the heading parked under the header, the row marked —
 * which came back byte-identical to a shot that did nothing. So the comparison
 * is against the **document** rather than against the tag: origin, path and
 * query, which is *the same address ignoring the hash*. A press that would
 * leave is still refused, the listener is still capture-phase, and it still
 * calls `preventDefault` rather than `stopPropagation` so the page's own
 * delegated listeners see the click.
 *
 * An `href` that will not resolve is refused, which is the safe reading of a
 * thing nothing can classify: the property being kept is that a press never
 * changes the subject of the shot, and an unparseable address is not evidence
 * that it would not.
 *
 * It is the **top** document, and that is stated rather than glossed: a
 * listener added here does not reach inside a frame, so a link pressed in a
 * framed approach still navigates that frame. A `waitFor` step is how such a
 * shot re-synchronises with the document it landed in.
 */
export const pinNavigation = (): void => {
  const instrument = window as unknown as Instrumented
  instrument["__loomPinnedPresses"] = []

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target
      if (!(target instanceof Element)) return

      const link = target.closest("a[href]")
      if (link === null) return

      const href = link.getAttribute("href") ?? ""
      const here = new URL(location.href)
      let destination: URL | undefined = undefined
      try {
        destination = new URL(href, location.href)
      } catch {
        destination = undefined
      }

      if (
        destination !== undefined &&
        destination.origin === here.origin &&
        destination.pathname === here.pathname &&
        destination.search === here.search
      )
        return

      event.preventDefault()
      const refused = instrument["__loomPinnedPresses"]
      if (refused !== undefined) refused.push(destination === undefined ? href : destination.href)
    },
    true
  )
}

/**
 * Run in the page after the last step: every press the pin refused, in order.
 *
 * It exists because the harness knew and the lane running it had to infer the
 * refusal from a selector reading `no match` two lines further down. One run
 * spent two shots and a 2,500ms wait on a press that was never going to happen,
 * and nothing in the output said so.
 *
 * Read once after the steps rather than between them: a reading per press would
 * buy the step's own selector at the cost of a round trip on every click in the
 * repository, and the address is what identifies the link a lane went looking
 * for.
 *
 * An empty list when the pin never ran at all, which is the same answer as a
 * list of steps that pressed nothing. Neither is a fault and a report cannot
 * tell them apart, so the absence is a list rather than a reason.
 */
export const readPinnedPresses = (): readonly string[] => [
  ...((window as unknown as Instrumented)["__loomPinnedPresses"] ?? []),
]
