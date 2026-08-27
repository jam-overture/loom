# 0096. An anchor is a reserved key the runtime checks and a primitive places

**Status:** Accepted
**Date:** 2026-08-27
**Section:** §4b

## Context

A Loom page can hold a link to any document on the web except itself.

`Loom marketing` filed this on 26 August, from a front door that needed it. The
opening band answers a visitor's request, and the panel holding the full record
of that change sits roughly twelve hundred pixels further down the same page. The
band wanted one more control than it had — *read the whole record*, pointing at
the panel below it — and there was nothing to point at. What shipped instead was
a link back to the published front door replaying the same request, which is a
better destination for a *shareable* record and is not a substitute for "it is
below you, here it is".

The two halves of an in-page link are the address and the target, and only one of
them was missing.

**The address half already works.** `linkUrlSchema` allowlists schemes and parses
with `URL`, so `https://host/?ask=problem#see-it-happen` passes today without
complaint. Whether a tree may write the *bare* form, `#see-it-happen`, is the
open question on
[0069](0069-a-root-relative-path-is-a-destination-a-tree-may-name.md), proposed
on 19 August and still unresolved, and it is not this record's to settle.

**The target half did not exist.** No primitive in the library renders an `id`.
`loom.editable` spreads `data-loom-node`, which is identity for the renderer and
the portal rather than a fragment target, and nothing else emits one.

The finding's recommendation was an `anchor` prop on the band primitives —
`loom.section`, `loom.hero`, `loom.callout` — and named three things to decide
with it: whether it is validated as a fragment, whether two nodes may share one,
and whether a decorative copy strips it.

## Decision

**An anchor is `loom:anchor`, a reserved key on any node, checked by the runtime
and placed by the primitive as `loom.anchor`.** A node whose anchor is usable and
unclaimed receives an attribute bundle to spread onto its own root element,
beside the attributes that make it editable and the variables that make the root
themed — never on a wrapper the renderer emitted, for the reason
[0050](0050-the-runtimes-props-are-namespaced-and-the-root-mounts-the-theme.md)
and `editable.ts` both give.

The three questions the finding raised are answered as it expected, and the
reason they are answerable at all is what decided the key.

**It is validated, against a grammar narrower than an `id` attribute permits:**
lowercase letters and digits in words joined by single hyphens, at most 64
characters. The grammar is not about what the document accepts — since HTML5 an
`id` may be very nearly anything — it is about what survives the round trip from
the tree, through a URL somebody copies out of an address bar, and back to the
element. Capitals fail it because fragment matching is case-sensitive and a tree
that anchors `Pricing` while linking to `#pricing` scrolls nowhere, silently.
Spaces and non-ASCII fail it because they reach the browser percent-encoded and
half-work until something in the chain normalises one spelling and not the other.

**Two nodes may not share one. The first in document order keeps it**, and the
second is reported. Two elements with the same `id` is a document a browser
resolves by its own rule rather than by the tree's, and a link landing on
whichever of the two the parser preferred is worse than one band that cannot be
linked to.

**A decorative copy carries no anchor**, which
[0093](0093-a-decorative-copy-is-the-same-children-without-identity.md) already
required in advance: a copy is the same children with identity switched off, and
an anchor is identity. It is the same duplicate-`id` failure 0093 exists to
prevent, in its other spelling.

**A primitive receives the attributes or it receives nothing.** Every other seam
on the render context is careful to keep "the tree said nothing" apart from "the
tree said something and it was refused" — a form distinguishes them, a binding
distinguishes them. An anchor does not, because a primitive would do the same
thing with both: there is no way to render a refused `id`. The difference is
real, and it is in the diagnostics, where a fault with no behaviour belongs.

## Consequences

**Any primitive can be anchored, and none has to be changed to allow it.** The
finding's shape — a prop on three band primitives — would have made the
anchorable set a list somebody maintains, and a fourth primitive wanting one
would be a schema change in another lane. A reserved key means the primitives
lane adds one spread where it wants the attribute placed, and a primitive that
never does renders correctly and cannot be linked to.

**The runtime can see what a schema cannot.** A prop schema validates one node
at a time and could have caught the grammar; it could not have caught the
collision, because the collision is a fact about two nodes, and it could not have
stripped the copy, because the copy is a fact about the render. Both of those are
the whole reason this is not a prop.

**The anchor is emitted verbatim, so the tree names the fragment.** A prefix —
`loom-pricing` — would guarantee no collision with the host's own markup, which
the renderer cannot see and does not check. It was rejected because the fragment
is user-visible content that outlives the page in every link anybody shares, and
because a mangled slug means the tree cannot name its own destination: a model
writing the href would have to know the runtime's prefix. **The limit is real and
is stated rather than fixed** — the ledger covers one render of one tree, so a
tree that anchors `main` on a host page whose layout already has `id="main"`
produces a duplicate nothing here can notice.

**A change to an anchor is not yet a stake of its own.** Moving a form's
destination is
([0071](0071-moving-a-forms-destination-is-a-stake-of-its-own.md)), because it
sends a visitor's data somewhere new. Renaming an anchor breaks every inbound
link that was ever shared, which is a smaller harm of a similar kind, and the
runtime's analysis reports it today as an ordinary `configure` of a reserved key.
Left as it is deliberately: the seam has no consumer yet, and the cheap time to
decide is after one exists.

**Nothing about the address half changed**, and until 0069 is settled a tree
reaching its own anchor writes the absolute form, which has always worked.

## Alternatives considered

**An `anchor` prop on the band primitives**, as the finding recommended. Rejected
for the two things it structurally cannot do — see the collision and the copy,
above — and for making the anchorable set a maintained list in another lane.

**A prefixed `id`.** Rejected above: it fixes a collision the renderer cannot see
by breaking the naming the seam exists to provide.

**Deriving the anchor from the node id.** Every node already has a stable unique
identifier, and `#n_4f2a` is not a link anybody shares, does not survive being
rewritten, and says nothing about where it goes.

**A refusal handed to the primitive, shaped like a frame's.** Rejected because a
primitive can render a refused frame and cannot render a refused `id`. A shape
offering a choice nobody can act on invites one to be invented.

**Waiting for 0069.** The two halves are independent: the target half is useful
the moment it exists, because the absolute form of the address has always
parsed. Coupling them would have held a working seam behind an unresolved
architectural question.
