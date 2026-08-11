# 0053. A URL in the tree is checked against a scheme allowlist

**Status:** Accepted
**Date:** 2026-08-11
**Section:** §4b

## Context

Two of the first ten ported primitives take a URL: `loom.action` takes an
`href`, `loom.media` takes a `src`. The obvious schema for both is
`z.string().url()`, which is what the port used first.

A test written to assert that a bad destination is refused found that
`javascript:alert(1)` **passes** `z.string().url()`. It is a well-formed URL, so
the check is doing what it says; it is just not answering the question the
primitive needs answered.

That matters more here than in an ordinary component library. Props in a Loom
tree are AI-authored ([0009](0009-primitives-receive-props-in-a-bag.md)) and
arrive from storage, and the renderer is a faithful projection
([0008](0008-the-renderer-is-a-total-pure-projection.md)) — it emits what the
tree says. So an `href` schema that accepts any parseable URL accepts script
execution, written by a model, from the one part of the system whose entire
purpose is to bound what a model may produce. The Gate cannot help: a
`configure` setting a URL is a small, low-stakes, perfectly reversible change by
every measure it has.

## Decision

**A URL prop in the primitive library is validated against an allowlist of
schemes, not merely parsed.**

- `linkUrlSchema` — `http:`, `https:`, `mailto:`, `tel:`. Where a call to action
  may point. `mailto:` and `tel:` are ordinary CTAs on a real page and excluding
  them would push authors toward a raw anchor.
- `mediaUrlSchema` — `http:`, `https:`. Narrower on purpose: `data:` is excluded
  because an inline SVG document is a script host, and because the bytes would
  sit in the tree and in every delta that touched it.
- Relative URLs are refused by both. A tree is rendered by whoever holds it, at
  a path it does not know, so a relative destination means something different
  per deployment — the same objection [0049](0049-a-theme-is-three-ids-in-the-tree.md)
  raised to a page that is a function of deployment config.

**A refused URL invalidates the node, and the node is omitted with a
diagnostic** — the existing behaviour for invalid props
([0011](0011-a-primitive-declares-its-props-and-the-seam-enforces-them.md)). It
is *not* rewritten into something safe. Validation here is a predicate and never
a codec, so the page stays a function of the tree rather than of what the
sanitiser decided the tree meant.

## Consequences

- Every URL-bearing primitive in the remaining sixty uses one of these two
  schemas rather than reaching for `.url()`. Ported blocks with links —
  `social-links`, `products`, `press`, `podcast-episodes` — inherit the check
  without deciding anything.
- The allowlist is in the primitive library, not in the tree schema. A host
  building its own primitives can import these or write its own; nothing in the
  runtime forces a URL to be safe, because nothing in the runtime knows a string
  is a URL.
- An AI proposal that names a `javascript:` destination now fails at the render
  seam with an `invalid-props` diagnostic, which §6 records. That makes the
  attempt visible rather than merely blocked.

## Alternatives considered

**Sanitise at render time — drop an unsafe `href` and render the anchor
without it.** Renders more of the page. Rejected: it makes what is displayed
differ from what the tree says, which every other part of the render seam
refuses to do, and it hides the attempt instead of reporting it.

**Escalate it to the Gate as a stakes factor.** "This delta introduces a
`javascript:` URL" could raise stakes and force review. Rejected as the primary
defence: the Gate weighs changes a human may then approve, and no reviewer
should be offered the choice. It remains worth adding as a factor later, on top
of the refusal rather than instead of it.

**Put the check in the tree schema, so no tree can hold an unsafe URL
anywhere.** The tree does not know which strings are URLs, and teaching it would
mean the schema knowing about primitives — the inversion §4 exists to prevent.
