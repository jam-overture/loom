import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import type { LoomNode, LoomTree } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { siteQuestions } from "./questions"
import { treeFor } from "./render"
import { DEFAULT_THEME, HOME, PRODUCT_SURFACES, type Surface } from "./site"

/**
 * The surfaces this site offers that are not finished, and whether it says so.
 *
 * The front door's whole job, under the maintainer's decision of 18 August, is
 * to be the way into the rest of the product: the bar's *Sign in*, the band of
 * four cards, the footer's map. Three of the four destinations behind those
 * links are finished. **The portal is not**, and until this run the only place
 * a visitor could learn that was on the far side of the link.
 *
 * `(portal)/_components/under-construction.tsx` has carried a banner since
 * 28 September, at the maintainer's instruction, saying *"The portal is still
 * being built… screens are incomplete, some are missing."* Its own note names
 * the half it could not fix:
 *
 * > *"The portal is reachable from the marketing site's menu and its footer — a
 * > stranger who follows Portal from the front door arrives at a working screen
 * > and has no way to know that most of what it will be is not built yet."*
 *
 * That is a sentence about this route group, written in another one. The lane
 * that owns the door told the truth about it; the lane that sends people there
 * went on offering it beside the demo, the documentation and the course as
 * though the four were the same kind of thing. Photographed on 15 October, the
 * card read *Where the changes are reviewed… Needs an invitation* and the page
 * it opened read *The portal is still being built.*
 *
 * ## Why this can be checked when `GuardedSurface` says the door cannot
 *
 * `GuardedSurface`'s note settles that this lane may not claim a door opens:
 * whether sign-in is configured belongs to the deployment, `(marketing)` does
 * not import `(portal)`'s auth config, and nothing here can see it. That is
 * still true and this does not go near it.
 *
 * **Whether a surface has been finished is a different fact.** It is a property
 * of this version of Loom rather than of the machine serving it, it is true
 * wherever the application is deployed, and the lane that owns the surface has
 * already committed it to the repository as a component. So it is read off the
 * repository — not imported, not inferred from a screenshot, and not retyped.
 *
 * ## Both directions, which is the point
 *
 * A caveat is worth having only while it is true, and a caveat nobody removes
 * is how a site ends up apologising for something it fixed a year ago. So the
 * two assertions are a pair: a surface whose route group still carries the
 * banner **must** say so, and a surface whose route group has stopped carrying
 * it **must not**. When `Loom portal` finishes and deletes its banner, this
 * file goes red and names the field to delete. The marketing lane's claim about
 * another lane's surface stops being something somebody has to remember.
 *
 * This is the shape `named.test.ts` settled on for retired pages a day earlier,
 * applied to the other direction of the same problem: there, a page that is
 * gone and still named; here, a surface that is unfinished and not said to be.
 */

const APP = fileURLToPath(new URL("../../", import.meta.url))

/**
 * Which route group serves each surface, because a path is not a directory.
 *
 * Written down rather than derived from the path. A route group contributes
 * nothing to a URL (0067), so `/demo` being served by `(demo)` is a convention
 * every one of these happens to follow and not a rule the framework enforces —
 * and a lane that moved its routes under a differently named group would make a
 * derivation quietly stop finding anything, which is the failure mode that
 * makes a sweep pass for the wrong reason.
 */
const GROUPS: Readonly<Record<string, string>> = {
  "/demo": "(demo)",
  "/docs": "(docs)",
  "/lessons": "(lessons)",
  "/portal": "(portal)",
}

/**
 * The attribute the banner marks itself with, which is the contract being read.
 *
 * `data-under-construction` rather than the sentence it renders: the words are
 * the other lane's to reword and the attribute is what their own tests hold it
 * to, so this reads the stable half. A lane that renames it turns this file red
 * rather than letting it pass silently, which is the right way round — a sweep
 * that finds nothing must say so rather than report agreement.
 */
const MARKER = "data-under-construction"

const filesUnder = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}${entry.name}`

    if (entry.isDirectory()) return filesUnder(`${path}/`)

    return entry.name.endsWith(".tsx") && !entry.name.includes(".test.") ? [path] : []
  })

/** Whether the lane that owns this surface still says, in its own code, that it is unfinished. */
const saysItIsUnfinished = (surface: Surface): boolean => {
  const group = GROUPS[surface.path]

  if (group === undefined) return false

  return filesUnder(`${APP}${group}/`).some((file) => readFileSync(file, "utf8").includes(MARKER))
}

/**
 * Every word a tree puts on the screen, text nodes **and** string props.
 *
 * The props half is not thoroughness, it is the only half that matters here.
 * A `loom.faq` carries its question and its answer as props, so the questions
 * band renders about four hundred words that no text node in this tree holds —
 * walking children alone, this assertion reads a front door with no answers on
 * it and would pass the day the band was deleted.
 *
 * Which is the same trap one level down from the one `named.test.ts` names: an
 * extraction that quietly stops finding the thing it is checking reports
 * agreement rather than silence.
 */
const saidOn = (tree: LoomTree): string =>
  [tree.root]
    .flatMap(function words(node: LoomNode): readonly string[] {
      if (node.kind === "text") return [node.value]
      if (node.kind === "slot") return node.children.flatMap(words)

      return [
        ...Object.values(node.props).filter((value): value is string => typeof value === "string"),
        ...node.children.flatMap(words),
      ]
    })
    .join(" ")

describe("a surface this site offers that is not finished", () => {
  /**
   * The sweep's own self-check, and it is load-bearing.
   *
   * Every assertion below is of the form *the repository says X, so the copy
   * must say Y*. The day the extraction stops finding anything — a group
   * renamed, the marker reworded, this file moved so `APP` points somewhere
   * else — every one of them passes, because nothing is unfinished and nothing
   * claims to be. The suite would go green by going blind.
   *
   * So the one surface known to be unfinished today is named here. When the
   * portal is finished this assertion is the one to delete, and deleting it is
   * a deliberate act somebody has to perform rather than a silence.
   */
  it("finds the banner the portal lane committed, so the sweep is looking at something", () => {
    const portal = PRODUCT_SURFACES.find((surface) => surface.path === "/portal")

    expect(portal).toBeDefined()
    expect(portal !== undefined && saysItIsUnfinished(portal)).toBe(true)
  })

  /**
   * The pair. Neither half is interesting on its own and together they are the
   * whole rule: the site's caveats and the product's state are the same list.
   */
  it("is said to be unfinished exactly while its own lane says it is", () => {
    for (const surface of PRODUCT_SURFACES) {
      expect(
        surface.notYet !== undefined,
        surface.notYet === undefined
          ? `${surface.path} still carries ${MARKER} in ${GROUPS[surface.path]}, so site.ts owes it a notYet`
          : `${surface.path} no longer carries ${MARKER}, so delete notYet on it in site.ts`
      ).toBe(saysItIsUnfinished(surface))
    }
  })

  /**
   * The cost line is where four destinations are compared, so it is where an
   * unfinished one has to own up.
   *
   * Blunt on purpose, and for the reason `named.test.ts` gives at length: a
   * rule that infers the meaning of a sentence passes the sentence that is
   * doing something else as well. The word is required. A cost that says
   * *Needs an invitation* of a surface nobody can yet be invited into is the
   * exact failure this catches, and it is the one that was live.
   */
  it("says so on the line a reader compares the four destinations along", () => {
    for (const surface of PRODUCT_SURFACES) {
      if (surface.notYet === undefined) continue

      expect(surface.cost.toLowerCase()).toContain("built")
    }
  })

  /**
   * And the fuller sentence reaches the page, rather than sitting in a constant.
   *
   * It is carried by the questions band's answer about the door, which is the
   * band a reader asking *can I get in* arrives at — and that band is on the
   * front door, so this assertion is about what a stranger can actually read
   * without pressing anything. Held against the rendered tree rather than
   * against `siteQuestions()` so that an answer removed from the band, rather
   * than reworded, is caught too.
   */
  it("puts the sentence on the page a stranger arrives at", () => {
    const said = saidOn(treeFor(HOME, { theme: DEFAULT_THEME }))

    for (const surface of PRODUCT_SURFACES) {
      if (surface.notYet === undefined) continue

      expect(said).toContain(surface.notYet)
    }
  })

  /**
   * The schema a search engine and an assistant read carries it too.
   *
   * `questions.ts` exists because those two readers quote the same answers, and
   * an answer that is honest on the page and silent in the `FAQPage` would be
   * the site telling a person one thing and a machine another — which is the
   * failure that file was written to prevent, met from a new direction.
   */
  it("carries it into the answer a machine quotes", () => {
    const answers = siteQuestions().map((entry) => entry.answer)

    for (const surface of PRODUCT_SURFACES) {
      const notYet = surface.notYet

      if (notYet === undefined) continue

      expect(answers.some((answer) => answer.includes(notYet))).toBe(true)
    }
  })
})
