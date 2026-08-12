# 0056. The demo is public, and shares nothing with the portal but the deployment

**Status:** Accepted
**Date:** 2026-08-12
**Section:** §4b → §5

## Context

§4b's fourth step is a demo: a real page, and the record of how it changed,
side by side. Three properties are in tension about where it lives.

**It has to be seen.** The maintainer has never been able to look at any of this
working. One Vercel project exists, it builds `apps/portal`, and it is what every
pull request gets a preview URL for. A surface in a new app is a surface nobody
can look at until somebody creates a second project by hand.

**It has to be reachable without an account.** §4d's marketing site embeds the
demo. A visitor arriving from a marketing page cannot be asked to sign in to see
the thing being marketed, and the whole portal is behind a session by design
([0027](0027-identity-is-server-derived-and-absence-fails-closed.md)) — one
blanket rule in the proxy plus `requireActor` inside every page, neither
optional.

**It must not weaken the portal.** The portal reviews a stored tree, holds a
telemetry journal and counts sign-in attempts. An unauthenticated page inside the
same app is a door in a wall that exists for a reason, and the danger is not the
door — it is that the next unguarded page reaches through it for a store handle,
which looks exactly like an ordinary import.

## Decision

**The demo is a public route group inside the portal app, and it shares nothing
with the portal but the deployment.**

Public means public: `/demo` joins `/sign-in` in the proxy's allow-list, and it
is the third and only rendering entry in the `UNGUARDED_BY_DESIGN` list that
`guarded-pages.test.ts` enforces.

What makes that safe is the second half, which is a structural claim rather than
a promise:

- **Its own registry.** The starter library through the public SDK, not
  `portalRegistry`.
- **Its own store.** A `memoryTreeStore` per visitor, created on first change,
  keyed by an opaque cookie, evicted at 64 sessions and gone when the instance
  recycles. It never touches `portalStore`.
- **Its own policy**, named `demo`
  ([0033](0033-the-policy-is-resolved-per-change-and-named-on-the-verdict.md)).
- **No identity at all.** No `requireActor`, no session, no roster. Changes are
  attributed to the constant `a demo visitor`, because provenance is meant to
  name somebody a reviewer could go and ask (0027), and a cookie value is not
  one.
- **No journal.** The demo's record is the runtime's own event stream, read back
  within the request that produced it. Nothing is written to the telemetry
  database.

The exemption list is held honest by a test that reads the source of every
unguarded page and fails if one imports `@/lib/store`, `@/lib/write`,
`@/lib/telemetry` or `@/lib/database`. Auth is deliberately not on that list:
`/sign-in` exists to use it.

One consequence of being public and having a model behind it: free text spends a
paid API on the maintainer's key, so it is bounded by a token bucket — per
session and per instance, both debited, so minting sessions is not a way around
the first. The presets need no key at all
([0057](0057-a-preset-is-a-deterministic-interpreter.md)).

## Consequences

- The maintainer can see the demo on the preview URL of the pull request that
  builds it, with no new project to create and no environment to configure.
- §4d can embed the demo, because it is a route anyone can reach.
- The portal's blanket guard now has an exception, which is a cost. It is paid
  for by a test that names the exceptions and checks what they import, rather
  than by a comment asking the next person to be careful.
- A visitor's page resets when the instance recycles. That is correct for a
  demo and would be data loss for a portal, which is the clearest statement of
  how little the two surfaces share.
- **This record is expected to be revisited at §4d**, not superseded lightly. If
  the marketing site becomes its own app, the demo route moves into it: it has no
  portal-specific import to unpick, which was the point of building it this way.
  The public/anonymous/no-journal decisions survive the move; only the address
  changes.

## Alternatives considered

**A new `apps/demo` (or `apps/site`) app.** The tidiest answer, and the one this
will probably become. Rejected for now on one fact: Vercel builds the project it
was configured with, so the demo would have shipped invisible, and "the
maintainer has not yet been able to see any of this working" is the specific
problem §4b step 4 exists to solve. Ship it where it can be seen, move it when
there is a second project to move it to.

**Keep the demo behind the portal's sign-in.** Free, and it would have let the
maintainer see it. Rejected because it makes §4d impossible without a rewrite: a
marketing site cannot embed a page that redirects to a login, and discovering
that at §4d would mean building the demo twice.

**Let the demo use the portal's store and seed.** Would have reused
`ensureSeeded`, `portalHolds` and the existing tree page wholesale. Rejected
outright: it makes an anonymous visitor a writer to the tree under review,
through the one write path 0017 exists to keep single. A demo is not a reason to
give the public a pen.

**Client-held state, with the tree posted on every request.** No server memory,
no eviction, no cookie, and it would survive an instance recycling. Rejected
because the demo would stop exercising the parts of the system worth
demonstrating: `planRevert` reads a log, holds live in a store, and a
revision is a position in something durable. A demo that stubbed all three would
be demonstrating a diagram.

**A shared demo tree for everyone.** One store, one tree, no cookie. Rejected as
a multiplayer editor nobody asked for — two visitors undoing each other is a
worse first impression than no demo at all.
