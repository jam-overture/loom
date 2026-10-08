import { describe, expect, it } from "vitest"

import { IN_VIEW_CONTEXT, scrollToShow } from "./in-view"

/**
 * The rail's own geometry, which is the half of this that no browser is needed
 * for.
 *
 * The other half — the four numbers being the four a browser reports, and the
 * lookup that finds them — is in `_components/sidebar.test.tsx`, because in
 * this suite the extension decides the environment and a `.test.ts` has no
 * document (0015's reasoning, applied in `vitest.config.ts`). It is tested
 * through the rendered rail there rather than against elements built by hand,
 * which is the better fixture anyway: the rail really does have 45 rows.
 *
 * The numbers are the deployment's, measured with `pnpm shoot`'s `measure` on
 * a 1280×900 screen: the rail shows **844** pixels and holds **1,730**, a row
 * is **32** tall, and the current page's row sits at **113** on the first page
 * of the site and at **1,723** on the last. A fixture written out of thin air
 * would prove the arithmetic and nothing about the defect.
 */
const RAIL = { viewport: 844, scrollTop: 0, content: 1730 } as const

/**
 * The last page of the site, as a row **in the list**.
 *
 * The harness prints a box against the viewport, so the 1,723 it reported is
 * 1,666 here: the rail's own frame starts 57 down, under a header that is 56
 * tall and a border. Transcribing the screen number straight in is a mistake
 * worth leaving a note about, because every assertion still passes — the two
 * differ by less than the clamp at the bottom of the list absorbs.
 */
const ROW = { top: 1723 - 57, height: 32 } as const

/** The last page of *The runtime*, which is the first row off the bottom. */
const PAST = { top: 985 - 57, height: 32 } as const

describe("scrollToShow", () => {
  it("leaves the rail alone for a row that is on screen", () => {
    expect(scrollToShow(RAIL, { top: 113 - 57, height: 32 })).toBeUndefined()
  })

  /**
   * The measured defect, as one number.
   *
   * 1,666 + 32 + 48 − 844 is 902, and the rail can go no further than
   * 1,730 − 844 = 886 — so the last row of the site is a clamp rather than an
   * arithmetic answer, and the clamp is the bottom of the list.
   */
  it("brings the last page of the site into view, as far as the list goes", () => {
    expect(scrollToShow(RAIL, ROW)).toBe(886)
  })

  it("puts a row below the fold at the bottom, with context under it", () => {
    expect(scrollToShow(RAIL, PAST)).toBe(PAST.top + PAST.height + IN_VIEW_CONTEXT - 844)
  })

  it("puts a row above the fold at the top, with context over it", () => {
    expect(scrollToShow({ ...RAIL, scrollTop: 886 }, { top: 500, height: 32 })).toBe(500 - IN_VIEW_CONTEXT)
  })

  /**
   * The property the rest of this file is in service of: a reader who scrolled
   * the rail to the row they wanted, and then pressed it, is not moved.
   *
   * It is what makes the effect safe to run on every navigation rather than on
   * the ones the rail did not cause — which it has no way to tell apart.
   */
  it("does not move a rail the reader scrolled there themselves", () => {
    for (const scrollTop of [PAST.top - 800, 500, PAST.top]) {
      expect(scrollToShow({ ...RAIL, scrollTop }, PAST)).toBeUndefined()
    }
  })

  /** And the row at the very bottom is reached, so the clamp is not a dead end. */
  it("does not move a rail already at the bottom of the list", () => {
    expect(scrollToShow({ ...RAIL, scrollTop: 886 }, ROW)).toBeUndefined()
  })

  it("does not move a rail whose whole list already fits", () => {
    const fits = { viewport: 844, scrollTop: 0, content: 600 } as const

    expect(scrollToShow(fits, { top: 500, height: 32 })).toBeUndefined()
  })

  /** Nothing above the first row to give it, so the honest answer is no movement. */
  it("asks for no context it cannot have at the top of the list", () => {
    expect(scrollToShow({ ...RAIL, scrollTop: 500 }, { top: 8, height: 32 })).toBe(0)
    expect(scrollToShow(RAIL, { top: 8, height: 32 })).toBeUndefined()
  })

  /**
   * A row taller than the box it is in shows its top.
   *
   * Not a row this rail has — every entry is one line — and the branch exists
   * because without it the comparison it guards stops describing a window and
   * reads as *already in view* for a row half off the edge.
   */
  it("shows the top of a row too tall to fit with its context", () => {
    expect(scrollToShow({ viewport: 200, scrollTop: 0, content: 1730 }, { top: 500, height: 400 })).toBe(452)
  })

  it("never asks for a scrollTop outside the list", () => {
    for (const top of [0, 60, 500, 1666, 1698]) {
      const to = scrollToShow(RAIL, { top, height: 32 })

      if (to !== undefined) {
        expect(to).toBeGreaterThanOrEqual(0)
        expect(to).toBeLessThanOrEqual(RAIL.content - RAIL.viewport)
      }
    }
  })

  /** The context is an argument so that this claim is a test and not a comment. */
  it("keeps whatever context it is given", () => {
    expect(scrollToShow(RAIL, PAST, 0)).toBe(PAST.top + PAST.height - 844)
  })
})
