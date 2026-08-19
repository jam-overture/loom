# 0070. The portal is a segment, and the marketing site is the front door

**Status:** Accepted
**Date:** 2026-08-19
**Section:** §4c, §4d, §5

## Context

[0067](0067-the-four-surfaces-are-one-application.md) decided that Loom's four
public surfaces are one Next.js application with one route group per surface, and
this is the run that carried it out. Two things it left open had to be answered
before a single file could move, because there is no arrangement of the tree that
avoids them.

**A route group contributes nothing to a URL.** That is the property that makes
0067 work — four surfaces, four root layouts, no path segment invented to
separate them — and it is also what makes `(marketing)/page.tsx` and
`(portal)/page.tsx` the *same route*. Both applications had a `/`. One of them
has to stop.

**The other is where a surface's non-route code lives.** `apps/portal/lib/` and
`apps/docs/lib/` were sibling directories under two applications; merged into
one, they are two `lib/` directories with the same `@/lib/` alias and no way to
tell which surface a module belongs to. The lane table in `docs/routines.md`
names each routine's territory as its route group, so wherever this code lands
has to be inside one.

## Decision

**Marketing keeps `/`, and the portal moves to `/portal`.**

```
/                   (marketing)
/docs/…             (docs)
/lessons/…          (lessons)
/portal/…           (portal)     — behind sign-in
```

This is the `supabase.com` → `supabase.com/dashboard` shape the maintainer asked
for, and the ordering falls out of who is being served: a stranger arrives at the
root and a reviewer arrives at a bookmark. Making the front door the surface most
people reach first is what "the portal is reached through the marketing site"
means once the two share a domain.

The documentation's front door moves the same way and for the same reason. It was
`/` in its own application and redirected to the first page; it is now `/docs`,
redirecting to the same place.

**A surface's code lives inside its route group, in private folders.**

```
app/(portal)/_components/   the shell, and per-page components
app/(portal)/_lib/          view models, the store, auth
app/(portal)/portal/        the routes
```

Next excludes an underscore-prefixed folder from routing, so `_lib` and
`_components` sit beside the routes without becoming any. The alias follows:
`@/lib/store` is now `@/app/(portal)/_lib/store`, which is longer and says which
surface it belongs to — and that is the point. A lane is one directory, and the
lane table does not need a second line to name a surface's `lib/`.

**Sign-in is enforced at the route-group boundary, in `proxy.ts`.** The matcher
was an exclusion — everything but Next's asset routes — because the set of
application routes grew and the set of framework routes did not. Three public
surfaces invert that reasoning: an exclusion list would now have to name every
marketing page, doc and lesson written from here on, and the one it forgot would
be a public page behind a sign-in. The guard names the closed set instead:
`/portal` and `/portal/:path*`.

**`requireActor` stays inside the pages**, unchanged.
[0027](0027-identity-is-server-derived-and-absence-fails-closed.md) is explicit
that neither check is optional — "the proxy covers the page somebody forgets to
guard, and `requireActor` covers the matcher somebody edits" — and this record
narrows *where the boundary is*, not how many checks stand on it.
`guarded-pages.test.ts` still asserts the second half, now scoped to `(portal)`.

## Consequences

- **Every portal URL changed.** A bookmark to `/trees` is now `/portal/trees`.
  There are no redirects from the old paths: the portal has a roster of named
  reviewers rather than a public audience, and a redirect table for an alpha's
  eight pages is more to keep true than it is worth. Say so when the domain moves.
- **The demo is at `/portal/demo`**, still public, still sharing nothing with the
  portal but the deployment
  ([0056](0056-the-demo-is-public-and-shares-nothing-but-the-deployment.md)).
  That URL is a poor address for the thing the marketing site wants to embed, and
  it is deliberately not fixed here — moving the demo is a decision about whose
  lane it is, which is open in `FINDINGS.md`, and a migration that also moved it
  would be unreviewable.
- **One Vercel project, and the existing ones point at directories that no longer
  exist.** Repointing Root Directory at `apps/loom` is a dashboard change nobody
  can make from the repository; `docs/deployment.md` says so at the top.
- **Three surfaces became statically prerenderable again.** `force-dynamic` was
  declared for the portal's whole segment and now sits in `(portal)/layout.tsx`,
  so marketing and the docs are static and the portal is per-request, which is
  what each of them wants.
- **A URL that matches no route has no layout to inherit**, because each group is
  a root layout of its own. `app/not-found.tsx` carries its own document.

## Alternatives considered

**Give the portal the root and put marketing under `/home` or similar.**
Rejected: it inverts the maintainer's requirement. The portal is the thing
reached *through* the marketing site, and a product whose front page is its admin
tool is not the shape that was asked for.

**Keep `lib/` at the application root, split by surface — `lib/portal/`,
`lib/docs/`.** Rejected, though it is the arrangement with the prettier import
paths and no parentheses in a module specifier. It makes every lane two
directories instead of one, which is a second thing to state in the lane table and
a second place for two routines to collide. 0067 says a route group is a lane; the
code belongs where the lane is.

**Keep the portal's blanket matcher and exempt the public surfaces.** Rejected as
the wrong default. A deny-list of public paths fails towards a marketing page
behind a sign-in, silently, on the day someone adds a page and forgets — and the
three public surfaces are the ones that will grow fastest.

**One root layout with the four surfaces as nested layouts.** Rejected: the
portal and the documentation each import a Tailwind stylesheet that defines the
same token names to different values, and a shared `<html>` would put both on
every page. Separate root layouts keep each surface's CSS on its own routes,
which is also why moving between surfaces is a full page load — correct here,
since they do not share a design.

**Redirects from every old portal path.** Rejected as above: eight routes of
compatibility shim for a named roster of alpha reviewers, kept true forever
because nothing would ever prove they were unused.
