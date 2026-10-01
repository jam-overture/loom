# 2026-08-20 — The lessons surface wears the house theme

**Landed:** the `minimal` / `minimal-sans` / `precise` selection in
`apps/loom/app/(lessons)/_lib/loom.ts`, a Geist stylesheet link in the route
group's layout, and one split in the furniture's tokens that the theme forced.

**No lesson this run, and no lesson text changed.** Asked for directly by the
maintainer: *the minimal theme is ready, convert the lesson page.* Next in the
syllabus is still 12, Projection.

## What the selection is

Three ids, from the finding #103 filed against all four surface lanes:

```json
{ "palette": "minimal", "fontPack": "minimal-sans", "stylePreset": "precise" }
```

The course was on `editorial` because it was the quieter of the two palettes
that existed when this surface was built, and the argument in the comment was
that a course is read for twenty minutes rather than scanned. `minimal` is a
better answer to that same argument: white paper, black ink, and the green kept
back for the one thing being pointed at.

## Geist is linked, not bundled, and that is not a shortcut

The finding suggests `next/font` as the cheap way to load Geist. **It would not
have worked**, and the reason is worth writing down because the next surface to
adopt this will hit it.

`minimal-sans` is a *literal family stack* in a registered theme:

```
Geist, "Geist Sans", ui-sans-serif, -apple-system, …
```

`next/font` mints a hashed family name — `__Geist_1a2b3c` — and exposes it as a
CSS variable for the app to apply. Nothing in that stack is `__Geist_1a2b3c`, and
this lane may not edit `src/theme/library.ts` to make it so. The font would have
downloaded and never been matched.

Google Fonts serves the face under its real name, so a stylesheet link satisfies
the stack exactly as written. Two weights, 400 and 700, because the pack uses
exactly two.

**What the screenshots below are not.** The sandboxed browser has no egress, so
the render was taken in the fallback stack rather than in Geist — `curl` reaches
`fonts.googleapis.com` and returns the `@font-face` block, and the served HTML
carries the link and Next's preload of it, but the headless Chromium never
fetched it. The theme is designed for exactly this: everything in the fallback
is a neo-grotesque of the same temperature. Someone looking at the deployed page
with Geist actually present should re-check step 8 of the ramp, which #103 tuned
against a render at 1440px and flagged as metric-sensitive.

## What the theme found in my own furniture

The change that mattered was not the three ids. It was this:

> **`accent` is black in this palette, deliberately** — so that the green is
> left free to be a highlight rather than the largest element on the page.

`_components/style.ts` had one `accent` token, and it was doing two jobs that
`editorial` had hidden by making them the same slate: *what a filled control is
made of*, and *what points at something*. Under `minimal` the second job went
black, and the first render of this branch proved it — "Today's sitting" and
every overdue date rendered in body-text black, emphasising nothing. The queue
had lost the one piece of visual information it exists to carry.

So the token split in two, following the palette's own guidance about where the
green belongs:

| token | slot | what it is for |
| --- | --- | --- |
| `accent` | `accent` | fills and rings that mean *this is the button* — the black primary |
| `highlight` | `accent-strong` | the label on the thing being pointed at |
| `highlightTint` | `accent-subtle` | the tile under it |
| `highlightEdge` | `border-accent` | the ring around that tile |

Today's sitting is now a tinted tile with a green ring and a green label, and it
is the only green on the surface. The overdue rows went to `fg-muted` — twelve
green dates would have undone the point of the palette by making the highlight
the wallpaper.

A palette that makes `accent` and `accent-strong` the same color again is
welcome to; nothing here names a color.

## Executed

- `pnpm verify` green: **1407** runtime tests across 97 files, **759**
  application tests across 74 files, build clean, 29 static pages.
- One new test pins the two properties that make this *this* theme rather than
  any theme: `bg-surface === bg-canvas` (outline-first — a panel is a hairline,
  not a change of ground) and heading family === body family with different
  weights (`minimal-sans`'s own argument). Both fail loudly if the surface is
  flipped back to a palette that fills its cards or pairs two families.
- The built application was started and driven through a sitting again — rate,
  write, submit, check, grade — under the new palette.

## Found while teaching

**Nothing new this run.** The `accent` collision above is not a framework
finding: the palette is right, and the surface was reading one token for two
purposes, which is the surface's bug. It is written up here rather than in
`FINDINGS.md` for that reason — though a second surface hitting the same thing
would make it a note worth promoting, so this paragraph exists to be found.

The three findings from 19 August stand unchanged: no primitive can mark inline
code inside a paragraph, `sequentialIdFactory` accepts a namespace it cannot mint
an id from, and `review-schedule.md`'s tracking table now exists twice.
