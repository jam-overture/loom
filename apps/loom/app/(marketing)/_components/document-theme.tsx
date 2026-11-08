import { type RenderOutput, themeGroundCss } from "@jam-overture/loom/react"

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
 * A host is handed the palette's own rule for its own `:root`, which **is** the
 * document element. That is the same bargain `themeGround` already makes for a
 * host's frame and `BrowserBar` beside this file already takes: the parts of a
 * page Loom does not draw are answered by handing the host the palette's own
 * answer, never by guessing at one.
 *
 * ## Which half of that rule, which is this file's one argument
 *
 * There are two published spellings and they are written for two different
 * hosts. `themeDocumentCss(theme)` returns every `--loom-*` variable **and**
 * the ground; `themeGroundCss(theme)` returns the ground alone. This file took
 * the first from 2 November until today and the second is the right one, which
 * is [0337](../../../../../decisions/0337-a-host-whose-page-is-already-a-tree-is-handed-the-ground-alone.md)
 * and was this lane's own finding of 2 November.
 *
 * The difference is what the host already has. The application shell has no
 * tree: it draws its own markup, mounts nothing, and needs the variables as
 * much as the ground — `SHELL_ROOT_CSS` is `themeDocumentCss(shellTheme)` and
 * should stay that. **A surface is the other host and it is not the same
 * host.** Every pixel of this one is a tree, so the root primitive has already
 * mounted every one of the palette's variables — 52 of them, or 53 under
 * `minimal` — on the element it renders, and the copy on `:root`
 * is read by nothing inside the page: a primitive reads the nearest declaration
 * and the nearest one is the tree's own. What the document actually needs is
 * the three declarations no tree can reach — `background-color`, `color` and
 * `color-scheme`, on the element the scrollbar and the overscroll canvas belong
 * to — and that is what this now asks for.
 *
 * **Measured rather than reasoned**, on the production build of 8 November,
 * with the whole rule and then with the ground alone:
 *
 * | palette | `themeDocumentCss` | `themeGroundCss` |
 * | --- | --- | --- |
 * | `minimal` | 2,255 B, 53 variables | 79 B, none |
 * | `editorial` | 1,969 B, 52 variables | 79 B, none |
 * | `bold` | 1,976 B, 52 variables | 78 B, none |
 *
 * It is **not** taken for the saving, and the report says so with the
 * arithmetic: two copies of 1,898 bytes against a response of 2.87MB is a
 * fifteenth of one percent. It is taken because the variables were a second
 * copy of a mounting that had already happened, in the one place nothing looks,
 * and because the alternative this lane considered first — writing the three
 * declarations here by hand — would have kept a copy of a decision the palette
 * owns somewhere the palette cannot reach, which is the hazard 0197 and 0334
 * both exist to refuse. The answer was for the framework to publish the half,
 * and it has.
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
 * ## Two states that are one state, and that is the reason for the body below
 *
 * This emitted nothing for a tree that names no theme, because there is no
 * fallback theme by design (0049). It now emits nothing for a second reason as
 * well: `themeGroundCss` hands back `undefined` for a palette whose body-copy
 * pair cannot be read, mirroring `themeGround`, because here there is no other
 * half and a rule would be an empty block. Every registered palette resolves
 * both ends, so no page of this site reaches it — and *nothing to say* is a
 * state this answers rather than one it guesses at, which is why the rule is
 * computed once and the component branches on the rule rather than on the
 * theme.
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

export const DocumentTheme = ({ theme }: DocumentThemeProps) => {
  const ground = theme === undefined ? undefined : themeGroundCss(theme)

  return ground === undefined ? null : (
    <style
      href={DOCUMENT_THEME_HREF}
      precedence="default"
      dangerouslySetInnerHTML={{ __html: ground }}
    />
  )
}
