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

**Done — 47 blocks, 70 primitives.**

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
| `video`, `video-playlist`, `playlist`, `podcast-episodes` | `loom.recording-grid` / `loom.recording` | pair ✅ — four blocks, one record |
| `events` | `loom.event-grid` / `loom.event` | pair ✅ |

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

**Pairs to build — 3 blocks, 2 pairs.** Grouped by the content model they
share, which is the order to build them in.

| Group | Hermes blocks | Proposed pair |
| --- | --- | --- |
| Reading | `book-list`, `currently-reading` | `loom.book-shelf` / `loom.book` |
| Property | `property-listings` | `loom.listing-grid` / `loom.listing` |

**Four proposed names have changed when they were built**, and the change is
0054 being applied rather than overruled. `loom.offering-list`,
`loom.credential-list` and `loom.episode-list` all shipped as `-grid`, because
the arrangement word names *what the container does with its children* and what
all three of them do is `repeat(auto-fit, minmax(…))`. 0054's own consequence is
the reason to get it right before it ships: a container that changes its
arrangement changes its name, and a rename is a breaking change to every stored
tree. The two rows above are proposals until the run that builds them looks at
the markup — read the arrangement word as a prediction, not a commitment.

**The fourth change was a noun rather than an arrangement**, and it is the one
worth reading before the last two pairs are built. `loom.episode` shipped as
`loom.recording`: *episode* is one of the four collapsed blocks' words rather
than the name of what all four are, and a track on a playlist is not an episode
of anything. Every collapse in this table has taken the general noun —
`loom.milestone` over *timeline-item*, `loom.credential` over *award*,
`loom.offering` over *service* — so the proposed nouns in the rows above deserve
the same test at build time. `loom.book` survives it; `loom.listing` is a
`property-listings` word and a run that builds it should ask what else it
collapses first.

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

**Two more joined them on 31 August, and they are the first gap this document
predicted rather than discovered.** Hermes sold a person; a page that sells a
*product* has two bands it never needed — *how it works*, and *what it works
with*. `loom.milestone-row` is the second, and neither of them is a new content
model: it is the entries a `loom.milestone-list` runs down a rail, laid across
as numbered steps, which is 0054 producing a container rather than a fourth set
of words for a marker, a title and a sentence. `loom.orbit` is children circling
a mark the primitive places, which is the claim a logo wall cannot make and the
fourth general arranger. Neither has a row above, and the count below is
unmoved by either — which is the point of the paragraph above.

**Three more joined them on 4 September, and they are the same gap read one
level up.** Hermes sold a *person*: a photograph is a photograph, a profile is
never reviewed, and nothing on a creator's page is a running interface. A page
selling **software** has three things it cannot do without and none of the
seventy is any of them — the chrome a screenshot sits in, the marks that say
which part of it matters, and a score. `loom.frame`, `loom.pin` and
`loom.rating` have no row above for that reason.

`loom.pin` is worth reading twice for the same reason `hours-of-operation` is,
from the other side: Hermes would have held the marks as a `hotspots[]` field on
the frame, and by 0052 they are nodes — an `insert` each, a `move` each, an
inverse each. The port map has no row to correct here because Hermes never had
the block; the rule is the same one that turns seven fixed weekday fields into
seven nodes.
**Four more joined them on 5 September, and three of the four are the page
chrome paragraph above coming round a second time.** Hermes' app shell owned the
top of the window, so nothing in the seventy is an announcement strip and
nothing is a breadcrumb: `loom.banner` and `loom.link-trail` are the third and
fourth primitives here whose absence is that same fact. `loom.carousel` is the
fifth general arranger and the first that admits the reader has a phone — a row
that scrolls and snaps, which no Hermes block needed because a profile was one
column. `loom.meter` is the only one of the four with something like an
ancestor, and the distance is the point: Hermes' `stats` block *states* a figure
and this one draws it against a whole, which is the collapse rule read the other
way — two blocks that want different markup are two primitives.

The same run gave `loom.section`, `loom.hero` and `loom.callout` an `anchor`, so
a band can be linked to from the page it is on. Hermes never needed one: a
profile was a single screen with an app shell above it. A marketing site is not,
and until 31 August a Loom page could link to any document on the web except
itself.

Read the ledger below accordingly. **It is a measure of the port, not of the
library**, and the gaps that have mattered most in the last four runs have all
been outside it.

## Where this leaves the count

| | Blocks |
| --- | --- |
| Ported | 52 |
| Need no primitive | 13 |
| Pairs still to build | 3 (2 pairs) |
| Atomic still to build | 0 |
| Blocked on a seam | 2 |

**67 of 70 are settled**, and the 3 that remain are two pairs rather than three
primitives. That is the number worth quoting, because "70 blocks" has been the
shape of this job since the port started and it was never the real size of it.

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
`loom.recording` are **read**, so the card is the target; `loom.offering`,
`loom.listing` and `loom.event` are **acted on**, so a control is. Both halves
of that shipped together on 2 September and the pair is the clearest statement
of the rule in the library: a recording is played, so its title's overlay covers
the artwork; an event is booked, so nothing is covered and the ticket control is
the aim. That is the
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
`loom.listing` have repeated parts and take their prose as children;
`loom.recording` and `loom.event` were read against their own shapes when they
were built on 2 September, and **both went the credential way**: neither turns a
field of its record into a children flow, so both hold their sentence as a prop
and both are leaves. What looked at proposal time like a question about card
richness turned out to be one question — *is there a repeated part?* — and the
answer for both was no.
