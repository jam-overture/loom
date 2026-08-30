# The Hermes port map

Hermes has **70 blocks over 54 shapes**. This is the ledger of what each one
becomes in Loom, so a run picks up work without re-deciding the same seventy
questions, and so the number that is left is a fact rather than a feeling.

It is a working document. A row changes when a run ports it or finds the
verdict wrong; the reasoning belongs in that run's report and the decision
records, not here.

## The three verdicts

Applying [0052](../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)
and [`primitive-granularity.md`](primitive-granularity.md) to a Hermes block
gives one of three answers, and **the first one is the surprise**:

**Composition — no new primitive.** The block is a heading, a sentence and a
button, or an image beside some words. Hermes had to register it because its
composition model is a flat `warp.blocks` list: a block was the only unit, so
"title + description + button" had to *be* a block. Loom nests, so it is a
`loom.section` holding a `loom.heading`, a `loom.prose` and a `loom.action` —
already reachable, already rearrangeable, and it needs nothing built. Roughly a
fifth of Hermes is this. **Building these as primitives would be the exact
mistake the granularity doc names**: a `loom.cta` with `title`, `desc`,
`btnText` and `btnUrl` is four props impersonating four nodes, and "move the
button above the description" would be unreachable forever.

These become **starting compositions** ([0057](../decisions/0057-a-preset-is-a-deterministic-interpreter.md))
when convenience demands it — one `insert` carrying the whole subtree — never a
registered primitive.

**Pair — a container and a child.** The block has an `items` list of a shape.
The list becomes child nodes and the container becomes a primitive named by
[0054](../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md).
This is most of Hermes.

**Atomic — one primitive with props.** Indivisible behaviour: something that
measures itself, animates continuously, or embeds a third party. The
granularity doc's first exception.

## What collapses

The port is much smaller than 70 because **Hermes blocks are not 70 content
models**. They are perhaps 25, wearing different words for different audiences —
which is right for a product whose users pick "Coaching packages" rather than
"a grid of priced offerings", and wrong for a registry a model chooses from.

`loom.milestone-list` / `loom.milestone` is the clearest case and the one
already built: `timeline`, `journey`, `roadmap`, `changelog`, `process-steps`,
`course-modules` and `event-agenda` are **one** content model — a short label, a
title, a sentence, down a rule. Seven blocks, one pair, because a roadmap is a
timeline whose markers are statuses.

Collapsing is not free and the limit is real: when two blocks want *different
markup* rather than different words, they are two primitives. `loom.tier` and
`loom.offering` will both be "a name, a price and a button" and will still
differ, because a pricing table compares plans in one row and an offering
stands alone.

## The ledger

**Done — 50 blocks, 72 primitives.**

| Hermes block | Becomes | Verdict |
| --- | --- | --- |
| `feature-grid` | `loom.feature-grid` / `loom.feature` | pair ✅ |
| `stats` | `loom.stat-grid` / `loom.stat` | pair ✅ |
| `pricing-tiers` | `loom.tier-table` / `loom.tier` (+ `loom.perk-list`) | pair ✅ |
| `testimonial-grid`, `testimonial`, `quote`, `interview-quotes` | `loom.quote-grid` / `loom.quote` | pair ✅ |
| `clients` | `loom.logo-cloud` / `loom.logo` | pair ✅ |
| `faq`, `accordion` | `loom.faq-list` / `loom.faq` | pair ✅ |
| `divider` | `loom.divider` | atomic ✅ |
| `timeline`, `journey`, `roadmap`, `changelog`, `process-steps`, `course-modules`, `event-agenda` | `loom.milestone-list` / `loom.milestone` | pair ✅ |
| `team-members`, `staff-roster` | `loom.person-grid` / `loom.person` | pair ✅ |
| `articles`, `press`, `case-studies`, `tutorials`, `recipes` | `loom.article-grid` / `loom.article` | pair ✅ |
| `products`, `digital-downloads`, `shop-categories`, `leadmagnet` | `loom.product-grid` / `loom.product` | pair ✅ |
| `contactform`, `newsletter` | `loom.form` / `loom.field` (+ `loom.option`, `loom.button`) | pair ✅ |
| `code-block` | `loom.code` | atomic ✅ |
| `comparison-table` | `loom.comparison-table` / `loom.comparison-row` / `loom.comparison` | pair ✅ — a **trio**, see [0084](../decisions/0084-in-a-two-dimensional-band-rows-are-nodes-and-columns-are-positions.md) |
| `marquee` | `loom.marquee` | **container** ✅ — the verdict below was wrong, see the note |
| `embed` | `loom.embed` | atomic ✅ |
| `before-after` | `loom.before-after` | atomic ✅ |
| `services`, `coaching-packages`, `mentorship-tracks`, `donation-tiers`, `class-schedule`, `volunteer-opportunities`, `restaurant-menu` | `loom.offering-grid` / `loom.offering` | pair ✅ — seven blocks, one record |
| `awards`, `certifications`, `affiliations`, `favorite-tools` | `loom.credential-grid` / `loom.credential` | pair ✅ |
| `book-list`, `currently-reading` | `loom.book-grid` / `loom.book` | pair ✅ — Hermes' two shapes are one record |
| `property-listings` | `loom.listing-grid` / `loom.listing` | pair ✅ |

**Compositions — 13 blocks, nothing to build.**

| Hermes block | Assembled from |
| --- | --- |
| `cta` | `section` > `heading` + `prose` + `action` |
| `about` | `split` > `media` \| `heading` + `prose` |
| `manifesto` | `section` > `heading` + `prose` |
| `image-text` | `split` (its `imagePosition` is `split.reverse`) |
| `featured` | `card` > `media` + `heading` + `prose` + `action` |
| `contact-info` | `link-list` > `link` per channel — `mailto:` and `tel:` are on the allowlist |
| `social-links` | `link-list` (row) > `link` + `icon` — but its items are a **curation**, so 0058 answers them |
| `gallery` | `grid` > `media` |
| `live-chat-prompt` | `card` > `prose` + `action` |
| `book-consultation` | `card` > `heading` + `prose` + `action` |
| `office-hours` | `section` > `heading` + `prose` + `action` |
| `now-page` | `section` > `prose` + `milestone-list` |
| `hours-of-operation` | `milestone-list` > `milestone` per day |

Two of these got better on 19 August without changing category. `contact-info`
and `social-links` were both *a row of quiet buttons* until `loom.link` and
`loom.link-list` existed, because the catalogue had no plain text link; they are
now the thing they always were. Nothing about the verdict changes — still no
primitive to build.

`hours-of-operation` is worth reading twice: Hermes holds it as **seven fixed
fields** — `monday` through `sunday` — which is repeated content that never got
to be a list. By 0052 those are seven nodes, and a day with hours is exactly a
marker and a line of text. It ports to a band that already exists.

**Pairs to build — 5 blocks, 2 pairs.** Grouped by the content model they
share, which is the order to build them in.

| Group | Hermes blocks | Proposed pair |
| --- | --- | --- |
| Playable media | `video`, `video-playlist`, `playlist`, `podcast-episodes` | `loom.episode-list` / `loom.episode` |
| Dated things | `events` | its own pair — an `EventItem` carries a venue and a ticket link a milestone has nowhere to put |

Both remaining rows are in flight in **#180**, which was opened on 28 August and
has not merged. Read this table as *what `main` does not yet have* rather than
as *what nobody has written*; when #180 lands, the table is empty and the port's
buildable remainder is zero.

**Three proposed names changed when they were built**, and the change is 0054
being applied rather than overruled. `loom.offering-list`,
`loom.credential-list` and `loom.book-shelf` all shipped as `-grid`, because the
arrangement word names *what the container does with its children* and what all
three of them do is `repeat(auto-fit, minmax(…))` with `align-items: stretch`.
`-shelf` was the most tempting of the three and would have been the plainest lie
about the layout: a real shelf is a wrapping row of natural-width covers with a
ragged last row, and if the library ever wants one it is a different container
rather than this one with a prop. 0054's own consequence is the reason to get it
right before it ships: a container that changes its arrangement changes its
name, and a rename is a breaking change to every stored tree. The rows above are
proposals until the run that builds them looks at the markup — read the
arrangement word as a prediction, not a commitment.

`loom.offering-grid` also carries a **local** column vocabulary, `auto | one |
two | three`, where `loom.credential-grid` takes the shared `COLUMN_NAMES`. That
is not a preference: three of the seven blocks the offering pair ports —
`class-schedule`, `volunteer-opportunities`, `restaurant-menu` — are a single
column of full-width rows, an arrangement the shared names cannot say, and a
`loom.offering` reads as a row rather than a card exactly when it is given that
width. `loom.perk-list` set the precedent and gave the same reason.

**Atomic to build — none. The table is empty**, closed on 25 August by
`primitives-13-the-band-that-moves`.

One of its three verdicts was wrong, and the correction is worth keeping because
it is the kind of mistake this ledger exists to stop being made twice.
`marquee` was called atomic on the grounds that "splitting produces nodes that
mean nothing alone". That is true of the **motion** and false of the
**content**: a logo in a marquee is a logo, and it means the same thing standing
still. So it is 0054's shape — a container named for the arrangement it puts its
children in — and it needed no new child type, because every child type it wants
was already registered. The rule the row got wrong: *indivisible behaviour makes
a primitive atomic only when the thing the behaviour acts on is also
indivisible.*

The other two were right. `embed` frames a document with no interior this
library can address; `before-after` superimposes two regions rather than
arranging them, so there is no arrangement to name. Both ship with slots or props
and no repeated child.

**Blocked — 2 blocks.** `contactform` and `newsletter` left this table on 18
August, when [0065](../decisions/0065-a-submission-names-a-destination-and-never-carries-one.md)
gave a form somewhere to post, and left the *pairs to build* table on 20 August
when `loom.form` was built against it
([0073](../decisions/0073-a-form-with-nowhere-to-post-renders-disabled-and-says-so.md)).

| Hermes block | Blocked on |
| --- | --- |
| `tabs` | client-side selection. The runtime has no state seam; `loom.faq` gets away with `<details>` because HTML has one. Filed. |
| `feed` | its items are a `binding`, not authored content — [0058](../decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md) is the seam and the shape of the answer is a design question. |

Two of these are not what their names suggest. `marquee` is not scrolling text:
its items are a **binding** to `social-links`, so it is a moving row of a
creator's profiles. And `social-links` itself takes its items from a
**curation** of the same source. Neither is authored content, so both are
[0058](../decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)'s
business before they are a primitive's — the tree asks a question and the host
answers it. **Do not port either as an authored list**, which is what reading
the block names alone would produce.

## What Hermes never had

The ledger above counts *Hermes blocks*, and a block Hermes never defined cannot
appear in it. There is one such group and it is not small: **page chrome.**
Hermes was a creator-profile toolkit whose header and footer came from the app
shell, so a page's top and bottom bar were markup rather than content — nothing
in the seventy is a nav and nothing is a footer.

A site built in Loom cannot borrow that shell, because the claim is that the
whole page is data. `loom.nav`, `loom.footer`, `loom.link` and `loom.link-list`
landed on 19 August for that reason, and they are the first primitives in the
library with no Hermes ancestor at all. Read the count below as "of the Hermes
catalogue", not "of the library".

`comparison-table` is the exception among the ported blocks and worth noting
here: Hermes *did* define it, and it came out three primitives rather than two
because both of its axes are repeated content. 0084 is the record; the short
form is that rows are nodes, columns are positions, and the singular is
`loom.comparison` — one subject measured against one criterion.

Four more joined them on 21 August, and they are the same shape of gap. Hermes
sold a creator's *services*; nothing in the seventy is about a **tool**, so
nothing in it is a key cap or an avatar reachable outside a person record, and
`loom.mosaic` arranges cells at sizes no Hermes block ever varied. `loom.kbd`,
`loom.avatar`, `loom.avatar-row` and `loom.mosaic` have no row above because
there is no block they port.

**Five more joined them on 23 August, and they are the largest gap of the
three** — the layer a page is *written* in, as opposed to what it is built from.
Hermes held its lists as fields inside other blocks (`features: string[]` inside
a `PricingTier`, `items: FaqItem[]` inside an accordion) and its prose as a
string, so nothing in the seventy is a plain bulleted list, an emphasised span,
an inline code reference or a callout. `loom.list`, `loom.list-item`,
`loom.emphasis`, `loom.code-span` and `loom.callout` have no row above for that
reason, and their absence was invisible from this document because this document
counts Hermes blocks: the library could draw a pricing table and a timeline and a
comparison band while being unable to write three bullet points.

Read the ledger below accordingly. **It is a measure of the port, not of the
library**, and the gaps that have mattered most in the last three runs have all
been outside it.

## Where this leaves the count

| | Blocks |
| --- | --- |
| Ported | 50 |
| Need no primitive | 13 |
| Pairs still to build | 5 (2 pairs, both in flight in #180) |
| Atomic still to build | 0 |
| Blocked on a seam | 2 |

**65 of 70 are settled**, and the 5 that remain are two pairs rather than five
primitives — both of them written and waiting in #180. That is the number worth
quoting, because "70 blocks" has been the shape of this job since the port
started and it was never the real size of it.

*The three counts above were internally inconsistent before 26 August* — the
ledger said 36 done while this table said 33, and the table still listed three
atomic blocks the 25 August run had closed. Both are corrected here. A count
that has to be updated in three places is a count that will disagree with itself
again; deriving the ported figure from the ledger's own rows is a small tool
nobody has written.

**Every one of the remaining pairs is a card in a grid**, and what separates them
is not their fields — it is what the reader aims at.
[0066](../decisions/0066-a-card-is-the-target-when-it-is-read-and-the-control-is-the-target-when-it-is-bought.md)
settles it once for all of them: `loom.credential`, `loom.book` and
`loom.episode` are **read**, so the card is the target; `loom.offering`,
`loom.listing` and `loom.event` are **acted on**, so a control is. That is the
one question the article/product pair had to answer that the granularity rules
did not already answer.

**A second question turned out to be waiting behind it**, found when the
offering and credential pairs were built on the same day and gave opposite
answers to it: *where does the card's own sentence live?*
[0094](../decisions/0094-a-cards-prose-is-a-child-when-the-card-has-a-flow.md)
settles that one the same way — ask whether the port turns any field of the
record into child nodes. An offering has an includes list, so it has a flow and
its prose is a node in it; a credential has no repeated part at all, so its one
line is a prop and 0059's multi-string leaf applies unchanged. `loom.book` and
`loom.listing` have repeated parts and take their prose as children — which both
did when they were built on 30 August, so the prediction held and cost that run
nothing; `loom.episode` and `loom.event` are to be read against their own shapes
at port time.

**A third question was waiting behind that one**, and the book and listing pairs
found it the way the offering and credential pairs found 0094: *where does the
card's own picture live?* `loom.credential` holds its mark as a **region** and
`loom.article` holds its image as a **prop**, both correctly, and the two
arguments generalise in opposite directions — read either one alone and it
decides every card in the library, wrongly.
[0096](../decisions/0096-a-cards-picture-is-a-prop-when-the-model-names-one-kind-of-picture.md)
settles it: ask how many kinds of picture the content model names, since one
kind is a prop and several are a region. A book cover and a property photograph
are one kind each, so both are props; a credential's mark is three Hermes fields
over four renderings, so it is a region. It decides `loom.episode`'s artwork and
`loom.event`'s poster in advance, the way 0094 decided their prose.
