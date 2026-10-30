import { readPageSource } from "../search/headings"

import { calls } from "./calls"
import { fencesOnPage, pagesWithFences } from "./extract"
import { importLineFor, importsBinding, importsIn, type FenceImport } from "./imports"
import { canCarryAnImport, isCheckable, type Fence } from "./model"
import { blockSectionsIn } from "./sections"

/**
 * The door a reader can see **from where they landed**.
 *
 * **The plain version.** A page here is written to be read downwards, and the
 * import for a name is written once, the first time the name appears. That is
 * the right way to write a page and it assumes one thing: that the reader
 * started at the top.
 *
 * Nobody starts at the top. This site hands out fragments of its own pages, by
 * design, in three places:
 *
 * - **the search box**, whose results are headings and whose code band
 *   (`search/code.ts`) exists so that *a name a reader saw in a block can be
 *   found again* — it finds the block and sends the reader to the heading above
 *   it;
 * - **the contents rail** on the right of every page;
 * - **the arrival route's own `checkpointHref`**, which anchors on the heading
 *   where the step's one promised name is first mentioned.
 *
 * A reader arriving that way is standing in the middle of the page with
 * everything above them unread. So on 29 October the rule *the page shows the
 * import* was made true and left a second question open, which that day's
 * report stated and did not answer:
 *
 * > *a reader who lands **mid-page** — from search, or from the route's own
 * > `checkpointHref` — can still meet a block whose import is two screens up.*
 *
 * ## The rule
 *
 * **A block's doors are shown in the section the block is in.** The section is
 * the one `search/code.ts` indexes and the rail links to — opened by a `##` or
 * a `###` and by nothing else, because those are the only anchors anything on
 * this site hands out ({@link blockSectionsIn}). A reader who lands on a heading
 * and reads downwards reaches every import they need before they reach the call
 * that needs it.
 *
 * It is a tightening and not a new idea: *Your first tree* has repeated
 * `sequentialIdFactory`'s import for months, by hand, and `program.ts` names the
 * reason in its own docblock — *"because a reader who arrives at the second
 * block should not have to scroll up to know where the name came from."* That is
 * this rule, written as a courtesy by whoever happened to think of it. Hoisting
 * and merging the page's imports is what makes the courtesy free: a repeated
 * import is one import in the module that gets compiled, so the page may say a
 * thing twice to a reader and still be one program.
 *
 * ## What is in scope, and what is deliberately not
 *
 * **Every door a page opens, not only the runtime's.** `import { describe,
 * expect, it } from "vitest"` is the one a reader is most likely to need and
 * least likely to guess, and *Testing what you built* had it one heading above
 * the two blocks that call `it`. A rule that asked only about
 * `@jam-overture/loom` would have called that page clean.
 *
 * **A name no block on the page imports at all is not this module's question.**
 * That one is `lent.ts`'s — whether the page or a context file holds the door —
 * and the two are kept disjoint on purpose: this module reads the page's own
 * import lines and asks only *where* they are.
 *
 * The exception is the exception `model.ts` states: there is no edit that puts
 * an `import` in the middle of an object literal, so a call from an
 * `object-body` is not asked for a door. A `sketch` is left out for the reason
 * the word exists.
 */

export type Landing = {
  readonly section: string
  readonly page: string
  /** The name the block calls, and the line on the page that binds it. */
  readonly door: FenceImport
  /** The anchor a reader can be sent to. Empty for the page's opening. */
  readonly anchor: string
  /** That heading's text, for a fault to name somewhere a person can see. */
  readonly heading: string
  /** The page line of the first block in this section that calls the name. */
  readonly callsAt: number
  /** The page line of the block in this section that shows the door first, if any. */
  readonly shownAt: number | undefined
}

/** A block that is asked to have been shown a door before it uses one. */
const demands = (fence: Fence): boolean => isCheckable(fence) && canCarryAnImport(fence)

type Placed = {
  readonly fence: Fence
  readonly anchor: string
  readonly heading: string
}

/**
 * Every block on a page with the section a reader can land on it by.
 *
 * The join is the opening line, which both readers key on because both read the
 * same file: `extract.ts` says what a block claims to be, `sections.ts` says
 * where it sits. A block whose line is in neither cannot exist, and the fault
 * sentence would be about this module rather than about the page if it did.
 */
const placedFencesOn = (section: string, page: string): readonly Placed[] => {
  const where = new Map(
    blockSectionsIn(readPageSource(section, page)).map((block) => [block.opensAt, block])
  )

  return fencesOnPage(section, page).map((fence) => {
    const at = where.get(fence.line)

    return { fence, anchor: at?.anchor ?? "", heading: at?.heading ?? "" }
  })
}

/**
 * What one page shows a reader who landed in the middle of it.
 *
 * One entry per name per section — the **first** block in the section that calls
 * the name without having been shown the door. The later ones in the same
 * section are the same reader in the same position, and showing the door once
 * answers all of them.
 */
export const landingsOn = (section: string, page: string): readonly Landing[] => {
  const placed = placedFencesOn(section, page)

  const doors = placed.flatMap(({ fence }) =>
    isCheckable(fence) || fence.kind === "object-body" ? importsIn(fence.code, fence.language) : []
  )

  return [...new Map(doors.map((door) => [door.name, door])).values()].flatMap((door) => {
    const seen = new Set<string>()

    return placed.flatMap(({ fence, anchor, heading }, at): readonly Landing[] => {
      if (!demands(fence)) return []
      if (!calls(door.name, fence.code, fence.language)) return []
      if (importsBinding(door.name, fence.code, fence.language)) return []
      if (seen.has(anchor)) return []

      seen.add(anchor)

      const shown = placed
        .slice(0, at + 1)
        .filter((block) => block.anchor === anchor)
        .find((block) => importsBinding(door.name, block.fence.code, block.fence.language))

      return [{ section, page, door, anchor, heading, callsAt: fence.line, shownAt: shown?.fence.line }]
    })
  })
}

export type Arrival = {
  /** The page line of the first block in the section that calls the name. */
  readonly callsAt: number | undefined
  /** The page line of the first block in the section that binds it. */
  readonly shownAt: number | undefined
}

/**
 * What one name looks like to a reader who was sent to one anchor.
 *
 * The question {@link landingsOn} answers over a whole page, asked of a single
 * address — which is how the arrival route asks it. A step's `checkpointHref`
 * anchors on the heading where its one promised name is first mentioned, so the
 * route is **the one caller that can name the anchor in advance**, and a check
 * written over it stays pointed at the promise rather than at the mechanism.
 *
 * `callsAt` is where the reader meets the name whether or not that block shows
 * the door, which is what makes the pair comparable: the rule is *shown at or
 * before called*, and a block that does both satisfies it with one line.
 */
export const arrivalAt = (section: string, page: string, anchor: string, name: string): Arrival => {
  const inSection = placedFencesOn(section, page).filter((block) => block.anchor === anchor)

  const called = inSection.find(({ fence }) => demands(fence) && calls(name, fence.code, fence.language))
  const shown = inSection.find(({ fence }) => importsBinding(name, fence.code, fence.language))

  return { callsAt: called?.fence.line, shownAt: shown?.fence.line }
}

/** Every page on this site, read the way a reader who arrived mid-page reads it. */
export const landings = (): readonly Landing[] =>
  pagesWithFences().flatMap((page) => landingsOn(page.sectionSlug, page.pageSlug))

/**
 * The sentence a reader would have hit, said to whoever broke it.
 *
 * It names **the address a reader was sent to**, because that is the thing that
 * went wrong — the block is fine where it is, and the page read from the top is
 * fine too. One fault per place a reader can land.
 */
export const landingFaults = (found: readonly Landing[]): readonly string[] =>
  found.flatMap((landing) => {
    if (landing.shownAt !== undefined) return []

    const where = landing.anchor === "" ? "" : `#${landing.anchor}`
    const section = landing.heading === "" ? "the page's opening" : `"${landing.heading}"`

    return [
      `/docs/${landing.section}/${landing.page}${where} — a reader sent to ${section} reads down to ` +
        `the block at line ${landing.callsAt}, which calls \`${landing.door.name}\`, and the only ` +
        `\`${importLineFor(landing.door)}\` on the page is above where they landed`,
    ]
  })

export const LANDINGS: readonly Landing[] = landings()
