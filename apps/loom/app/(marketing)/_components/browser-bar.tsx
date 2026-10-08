import { type RenderOutput, themeGround } from "@jam-overture/loom/react"

/**
 * The strip of browser above the page, told what colour to be.
 *
 * The third piece of this site that is not a Loom tree, and the third that
 * draws nothing — `CountReaders` returns `null`, `StructuredData` emits a
 * script no reader sees, and this emits a `<meta>`. The question 0067 asks of
 * anything this surface renders itself is whether a registered primitive is
 * missing, and **none is**: this is not part of the page. On Android it is
 * Chrome's address bar, on an iPhone the area around the page. No stylesheet
 * reaches it and no primitive renders it, so a tree cannot hold one and a
 * primitive that could emit document metadata would be a primitive able to put
 * arbitrary tags into any page a model can edit.
 *
 * A page that emits nothing gets the browser's default, which on most phones is
 * light. **This site has shipped a white strip over a black page for as long as
 * it has had a palette switcher**: `bold`'s canvas is `#0a0a0a`, and nothing in
 * the head said so. Filed by `Loom docs` on 7 October as one finding with four
 * owners, measured off the production build — 46 of the 126 prerendered pages
 * emitted one and all 46 were the documentation site's.
 *
 * ## It is the recipe rather than a copy of it
 *
 * `/docs/building-with-loom/theming#the-bar-above-your-page` publishes this,
 * and publishes it as `themeGround(resolved).backgroundColor`. The
 * documentation site could not follow its own recipe — a sidebar and a header
 * are application furniture with no theme mounted on them (0067), so it has
 * nothing to resolve and transcribes two hex values out of its stylesheet
 * instead, with a test holding the copies together.
 *
 * **This surface has the thing the recipe asks for.** Every pixel of it is a
 * tree, so the render that drew the page hands back what its root is wearing,
 * and the colour is read off that. There is no second reading of the palette
 * and therefore nothing that can drift: `theme` is `RenderOutput["theme"]` —
 * the field, not a type restated — so the only palette this can report is the
 * one that was served.
 *
 * ## The hex, which is the part that looks wrong
 *
 * Everything else on this surface is forbidden a colour, and this is a colour.
 * `content` is a colour and there is nowhere in it to put a word, so a
 * `themeGround` case is what this is even though it looks like the other kind.
 * Nothing here *names* a colour: `bg-canvas` is named, and the palette answers.
 *
 * **Not the `media="(prefers-color-scheme: …)"` pair**, which is what every
 * article on the subject recommends. It reads the reader's machine; this site's
 * palette is in the address — `?theme=bold` — and the two agree by coincidence.
 * Two constants also cannot cover three palettes, which is the same arithmetic
 * that stopped a stylesheet holding a ground (0197).
 *
 * ## Why it is per page rather than in the layout
 *
 * The same reason `StructuredData` is. The layout does not read the address, so
 * it does not know which palette the visitor asked for — and a layout emitting
 * the house theme's white would be wrong on exactly the palette that needs this.
 */

/** The name the strip goes out under. Nothing else in this route group writes it. */
export const BROWSER_BAR_META = "theme-color"

export type BrowserBarProps = {
  /**
   * What the root is wearing, as the render handed it back.
   *
   * Optional on `RenderOutput` because a tree may name no theme or name one the
   * registry refuses, and there is no fallback theme by design (0049) — so
   * *nothing to say* is a state this has to carry rather than a case to guess
   * at. An unthemed page emits nothing and keeps the browser's own default,
   * which is the same nothing it had before this existed.
   */
  readonly theme: RenderOutput["theme"]
}

export const BrowserBar = ({ theme }: BrowserBarProps) => {
  const ground = theme === undefined ? undefined : themeGround(theme)

  return ground === undefined ? null : (
    <meta name={BROWSER_BAR_META} content={ground.backgroundColor} />
  )
}
