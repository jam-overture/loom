import { type RenderOutput, themeDocumentCss } from "@jam-overture/loom/react"

/**
 * The furniture around the page, told which way round the palette is.
 *
 * The fourth piece of this site that is not a Loom tree, and the fourth that
 * draws nothing a visitor looks at — `CountReaders` returns `null`,
 * `StructuredData` emits a script no reader sees, `BrowserBar` emits a `<meta>`,
 * and this emits a `<style>` holding one rule. The question 0067 asks of
 * anything this surface renders itself is whether a registered primitive is
 * missing, and **none is**: the subject is the document, and no tree ever
 * contains the document.
 *
 * ## What was wrong, and it was wrong on one palette of three
 *
 * Three things a reader sees belong to the document element rather than to
 * anything a page renders: the scrollbar the browser draws beside it, the
 * canvas it paints past the end of a short page, and the rendering it gives a
 * form control nobody styled. `color-scheme` is the declaration all three read.
 *
 * This lane filed on 8 October that nothing in a rendered Loom page applies it —
 * swept over the served markup of `/?theme=bold` with the scripts taken out,
 * `color-scheme` appeared **nought** times in the whole document, the library's
 * own hoisted stylesheet included. `bold`'s canvas is `#0a0a0a`, so that palette
 * has shipped a black page with a light scrollbar beside it and a white band
 * past the end of it for as long as the switcher has offered it.
 *
 * ## Why the fix could not be a line in this lane's layout
 *
 * The filing named two candidate elements and said neither was this lane's, and
 * [0334](../../../../../decisions/0334-the-browsers-own-furniture-is-outside-the-tree-so-a-host-is-handed-a-root-rule-for-its-document.md)
 * answered it with the second: **the root primitive must not declare it**, not
 * as a matter of taste but because `color-scheme` is inherited — put on the
 * tree's root it reaches every primitive below, which needed it least, and
 * reaches none of the three surfaces the declaration is for. So the one-line
 * change that looked available in `src/primitives/` would have closed the
 * finding, passed every test, and fixed nothing.
 *
 * A host is handed `themeDocumentCss(theme)` instead — the rule for its own
 * `:root`, which **is** the document element. That is the same bargain
 * `themeGround` already makes for a host's frame and `BrowserBar` beside this
 * file already takes: the parts of a page Loom does not draw are answered by
 * handing the host the palette's own answer, never by guessing at one.
 *
 * ## Why the page and not the layout, which is the whole of why this is a file
 *
 * `layout.tsx` deliberately does not read the address, so it does not know
 * which palette the visitor asked for — and a layout emitting the house
 * theme's white would be wrong on exactly the palette that needs this. A rule
 * rendered by the *page* is hoisted into the head by React and lands in the
 * same place, so the layout need not learn the palette to get a correct
 * document. `StructuredData` and `BrowserBar` are on this surface for the same
 * reason and `0334`'s finding says so in as many words.
 *
 * **`precedence` is what asks for the hoist**, and without it the rule lands
 * wherever it was written. The alternative — a page rendering its own `<html>`
 * to carry the variables — gets one *nested inside* Next's, where the theme
 * reaches the page only through the HTML parser's error recovery. It happens to
 * work and no test can see that it only happens to, which is the trap 0334
 * records and the reason this is a `<style>` and not an attribute.
 *
 * The application shell wrote this rule by hand before the framework published
 * it, and `SHELL_ROOT_CSS` is `themeDocumentCss(shellTheme)` today with
 * byte-identical output. This is the same element it renders, with the palette
 * coming off a request rather than off a constant.
 *
 * ## The ramp, which is the one argument this file has to make
 *
 * `themeDocumentCss` mounts its ramps `fluid` by default and `renderTree` asks
 * for the same, because a render only mounts `fixed` ramps when a caller wants
 * literals instead of variables and nothing on this surface does. So the
 * variables on `:root` and the variables the root primitive mounts are the same
 * strings, and `document-theme.test.ts` holds that rather than trusting that two
 * defaults will go on agreeing.
 *
 * ## What it costs, said here because this lane is the one reporting weight
 *
 * The rule is the whole theme and not the three declarations the furniture
 * reads, so a surface whose every pixel is already a tree mounts its variables
 * twice — once here on the document and once on the tree's root. Measured at
 * about 2KB of the response, which is a fraction of a percent of a page this
 * lane measured at 2,418KB on 1 November. It is taken as published rather than
 * trimmed by hand: a hand-written rule carrying three of the declarations would
 * be a copy of a decision the palette owns, kept somewhere the palette cannot
 * reach, which is the hazard 0197 and 0334 both exist to refuse. The duplicate
 * half is filed for the lane that owns the function.
 */

/**
 * The name the rule is deduped under.
 *
 * React keeps one `<style>` per `href`, and one document is served in one
 * palette, so this is a constant rather than something naming the palette —
 * an href carrying `bold` would be a second encoding of the request that
 * nothing reads back.
 */
export const DOCUMENT_THEME_HREF = "loom-marketing-document"

export type DocumentThemeProps = {
  /**
   * What the root is wearing, as the render handed it back.
   *
   * Optional on `RenderOutput` because a tree may name no theme or name one the
   * registry refuses, and there is no fallback theme by design (0049) — so
   * *nothing to say* is a state this carries rather than a case to guess at. An
   * unthemed page emits no rule and keeps the browser's own defaults, which is
   * the same nothing it had before this existed.
   */
  readonly theme: RenderOutput["theme"]
}

export const DocumentTheme = ({ theme }: DocumentThemeProps) =>
  theme === undefined ? null : (
    <style
      href={DOCUMENT_THEME_HREF}
      precedence="default"
      dangerouslySetInnerHTML={{ __html: themeDocumentCss(theme) }}
    />
  )
