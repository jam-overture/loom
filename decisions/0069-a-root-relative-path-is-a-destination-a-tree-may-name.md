# 0069. A root-relative path is a destination a tree may name

**Status:** Proposed — **ARCHITECTURAL, needs review.** It contradicts a clause
of [0053](0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md),
which is `Accepted`. Nothing in this branch implements it; `src/primitives/url.ts`
is unchanged.
**Date:** 2026-08-19
**Section:** §4b

## Context

[0053](0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md) checks
every URL in the library against a scheme allowlist, and one clause of it reads:

> Relative URLs are refused by both. A tree is rendered by whoever holds it, at
> a path it does not know, so a relative destination means something different
> per deployment — the same objection
> [0049](0049-a-theme-is-three-ids-in-the-tree.md) raised to a page that is a
> function of deployment config.

That was written on 11 August, when the only trees in existence were demos whose
links all pointed at other people's sites. The marketing routine hit the other
case on 19 August and filed it: **`apps/marketing` has a header, a footer and
eight calls to action, and every one of them is internal.** `href: "/pricing"`
is not a value any primitive in this library can hold.

What the site does instead is resolve an origin per request — `LOOM_SITE_ORIGIN`,
else `VERCEL_URL`, else `http://localhost:3000` — and build absolute URLs from
it. It works, and it costs the property 0049 and 0050 exist to protect: **the
tree is now a function of route, theme *and deployment*.** Two deployments of one
site hold different trees, and a stored tree carries one deployment's hostname
into another's. 0053's own reasoning, applied honestly, indicts the workaround
its clause forced.

This run built `loom.nav`, `loom.footer`, `loom.link` and `loom.link-list` — four
primitives whose whole job is linking a site to itself — and every one of them
inherits the refusal.

## Decision

**`linkUrlSchema` and `mediaUrlSchema` accept a path beginning with a single
`/`, in addition to the schemes they already allow.**

```
/pricing            accepted — same origin, whatever that turns out to be
/docs/getting-started accepted
//evil.example.com  refused — scheme-relative, and it reaches another origin
../sibling          refused — depends on the current path, which no tree knows
pricing             refused — same
```

Three properties make this narrower than it sounds:

- **It refuses exactly as much as today.** The allowlist's job is to stop
  `javascript:` and friends. A root-relative path is not a scheme and cannot
  execute anything; there is no string beginning `/` that is a script URL.
- **`//host` stays refused, and that is the whole of the care needed.** A
  scheme-relative URL looks like a path and reaches another origin, so it is the
  one case where the cheap test — "starts with a slash" — gives the wrong answer.
  The rule is: begins with `/`, and does not begin with `//`.
- **A path-relative URL stays refused**, which keeps 0053's actual objection
  intact. `../sibling` means something different depending on the path the tree
  is rendered at, and a tree does not know its own path. A *root*-relative path
  does not have that problem: it means the same thing at every route of one
  deployment.

**What 0053 got right and this keeps.** A tree must not carry a deployment's
hostname. That is the objection, and a root-relative path is the shape that
honours it — it names a destination *within whatever origin serves this tree*,
which is the only self-reference a portable tree can make.

**What it got wrong.** It read "relative" as one category. Two of the three
kinds are deployment-dependent and one is not.

## Consequences

- **`apps/marketing`'s origin seam can be deleted** — one function and one test,
  by the filing routine's own account — and the site's tree becomes portable
  again. That is not this lane's to do, and the record notes it so whoever takes
  it knows the seam is the thing this unblocks.
- **A stored tree becomes portable across deployments again**, restoring 0050's
  property for the first surface that had to bend it.
- **A model can now propose a link to a page that does not exist.** `/pricign`
  passes the allowlist and 404s. That is true of `https://example.com/pricign`
  today, so it is not a new class of error — but internal links are the ones a
  model will guess at most, and it is worth saying that nothing here checks a
  route exists. Route existence is a host's knowledge, not the library's.
- **`mediaUrlSchema` gets the same treatment**, so a site can serve its own
  images. It is the same argument and splitting them would leave a page whose
  links are portable and whose pictures are not.

## Alternatives considered

**Leave 0053 as it stands and keep the origin seam.** It works today. Rejected
as the recommendation because the cost is the property the whole theme and tree
model is built on — a page being a function of the tree rather than of
deployment config — and it is paid by every site built in Loom, forever, to
avoid widening an allowlist by one shape that cannot execute anything.

**A `loom:origin` reserved prop on the root**, which the renderer prepends to
relative hrefs. Rejected: it makes the renderer a codec, which 0053's own
"predicate, never a codec" clause forbids, and it puts the hostname back in the
tree — one node higher up.

**A separate `internalUrlSchema` for the chrome primitives only.** Rejected:
`loom.action` and `loom.card` link internally as often as `loom.link` does, and
a library where half the primitives can point at your own site and half cannot
is a distinction no author would predict.

**Accept `//host` too, since it is technically same-scheme.** Rejected without
much thought. It reaches another origin while looking like a path, which is the
one genuinely confusing case, and nobody writing a tree by hand or by model
wants it.
