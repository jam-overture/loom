import { readFileSync } from "node:fs"

import ts from "typescript"

/**
 * Everything a screen in this lane shows a reader **unasked**, pulled out of the
 * source rather than out of a render.
 *
 * ## Why it is parsed and not grepped
 *
 * The plain-language rule has been enforced since 11 September by per-module
 * tests — `expect(runtimeWordsIn(step.plain)).toEqual([])` — and it works
 * exactly as far as somebody remembered to write one. `every-screen.test.ts`
 * exists because that is not far enough: *a guard somebody has to remember to
 * write guards the screens somebody remembered.*
 *
 * The obvious lane-wide version is a regex over the file. It does not hold up,
 * and the run that wrote this module measured both ends of why:
 *
 * - **It reports leaks that are not there.** `>([^<>{}]+)<` matches the inside
 *   of `ReadonlyMap<string, number>` and every `=>` in the file, so
 *   `readonly revisions: ReadonlyMap` came back as a sentence shown to a
 *   reader.
 * - **It misses leaks that are.** A sentence broken across an expression —
 *   `wipe out what revision{n === 1 ? " " : "s "}` — is not one text run, and
 *   `reversal-note.tsx` had said *revision* on the surface through every sweep
 *   of this lane ever run over it.
 *
 * A parser has neither problem: a `JsxText` node is a text node whatever an
 * expression does on either side of it, and a type argument is not one.
 *
 * ## What counts as "unasked"
 *
 * Text inside a `<TechnicalDetail>` is the record, and the record is *supposed*
 * to use the runtime's vocabulary — several tests assert that it does. So the
 * whole subtree is skipped, which is the same line `every-screen.test.ts`
 * already draws for reading order and for altitude.
 *
 * String literals in attributes are read for the handful of props that are
 * shown to a reader as prose — a `title` on a `StateNotice` is a sentence, and
 * a `className` is not. `summary` is deliberately absent: it is the label on a
 * disclosure, which is the one place a runtime word belongs on the surface.
 */
const READER_FACING_ATTRIBUTES: ReadonlySet<string> = new Set([
  "title",
  "alt",
  "aria-label",
  "placeholder",
])

/** The element whose subtree is the record rather than the surface. */
const RECORD_ELEMENT = "TechnicalDetail"

const nameOf = (tag: ts.JsxTagNameExpression): string => tag.getText()

const isRecord = (node: ts.Node): boolean => {
  if (ts.isJsxElement(node)) return nameOf(node.openingElement.tagName) === RECORD_ELEMENT
  if (ts.isJsxSelfClosingElement(node)) return nameOf(node.tagName) === RECORD_ELEMENT

  return false
}

/**
 * One reader-facing run of text, with enough of its position to name in a
 * failure message. A test that says *something in this lane says "revision"* has
 * told a maintainer nothing they can act on.
 */
export type SurfaceText = {
  /** `revision-row.tsx:112`, relative to whatever root the caller passed. */
  readonly where: string
  readonly text: string
}

/**
 * Pull the text a reader meets out of one `.tsx` file.
 *
 * `label` is the path as it should appear in a failure; the file is read from
 * `file`. Both are passed because the two are never the same string — one is
 * absolute and one is what a person greps for.
 */
export const surfaceTextIn = (file: string, label: string): readonly SurfaceText[] => {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )

  const found: SurfaceText[] = []

  const at = (node: ts.Node): string =>
    `${label}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`

  const visit = (node: ts.Node): void => {
    if (isRecord(node)) return

    if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/gu, " ").trim()
      if (text !== "") found.push({ where: at(node), text })
    }

    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
      const value = node.initializer

      if (READER_FACING_ATTRIBUTES.has(node.name.text) && value !== undefined) {
        if (ts.isStringLiteral(value)) found.push({ where: at(node), text: value.text })
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(source)

  return found
}
