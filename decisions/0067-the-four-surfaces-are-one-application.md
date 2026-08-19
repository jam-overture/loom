# 0067. The four surfaces are one application, and a route group is a lane

**Status:** Accepted
**Date:** 2026-08-18
**Section:** §4c, §4d, §5

## Context

Loom is growing four public surfaces: a marketing site (§4d), a documentation
site (§4c), the lessons course, and the portal (§5). Two exist as sibling
applications — `apps/portal` and `apps/docs`, the latter landing in #94 — and
the plan had the remaining two arriving the same way, each with its own
deployment.

Three things make that wrong, and the maintainer settled it on 18 August:
**access to the portal is through the marketing site.**

- **A visitor moves between them without noticing they are different things.**
  Read the marketing page, follow it into the docs, try something, open the
  portal. Separate deployments make that a set of links between products.
- **They share a session.** Signing in on the marketing site and arriving
  signed in at the portal is the behaviour people expect from
  `supabase.com` → `supabase.com/dashboard`. Across deployments it is
  cross-domain auth, which is work that buys nothing.
- **They share a design system**, and the strongest version of that claim is
  that three of the four are *built in Loom* — composed from the same
  primitives the framework registers. Four codebases means four drifting
  interpretations of one visual language.

The timing is what makes this decisive rather than merely tidy. Two of the four
surfaces do not exist yet, and `apps/docs` is one day old. Merging later means
migrating four built things; deciding now means two are born in the right place
and the third has barely any weight to move.

## Decision

**One Next.js application, `apps/loom`, with one route group per surface.**

```
apps/loom/app/
├── (marketing)/     public
├── (docs)/          public
├── (lessons)/       public
└── (portal)/        behind sign-in
```

`apps/portal` is retired into `(portal)` and `apps/docs` into `(docs)`.
Marketing, docs and lessons are public; the portal keeps the sign-in it has,
enforced in middleware at the route-group boundary rather than per page.

**A route group is a routine's lane.** Each of the four routines owns exactly
one and edits no other. This preserves the property that made separate
directories work — a PR touching one surface is reviewable on its own — without
paying for four deployments to get it.

**The shared vocabulary is `src/primitives/`, not a components directory.**
Marketing, docs and lessons compose registered Loom primitives. They are not
permitted a parallel component library, because a second design system is the
thing this record exists to prevent, and because those three surfaces being
built in Loom is the proof the project rests on. A primitive that is missing is
a finding for `Loom primitives`, not a local component.

**The portal is the exception, and deliberately.** It is a tool for reviewing
Loom trees rather than content built out of them, so it keeps app-level
components of its own. It is still bound to the same visual language, and it
still consumes the framework only through published entry points
([0018](0018-the-portal-is-a-consumer-not-an-insider.md)).

## Consequences

- One deployment, one domain, one session. The portal is reached from the
  marketing site rather than linked to.
- A broken build blocks all four surfaces. This is the real cost, and it is
  bounded by `pnpm verify` staying green as the merge gate it already is.
- The lanes move from directory-per-application to route-group-per-surface.
  `docs/routines.md` holds the table.
- Three surfaces gain a constraint they did not have: they may only render what
  the registry can express. That is a feature — it is the same constraint the
  framework asks of its users, and it means the marketing site cannot claim
  something the framework cannot do.
- The lessons course stops being markdown files. It was asked for as something
  hosted and interactive on 2026-08-04 and never became that; a route group is
  what makes it possible.

## Alternatives considered

**Four sibling applications, as originally planned.** Rejected for the three
reasons above. Its one real advantage — a marketing copy change cannot break
the portal — is largely recovered by preview deployments and a green-verify
merge gate.

**One application, one routine.** Rejected: it recreates the problem that
splitting `Loom primitives` out of `Loom daily build` solved on 16 August. Four
surfaces at four different stages of maturity are four objectives, and a single
routine covering them would starve whichever one it found least interesting.

**A shared `components/ui` directory owned jointly.** Rejected: four routines
editing one directory is the collision the lane system exists to prevent, and
there is no reviewable way to arbitrate. Making `src/primitives/` the shared
layer gives the shared vocabulary a single owner that already exists.

**Keeping the portal a separate deployment for its different auth posture.**
Rejected: middleware scoped to a route group handles this, and the maintainer's
requirement that the portal is reached *through* the marketing site is a
statement about one product rather than two that link to each other.
