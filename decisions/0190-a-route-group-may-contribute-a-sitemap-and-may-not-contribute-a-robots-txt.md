# 0190. A route group may contribute a sitemap and may not contribute a robots.txt

**Status:** Accepted
**Date:** 2026-09-25
**Section:** §4d

> **Why this number.** `0188` is taken by this branch's other record; `0189` is
> claimed by #389. This is the next free number on `main` and on every open
> branch.
>
> **Why `Accepted`.** It touches no schema, no tree and no delta. It is not a
> choice this project is making — it is a constraint the framework already
> imposes, written down with the measurement beside it and with a gate that says
> so the next time somebody trips on it.

## Context

`Loom marketing` shipped `/sitemap.xml` on 24 September and filed a finding the
same day: the `robots.txt` that should announce it was written, correct, covered
by eleven passing assertions, and served nothing. The file was in
`app/(marketing)/`, beside the `sitemap.ts` that works from exactly there.

The finding narrowed the cause by elimination — not the middleware, not a
rewrite, not `vercel.json`, not a `public/` shadow — and could not name it,
because the one fetch that would have settled it came back `EGRESS_BLOCKED`.

### What the measurements say now

The cause is in Next's own matcher and needs no network to read.
`isMetadataRouteFile` compiles one pattern per convention, and two of them are
anchored to the application root where the rest are not:

```js
new RegExp(`^[\\\\/]robots${…}`)      // anchored
new RegExp(`^[\\\\/]manifest${…}`)    // anchored
new RegExp(`[\\\\/]sitemap${…}`)      // not
new RegExp(`[\\\\/]icon${…}`)         // not
```

Called with this application's `pageExtensions`, on 16.2.12:

| file | honoured |
| --- | --- |
| `app/robots.ts` | **yes** |
| `app/(marketing)/robots.ts` | **no** |
| `app/manifest.ts` | **yes** |
| `app/(marketing)/manifest.ts` | **no** |
| `app/sitemap.ts`, `app/(marketing)/sitemap.ts` | yes, both |
| `app/icon.tsx`, `app/(marketing)/icon.tsx` | yes, both |
| `app/(marketing)/opengraph-image.tsx` | yes |

**Two of the finding's three observations do not reproduce and one is the whole
fault.** From a clean build of this tree, `app/robots.ts` is built, served, and
answers `200 text/plain` with the right four lines under both `next dev` and
`next start`. And `/robots.txt/` answering `308` proves nothing about the route
existing: `/definitely-not-a-route.txt/` answers `308` too and then `404`, because
the trailing-slash redirect is a normalisation that runs before any route is
looked up. The 404 at the application root was almost certainly the stale-`.next`
false green the same lane filed the same day — a killed build, a second build
exiting 0, and a server answering from output that predated the file.

What is left is real, is the reason the file shipped broken, and is worse than a
404: **the build says nothing.** A `robots.ts` in a route group is not a route,
not a page and not an error. It is not read.

## Decision

**`robots` and `manifest` are honoured only at `apps/loom/app/`. Every other
metadata convention is honoured wherever it sits.**

Two consequences follow, and the second is the one worth the record.

**`app/robots.ts` is at the application root because the framework puts it
there, and its content is the marketing lane's.** This is the rule
`docs/routines.md` already states for `next.config.ts` and `mdx-components.tsx`
— *the lane follows the content and not the location* — and this is its second
instance. The four lines are the ones argued at the head of
`(marketing)/sitemap.ts`, and both maps are derived from the same `guarded`
field, so a surface added to `PRODUCT_SURFACES` is crawled or disallowed by the
one decision that already put it in the header's menu.

**`pnpm prerender:check` now fails on a metadata file the build did not turn
into a route.** It reads the conventions out of the source tree and the routes
out of `app-paths-manifest.json`, and reports any convention with no route.

The check does **not** encode the rule above. It compares what was written
against what was built, so the day a Next upgrade moves an anchor, the manifest
changes and the check notices — rather than the repository holding a second copy
of somebody else's regex, true on the day it was typed.

## Consequences

- A `robots.ts` or `manifest.ts` written in a route group turns the gate red
  with a message naming the root-only rule, instead of shipping silence.
- The same check covers every other convention against a different failure: one
  that was written, was expected somewhere, and produced nothing.
- `pnpm prerender:check` now depends on `app-paths-manifest.json` as well as on
  the prerendered HTML. Both come from the same `next build` and it already ran
  after it, so the gate's ordering is unchanged.
- The application serves a `robots.txt` with a `Sitemap:` line and a
  `Disallow: /portal`. **Neither is a security control.** What keeps the portal
  shut is the sign-in in `proxy.ts` (0027); a `Disallow` is a request that
  well-behaved crawlers honour and nothing else is bound by.
- A convention file inside a `_`-prefixed folder is invisible to the check, as
  it is to the framework. That is correct and is the one way to have a file
  named `manifest.ts` that is deliberately not a route.

## Alternatives considered

**Put the check in a test of the exported function.** This is what already
existed and is what failed: eleven assertions passed against a `robots.ts` that
was never compiled. A test of a value cannot see whether the framework read the
file. Rejected as the thing being fixed.

**Probe the served addresses over HTTP.** Honest, and it is what found the fault
originally. Rejected for the gate: it needs the application started, which
`pnpm shoot` deliberately does not do (0117) and which would put a server in the
merge gate for four surfaces. The manifest is the same fact one step earlier and
costs one file read.

**Import Next's `isMetadataRouteFile` and check placement directly.** The most
precise answer available and the shortest. Rejected because it is a deep import
of a private module: a check that breaks on a minor upgrade of the thing it is
checking is a check that gets deleted. It was used to *measure* the table above,
which is a different job from being the gate.

**Keep `robots.ts` in `(marketing)` and add a redirect or a route handler at the
root.** Rejected: it works, and it makes the application carry a workaround for
a framework rule that has a supported spelling. The supported spelling is the
file at the root.

**Do nothing but write the rule down.** Rejected on the evidence. The rule was
discoverable and one lane spent a run and a screenshot cycle failing to discover
it; a paragraph in a document is found by whoever already suspects it exists.
