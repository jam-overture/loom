import type { RampMode } from "../theme/apply.js"
import type { ResolvedTheme } from "../theme/theme.js"

import { themeGround, themeStyle } from "./theme.js"

/**
 * Mounting a theme on the **document element** rather than on a tree.
 *
 * ## The boundary a tree has, and what is outside it
 *
 * A root primitive paints `bg-canvas` across the page and mounts every
 * `--loom-*` variable below it ([`themeStyle`](./theme.ts)), and for everything
 * a tree contains that is the whole answer. Three things a reader sees are not
 * in it: the scrollbar the browser draws beside the document, the canvas it
 * paints past the end of a short page, and the rendering it gives a form
 * control that nobody styled. They belong to the document, and **no tree ever
 * contains the document** — the root primitive is an element inside a `<body>`
 * some layout rendered.
 *
 * `color-scheme` is the declaration those three read, and it is inherited, so
 * putting it on the tree's root reaches every primitive below it — which needed
 * it least — and reaches none of them. On a dark palette that is a black page
 * with a light scrollbar beside it and a white band past the end of it: the
 * defect `Loom marketing` measured on `/?theme=bold` on 8 October, where the
 * served document carried `color-scheme` nowhere at all.
 *
 * So the answer to *should the root primitive declare it* is **no**, and it is
 * not a matter of taste: the root primitive cannot reach the surface the
 * declaration is for. A host is handed the rule for its own `<html>` instead,
 * which is the same bargain [`themeGround`](./theme.ts) already makes for a
 * host's own frame — the parts of a page Loom does not draw are answered by
 * giving the host the palette's answer, never by guessing in a stylesheet.
 *
 * ## Why a CSS rule and not a style object
 *
 * A style object is how a *surface* mounts a theme, because there the root
 * primitive is an element inside a document its layout already rendered. The
 * document element is not an element any page may render: a page that renders
 * its own `<html>` gets it **nested inside the real one**, and the variables
 * reach the page only through the HTML parser's error recovery, which merges a
 * stray `<html>`'s attributes onto the real element. It happens to work, and a
 * test can never see that it only happens to — React hoists a rendered
 * `<html>`'s attributes onto the document element under jsdom, so a suite sees
 * the outcome a browser arrives at by accident.
 *
 * A `:root` rule is true where it is written. It goes in a `<style>`, which
 * React hoists into the head, and it needs no element of the host's own.
 *
 * Written by hand once before it was here, in this repository's own application
 * shell, which is the second instance of the rule `themeGround`'s docblock
 * states: a copy of a decision the palette owns, kept somewhere the palette
 * cannot reach, is wrong the moment the palette moves and nothing anywhere can
 * see that it has.
 */

/**
 * A style object's key as CSS spells it.
 *
 * Custom properties pass through: `--loom-accent` is already CSS, and lowering
 * it would be a no-op that only looked safe. Everything else is a camelCased
 * CSS property, and `backgroundColor: #fff` is not a declaration any browser
 * applies — it is discarded by the parser, with no error anywhere, leaving an
 * element that renders as though nobody had styled it.
 */
const cssProperty = (key: string): string =>
  key.startsWith("--") ? key : key.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`)

/** A declaration pair as CSS text, or nothing when the value is absent. */
const declaration = (key: string, value: unknown): readonly string[] =>
  value === undefined ? [] : [`  ${cssProperty(key)}: ${String(value)};`]

const declarations = (properties: Readonly<Record<string, unknown>>): readonly string[] =>
  Object.entries(properties).flatMap(([key, value]) => declaration(key, value))

/** The declarations given, as one rule on the document element. */
const rootRule = (lines: readonly string[]): string => [":root {", ...lines, "}"].join("\n")

/**
 * A resolved theme as the `:root` rule a host puts on its own document.
 *
 * Every variable `themeStyle` mounts, and then the ground — `background-color`,
 * `color` and `color-scheme` — so one rule answers both the page's palette and
 * the furniture around it. `:root` **is** the document element, which is what
 * makes the ground reach the overscroll area past the end of a short page; the
 * same declarations on a wrapper inside the document leave the browser's own
 * white there, invisible under a light palette and not under the next one.
 *
 * Takes a `ResolvedTheme` rather than a `ThemeResolution`, the bargain
 * `themeStyle` and `themeGround` both make: there is no fallback theme (0049),
 * so *the tree names no theme* is the host's question about its own document and
 * not one the runtime can answer by handing back a rule.
 *
 * **The ground may be absent and the rule is still returned.** A palette whose
 * body-copy pair cannot be read gets no ground rather than a guessed one, and
 * `ThemeGround` already documents what follows: whatever `color-scheme` the
 * host's own stylesheet sets stands. The variables are unaffected by that and
 * are the half a host cannot write for itself, so withholding the rule over it
 * would cost a page its whole palette to avoid mis-stating one declaration of
 * it. Every registered palette resolves both ends.
 *
 * Nothing is restated here: both halves are derived from the one resolved theme
 * by the two functions a surface uses, so only the serialisation is this
 * function's own and a re-theme has no second source of truth to miss.
 */
export const themeDocumentCss = (theme: ResolvedTheme, ramp: RampMode = "fluid"): string =>
  rootRule([
    ...declarations(themeStyle(theme, ramp) as Readonly<Record<string, unknown>>),
    ...declarations(themeGround(theme) ?? {}),
  ])

/**
 * The ground alone, as the same `:root` rule — for a host whose page is already
 * a tree to its edges.
 *
 * `themeDocumentCss` above answers a host that has no tree: the
 * application shell draws its own frame, mounts nothing, and needs every
 * variable as well as the ground. A *surface* is the other host, and it is not
 * the same host. `(marketing)` composes a tree whose root primitive already
 * mounts every `--loom-*` below it, so the variables in the document rule are
 * read by nothing inside the page — they are a second copy of a mounting that
 * already happened, in the one place no primitive looks. What that page actually
 * needs from the document is the three declarations a tree cannot reach:
 * `background-color`, `color` and `color-scheme`, on the element the scrollbar
 * and the overscroll canvas belong to.
 *
 * `Loom marketing` measured the duplicate at 1,976 bytes on `/?theme=bold` and
 * filed the shape rather than hand-writing the shorter rule, which was the right
 * call twice over: a three-declaration rule written in a surface is a copy of a
 * decision the palette owns, kept where the palette cannot reach it, and that is
 * the hazard [`themeGround`](./theme.ts) and the docblock above both exist to
 * refuse. The answer is to publish the half, not to let a caller rebuild it.
 *
 * **A second export rather than a flag on the first**, because the two differ in
 * their inputs and not only in their output. `ramp` decides how the variables
 * are written and has nothing to say about the ground, so a flag would leave a
 * parameter that is read on one setting and silently ignored on the other —
 * and a caller passing both would have written something that cannot be true.
 * Two functions, one private serialiser, and neither has an argument it
 * disregards.
 *
 * **`undefined` when the palette has no ground**, which mirrors `themeGround`
 * exactly and for its reason: a palette whose body-copy pair cannot be read gets
 * no ground rather than a guessed one. `themeDocumentCss` still returns its rule
 * in that case because the variables are the half the host cannot write for
 * itself and they are unaffected. Here there is no other half, so a rule would
 * be an empty block — and *nothing to say* is a state a caller should have to
 * answer rather than render. Every registered palette resolves both ends.
 */
export const themeGroundCss = (theme: ResolvedTheme): string | undefined => {
  const ground = themeGround(theme)

  return ground === undefined ? undefined : rootRule(declarations(ground))
}
