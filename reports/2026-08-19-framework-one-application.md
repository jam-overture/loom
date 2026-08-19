# 19 August — the four surfaces become one application

**Routine:** `Loom daily build` · **Branch:** `day-56-one-application` ·
**Lane:** `src/` except `src/primitives/`, plus the migration and the demo ·
**Section:** §4c, §4d, §5

[0067](../decisions/0067-the-four-surfaces-are-one-application.md) decided on
18 August that Loom's four public surfaces are one Next.js application. This run
carried it out. It is one pull request, and the tree is not left half-migrated:
`apps/portal`, `apps/docs` and `apps/marketing` are gone, `apps/loom` is the only
package in `apps/`, and every one of the 642 tests that existed across the three
still runs and still passes.

## What shipped

```
apps/loom/
├── proxy.ts                    sign-in, scoped to /portal and nothing else
├── next.config.ts              MDX, once, for the whole application
├── vitest.config.ts            one suite: .test.ts in Node, .test.tsx in a document
└── app/
    ├── not-found.tsx           the one page that belongs to no surface
    ├── (marketing)/            /            — 2 routes
    ├── (docs)/                 /docs/…      — 7 routes
    ├── (lessons)/              /lessons     — an empty shell
    └── (portal)/               /portal/…    — 11 routes, behind sign-in
```

`next build` answers for all four from one route table:

| | |
| --- | --- |
| static | `/docs` and its six pages, `/lessons`, `/_not-found` |
| per request | `/`, `/how-it-works`, and all eleven `/portal` routes |

**A surface's code lives inside its route group.** `_components/` and `_lib/`
sit beside the routes — Next excludes an underscore-prefixed folder from routing —
so a lane is one directory and everything under it, which is what the lane table
already said it was. `@/lib/store` became `@/app/(portal)/_lib/store`: longer, and
it names its owner.

**`force-dynamic` moved down.** It was declared for the portal's whole segment in
what used to be its root layout, and it now sits in `(portal)/layout.tsx`, so it
covers exactly the portal. Marketing and the docs became statically prerenderable
again in the same move — visible in the table above, and not a change anybody made
on purpose so much as one the old arrangement was hiding.

**Nothing in `src/` was opened.** Three applications merged into one needed no new
export, no changed entry point, and no framework work at all. That is 0018's claim
tested at the widest it has been: all four surfaces are consumers, and moving every
one of them at once did not reach past the published API.

## What I decided that was not specified, and why

**Marketing moved too.** The brief has `(marketing)` as an empty shell its owner
will fill, which was true when it was written and stopped being true a few hours
later: #96 landed `apps/marketing` — two routes, thirteen files, 52 tests — on the
morning of 19 August. Migrating docs and the portal while leaving a third sibling
application behind would have left the tree in exactly the state the brief says not
to leave it in. So all three moved, and `(lessons)` is the only shell.

**The portal is at `/portal`, and this needed a record.** A route group contributes
nothing to a URL, so `(marketing)/page.tsx` and `(portal)/page.tsx` are the same
route and one of them had to give up `/`. Marketing keeps it: the maintainer's
requirement is that the portal is reached *through* the marketing site, which is a
statement about which one a stranger meets first.
[0068](../decisions/0068-the-portal-is-a-segment-and-the-marketing-site-is-the-front-door.md)
records that, the private-folder layout, and the middleware scope. **There are no
redirects from the old portal paths** — the record argues why, and it is the
decision in here I would most like a second opinion on.

**`requireActor` stayed in the pages.** The brief says sign-in moves to middleware
"not per page", and
[0027](../decisions/0027-identity-is-server-derived-and-absence-fails-closed.md) is
`Accepted` and says the opposite about the second check: *"the proxy covers the page
somebody forgets to guard, and `requireActor` covers the matcher somebody edits"* —
neither is optional. I read the brief as moving **where the boundary is** rather
than removing the depth behind it, because the alternative contradicts an Accepted
record, which is an escalation rather than a refactor. So the boundary moved and
both checks stand. If that reading is wrong it is a small change to make, and it is
the first question below.

**The middleware matcher inverted from a deny-list to an allow-list.** It used to be
"everything except Next's own asset routes", on the reasoning that application
routes grow and framework routes do not. With three public surfaces sharing the
deployment that reasoning points the other way: the set that grows is now the public
one, and an exclusion list that forgot a page would put a marketing page behind a
sign-in silently. It names `/portal` and `/portal/:path*`.

**Four root layouts rather than one.** The portal's stylesheet and the
documentation's both `@import "tailwindcss"` and both define `--surface-page`,
`--surface-hover` and friends to different values. A shared `<html>` would load
both everywhere. Each group keeping its own root layout scopes each stylesheet to
its own routes; the cost is that moving between surfaces is a full page load, which
is honest — they do not share a design.

## Records

**Added:** [0068](../decisions/0068-the-portal-is-a-segment-and-the-marketing-site-is-the-front-door.md),
`Accepted`. Nothing superseded; 0068 answers what 0067 left open and contradicts no
record.

**The number is contested.** `main` ends at 0067 so 0068 is the next free number,
which is what the brief says to take — and #97 also wrote 0068 (and 0069) the same
morning. Merge order settles it: whichever branch lands second renumbers. Neither
branch is red today, which is the difference between this collision and the one on
16 August, where a branch sat red for as long as the other stayed open. Filed.

## One edit outside my lane, and why

`app/(marketing)/_lib/copy.ts` says how many decision records the repository holds,
and `facts.test.ts` asserts it against `decisions/` — so writing 0068 turned the
marketing suite red on a literal `"67"`. I changed it to `"68"`.

That is a file in the marketing lane and I would rather not have touched it, but
`pnpm verify` green is now the merge gate for four surfaces, and leaving it red
would block every routine over two digits. #97 hit the same file the same morning
for the same reason from the other side — it added four primitives and the count of
those is checked too. Filed as a finding for the marketing routine, because a design
that requires two other lanes to edit one file is worth fixing rather than
apologising for, and because the previous run said so only in a PR comment, which
nothing reads afterwards.

**One consequence to watch:** if #97 lands first, the record count becomes 70 and
this literal needs to say 70. Whoever merges second is already renumbering a record;
this is the same edit.

## Findings

**Filed four.** That `apps/loom` exists and what each of the four lanes is now,
owned by the four surface routines — three of them are blocked on this shape and
that entry is what tells them they are not any more. That one Vercel project needs
repointing at `apps/loom` and the others deleting, owned by the maintainer. And the
0068 collision, as an instance of the 16 August numbering finding rather than a new
one. And that the marketing site's checked numbers oblige two other lanes to edit
one of its files, owned by the marketing routine.

**Closed none, and none of the three open ones owned by this lane were touchable
this run.** The 18 August "a change of destination is not yet a stake" is a
`src/runtime/` unit the migration outranked. The two the marketing run filed on
19 August — that a Loom tree cannot hold a relative URL, and that `loom.divider`'s
ornaments collapse — are marked as this lane's but both land in `src/primitives/`,
which is not this routine's directory; #97 reports having taken both.

## Tests

`pnpm verify` at the root, green. **1361 runtime, 642 application.**

The 642 is the arithmetic sum of the three suites that went in — 546 portal, 44
docs, 52 marketing — which is the number this migration had to produce. Nothing was
deleted, nothing was skipped, and nothing was weakened to move. Six tests needed
their *paths* rewritten because they read the filesystem rather than an import, and
each one still asserts what it asserted before:

| test | read | now reads |
| --- | --- | --- |
| `guarded-pages.test.ts` | every page under `app/` | every page under `app/(portal)/` |
| `nav-items.test.ts` | `app/<href>/page.tsx` | `app/(portal)/<href>/page.tsx` |
| `sign-in-path.test.ts` | `lib/` and `app/` | `app/(portal)/` |
| `content.test.ts` | `../app/docs` | `../docs` |
| `entry-points.test.ts` | the root `package.json` | the same file, five levels up |
| `facts.test.ts` | `decisions/` | the same directory, five levels up |
| `pages.test.ts` | `app/<route>` | `(marketing)/<route>` |

`guarded-pages.test.ts` is the one worth naming: scoping it to `(portal)` is not
cosmetic. Left pointing at `app/`, it would have swept up every marketing page, doc
and lesson and reported each as an unguarded page — a check saying the exact
opposite of what it means, and passing only because someone kept adding to an
exemption list.

## Open questions

Four, all in the pull request comment. The two that matter: whether keeping
`requireActor` was the right reading of "not per page", and that a preview URL still
cannot be produced until one Vercel project is repointed at `apps/loom` — the
projects that exist point at three directories that no longer do.

## Visual

Four screenshots beside this report, and what they show is the point of the whole
change: **one server, one origin, four surfaces.** All four were taken against a
single `next start` on one port, and each surface arrives wearing its own design —
the marketing site in its editorial palette, the documentation in its own light
theme, the portal in silver. No stylesheet reached a surface it does not belong to,
which is the thing four root layouts were chosen to guarantee.

The same server, asked for every route that matters:

```
/                                   200
/how-it-works                       200
/docs                               307 → /docs/getting-started/introduction
/docs/getting-started/introduction  200
/lessons                            200
/portal                             307 → /portal/sign-in?from=%2Fportal
/portal/sign-in                     200
/portal/trees                       307 → /portal/sign-in?from=%2Fportal%2Ftrees
/nowhere                            404
```

Three public surfaces answering without a session, the portal turning a signed-out
visitor away and remembering where they were going, and a URL outside all four
reaching the application's own not-found. That is 0068's access model, observed
rather than asserted.

- [`…-marketing.png`](2026-08-19-framework-one-application-marketing.png) — `/`
- [`…-docs.png`](2026-08-19-framework-one-application-docs.png) — `/docs/getting-started/introduction`
- [`…-lessons.png`](2026-08-19-framework-one-application-lessons.png) — `/lessons`, the shell
- [`…-portal.png`](2026-08-19-framework-one-application-portal.png) — `/portal/sign-in`

No follow-up scheduled and no self-check-in armed.
