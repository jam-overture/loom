# 0094. A same-origin path is decided by resolving it, not by matching it

**Status:** Proposed — **ARCHITECTURAL, needs review.** It shares
[0069](0069-a-root-relative-path-is-a-destination-a-tree-may-name.md)'s
contradiction of a clause of
[0053](0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md), which is
`Accepted`, and it revises the *mechanism* 0069 proposed. 0069 is left `Proposed`
and is not superseded here: one decision is outstanding, not two, and it is the
maintainer's.
**Date:** 2026-08-27
**Section:** §4b

## Context

[0069](0069-a-root-relative-path-is-a-destination-a-tree-may-name.md) was written
on 19 August and makes the case in full: a Loom tree can point at another site
and cannot point at the page beside it, because 0053 refused every relative URL.
Its argument is not restated here. It has been `Proposed` and unreviewed for
eight days, and [0067](0067-the-four-surfaces-are-one-application.md) has since
made every link between marketing, docs, lessons and the portal an internal one.

This record exists because **0069's decision text, implemented literally, is
exploitable.** It states the rule as:

> The rule is: begins with `/`, and does not begin with `//`.

and asserts:

> **`//host` stays refused, and that is the whole of the care needed.**

It is not the whole of the care needed. Three values pass that rule and reach an
origin the author of the tree chose:

| value | 0069's rule | where a browser goes |
| --- | --- | --- |
| `/pricing` | accepted | the page's own origin ✓ |
| `//evil.example` | refused | `evil.example` ✓ |
| `/\evil.example` | **accepted** | `evil.example` ✗ |
| `/⇥/evil.example` | **accepted** | `evil.example` ✗ |
| `/⏎/evil.example` | **accepted** | `evil.example` ✗ |

The URL standard treats a backslash as a slash under a special scheme, and strips
tabs, newlines and carriage returns from a URL *before* it decides where the
authority begins. So all three of those are `//evil.example` by the time anything
resolves them, and the one case 0069 guarded is the only one of the four its
guard catches.

The values in that table are `href` props. Props in a Loom tree are AI-authored
([0009](0009-primitives-receive-props-in-a-bag.md)) and the renderer emits them
faithfully ([0008](0008-the-renderer-is-a-total-pure-projection.md)). This is the
same shape of mistake 0053 was written to prevent, arriving through the door 0069
proposed to open — and it would have shipped looking correct, because a test
suite written from 0069's own text would assert `//evil.example` is refused and
never think to try a backslash.

## Decision

**A destination is same-origin if resolving it says so.** The check is:

1. the value begins with `/`, and
2. resolving it against a probe origin lands back on that origin.

Everything else falls through to 0053's scheme allowlist, unchanged.

**The substance of this record is that the check resolves rather than matches.**
A hand-written pattern has to encode the backslash rule, the three stripped
control characters, and whatever the URL standard does next, and stay right as it
moves. Resolving delegates the question to the same parser that will answer it
again in the browser, so the two cannot disagree. That property is worth more
than the four cases in the table, because it also covers the fifth one nobody has
thought of.

The probe is `https://loom.invalid` — reserved by RFC 2606, resolving nowhere, so
a value that somehow escaped into a real request fails rather than reaching a
host somebody owns.

**What 0069 decided and this keeps unchanged:** root-relative paths are accepted
for both `linkUrlSchema` and `mediaUrlSchema`; document-relative paths
(`pricing`, `./pricing`, `../pricing`) stay refused, which is 0053's real
objection kept intact; nothing about the scheme allowlist moves.

**Two additions 0069 did not settle.**

- **A bare fragment — `#pricing` — is refused.** No primitive in the library
  emits an id for a fragment to reach, so it would validate as a link to nowhere.
  Worth revisiting when something is anchorable; it is a smaller question than
  this one and should not ride along with it.
- **An empty string is refused** rather than read as "this page".

**Validation stays a predicate and never a codec** (0053). An accepted path is
handed back exactly as written; the probe origin never appears in the output.

## Consequences

**Everything in this section is conditional on the decision being accepted.**

- The eight URL-bearing primitives 0069 lists can hold a site's own links,
  without a line changing in any of them, and `mediaUrlSchema`'s consumers can
  serve `/logo.svg` from the application's own `public/`.
- **`(marketing)/_lib/site.ts` can be deleted by its own lane** — the per-request
  origin seam, and with it the bend in the property that a page is a function of
  the tree rather than of deployment config. Filed as a finding; it is another
  lane's file and another lane's call when to take it.
- `loom.embed`'s `src` may be a path, which is a same-origin frame. The origin
  allowlist proposed on #165 is not consulted by a path, and that PR's own record
  treats a same-origin frame as permitted-and-reported rather than refused, so
  the two agree. Neither has landed on the other's branch; whichever merges
  second should confirm it.
- **A model can propose a link to a page that does not exist.** `/pricign`
  passes and 404s. That is already true of `https://example.com/pricign`, so it
  is not a new class of error, but internal links are the ones a model guesses at
  most. Nothing here checks that a route exists; route existence is a host's
  knowledge, not the library's.
- One assertion in `library.test.ts` — the primitives lane's file — asserted the
  old behaviour. It is the only line of that lane's code this touches.

## Alternatives considered

**0069 as written: begin with `/`, not with `//`.** Rejected, and the table above
is the entire reason. It is worth recording that this change was going to be
exactly that until the four values were run through the parser rather than
reasoned about.

**Strip the dangerous characters, then match.** Turns the validator into a codec,
which 0053 forbids and for a good reason: what is displayed would stop matching
what the tree says, and the tree would hold one string while the page held
another.

**Refuse any value containing a backslash or a control character, then match.**
Closes the three known cases and none of the unknown ones, and it refuses paths
that are merely odd rather than dangerous. It is the pattern-matching answer
again with a longer pattern.

**Leave it refused and keep the origin seam**, which is 0069's first alternative
and still the honest fallback if the contradiction with 0053 is not one the
maintainer wants to resolve in this direction. The cost is stated there: every
Loom site pays it, forever.

**Resolve against the real request origin instead of a probe.** Would let the
check answer "same origin as *this* deployment", which sounds stronger and is
not: it makes validation a function of deployment config, which is the property
this whole line of records exists to protect. The probe is deliberately a
nowhere.
