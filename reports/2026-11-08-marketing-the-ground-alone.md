# Marketing — the document gets the ground and stops getting the palette twice

**Branch** `marketing-31-the-ground-alone` · **Date** 8 November 2026 ·
**Section** §4d, the marketing site · **Lane** `apps/loom/app/(marketing)/`

---

# What was built

One line of this surface changed, and nothing a visitor looks at changed with
it. `DocumentTheme` asked the framework for the whole palette as a `:root` rule
and now asks for the ground alone.

| | the rule the document carries |
| --- | --- |
| before | `themeDocumentCss(theme)` — 52 variables and 3 declarations, 1,976 B on `bold` |
| after | `themeGroundCss(theme)` — 3 declarations, 78 B on `bold` |

![The front door under bold, after the change](2026-11-08-marketing-the-ground-alone-bold.webp)

**That picture is byte-identical to the same shot off the pre-change build**,
and so are the other five this run took. The evidence section below says how
that was checked and why it is the point rather than a disappointment.

This closes this lane's half of its own finding of 2 November. The framework
half closed the same day as
[0337](../decisions/0337-a-host-whose-page-is-already-a-tree-is-handed-the-ground-alone.md);
the one line it left for this lane is what shipped today.

---

# 1. Why the variables were there, and why they should not have been

Three things a reader sees belong to the document element and to nothing a page
renders: the scrollbar beside it, the canvas painted past the end of a short
page, and an unstyled form control. They read `color-scheme`,
`background-color` and `color`. No tree can reach them, because a tree ends at
the element its root primitive renders and no tree ever contains the document.

[0334](../decisions/0334-the-browsers-own-furniture-is-outside-the-tree-so-a-host-is-handed-a-root-rule-for-its-document.md)
answered that by publishing `themeDocumentCss(theme)`: the rule a host puts on
its own `:root`, which **is** the document element. This surface took it on
2 November and it fixed the defect — `bold` had shipped a black page with a
light scrollbar beside it for as long as the switcher had offered it.

**What it also did was mount the palette a second time.** `themeDocumentCss`
returns every `--loom-*` variable as well as the three declarations, because it
was written for the application shell: the shell draws its own markup, mounts
nothing, and needs the variables as much as the ground. A *surface* is the
other host and it is not the same host. Every pixel of this one is a tree, so
the root primitive has already mounted the palette on the element it renders,
and a primitive reads the nearest declaration — which is the tree's own, never
the copy on the document. The copy was read by nothing inside the page.

Measured on the production build of 8 November, both spellings off the same
resolved palette:

| palette | `themeDocumentCss` | `themeGroundCss` | the difference |
| --- | --- | --- | --- |
| `minimal` | 2,255 B, 53 variables | 79 B, none | 2,176 B |
| `editorial` | 1,969 B, 52 variables | 79 B, none | 1,890 B |
| `bold` | 1,976 B, 52 variables | 78 B, none | 1,898 B |

## It is not taken for the saving, and the arithmetic says so

The rule is in the response twice — once as the hoisted `<style>` and once in
the flight payload — so on `/?theme=bold` the whole change is **3,947 bytes of
2,871,274**, which is a seventh of one percent. Read off the served documents
rather than reasoned:

| | before | after | saved |
| --- | --- | --- | --- |
| `/?theme=bold` | 2,871,274 | 2,867,327 | 3,947 |
| `/?theme=editorial` | 2,870,662 | 2,866,731 | 3,931 |
| `/` (`minimal`) | 2,871,761 | 2,867,245 | 4,516 |
| `/why-use-it?theme=bold` | 2,567,014 | 2,563,065 | 3,949 |
| `/what-you-run?theme=bold` | 1,142,680 | 1,138,733 | 3,947 |

The 2 November finding said the same thing about its own arithmetic and was
right: *a tenth of a percent does not justify this lane hand-writing a
three-declaration rule.* The reason to take it is the seam. Writing the three
declarations here by hand would have kept a copy of a decision the palette owns
somewhere the palette cannot reach, which is the hazard 0197 and 0334 both
exist to refuse; the answer was for the framework to publish the half, and it
did. **This is a line taken, not a shape invented.**

## What stayed `themeDocumentCss`, and that is deliberate

`apps/loom/app/_lib/shell/theme.ts` still reads `themeDocumentCss(shellTheme)`
and should. It is the application shell, it is not this lane's, and it is the
host 0334 was written for. Nothing outside `app/(marketing)/` was touched.

---

# 2. The evidence, which is a table and not a picture

The thing this change is about cannot be photographed. A desktop screenshot
excludes the scrollbar — measured again today rather than assumed:
`window.innerWidth - document.documentElement.clientWidth` is **0** in the
harness's Chromium, so the scrollbar is an overlay and is not in the frame. The
overscroll canvas exists only while a finger is dragging past the end of the
page.

So the three declarations were read off the **live document** on the production
build, in every palette on every page, with `getComputedStyle`:

| page | palette | `background-color` | `color-scheme` | `--loom-bg-canvas` on `:root` | on the tree's root |
| --- | --- | --- | --- | --- | --- |
| `/` | minimal | `rgb(255, 255, 255)` | `light` | *absent* | `#ffffff` |
| `/` | editorial | `rgb(250, 250, 247)` | `light` | *absent* | `#fafaf7` |
| `/` | bold | `rgb(10, 10, 10)` | `dark` | *absent* | `#0a0a0a` |
| `/why-use-it` | minimal | `rgb(255, 255, 255)` | `light` | *absent* | `#ffffff` |
| `/why-use-it` | editorial | `rgb(250, 250, 247)` | `light` | *absent* | `#fafaf7` |
| `/why-use-it` | bold | `rgb(10, 10, 10)` | `dark` | *absent* | `#0a0a0a` |
| `/what-you-run` | minimal | `rgb(255, 255, 255)` | `light` | *absent* | `#ffffff` |
| `/what-you-run` | editorial | `rgb(250, 250, 247)` | `light` | *absent* | `#fafaf7` |
| `/what-you-run` | bold | `rgb(10, 10, 10)` | `dark` | *absent* | `#0a0a0a` |

Every one of the nine ground readings is what it was before the change, and the
variable the document used to carry is gone from `:root` and still on the
element the tree renders, with the palette's value. The whole rule as served,
read out of the response:

```css
:root {
  background-color: #0a0a0a;
  color: #f5f5f5;
  color-scheme: dark;
}
```

## Six photographs, byte-identical

Two production builds were made — one before the edit and one after — and the
same six shots taken off each at `1280×900@2x` and `390×844@2x`. All six PNGs
are **identical by `md5sum`**: `/` under all three palettes, `/what-you-run`
under `bold`, `/why-use-it` under `editorial`, and `/` under `bold` on a phone.

That is the strongest form the claim takes. A change that silenced the palette
by accident would show on the first of those six and does not show on any.

![minimal](2026-11-08-marketing-the-ground-alone-minimal.webp)

![editorial](2026-11-08-marketing-the-ground-alone-editorial.webp)

![The phone, under bold](2026-11-08-marketing-the-ground-alone-phone.webp)

No hard-coded colour anywhere. The component names none and
`document-theme.test.tsx` holds that it names none, over the code with the
comments stripped — the reasoning is allowed to quote `bold`'s canvas because it
is the evidence for the original change.

---

# 3. What the test now holds, and the case that was inverted

`document-theme.test.tsx` went from **37 cases to 44**. One case was inverted
and six are new.

**The inverted one is the change.** It read *on %s, mounts the variables the
tree mounts*, and it passed: the document carried every `--loom-*` the tree
carried, and the two agreed because `themeDocumentCss` and `renderTree` both
default their ramps to `fluid`. Two readings of one palette agreeing is a fact
and it was the wrong fact to hold — the agreement was between a mounting and a
copy of that mounting, in the one place nothing looks. What is held now is that
there is nothing to agree about:

| case | what it holds |
| --- | --- |
| *declares no variable of the palette's* ×3 | the rule matches no `--loom-`, and no name `themeStyle` mounts is declared in it |
| *leaves every one of them on the tree's own root* ×3 | all 52 (53 under `minimal`) are on the element the tree renders, read off the served markup |
| *is the three declarations and nothing else* ×3 | the rule's property names are exactly `background-color`, `color`, `color-scheme` |
| *emits nothing for a palette with no ground either* | `themeGroundCss` returns `undefined` for a palette whose body-copy pair cannot be read, and the component renders nothing rather than `:root {}` |

The two ramp defaults no longer have to keep agreeing, and that is a property
rather than a check deleted: there is no second set of lengths in the document
to drift from the tree's.

**The second case is why the first cannot stand alone.** *The document declares
no variables* is also true of a site with no colour on it. It reads the
variables off the served markup, which is the same independent half the ground
assertions already take.

## One thing found while writing that test, and it is in the test

`themeStyle` hands back `Impact, "Haettenschweiler", …` and React writes
`&quot;` for each quote, so comparing against the raw markup fails on exactly
the **four font stacks** and passes on the other forty-eight. A check written
that way would report the type half of a palette missing from the tree as a
palette that is there. The helper decodes entities and the docblock says why.

## Proved by breaking them

| broken how | what went red |
| --- | --- |
| `themeGroundCss` → `themeDocumentCss` in the component | 8 of 44: all three *declares no variable*, all three *three declarations*, the groundless case, and the source assertion |
| `themeGroundCss(theme) ?? ":root {\n}"` | 2 of 44: the groundless case **and** *writes no CSS of its own* |
| the entity decoding taken out of the test helper | 3 of 44: all three *leaves every one of them on the tree's own root* |

---

# Decisions

**None taken and none recorded.** Nothing here touches the tree schema, the
delta model or an Accepted record; this is a caller moving to the function
0337 published for it. No primitive was added and none was needed — the subject
is the document, and no tree ever contains the document, which is the question
0067 asks of anything this surface renders itself.

All three marketing routes still report `ƒ` in `next build`, so
[0331](../decisions/0331-a-marketing-page-is-served-per-request-because-the-store-governs-it.md)
holds and nothing here froze a governed page.

# Findings

**One filed, one closed. No copy changed, so no word budget moved.**

- **Closed, this lane's row on the 2 November entry** *(`themeDocumentCss`
  hands back the whole theme, so a surface whose every pixel is already a tree
  mounts its variables twice)*. The framework half closed on 2 November as
  0337; the line it left here is taken.
- **Filed, for `Loom daily build`** (`tools/weigh/repetition.ts`): the copy
  count `pnpm weigh` prints is a **landmark** count, and for a short rule the
  landmark can be an ordinary CSS property name. This run's own 78-byte rule is
  reported as *carried 426 times, at least 33,150 bytes repeated* when the
  document contains exactly two copies totalling 156 bytes. The measurement is
  in the finding.

**The before reading is affected by the same thing and the report says so**: on
the pre-change build `weigh` printed *1,976 bytes carried 4 times*, and the
document held two copies of that rule. The other two occurrences of its
landmark were the tree's own mounting of the same palette — which is a true
reading of a real duplicate, arrived at by accident. The 2 November finding's
own figure of two copies, counted by hand, is the one that was right.

# Test numbers

`pnpm install && pnpm verify`, read out of the file the status was written to
rather than off a notification:

```
Test Files  272 passed (272)      Tests  6606 passed (6606)    # framework
1467 findings, 0 malformed
2149 visuals in reports/, 150.0MB, none over 1.1MB, 413 cited by no file
Test Files  441 passed (441)      Tests  7160 passed (7160)    # @loom/app
139 prerendered pages, 2099 text junctions, 0 run together; 3 metadata conventions, 0 unserved
EXIT=0
```

**The first run of the gate was red, on `tsc` and not on a test.** The new case
needs the `ResolvedTheme` type to build a palette with no ground by hand, and
the first spelling imported it from `@jam-overture/loom/react` beside the three
functions it uses. That door does not export it; `@jam-overture/loom` does, and
`share-image.ts` two files away has always said so. **`vitest` was green on all
44 cases with the import wrong**, because it strips types rather than checking
them, which is worth writing down: a type-only mistake in a test file is
invisible to the suite and shows up in the gate's `tsc` step.

This branch's own additions: **7 cases**, all in `document-theme.test.tsx`,
which goes from 37 to 44. One existing case was inverted rather than deleted
(above). The framework suite is untouched by this branch and no file outside
`app/(marketing)/` was changed.

**`413 cited by no file` is not this branch's.** It is the same 413 on
`origin/main`, checked by running `pnpm reports:check` on a clean tree, and
`reports:check` prints it without failing on it. The four visuals this run added
are all cited by this report.

# Open questions

In the pull request comment. Nothing about this change is blocking, and it
needs no positioning answer: no copy on the site changed, and no word of the
site's 3,060 moved.
