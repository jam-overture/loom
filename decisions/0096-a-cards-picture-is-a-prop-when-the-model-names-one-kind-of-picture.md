# 0096. A card's picture is a prop when the model names one kind of picture, and a region when it does not

**Status:** Accepted
**Date:** 2026-08-30
**Section:** §4b

## Context

Nearly every card in this library carries a picture, and the library has been
answering the same question about it two ways without a rule — which is exactly
the position [0094](0094-a-cards-prose-is-a-child-when-the-card-has-a-flow.md)
found the same cards in about their *prose* four days earlier.

- `loom.article` and `loom.product` hold theirs as an **`image` prop**, a
  `mediaUrlSchema` URL the card renders as an `<img>` cropped to fill a framed
  box.
- `loom.credential` holds its as a **`mark` region**, a slot the card places at
  its leading edge, into which an author puts a `loom.logo`, a `loom.avatar`,
  a `loom.icon` or a `loom.media`.

Both were argued at the time and both arguments were good.
`loom.credential`'s is the stronger-looking of the two and it is written out in
that file: Hermes holds the same field three different ways — `badge` on a
certification, `logo` on an affiliation, `image` on a tool — and every one of
them is a bare URL, so a prop could express exactly one of the four renderings
the content actually wants. `loom.before-after` reached the same place for the
same reason.

Read only that argument and the conclusion generalises to every card in the
library, and it is wrong: a `loom.product` whose picture became a region would
buy one node per product to say the one thing an `image` prop already says.

`loom.book` and `loom.listing` forced the question, because they are the two
cards where the temptation is strongest and the answer is *prop* on both. A
book cover is the most picture-like field in the whole port — portrait, framed,
the thing the eye lands on first — and a slot for it would have been defensible
on the "a picture should be a `loom.media` with its own alt text" reading.
Three more card pairs are behind them.

The cost of leaving it is the cost 0094 counted, unchanged: a picture held as a
prop and a picture held as a node are different trees, different deltas and
different attribution, and changing the answer after a tree ships means
rewriting every instance of it.

## Decision

**Ask how many kinds of picture the content model names. One kind is a prop;
several are a region.**

- **One kind** — every record of this type wants the same rendering of the same
  sort of image, and the only thing that varies between records is which file.
  A book cover is a photograph of the front of a book. A property listing's
  photograph is a photograph of a property. A product shot is a product shot.
  The card owns the frame, the ratio and the crop, and the tree supplies a URL:
  a `mediaUrlSchema` **prop**.
- **Several kinds** — the port has to reconcile fields that are honestly
  different things, or one field whose real content is sometimes a wordmark,
  sometimes a face, sometimes a glyph, sometimes a photograph. No prop can
  express that, because a URL carries no answer to *what is this and how should
  it be drawn*. A **slot** ([0051](0051-a-slot-is-a-region-the-primitive-places.md)),
  into which whichever leaf is right goes as a node with its own props.

The test is about the **content model**, not about the picture's importance,
its size, or how much of the card it occupies. A book cover is two-thirds of
the cell and is still a prop; a credential's mark is a 96px square and is still
a region.

**A prop is the default, and the region is what has to be argued for.** That is
the asymmetry the granularity doc's bound puts here: every region costs a node
in the projection, in the grammar budget and in every review of the tree, and
buys nothing at all when there is only one thing that node could ever be.

## Consequences

- **The three shipped answers were already right, and now they are right for a
  stated reason.** `loom.article` and `loom.product` name one kind of picture;
  `loom.credential` reconciles three fields across four renderings. Nothing
  changes; the argument stops being made from scratch in each file.
- **The rule is checkable rather than felt**, and checkable from Hermes rather
  than from the markup: *how many fields does the port collapse into this
  picture, and can their contents honestly be drawn more than one way?* It is
  asked before the markup is written, and the answer is visible in the
  registry — a card's `slots` list either contains a picture region or does not.
- **It composes with 0094 rather than competing with it.** 0094 asks where a
  card's *sentence* lives and answers from the card's flow; this asks where its
  *picture* lives and answers from the content model's variety. A card can hold
  its prose as a node and its picture as a prop, which both new cards do.
- **A missing picture is the primitive's problem either way.** A prop makes it
  the primitive's problem by construction, which is how `loom.book` came to draw
  a jacket rather than leave a hole in the shelf, and how `loom.avatar` came to
  draw a monogram. A region leaves the hole to the author, which is the honest
  behaviour when the card cannot know what was meant to be there.
- **A card can gain a kind later, and that is a migration**, at the same cost
  0094 named. If a future `loom.book` had to show a wordmark for a publisher
  beside the cover, that is a second region rather than a widened prop, and the
  stored trees are untouched.

## Alternatives considered

**Always a region.** Consistent, and it is what `loom.credential`'s argument
says if read without the granularity doc's bound beside it. Rejected because it
spends a node per card on a choice nobody has: a shelf of thirty books becomes
sixty nodes so that each of them can say `loom.media` with the ratio the card
was going to impose anyway.

**Always a prop.** Also consistent, and cheaper in nodes. Rejected on the
reachability argument, which is the one the granularity doc says is not
recoverable: a credential whose mark is a URL prop can never show a monogram
for a person, a glyph for an award that never had a picture, or a wordmark that
greys back until it is pointed at — by anyone, ever, without a developer
shipping three more props and an enum to pick between them.

**A prop plus a `pictureKind` enum** — `image` alongside
`kind: "photo" | "logo" | "glyph"`. Rejected as the failure
`docs/primitive-granularity.md` names by name: it enumerates the renderings
somebody predicted, the fourth one is unreachable forever, and the leaves that
would draw those renderings are already registered primitives with props of
their own that the enum could not carry.

**Decide per card, and write the argument in the file.** What the library was
doing, and it is defensible — all three existing calls are correct. Rejected for
0094's reason: it does not scale to the card pairs still unbuilt, each of which
would re-derive it and some of which would derive it differently. The same
reasoning applied three times is a rule that has not been written down yet.
