# 0331. A marketing page is served per request because the store governs it

**Status:** Accepted
**Date:** 2026-11-01
**Section:** §4d, §5

## Context

The maintainer, on 31 October 2026:

> *"Also, the performance across the site is pretty slow. Lets make sure to
> prioritize improving the performance. For example, just switching to 'Why
> use it' takes several seconds."*

`Loom marketing` measured that the same day. 93% of a 2.4MB page is the
library stylesheet serialised once per primitive into the RSC payload, which
is `src/primitives/`' and is filed. The finding then named a second, smaller
thing and **got it wrong**, which is what this record is about:

> All four marketing routes are `ƒ` — server-rendered on demand — while every
> `(docs)` page is `○` static. The cause is that each route awaits
> `searchParams` (the palette) and `servedOrigin()` (a `headers()` read). That
> is the ~100ms, not the seconds, and **it is `Loom marketing`'s own to fix**.

It is not a fix. It is the one change available on this surface that would
break the product with every test green.

### What prerendering these pages would do

[0259](0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md)
made these pages the store's rather than their builders': `pageTreeFor` reads
the stored row, and the builder is the seed and the fallback. A change
somebody accepts in the portal, or an adaptation the Gate lets through, is a
new revision of that row, and the next reader is meant to get it.

A prerendered page reads that row **once, at build time**, and serves the copy
until the next deployment. The portal would go on governing a page nobody is
served — which is 0259's own title arriving by the other door.

### It was held by accident, and measured

Nothing on this surface declared it. Both halves of each route await
`searchParams` for the palette, and that was the whole of why Next.js served
them on demand. Measured on `/what-you-run`, with `next build`:

| | `next build` reports |
| --- | --- |
| as it shipped on 1 November | `ƒ` — served per request |
| with the page component's `searchParams` read removed | `ƒ` — the metadata still reads one |
| with both reads removed | **`○` — prerendered, and the row frozen** |

The middle row is the dangerous one. The read that keeps the guarantee true
lives in `generateMetadata`, not in the page body, so a run that removed the
palette from the component would see the route stay `ƒ`, conclude correctly
that nothing had changed, and leave a surface one edit from frozen.

Nothing would have been red at the bottom of that path. The stored row is
served either way; it is only ever *stale*, and no test in this repository
asserts the freshness of a row read at build time.

## Decision

**Every page of the marketing site declares `export const dynamic =
"force-dynamic"`**, and does so as a literal in the route file, beside a
comment naming 0259.

**The declaration is the guarantee, and a request-scoped read is not.** A
route that is served on demand because it happens to read a query string is
an arrangement, not a commitment. What this record requires is the statement.

**`(marketing)/_lib/governed.ts` holds the argument once** and
`governed.test.ts` reads the route files and fails if one has lost the
declaration or the reason beside it. The check reads the files as text rather
than importing them, because what matters is the literal Next.js resolves
when it decides how to serve a segment.

**The palette may now move off the query string.** That was worth doing on its
own terms and was blocked by this hazard rather than by anything about the
palette; with the declaration in place it is an ordinary change.

## Consequences

- These three routes stay `ƒ`, deliberately, and a report that lists them
  beside `(docs)`' `○` pages is comparing a governed surface with a compiled
  one. The ~100ms is the cost of 0259 and is not recoverable while 0259 holds.
- **The performance work available on this surface is therefore none.** The
  2.4MB is `src/primitives/`'; the ~100ms is this record's. A later run that
  reads the 1 November finding should read this file before acting on its last
  paragraph, and that paragraph is corrected in `FINDINGS.md`.
- A fourth marketing page is covered by the check on the day it is added,
  because `GOVERNED_ROUTES` derives from `SITE_ROUTES` rather than repeating
  it.
- Caching a governed page per request — `revalidate`, a tag, a short TTL — is
  the thing that would recover the ~100ms **without** freezing the row, and it
  is not decided here. It needs the portal to invalidate on append, which
  spans two lanes, and it is filed rather than guessed at.

## Alternatives considered

**Leave it implicit.** Rejected: that is the arrangement that was one edit
from gone, and the edit was recommended in writing by this lane's own finding.

**Make the pages static and accept the staleness.** Rejected: it contradicts
0259, which is `Accepted`, and it would make the portal's whole page-governing
surface decorative on the one deployment anybody looks at.

**`export const revalidate = 0`.** Equivalent in effect and weaker as a
statement — it reads as a cache tuning knob, which is exactly how a later
performance pass would treat it. `force-dynamic` says what is meant.

**A middleware or layout-level declaration.** Rejected: route config is
resolved per segment, and a reader of `page.tsx` is the person who needs to
see the constraint. A declaration one directory up is a constraint nobody
reads at the moment they are editing the thing it governs.
