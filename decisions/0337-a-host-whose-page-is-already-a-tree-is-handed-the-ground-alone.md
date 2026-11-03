# 0337. A host whose page is already a tree is handed the ground alone

**Status:** Accepted
**Date:** 2026-11-02
**Section:** §4b

## Context

[0334](0334-the-browsers-own-furniture-is-outside-the-tree-so-a-host-is-handed-a-root-rule-for-its-document.md)
settled where a tree ends. The scrollbar beside the document, the canvas past
the end of a short page and an unstyled form control belong to the document
element, which no tree ever contains — so the root primitive must not declare
`color-scheme`, and a host is handed `themeDocumentCss(theme)` for its own
`<html>` instead.

That record was written for **one** host: this repository's application shell,
which draws its own frame, composes no primitives and mounts nothing. For it,
the rule's two halves are both load-bearing. The docblock said so in a sentence
that has turned out to be about that host rather than about hosts — *"the
variables are the half a host cannot write for itself, so withholding the rule
over it would cost a page its whole palette."*

**There is a second host and it is the opposite shape.** A Loom-built surface is
a tree to its edges: `(marketing)` mounts every `--loom-*` on the root primitive
already, so the variables in the document rule are read by nothing inside the
page. They are a second copy of a mounting that has already happened, in the one
place no primitive looks. What that page needs from the document is the three
declarations no tree can reach.

`Loom marketing` met this on 2 November, measured the duplicate at **1,976
bytes** on `/?theme=bold`, and filed the shape rather than acting on it — a
tenth of a percent of that page, and a hand-written three-declaration rule in a
surface would be a copy of a decision the palette owns kept where the palette
cannot reach it, which is the hazard
[0197](0197-a-host-may-ask-which-way-round-a-palette-is-and-a-frame-standing-in-for-the-page-is-handed-both-ends.md) and
0334 both exist to refuse. The arithmetic said *do not trim it by hand* and the
filing said *the half should be published*. Both are right.

## Decision

**`themeGroundCss(theme)` is published beside `themeDocumentCss(theme, ramp)`,
returning the same `:root` rule carrying the ground alone.** The two serialise
through one private helper, so neither is a second source for the rule's shape.

**A second export rather than a flag on the first**, and the reason is in the
inputs rather than in taste. `ramp` decides how the variables are written and
has nothing to say about the ground. A flag would leave a parameter that is read
on one setting and ignored on the other, and a caller passing both would have
written something that cannot be true. Two functions, neither with an argument
it disregards.

**`themeGroundCss` returns `undefined` when the palette has no ground**, which
mirrors `themeGround` exactly and for its reason: a palette whose body-copy pair
cannot be read gets no ground rather than a guessed one. `themeDocumentCss`
still returns its rule in that case, because the variables are unaffected and
are the half that host cannot write for itself. Here there is no other half, so
the rule would be an empty block — and *nothing to say* is a state the caller
answers rather than renders.

**Which half a host is handed follows from whether it has a tree**, and that is
the sentence 0334 was one host short of being able to write. A host that mounts
nothing takes the whole rule. A host whose page is a tree takes the ground.

## Consequences

The framework half is shipped and **one line in `(marketing)` applies it** —
`DocumentTheme` swaps `themeDocumentCss` for `themeGroundCss` and handles the
`undefined` it already handles for an unthemed page. That line is `Loom
marketing`'s and is filed, not taken: the finding was filed from that lane and
this record answers it.

`(docs)` and `(lessons)` are the same shape and have the same line available
whenever either lane is next in the file. The application shell does not change:
it has no tree, so `themeDocumentCss` remains its function, and
`SHELL_ROOT_CSS` is untouched.

0334 is **not** superseded. Nothing it decided has changed — the boundary is
where it put it, the root primitive still declares no `color-scheme`, and the
host still gets a rule rather than a guess. This adds the half it did not need
to name while it had one caller. The sentence in `themeDocumentCss`'s docblock
that generalised from that caller now says which host it is about.

## Alternatives considered

**A flag or an option bag on `themeDocumentCss`.** Rejected above on the
argument the finding itself reached for — it called the shape *a flag rather
than a new decision* — and the thing that decides against it is `ramp`. An
option that silently voids an existing parameter is a worse published surface
than two functions, and the call sites read better: `themeGroundCss(theme)` says
what it returns.

**Let each surface write the three declarations.** This is what was happening by
omission and is the hazard 0197 names. A re-themed palette would move and three
hand-written rules in three route groups would not, with nothing anywhere able
to see it.

**A third export for the variables alone.** No caller wants it. A host with no
tree wants the ground too, because it has no root primitive to paint the canvas.
Building it would be an export with no reader, which is the dead code this
repository refuses.

**Leave it filed.** Defensible on the arithmetic alone — 0.14% of one page — and
rejected because the cost is not what makes it worth doing. The duplicate is a
seam that reads wrong: a surface asking for a rule two-thirds of which it must
ignore invites the next lane to trim it by hand, which is the failure 0197
exists to prevent. Publishing the half closes the invitation.
