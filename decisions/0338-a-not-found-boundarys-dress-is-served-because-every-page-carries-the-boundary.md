# 0338. A not-found boundary's dress is served, because every page carries the boundary

**Status:** Accepted
**Date:** 2026-11-02
**Section:** §4 (the application shell)

## Context

`app/not-found.tsx` is the one page in this application that belongs to no
surface: four route groups are four root layouts (0067), an address matching no
route is outside all of them, and Next supplies the document for it. Since 6
October it has worn the house theme, mounted by the shell rather than by a root
primitive (0232), and its stylesheet has been held as text in a module rather
than imported as a `.css` file — for testability and because a stylesheet that
failed to be emitted would render the page in the browser's own defaults, which
is the defect that unit closed.

Both of those reasons are still good. **What was wrong was where the text went.**

`Loom marketing` counted `:root {` blocks in a served response on 2 November to
weigh its own addition, found four on a page that should have had one, and filed
it. Measured off a production build and `next start`:

| path | response | copies | the shell's two blocks | share |
| --- | --- | --- | --- | --- |
| `/docs` | 35,749 B | 2 | 14,526 B | **40.6%** |
| `/lessons` | 68,756 B | 2 | 14,526 B | 21.1% |
| `/portal/sign-in` | 26,767 B | 1 | 7,263 B | 27.1% |
| `/lessons/1` | 31,475 B | 3 | 21,789 B | **69.2%** |
| `/?theme=bold` | 2,885,439 B | 2 | 14,526 B | 0.5% |

The stylesheet is **7,263 bytes** served. Inline it was slightly more than that
per copy, because a string in the flight payload is escaped — which is why the
figures the fix actually removed, below, are a little larger than this table's.

**The cause is not the CSS and not the shell's markup.** Next keeps the root
not-found boundary in the RSC tree of **every** route, and a boundary's fallback
is a prop on a client component — so React renders it on the server and
serialises the result into the flight payload of every response, whether or not
anything 404s. An inline `<style>` is therefore 7,263 bytes, escaped, on every
page of all four surfaces. No reader is ever served the wrong colour, because the
element only reaches a document if the boundary renders. It is pure weight, and
on the three surfaces nobody had measured it was the largest single item in the
response.

The filing also asked **why two copies and not one**, and said the lane could
not answer it from outside the shell. Measured here: it is one per boundary Next
inserts, and the count is Next's shape rather than the shell's — two on most
routes, **three under a dynamic segment** (`/lessons/1`, which is `[lesson]`),
and **one under `(portal)`**, which supplies a `not-found.tsx` of its own and so
takes the inner boundary off the shell's.

## Decision

**The shell's 404 dress is served at `/not-found.css` and linked, not inlined.**
`app/not-found.css/route.ts` returns `SHELL_ROOT_CSS` and `NOT_FOUND_STYLE`
concatenated, in that order, as `text/css`; `not-found.tsx` carries a
`<link rel="stylesheet">` at that address. A `<link>` is ~90 bytes in the
position the 7,263 were, and the browser fetches what it points at only when the
element is in a document — a response that is actually a 404.

**This retires the copy count as something anyone has to reason about.** At 90
bytes a boundary, the difference between one and three stops being interesting,
which is a better outcome than explaining it: the next route shape that inserts
a fourth costs nothing and nobody has to notice.

**`force-static`**, because the body is a pure function of the shell's theme and
the theme is fixed when the application is built. There is nothing in a request
for it to read, so it is prerendered once and costs no server time. The palette
remains the only source of the colours (0049, 0334) — the route names none.

**`precedence` stays on the link.** React waits for a stylesheet it was given a
precedence for, so the page is dressed on arrival rather than flashing through
the browser's own defaults. That flash is the one thing a fetched stylesheet
could have reintroduced, and it is the defect the 6 October unit existed to
close.

**A route's address is its directory name, which no import can read**, so the
address is a constant — `NOT_FOUND_STYLESHEET_PATH` — and `not-found.test.tsx`
holds the directory on disk against it. A renamed or deleted route fails the
build rather than serving the one page outside every layout undressed. The old
guarantee was *the text cannot be dropped*; this keeps it true under the second
way it could now go wrong.

## Consequences

Measured on a production build and `next start`, before and after, on the same
machine — the whole response, so the ~90-byte links the fix adds are already
netted off:

| path | before | after | saved |
| --- | --- | --- | --- |
| `/docs` | 35,749 B | 20,562 B | **−42.5%** |
| `/lessons/1` | 31,475 B | 8,907 B | **−71.7%** |
| `/portal/sign-in` | 26,767 B | 19,239 B | −28.1% |
| `/lessons` | 68,756 B | 53,657 B | −22.0% |
| `/docs/the-runtime/proposing-a-change` | 81,774 B | 66,645 B | −18.5% |
| `/?theme=bold` | 2,885,439 B | 2,870,374 B | −0.5% |

No copy of the stylesheet remains in any of them. The marketing figure is 0.5%
because that page's weight is the stylesheet-per-primitive defect in
`src/primitives/` at 93% — filed, open, and not this lane's.

The two blocks still arrive together and in order, which the inline `<style>`
guaranteed by construction. One response rather than two links is what keeps it:
there is no sequence in which the rules arrive without the theme they read.

A 404 now costs one extra request. It is conditional, it is prerendered, and it
is on the page nobody is meant to reach.

`not-found-style.ts` keeps the text and keeps its test — the reason it is a
string rather than an imported `.css` file is unchanged, and the assertion that
every `var(--loom-*)` in it is a property the mounted theme supplies is the
check a real stylesheet would be opaque to.

**What generalises, for every lane:** anything a `not-found.tsx` or an
`error.tsx` renders is in the flight payload of every page beneath it. That is a
property of a boundary, not of this shell, and it is the reason to keep a
boundary's dress behind an address rather than in its markup.

## Alternatives considered

**Render the `<style>` inside the not-found component's own subtree.** The first
shape the filing named, and it was already the case — the `<style>` was inside
the component. That is what made the measurement surprising and is the whole
content of the mechanism above: the boundary's fallback is rendered eagerly, so
*inside the component* is not a condition at all.

**Emit the CSS from a client component.** Keeps it inline and moves the bytes
from the flight payload into a JS chunk whose module reference is in the payload
of every route anyway, so the chunk is fetched for every page. Strictly worse:
the same weight, now also parsed as JavaScript.

**A static file in `public/`.** No route and no server work, and rejected on the
one thing that matters: the body would be a hand-maintained copy of the shell's
theme, kept where the palette cannot reach it. The palette moves and the file
does not, and nothing anywhere can see it — 0197's hazard and 0334's, arriving
through a build step.

**An immutable cache header.** The address carries no content hash, so a stale
copy would dress a 404 in the previous deploy's palette. `must-revalidate` costs
one conditional GET on a page nobody is meant to reach.

**Shrink the stylesheet instead.** It is 5,000 characters of the 7,256 (the byte figure is 7,263) and every
rule in it is read by the markup beside it. Cutting a page's own dress to save
weight on pages that never render it is answering the wrong question — the cost
was never the size, it was that it was on every page.
