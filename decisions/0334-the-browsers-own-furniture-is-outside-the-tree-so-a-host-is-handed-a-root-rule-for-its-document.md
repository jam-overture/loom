# 0334. The browser's own furniture is outside the tree, so a host is handed a `:root` rule for its document

**Status:** Accepted
**Date:** 2026-11-01
**Section:** §4b

> **Renumbered on 2026-11-01**, from 0333, when `main` was merged into the
> branch that carries it (#745). `main` had meanwhile accepted a different 0333
> — *a deployment's conversions are a third order, ranked on the loss between
> the two ends* (#746) — and two records sharing a number is fatal (0097). This
> record was written on 1 November and nothing in it changed but its number;
> the references on this branch were updated with it.

## Context

`Loom marketing` filed this on 8 October, having swept a production build of
`/?theme=bold`:

```
color-scheme in the served document:            0
color-scheme in the marketing stylesheet chunk: 0
```

`bold`'s canvas is `#0a0a0a`. The page is black and the browser is not told so,
so the scrollbar beside the document, the canvas painted past the end of a short
page and every form control nobody styled stay on the light default.

[0197](0197-a-host-may-ask-which-way-round-a-palette-is-and-a-frame-standing-in-for-the-page-is-handed-both-ends.md)
had already computed the answer. `themeGround` returns `backgroundColor`,
`color` and `colorScheme`, and `colorScheme` is correct on all twenty-one
registered palettes. **Nothing in a rendered Loom page applied it.**

The finding named two candidate homes and said neither was its lane's to pick
between, because the choice is a question about where the boundary of a tree is:

> `color-scheme` is inherited, so setting it on the tree's root would reach
> every primitive below and would **not** reach the canvas the browser paints
> outside the root element or the scrollbar it draws beside it. Whether the root
> primitive declaring it is enough, or whether a host has to be handed something
> for its own `<html>` the way `themeGround` hands it a ground for its own
> frame, is a question about where the boundary of a tree is.

## Decision

**A tree ends at the element the root primitive renders, and the browser's own
furniture is outside it.** Three things a reader sees are not in any tree: the
scrollbar the browser draws beside the document, the canvas it paints past the
end of a short page, and the rendering it gives an unstyled form control. They
belong to the document element, and no tree ever contains the document — the
root primitive is an element inside a `<body>` some layout rendered.

So the root primitive does **not** declare `color-scheme`. That is not a matter
of taste: it cannot reach the surface the declaration is for. Putting it there
would reach every primitive below it, which needed it least, and none of the
three.

A host is handed the rule for its own document instead.
`themeDocumentCss(theme, ramp?)` returns the `:root` rule a host puts in a
`<style>` — every variable `themeStyle` mounts, then the ground. `:root` **is**
the document element, which is what makes the declarations good.

Three properties of the shape, each of which was the alternative to something
worse:

- **A CSS rule, not a style object.** The document element is not an element a
  page may render. A page that renders its own `<html>` gets it nested inside
  the real one, and the variables reach the page only through the HTML parser's
  error recovery, which merges a stray `<html>`'s attributes onto the real
  element. It happens to work, and no test can see that it only happens to:
  React hoists a rendered `<html>`'s attributes onto the document element under
  jsdom, so a suite sees the outcome a browser arrives at by accident. A `:root`
  rule is true where it is written.
- **The ground may be absent and the rule is still returned.** A palette whose
  body-copy pair cannot be read gets no ground rather than a guessed one, and
  `ThemeGround` already says what follows — whatever `color-scheme` the host's
  own stylesheet sets stands. The variables are unaffected by that and are the
  half a host cannot write for itself, so withholding the rule over it would
  cost a page its whole palette to avoid mis-stating one declaration of it.
- **Nothing is restated.** Both halves are derived from the one resolved theme
  by the two functions a surface already uses, so only the serialising is this
  function's own and a re-theme has no second source of truth to miss.

## Consequences

The three public surfaces each take one line — the rule in a `<style>` on their
own root layout — and each decides for itself when, because each resolves its
palette differently and `(marketing)` resolves it per request from the address.
That half is filed for them and is not this record.

The application shell had written the rule by hand and is the reason the shape
was known: it is `SHELL_ROOT_CSS`, and it now asks for the rule instead of
composing one. The output is byte-identical, which was checked rather than
assumed.

`ThemeGround` gaining a fourth declaration now reaches every host that mounts a
document rule, with nothing to update anywhere. That is the half of this worth
most: the previous arrangement had one lane holding a private copy of a decision
the palette owns, which is the mistake `themeGround` itself was written to end
and which cost a 1.10:1 contrast reading the first time.

What this does **not** do is apply anything to a page that does not ask. A host
that mounts no document rule renders exactly as it did.

## Alternatives considered

**The root primitive declares `color-scheme`.** The other candidate the finding
named, and the one that looks like a one-line fix. Rejected because it is wrong
rather than insufficient: `color-scheme` on an element inside `<body>` governs
that element's subtree and leaves the document's own canvas and scrollbar on the
default. It would have closed the finding, passed every test, and fixed none of
the three things that were broken.

**A stylesheet constant per surface.** What `(docs)` and `(demo)` do today, and
what the frame that cost 1.10:1 did. It is correct for exactly as long as the
surface wears the palette the constant was written for, and the failure when it
stops is silent in both directions — nothing errors, and no test in either place
can see a stylesheet holding a copy of a decision the tree owns.

**Returning a style object for the host to apply to `<html>`.** Symmetric with
`themeGround`, and unusable: the host cannot reach its document element from
inside the page, which is the whole reason the shell discovered this.

**Extending `themeGround` to carry the variables too.** Rejected as a change in
meaning to a published function — a ground is what a *frame* paints when it
stands in for the page, and a document rule is a different question with a
different answer when the palette's pair cannot be read.
