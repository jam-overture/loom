import { describe, expect, it } from "vitest"

import { portalScreens, screenSource } from "@/app/(portal)/_lib/screen-source"

/**
 * One rule, over every screen, so that the sixteen cannot come back.
 *
 * ## What happened
 *
 * `_components/screen.tsx` landed on 3 October with the rule written out and the
 * primitive built, and converted **two** of the eighteen screens — the report
 * said so plainly and called the rest a queue, because a twenty-four-screen
 * relayout in one pull request is unreviewable. Four hours later the maintainer
 * opened one of the other sixteen and said the same thing again:
 *
 * > *"There is a lot of dead space on several of the portal views. I think we
 * > need to utilize it better."*
 *
 * A queue in a report is not a mechanism. What makes this the last time is not
 * that the other sixteen are converted — it is that a nineteenth screen written
 * next month cannot ship capped, because this fails.
 *
 * ## The property, and why it is spelled this way
 *
 * A screen may hold a `max-w-` anywhere it likes: a card of sentences, a list of
 * rows, a notice. What it may not do is cap **itself** — put a width on the
 * element it returns, which is the one container every reader of that screen
 * meets. `p-8` is what identifies that element: it is the screen's own padding
 * from the chrome, it appears on nothing nested inside, and every one of the
 * eighteen original screens carried it beside the cap it is now rid of.
 *
 * So the rule is a pair, and both halves are load bearing:
 *
 * > **A screen's outermost element is `Screen`, and nothing in it pairs a width
 * > with the screen's own padding.**
 *
 * The first half alone would pass a file that rendered `<Screen>` and then put
 * `max-w-3xl p-8` on a div inside it. The second alone would pass a file that
 * dropped the cap and kept a hand-written container, which is the same screen
 * one refactor from the cap coming back.
 *
 * Comments are stripped by `screenSource`, which is what lets this file and the
 * component it guards both write `max-w-3xl` out in full while explaining it.
 */

/**
 * The screens that render something. A 308 has no layout to hold to anything.
 *
 * `isForwarding` is the module's own answer to this question and it is the wrong
 * one *here*, which is worth saying rather than working around in silence: it
 * asks whether the source contains `<` followed by a letter, and the five
 * forwarding routes all take `Promise<{ rest?: readonly string[] }>`. A
 * generic parameter is not an element. It costs those guards nothing, because
 * what they assert about a redirect happens to hold, and it would cost this one
 * every redirect in the group — so this asks the question it actually means:
 * does the file return an element at all.
 */
const rendering = portalScreens()
  .map((screen) => ({ ...screen, source: screenSource(screen.file) }))
  .filter((screen) => /return\s*\(?\s*</u.test(screen.source))

/**
 * The one screen that is not `Screen`, named here rather than exempted quietly.
 *
 * `/portal/sign-in` is the only page in this group a visitor reaches without a
 * session, so it is drawn without the rail and without the chrome — a centred
 * hero, which is what every product's sign-in is and what this one should stay.
 * Widening it would be applying the rule past the thing the rule is for: there
 * is one field and one button on it, and a 1440-pixel-wide sign-in form is not
 * a better use of the space, it is a worse one.
 *
 * Written as a list of one at the point of use, so that a second entry has to be
 * argued for in a diff somebody reads.
 */
const HERO: readonly string[] = ["/portal/sign-in"]

/** A width utility, in any of the spellings Tailwind accepts for one. */
const WIDTH = /\bmax-w-(?:xs|sm|md|lg|xl|\d*xl|screen-\w+|\[[^\]]+\])\b/u

describe("every screen's width", () => {
  /**
   * The guard, guarded. If `portalScreens` ever returned nothing — a renamed
   * directory, a changed convention — every assertion below would pass over an
   * empty list and this file would report a clean lane for ever.
   */
  it("finds the screens it is supposed to be checking", () => {
    expect(rendering.length).toBeGreaterThanOrEqual(17)
    expect(rendering.map((screen) => screen.route)).toContain("/portal/activity")
    expect(rendering.map((screen) => screen.route)).toContain("/portal/pages/[treeId]/versions")
  })

  it.each(
    rendering
      .filter((screen) => !HERO.includes(screen.route))
      .map((screen) => [screen.route, screen.source] as const)
  )("%s is as wide as the display", (_route, source) => {
    expect(source).toMatch(/<Screen[\s/>]/u)
  })

  it.each(rendering.map((screen) => [screen.route, screen.source] as const))(
    "%s does not cap its own container",
    (_route, source) => {
      const capped = source
        .split("\n")
        .filter((line) => line.includes("p-8") && WIDTH.test(line))

      expect(capped).toEqual([])
    }
  )
})
