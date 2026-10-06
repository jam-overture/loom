import { createThemeRegistry, type JsonObject, type ResolvedTheme, type ThemeRegistry } from "@jam-overture/loom"
import { resolveTheme, themeGround, themeStyle, THEME_PROP_KEY, type ThemeGround } from "@jam-overture/loom/react"
import type { CSSProperties } from "react"

/**
 * What the shell is allowed to know about how the product looks.
 *
 * There is one page in this application that belongs to no surface — the root
 * `not-found.tsx`, reached by an address no route group matches — and until
 * today it was the only page of the product rendered in the browser's own
 * defaults. `Loom marketing` photographed it on 5 October: Times New, an
 * unstyled `h1`, a blue underlined `a`.
 *
 * **A theme registry and no primitive registry**, which is the whole shape of
 * this module and is recorded as 0232. A surface composes a tree out of
 * registered primitives and lets the root primitive mount the theme; the shell
 * draws its own markup and mounts the theme itself. The second half is what
 * `themeGround` was published for (0197) — a host drawing a frame where no root
 * primitive sits above it has to paint the ground the tree would have sat on.
 *
 * So nothing here builds a tree, and nothing here needs `createStarterPrimitiveRegistry`.
 * The shell borrows the product's *vocabulary of appearance* and composes none
 * of its *content*, which keeps the root 404 from becoming a fifth surface with
 * its own pages — the thing the file's own docblock has argued against since it
 * was written.
 */

/**
 * The house theme, named here rather than imported from a surface.
 *
 * `minimal` / `minimal-sans` / `precise` is the triple the maintainer specified
 * on 19 August, and `src/theme/library.ts` registers it in the library rather
 * than in any one surface precisely so that every host building a registry with
 * `createThemeRegistry()` and no arguments can reach it. The shell is such a
 * host.
 *
 * It is **not** a copy of the marketing site's default. Both name the same
 * registered ids because both are consumers of one documented fact, and neither
 * reads the other: a shell that imported `(marketing)/_lib` would make the
 * application's own error page depend on a room inside it, which is backwards.
 *
 * The cost is real and is in 0232's consequences: if the front door ever moves
 * off the house theme, this page and the page its one link leads to would be
 * dressed differently, and nothing here would say so.
 */
export const SHELL_SELECTION: JsonObject = {
  palette: "minimal",
  fontPack: "minimal-sans",
  stylePreset: "precise",
}

/** The palettes, font packs and style presets the shell may wear (0049). */
export const shellThemes: ThemeRegistry = createThemeRegistry()

/**
 * Resolved through the public path a host uses, not by reaching into the
 * library.
 *
 * `resolveTheme` is the function `render.ts` itself calls, given the same
 * reserved-prop bag a root node carries, so the shell cannot mount a theme the
 * runtime would have refused. A throw rather than a fallback: there is no
 * default theme in Loom by design (0049), and a 404 that silently rendered
 * unstyled is the defect this module exists to close — failing the build is the
 * honest outcome.
 */
const resolution = resolveTheme({ [THEME_PROP_KEY]: SHELL_SELECTION }, shellThemes)

if (resolution.outcome !== "themed") {
  throw new Error(`loom: the shell's theme did not resolve — ${resolution.outcome}`)
}

export const shellTheme: ResolvedTheme = resolution.theme

/** Every `--loom-*` property the shell's own stylesheet may read. */
export const SHELL_THEME_STYLE: CSSProperties = themeStyle(shellTheme)

/**
 * The ground, and the ink on it.
 *
 * `undefined` is a real return — a palette whose body copy cannot be read gets
 * no ground rather than a guessed one — and cannot happen for a registered
 * palette, so this throws rather than serving a page with no paper.
 */
const ground = themeGround(shellTheme)

if (ground === undefined) {
  throw new Error(`loom: the shell's theme has no ground, so a page outside every surface has no paper`)
}

export const SHELL_GROUND: ThemeGround = ground

/**
 * Geist, under the name the theme asks for.
 *
 * `minimal-sans` names `Geist` literally and a font pack carries a family name
 * rather than a file, because Loom never fetches a font (0085). Supplying the
 * face is therefore the host's job, and this is the **third** place in this
 * application that does it: `(marketing)` and `(lessons)` link the same URL,
 * `(portal)` and `(docs)` serve the face through the `geist` package under a
 * different family name and read it in their own stylesheets.
 *
 * Three copies of one URL is a thing that can drift and is filed as a finding
 * rather than consolidated here, because the one place it would belong is a
 * module every route group imports, and four cross-lane edits to save a
 * constant is the wrong trade on an unattended run.
 *
 * Nothing renders wrong if the request fails: `minimal-sans` falls through to
 * the platform grotesques, which `src/theme/library.ts` chose as near
 * neighbours precisely so that a page which never loads Geist still looks like
 * this palette's page.
 */
export const GEIST_HREF = "https://fonts.googleapis.com/css2?family=Geist:wght@400;700&display=swap"

/**
 * The mounted theme as a `:root` rule, and why it is not a style attribute.
 *
 * A style attribute is how every *surface* mounts a theme, because on a surface
 * the root primitive is an element inside a document some layout already
 * rendered. The shell has no layout: Next supplies the document for a page
 * outside every route group, so a page here that renders its own `<html>` has
 * it **nested inside that one**. Measured on a production build before this
 * existed — `<body><div hidden></div><html lang="en" style="--loom-…">` — and
 * the variables reached the page only through the HTML parser's error recovery,
 * which merges a stray `<html>`'s attributes onto the real element. It happens
 * to work. It is not something to build a product's error page on, and a test
 * could never see it: React hoists a rendered `<html>`'s attributes onto the
 * real document element under jsdom, so the suite sees the outcome the browser
 * only arrives at by accident.
 *
 * So the declarations go where they are actually true — on `:root`, which *is*
 * the document element — and the page renders no document of its own.
 *
 * The literals here are the same literals `themeStyle` produces and are derived
 * the same way, from the one resolved theme. Only the serialisation differs: a
 * CSS text block rather than a React style object. Nothing is restated, so
 * there is no second source of truth for a re-theme to miss (0049).
 */
const cssProperty = (key: string): string =>
  key.startsWith("--") ? key : key.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`)

const declarations = (properties: Readonly<Record<string, unknown>>): readonly string[] =>
  Object.entries(properties)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `  ${cssProperty(key)}: ${String(value)};`)

/**
 * `:root` carries the variables and the ground together, so the paper reaches
 * the overscroll area a phone exposes past the end of a short page. A ground on
 * a wrapper inside the document would leave the browser's own white there, which
 * is invisible under this palette and would not be under the next one.
 */
export const SHELL_ROOT_CSS = [
  ":root {",
  ...declarations(SHELL_THEME_STYLE as Readonly<Record<string, unknown>>),
  ...declarations(SHELL_GROUND as Readonly<Record<string, unknown>>),
  "}",
].join("\n")
