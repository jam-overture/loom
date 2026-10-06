# 0232 — The shell mounts a theme and registers no primitives

**Status:** Accepted
**Date:** 2026-10-06
**Section:** §4 (the application shell)

> **Numbered 0232 rather than 0231**, which was free on `main` and is written by
> two open pull requests at once — #527 and #528, both correct by the procedure.
> That is the fifth filed occurrence of the collision the 5 October entry in
> `FINDINGS.md` describes, and the second caught before either branch merged, by
> a run that read the open list. Reading it costs nothing and only works for
> whoever reads last.

## Context

[0067](0067-the-four-surfaces-are-one-application.md) made Loom's four public
surfaces one Next application with a route group each, and each route group is a
root layout of its own. A URL matching no route is outside all four. Next
supplies a document for it, and `app/not-found.tsx` fills it.

On 5 October `Loom marketing` photographed what that page serves and filed it:
Times New through `system-ui`, an unstyled `h1`, a blue underlined `a`. No
wordmark, no palette, nothing a visitor has seen on any other page of the
product — on the one page a mistyped address, a stale external link or a search
result for a page that moved all land on, and the only page of the product that
gave a confused reader no way to tell they were still on the same site.

The filing was careful to say the file's own reasoning was right and that what
followed was only that the page should be **styled** like the product, not that
it should say more. It then asked the question this record answers: the page
*cannot compose Loom primitives the way a surface does without a registry and a
theme*, and **which registry is a decision about the shell rather than about any
one lane**.

## Decision

**The shell mounts a theme. It registers no primitives, and it composes no
tree.**

Concretely, in `app/_lib/shell/`:

- A `ThemeRegistry` from `createThemeRegistry()`, resolving the house theme —
  `minimal` / `minimal-sans` / `precise` — through `resolveTheme`, the same
  function `render.ts` calls, given the same reserved-prop bag a root node
  carries. A selection the registry refuses throws at module load rather than
  serving a page in the browser's defaults.
- `themeStyle` and `themeGround` serialised into a `:root` rule, which is the
  path [0197](0197-a-host-may-ask-which-way-round-a-palette-is-and-a-frame-standing-in-for-the-page-is-handed-both-ends.md)
  published for a host drawing its own frame where no root primitive sits above
  it.
- No `createStarterPrimitiveRegistry`, no `IdFactory`, no `renderLoomTree`.

The shell therefore borrows the product's **vocabulary of appearance** and
composes none of its **content**. A page of the shell is ordinary markup reading
`--loom-*`; a page of a surface is a tree.

**The house theme is named by the shell, not imported from a surface.**
`src/theme/library.ts` registers `minimal` / `minimal-sans` / `precise` in the
library rather than in any one surface, so that every host building a registry
with `createThemeRegistry()` and no arguments can reach it. The shell is such a
host. It is not a copy of the marketing site's default: both name the same ids
because both read one documented fact.

**The declarations go on `:root`, and the page renders no document of its own.**
This was measured rather than assumed. A first build of this page rendered
`<html style={themeStyle(…)}>` the way a surface's layout does, and the
production output was `<body><div hidden></div><html lang="en" style="--loom-…">`
— nested inside the document Next supplies. The variables reached the page only
through the HTML parser's error recovery, which merges a stray `<html>`'s
attributes onto the real element. It works, and no test could see that it was
working by accident: React hoists a rendered `<html>`'s attributes onto the real
document element under jsdom, so the suite observed the outcome the browser only
arrives at by mistake.

## Consequences

**A shell page is styled like the product and is not part of it.** It wears the
palette, the type, the ramp, the spacing scale and the radii, and it will
re-theme with them. It cannot show a band, a hero or a record card, because
those are primitives and the shell has no registry to resolve them against.

**The shell's stylesheet is text, and is therefore checkable.** A page outside
every route group has no layout to import a `.css` file from, and a page that
imports one cannot be rendered under Vitest at all — the import reaches
`vite:css`, which loads the application's PostCSS config, and
`@tailwindcss/postcss` is not a plugin Vite's PostCSS runner accepts. Holding
the rules as a string and serving them in a hoisted `<style>` is forced by that,
and two things follow that a real stylesheet does not give: the rules cannot
fail to be emitted, and every `var(--loom-*)` in them is held mechanically
against the properties the mounted theme actually carries. A declaration naming
a property nothing supplies does not error and does not warn — the element
simply loses it.

**If the front door ever moves off the house theme, this page will not follow,
and nothing will say so.** That is deliberate: a test holding the shell to
`(marketing)/_lib`'s constant would fail inside that lane's pull request the
first time they re-themed. It is recorded as an open question for the
maintainer rather than gated.

**A second shell page costs nothing new.** `app/_lib/shell/` is the mount, and
an `error.tsx` or a maintenance page would read the same `:root` rule. Nothing
in this decision is specific to a 404.

## Alternatives considered

**Compose a real Loom tree, with a primitive registry.** The strongest version
of *styled like the product*: the page would be built from the same bands the
marketing site uses, themed by the root primitive, proving the shell can consume
the library. **Rejected**, on the filing's own terms. It makes the 404 a fifth
surface with its own composed content — which the file's docblock has refused
since it was written, for the reason that a page listing or echoing the four
surfaces is a fifth place that has to be kept true as they grow. It also pulls
the whole starter library into the shell's module graph for an error page.

And [0018](0018-the-portal-is-a-consumer-not-an-insider.md) already settled the
general form of this question for the portal: an application's **chrome** is not
a Loom tree, because a tree is data and chrome is interactivity. A 404 is the
shell's chrome. It is the mildest possible case — three static lines, nothing a
tree could not hold — which is exactly why it is the one where the line is worth
drawing on principle rather than on capability. Live rather than foreclosed: if
a shell page ever genuinely needs a band, this is the decision to revisit.

**Import the marketing site's `SITE_THEMES.minimal.selection`.** One constant,
and the front door and its 404 could never disagree. **Rejected:** it makes the
application's own error page depend on a room inside it. A shell that imports a
surface's `_lib` inverts the containment 0067 established, and the coupling runs
the wrong way for the one page that has to work when a surface does not.

**Add `app/layout.tsx` so the shell has a document of its own.** It would let
the theme go on a real `<html>` and would remove the hoisting entirely.
**Rejected outright:** a layout at the application root is a parent of all four
route groups, which is precisely what 0067 refuses — the portal's stylesheet
would be in scope on a marketing page.

**Put the ground on a wrapping element instead of `:root`.** Simpler, and no
serialisation. **Rejected:** a ground that stops at the content's edge leaves
the browser's own white in the overscroll area a phone exposes past the end of a
short page. Invisible under `minimal`, whose canvas is white, and not invisible
under the next palette — which is the shape of defect 0197 was written about.

**Serve the mark from `app/icon.svg`.** One artefact instead of a third copy of
the four arms. **Rejected** for the reason `(marketing)/_lib/chrome.ts` already
gives: an image is opaque to the cascade, so the file renders the hex it carries
on whatever paper the palette supplies. The arms are drawn inline with no
`fill`, and the copy is held against `icon.svg`'s own rectangles — the same
guard the marketing suite keeps, against the same file, so no copy is ever held
against another copy.
