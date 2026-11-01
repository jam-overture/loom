import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { PRODUCT_SURFACES, RETIRED_ROUTES, SITE_ROUTES, WITHDRAWN_ROUTES } from "./site"

/**
 * The pages this route group's prose names, held against the pages it serves.
 *
 * Everything a *reader* can reach is derived from `SITE_ROUTES` and
 * `PRODUCT_SURFACES` — the bar, the footer's map, the sitemap, `llms.txt`, the
 * front door's cards — so a retired page cannot leak into a link, a crawl or a
 * map. It leaked into the explanations instead. On 26 September a ten-page site
 * was cut to three; the seven that went had their words absorbed into bands of
 * the two that stayed, so every module with a reason to mention one went on
 * mentioning it. Swept on 14 October, this route group named the seven
 * **forty times**, and eleven of those were present-tense claims about a page
 * nobody can open:
 *
 * | where | what it said |
 * | --- | --- |
 * | `readers/counting.ts` | *"`/what-readers-do` has said since 16 September that counting is off unless you turn it on"* |
 * | `chrome.ts` | *"`/how-it-works` is offered by `/the-rules`' own *Before this* card"* |
 * | `adapt/run.ts` | *"`/your-components` has said since 11 September that there are three things no request gets past"* |
 *
 * The claims behind all three are still true — the words moved to a band, and
 * `RETIRED_ROUTES` says which band for each of the seven. What was false is
 * the page doing the saying, which is the kind of wrong a reader never meets
 * and the next run always does.
 *
 * **Why the rule is as blunt as it is.** The first draft looked for a
 * *past-tense marker* in the sentence — `was`, `until`, `retired`, `became` —
 * on the reasoning that history is fine and a live claim is not. It passed the
 * single worst sentence in the sweep. `readers/counting.ts` reads
 * *"`/what-readers-do` **has said since 16 September** that counting is off
 * unless you turn it on, and **until** now that **was** a sentence about
 * somebody else's deployment"*: two markers, both attached to the claim rather
 * than to the page, and the one mention that credits a retired page with a live
 * promise about a reader's privacy is the one a tense sniffer waves through.
 *
 * So the word is required rather than inferred. **A retired page may be named
 * only in a sentence that also says `retired`.** It is not subtle and it cannot
 * be fooled by a sentence that happens to be about something else, which the
 * subtle version demonstrably could. The cost is a reworded sentence per
 * mention, and the reworded sentence is better: a run reading
 * *"Replaces the retired `/the-rules`"* learns in four words what it would
 * otherwise have had to discover by opening the site.
 */

const HERE = fileURLToPath(new URL(".", import.meta.url))

const sourcesUnder = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}${entry.name}`

    if (entry.isDirectory()) return sourcesUnder(`${path}/`)

    return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") ? [path] : []
  })

/**
 * The whole route group, not just `_lib/`.
 *
 * A page module, a route handler and a component are all places somebody
 * explains a decision, and the sweep that only read this directory would have
 * missed `announced.test.ts` and `_components/count-readers.test.tsx` — both of
 * which name a retired page.
 *
 * **This file is the one exclusion**, and it is not modesty. The table above
 * quotes the eleven sentences this was written for, verbatim and in the present
 * tense, because a rule whose examples have been reworded into compliance is a
 * rule nobody can see the point of. Quoting them is the only thing in this
 * route group that *should* name a retired page without saying so.
 */
const SOURCES: readonly string[] = sourcesUnder(`${HERE}../`).filter(
  (path) => !path.endsWith("/named.test.ts")
)

/**
 * The prose, and nothing else.
 *
 * Both comment shapes, with the `*` gutter of a block comment taken off and the
 * lines joined, because a sentence in this repository is routinely four lines
 * long and a rule about sentences cannot be applied a line at a time.
 */
const commentsIn = (source: string): readonly string[] => [
  ...(source.match(/\/\*[\s\S]*?\*\//g) ?? []),
  ...(source.match(/\/\/[^\n]*/g) ?? []),
]

const prose = (comment: string): string =>
  comment
    .replace(/^\/\*+/, "")
    .replace(/\*+\/$/, "")
    .replace(/^\/\//, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").replace(/^\s*\/\/\s?/, ""))
    .join(" ")

/**
 * A sentence, for the purposes of the rule.
 *
 * Split on a terminator followed by a space, which is enough here: the
 * alternative — a real sentence splitter — would be more machinery than the
 * rule is worth, and the failure mode of this one is a *longer* span, which
 * makes the rule more permissive rather than less. A rule that errs toward
 * letting a mention through is the right way round for a rule whose remedy is
 * reworded prose.
 */
const sentencesIn = (text: string): readonly string[] => text.split(/(?<=[.!?])\s+/)

/** A path as this route group spells one in prose: in backticks, kebab-cased. */
const PATH_IN_PROSE = /`(\/[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*)`/g

/**
 * The roots this application answers under, which is what a path is checked
 * against rather than the exact route list.
 *
 * A mention is routinely of a *page inside another surface* — `/portal/audit`,
 * `/docs/getting-started` — and this lane does not own those route tables, so
 * it cannot say whether one of them exists. What it can say is whether the
 * surface does. `/api` is here for the same reason at the other end: three
 * modules name the address this site broadcasts reader signals to, and that
 * address is a route of this application.
 *
 * The weakening is deliberate and worth naming: a docs page invented in a
 * comment passes this. The rule is about **this route group's own pages**,
 * which are the ones it retired and the ones it keeps explaining.
 */
const SERVED_ROOTS: ReadonlySet<string> = new Set([
  ...SITE_ROUTES.map((route) => route.path),
  ...PRODUCT_SURFACES.map((surface) => surface.path),
  /**
   * The pages 0328 removed, which this lane's history names in 72 places.
   * `WITHDRAWN_ROUTES` carries the whole argument for why they are a category
   * of their own rather than rows in `RETIRED_ROUTES`.
   */
  ...WITHDRAWN_ROUTES,
  "/api",
])

const served = (path: string): boolean =>
  SERVED_ROOTS.has(path) || SERVED_ROOTS.has(`/${path.split("/")[1] ?? ""}`)

const RETIRED: ReadonlySet<string> = new Set(RETIRED_ROUTES.map((route) => route.path))

type Mention = {
  readonly path: string
  readonly where: string
  readonly sentence: string
}

const mentions = (): readonly Mention[] =>
  SOURCES.flatMap((path) => {
    const where = path.slice(path.indexOf("(marketing)")).replace("/_lib/../", "/")

    return commentsIn(readFileSync(path, "utf8")).flatMap((comment) =>
      sentencesIn(prose(comment)).flatMap((sentence) =>
        [...sentence.matchAll(PATH_IN_PROSE)].map((match) => ({
          path: match[1] as string,
          where,
          sentence: sentence.trim(),
        }))
      )
    )
  })

const MENTIONS = mentions()

describe("the pages this route group's prose names", () => {
  /**
   * The sweep has to be able to see something, or every assertion below passes
   * for the wrong reason — an extraction bug, a renamed directory, a regex that
   * matches nothing. The front door is named in prose more than any other path
   * and could only stop being so if the site stopped having one.
   */
  it("is reading prose at all", () => {
    expect(MENTIONS.length).toBeGreaterThan(50)
    expect(MENTIONS.map((mention) => mention.path)).toContain("/how-it-works")
  })

  it("names only pages this site serves or has retired", () => {
    const unknown = MENTIONS.filter(
      (mention) => !served(mention.path) && !RETIRED.has(mention.path)
    ).map((mention) => `${mention.where}: ${mention.path}`)

    expect([...new Set(unknown)]).toEqual([])
  })

  it("says `retired` in every sentence that names a retired page", () => {
    const unmarked = MENTIONS.filter(
      (mention) => RETIRED.has(mention.path) && !/\bretired\b/i.test(mention.sentence)
    ).map((mention) => `${mention.where}: ${mention.path} — ${mention.sentence}`)

    expect(unmarked).toEqual([])
  })

  /**
   * The list is a record of a cut rather than a place to park a path, so an
   * entry nothing names is an entry that has outlived its reason to exist: the
   * sentences it was holding have been rewritten away, and the next run reading
   * `RETIRED_ROUTES` should find seven pages it is about to meet in prose
   * rather than a graveyard.
   */
  it("keeps no retired page the prose has stopped naming", () => {
    const named = new Set(MENTIONS.map((mention) => mention.path))

    expect(RETIRED_ROUTES.filter((route) => !named.has(route.path))).toEqual([])
  })

  /** A retired page cannot also be one the site serves, or both sets are wrong. */
  it("retires no page the site still serves", () => {
    expect(RETIRED_ROUTES.filter((route) => served(route.path))).toEqual([])
  })
})
