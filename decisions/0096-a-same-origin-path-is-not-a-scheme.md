# 0096. A same-origin path is not a scheme

**Status:** Proposed — **ARCHITECTURAL, needs review.** It contradicts a clause
of [0053](0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md),
which is `Accepted`. Nothing in this record has been built. 0053 is untouched
and is still the behaviour on `main`.
**Date:** 2026-08-28
**Section:** §4b

## Context

`linkUrlSchema` and `mediaUrlSchema` allowlist schemes by parsing with
`new URL(value)` and refusing anything that does not parse — which is every
relative URL. So `href: "/how-it-works"` is not a value a `loom.action`,
`loom.card`, `loom.article`, `loom.logo`, `loom.person`, `loom.product`,
`loom.tier` or `loom.link` can hold. **A tree can point at another site and
cannot point at the page beside it.**

0053 decided that deliberately, and gave a reason:

> Relative URLs are refused by both. A tree is rendered by whoever holds it, at
> a path it does not know, so a relative destination means something different
> per deployment — the same objection 0049 raised to a page that is a function
> of deployment config.

That reason is sound and it is not the same reason as the rest of 0053. The
allowlist exists to refuse `javascript:`; the relative clause is about
deployment-independence. The two got decided together and only one of them is
about safety.

**What it has cost so far.** `(marketing)` resolves an origin per request —
`LOOM_SITE_ORIGIN`, else `VERCEL_URL`, else `http://localhost:3000` — and builds
absolute URLs from it (`_lib/site.ts`). It works, including on previews, and it
buys deployment-independence by giving it up: the tree is now a function of
route, theme **and deployment**, so two deployments of the same site hold
different trees and a stored tree carries one deployment's hostname into
another's. That is precisely the property 0050 protects, bent in the first place
that needed it. Filed as an open finding on 19 August; nine days open, because
the change lands in `src/primitives/url.ts` and the finding is owned by the lane
that does not own that directory.

**What is new since.** Two things, both in `src/submit/`.

`submissionTargetSchema` has accepted root-relative paths since it was written,
and says why in a comment: the check it makes is about *who authored the string*
— a host, not a model — rather than about relative URLs being unsafe. It also
records the objection that actually bites, and it is narrower than 0053's:

> A relative path with no leading `/` is refused […] it resolves against
> whatever route the form happens to be rendered on, which is not a decision
> anybody made.

That is an argument against **bare-relative** paths (`contact`, `../x`), not
against **root-relative** ones (`/contact`). A root-relative path resolves to
the same place from every route on the origin. 0053's clause does not
distinguish the two, and the distinction is the whole question.

Second, that schema had a hole, found and fixed in this pull request: it tested
`value.startsWith("/")`, which accepts `//evil.example` (scheme-relative) and
`/\evil.example` (the backslash spelling browsers normalise to it). Both begin
with a slash, both look like paths, and both resolve to another origin —
`new URL("/\\evil.example", "https://site.example")` is `https://evil.example/`.

So the predicate this proposal needs is now written down and tested rather than
assumed:

```ts
value.startsWith("/") && value[1] !== "/" && value[1] !== "\\"
```

## Decision

**Proposed, and not built.** `linkUrlSchema` and `mediaUrlSchema` accept a
same-origin path — a value beginning `/` whose second character is neither `/`
nor `\` — in addition to the schemes they allow today. Everything else is
refused exactly as it is now.

- It refuses **exactly as much** as today. A same-origin path has no scheme, so
  it cannot be `javascript:`, `data:` or anything else the allowlist exists to
  stop. The set of *schemes* accepted does not change.
- `//host` and `/\host` are refused, which is the one case where "starts with a
  slash" and "stays on this origin" come apart.
- Bare-relative paths (`contact`, `../x`) stay refused, on the submission
  seam's reasoning: they resolve against a route nobody chose.
- 0053 is **amended, not superseded**, if this is accepted: everything it
  decided about schemes stands, and only the relative clause narrows to
  bare-relative. The precedent for amending rather than superseding is
  0096-as-carried-by-#181, which is itself awaiting merge — if both land, this
  record follows whatever numbering that one settles into.

## Consequences

- `(marketing)` deletes `siteOrigin` and `internalHref`, and its trees stop
  being a function of deployment. `LOOM_SITE_ORIGIN` and the `VERCEL_URL`
  fallback go with them. The finding of 19 August closes.
- A stored tree becomes portable again in the case that matters: a site's
  internal links survive being rendered by another deployment, which is what
  0050 asks for and what the current workaround cannot give.
- `(docs)`, `(lessons)` and `(portal)` never have to write the same workaround.
  None of them has yet — the duplication this avoids is prospective, not
  observed, and that is stated plainly rather than counted as a benefit already
  earned.
- **A host's tree can now point at a path on the host's own origin.** That is
  the intended gain and also the thing to weigh: a model authoring a tree can
  name an internal path that does not exist. It produces a 404 on the host's own
  site rather than a navigation off it, and no scheme it could not already name.
- The absolute form keeps working, so nothing built against today's behaviour
  breaks. This widens what is accepted and narrows nothing.

## Alternatives considered

**Leave it, and let each surface resolve an origin.** What happens today.
Rejected as the standing answer, not as a stopgap: it works, and its cost is
that every surface pays it separately and every stored tree carries a hostname
that was true of one deployment. It is the right thing to keep doing until this
is decided, which is why nothing here is built.

**Put the origin in the tree's root as a reserved prop**, so a tree carries its
own origin the way it carries its theme (0049). Rejected: it makes every tree
deployment-stamped by construction rather than only the ones that link
internally, and it is a schema change to solve a props problem.

**Resolve the origin at render time** — keep `/how-it-works` out of the tree and
have the render seam join it to an origin it is configured with. Rejected: the
renderer is a total pure projection (0008), and giving it a configured value
that changes what a node points at is exactly the filtering 0008 refuses. It
would also make the same tree render differently under two renderers, which is
the property 0053 was protecting, moved rather than removed.

**Allow bare-relative paths too**, so `href: "contact"` works. Rejected on the
submission seam's reasoning: the destination depends on the route the node
happens to be rendered at, which is a decision nobody made and which a model
cannot reason about.

**Sanitise — rewrite a relative URL into an absolute one at validation.**
Rejected for 0053's own reason, which is unchanged and applies with full force:
validation here is a predicate and never a codec, so the page stays a function
of the tree rather than of what the sanitiser decided the tree meant.
