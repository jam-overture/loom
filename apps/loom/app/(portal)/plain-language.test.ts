import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import ts from "typescript"
import { describe, expect, it } from "vitest"

import { citationsIn, unplainWordsIn } from "@/app/(portal)/_lib/plain-language"

/**
 * The sweep. Every surface in the portal, held to the rule at once.
 *
 * This lane has now shipped two screens that were declared done and were still
 * in the runtime's voice — `/portal/primitives` on 27 August, `/portal/sign-ins`
 * on the run that added this file — and both were missed the same way: the
 * rename queue was a list, and a list is only as good as somebody's memory of
 * what is on it. A check does not forget, and it covers a route added tomorrow
 * without anybody deciding that it should.
 *
 * **It parses rather than greps, and the first draft of this file is the
 * argument for why.** Written as a regular expression over the source it
 * reported eight leaks, and seven of them were code: `disposition` destructured
 * from a proposal, `cursor` passed back through a URL, `@loom/runtime/telemetry`
 * in an import. The cause was that `=>` ends in a `>`, so every arrow function
 * in the route group looked like the start of a text node. A check that cries
 * wolf seven times out of eight does not get fixed, it gets deleted — so this
 * asks the TypeScript parser which characters are JSX text and which are
 * program, and gets an answer that is right by construction.
 *
 * Reading source rather than rendering is still a trade with a known hole.
 * Standing up every portal page would mean a store, a session and a telemetry
 * sink per assertion, and the pages are async server components; the guards
 * this lane already has for reading order read source for the same reason. What
 * source sees is every string a component was *written* with, across all of
 * them, including the ones no test renders. What it cannot see is a sentence
 * assembled at runtime — so the sign-in screen's own tests do that half with
 * `surfaceText`, against the real DOM, and the two together are the coverage.
 */

const portal = join(process.cwd(), "app", "(portal)")

const filesUnder = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) return filesUnder(path)

    return entry.isFile() && entry.name.endsWith(".tsx") && !entry.name.includes(".test.")
      ? [path]
      : []
  })

const surfaces = filesUnder(portal)

const parse = (file: string): ts.SourceFile =>
  ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

const tagNameOf = (node: ts.JsxElement | ts.JsxSelfClosingElement): string =>
  ts.isJsxElement(node) ? node.openingElement.tagName.getText() : node.tagName.getText()

/**
 * What a reader meets, as far as the parser can tell.
 *
 * Three things are skipped, and each is skipped for the same reason under the
 * brief's rule — *the technical record is one click away* — rather than because
 * it was inconvenient:
 *
 * - **`<TechnicalDetail>` bodies.** That is the click. Excluding them is not a
 *   loophole in the check, it is the thing the check is defending: a screen
 *   passes by moving a word down there, never by deleting it.
 * - **`font-mono` spans and `<pre>`.** A word set as code is being quoted as a
 *   name rather than used as English. `DATABASE_URL` and `create` are already
 *   on three portal screens that way and are right to be.
 * - **braced expressions.** `{pressure.subjects}` is an identifier, not a
 *   sentence. This is the hole the DOM tests cover.
 */
const readableText = (source: ts.SourceFile): readonly string[] => {
  const parts: string[] = []

  const isCodeSpan = (node: ts.JsxElement): boolean =>
    node.openingElement.attributes.properties.some(
      (property) =>
        ts.isJsxAttribute(property) &&
        property.name.getText() === "className" &&
        property.initializer !== undefined &&
        ts.isStringLiteral(property.initializer) &&
        property.initializer.text.includes("font-mono")
    )

  const walk = (node: ts.Node): void => {
    if (ts.isJsxText(node)) {
      parts.push(node.text)

      return
    }

    if (ts.isJsxElement(node)) {
      const tag = tagNameOf(node)

      if (tag === "TechnicalDetail" || tag === "pre" || isCodeSpan(node)) return
    }

    node.forEachChild(walk)
  }

  walk(source)

  return parts.map((text) => text.replace(/&ldquo;|&rdquo;|&rsquo;|&nbsp;/gu, " ")).filter(
    (text) => text.trim() !== ""
  )
}

/**
 * The strings that are prose and do not sit between angle brackets: a
 * `StateNotice` title is the first line of an error, and a `label` names a
 * number beside it.
 *
 * `summary` is deliberately **not** among them. A disclosure's summary is the
 * one label whose job is to say *the machine's version is down here* —
 * "The finding in the runtime's own words" is the summary working, not leaking,
 * and a check that flagged it would be asking the disclosure to hide what it
 * contains. Every other prop here is read by somebody who has not clicked.
 */
const PROSE_PROPS: readonly string[] = ["title", "label", "headline", "detail", "placeholder"]

const proseProps = (source: ts.SourceFile): readonly string[] => {
  const found: string[] = []

  const walk = (node: ts.Node): void => {
    if (
      ts.isJsxAttribute(node) &&
      PROSE_PROPS.includes(node.name.getText()) &&
      node.initializer !== undefined &&
      ts.isStringLiteral(node.initializer)
    ) {
      found.push(node.initializer.text)
    }

    node.forEachChild(walk)
  }

  walk(source)

  return found
}

const named = (file: string): string => file.slice(portal.length + 1)

const headingOf = (source: ts.SourceFile): string | null => {
  let heading: string | null = null

  const walk = (node: ts.Node): void => {
    if (heading !== null) return

    if (ts.isJsxElement(node) && tagNameOf(node) === "h1") {
      const text = node.children.filter(ts.isJsxText).map((child) => child.text).join("").trim()

      if (text !== "") heading = text
    }

    node.forEachChild(walk)
  }

  walk(source)

  return heading
}

describe("the portal's plain-language rule, swept across every surface", () => {
  /**
   * The list is worth having in a failure message even when it is empty, since
   * a sweep that silently stopped finding files would pass forever.
   */
  it("has surfaces to sweep", () => {
    expect(surfaces.length).toBeGreaterThan(20)
  })

  /**
   * The check that would have caught `/portal/sign-ins` on the day it shipped.
   * It led with "Failed sign-ins the throttle is still holding against
   * somebody" — a sentence about a mechanism, addressed to somebody who has to
   * already know what the mechanism is.
   */
  it("puts no word of the runtime's own vocabulary in front of a reader", () => {
    const leaks = surfaces.flatMap((file) => {
      const words = readableText(parse(file)).flatMap((text) => unplainWordsIn(text))

      return words.length === 0 ? [] : [`${named(file)}: ${[...new Set(words)].join(", ")}`]
    })

    expect(leaks).toEqual([])
  })

  /**
   * The same, for strings that arrive as props rather than as children.
   * Separate from the assertion above so a failure says which of the two shapes
   * leaked, because they are fixed in different places.
   */
  it("keeps the runtime's vocabulary out of titles and labels", () => {
    const leaks = surfaces.flatMap((file) => {
      const words = proseProps(parse(file)).flatMap((prose) => unplainWordsIn(prose))

      return words.length === 0 ? [] : [`${named(file)}: ${[...new Set(words)].join(", ")}`]
    })

    expect(leaks).toEqual([])
  })

  /**
   * A decision-record number on a screen is a reference to a document the
   * reader has not read, on the one surface whose whole test is whether
   * somebody who has read none of them can follow it. The fact it supports
   * always stays; the citation moves into a comment, which is why comments are
   * never part of what this reads.
   */
  it("cites no decision record at a reader", () => {
    const citations = surfaces.flatMap((file) => {
      const found = readableText(parse(file)).flatMap((text) => citationsIn(text))

      return found.length === 0 ? [] : [`${named(file)}: ${found.join(", ")}`]
    })

    expect(citations).toEqual([])
  })

  /**
   * A heading is the first thing read and the last thing anybody thinks to
   * rename. `/portal/sign-ins` had `<h1>sign-ins</h1>` for a month, and the
   * screens before it on the rename queue all shared the same tell:
   * `/portal/trees` said `trees`, `/portal/calibration` said `calibration`,
   * `/portal/primitives` says `primitives`. Each was found by somebody
   * noticing.
   *
   * **The tell is the lower-case letter, not the word.** An earlier draft of
   * this check also refused a heading that matched its route's last segment,
   * and it flagged Activity and History — two screens whose route name is
   * already what a person says. The route name is not the defect. Printing the
   * route name *as the route spells it* is: a heading in a person's words
   * begins like a sentence, because a person wrote it rather than a router.
   *
   * Every `<h1>` in the route group, not only the ones in a `page.tsx`. The
   * first draft looked at pages alone and passed `error.tsx`, which said
   * `something here failed` — the same defect on the screen a reader reaches
   * when something has already gone wrong, which is the worst moment to meet a
   * surface that has stopped sounding like it was written for them.
   */
  it("starts every screen's heading like a sentence rather than like a route", () => {
    const wrong = surfaces.flatMap((file) => {
      const heading = headingOf(parse(file))

      if (heading === null || /^[A-Z]/u.test(heading)) return []

      return [`${named(file)}: the heading is lowercase — "${heading}"`]
    })

    expect(wrong).toEqual([])
  })
})
