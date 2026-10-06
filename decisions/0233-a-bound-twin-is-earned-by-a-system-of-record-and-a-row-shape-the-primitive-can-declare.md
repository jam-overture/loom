# 0233. A bound twin is earned by a system of record and a row shape the primitive can declare

**Status:** Accepted
**Date:** 2026-10-06
**Section:** §4b

> **On the number.** 0231 is claimed by two open pull requests at the time of
> writing — #527 and #528 — and 0232 is the number whichever of them is
> renumbered will want, on the precedent the 0205 collision set. This takes 0233
> rather than widen a collision it did not cause. Filed in `FINDINGS.md`.

## Context

[0058](0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)
gave the tree a way to ask a question of a registered source on 15 August and
ended with what was missing: *"No primitive in the starter library binds
anything yet."* Two have since been built. `loom.feed` reads a list of entries;
`loom.tally` reads one figure. **At 103 primitives, two of them can be given
data and 101 can only be told.**

Each of those two had to argue for its own existence from scratch, and
`loom.tally`'s argument is the one worth reading, because it is general and was
written as though it were local:

> The tempting shape is one primitive whose `value` is a prop *or* an answer,
> since the content model is identical. It is rejected on the ground 0052
> rejected decomposing fixed fields, which is the same ground from the other
> direction: **`value` would have to become optional**, and a `loom.stat` with
> no value and no binding would then be a valid tree. Every authored stat in
> every stored tree loses the one guarantee its schema is there to make.
>
> The second reason is that the two have different failure surfaces. An
> authored stat cannot fail; this can, and a primitive that is sometimes
> infallible and sometimes not is two primitives sharing a name.

That settles *how* a bound primitive relates to its authored twin. It does not
settle **which content models get one**, and that question has teeth, because
the answer "all of them" is available and is catastrophic.

This library has roughly fifty containers and leaves that hold repeated or
singular content. A bound twin for each would double the vocabulary, put every
page's interpretation request past the
[0014](0014-the-reply-schema-must-fit-a-grammar-budget.md) grammar budget — the
measurement in `docs/primitive-gap-inventory.md` puts 250 entries at ~42,600
characters per request — and make a model choose between `loom.quote` and
`loom.voices` fifty times over on descriptions that differ in one clause. It is
[0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)'s
shades-of-one mistake with a new justification bolted on.

So the pressure runs both ways and neither direction is safe by default:
refusing bound twins leaves every page's content something a model invented,
and granting them freely ends the vocabulary.

## Decision

**A content model earns a bound twin when all three of these hold.** Any one
failing means the content stays authored, and a primitive is not written.

### One — the content originates in a system of record

Not *could* come from a database: **does**. The test is whether a deployment
serving this page already holds the thing somewhere that knows it, such that
authoring it into a tree is copying.

A testimonial passes hardest. `loom.quote`'s own `anonymous` prop exists because
of this and says so: *"A starting composition may not ship a fabricated
endorsement attributed to a person who does not exist."* Praise is the one kind
of content on a marketing page that nobody may author — a quote in a tree is a
quote somebody wrote on a customer's behalf, and a model writing one is a model
inventing it. Every real testimonial was collected with consent, somewhere.

A series of monthly figures passes: a metrics band's whole claim is that it is
current, and six authored numbers are six numbers that were true when somebody
typed them.

A picture passes: a model writing a URL to a file is a model guessing, and every
deployment's pictures already live somewhere with addresses.

**A feature tile fails.** *"Ships with audit logs"* is the page's argument about
the product, not a row anywhere. **A FAQ fails** for the same reason. **A
pricing tier is the interesting near-miss and it fails as stated**: the price is
in the billing system, but the plan's *name*, its ordering and which perks it
lists are the page's editorial, so the bound shape would be a tier with one
field read and five authored — which is a `loom.tier` whose price came from a
`loom.tally` beside it, and is already expressible.

### Two — the primitive can declare the row shape, with no field mapping

`loom.feed` settled the mechanism and the reasoning is the test:

> The obvious alternative is a field mapping in props — `{ title: "name",
> detail: "summary" }` — which is what every CMS block ships. It is rejected
> here: it makes a model author the join between two schemas it cannot see
> either of, and a mapping that names a column the source stopped returning
> fails silently at the one point nobody is looking. **Declaring the shape puts
> the adaptation in the adapter.**

So a candidate must have a row shape of a few fixed, nameable fields. If the
primitive cannot write that schema down — because the columns are whatever the
query returned — it fails, and it fails for a reason worth stating separately
because it is the one a run will try to argue past.

**A general bound table fails here, and it is the most wanted thing on this
list.** Rows from a query with arbitrary columns need either headings supplied
by the source, which makes a database write the page's words, or a `columns:
string[]` prop, which is prose a person wrote sitting in an array where no
`configure` can address one element and no reviewer can weigh one heading. The
second is genuinely defensible and `docs/primitive-granularity.md` says to
decompose when both readings are — and decomposing is blocked, because a
container receives its children as one rendered node and cannot read a prop off
one ([0008](0008-the-renderer-is-a-total-pure-projection.md)). That is the same
wall [0176](0176-a-control-may-be-answerable-to-another-control-and-they-agree-through-the-dom.md)
hit for tabs and the radio group. A bound *specification* list — rows of
`{ name, value }`, a shape a primitive can declare — is reachable and is not
this; a bound table is `ARCHITECTURAL` and is not built.

### Three — the authored twin loses a guarantee if the field becomes optional

`loom.tally`'s argument, which is what makes this a *twin* rather than a prop.
If the authored primitive's required field would have to become optional to
admit a binding, the twin is a second primitive. If it would not — if the field
is already optional and the binding adds no reachable invalid tree — then there
is no twin to write and the question is whether a prop is warranted at all.

This is also the clause that keeps the pair honest about failure. An authored
primitive cannot fail; a bound one can, in four ways that must be kept apart
(answered, answered-empty, unreachable, answered-unreadably), and 0058 is
explicit that collapsing *nothing to report* into *could not be reached* is the
mistake. One primitive doing both would be infallible on Tuesday and not on
Wednesday depending on a prop.

### What a twin must then do

Four obligations, all of them already precedent on `loom.feed` and all of them
load-bearing:

1. **Draw its unconnected state, as a region.** A bound primitive declares only
   the regions it places *without* an answer, because `auditRegistry` cannot
   supply one — so the `empty` region is what the catalogue photographs, and a
   band drops in **unbound**, because a composition naming a source id would
   report a binding every deployment that had not registered it never agreed to
   make.
2. **Skip the row it cannot read, and say so**
   ([0175](0175-a-listing-skips-the-row-it-cannot-read-and-fails-the-one-it-cannot-place.md)).
   An answer where *nothing* reads is not a list with holes in it; it is the
   failure line.
3. **Declare `reads`** in 0184's second form, so a tree binding under a
   near-miss name is a `data-unread` diagnostic rather than an empty region for
   ever against a source that answered correctly.
4. **Declare `unshown`**
   ([0206](0206-a-primitive-declares-what-it-could-not-show-and-the-runtime-decides-whether-to-say-so.md)),
   and declare *the function the component calls*, so the count in the log and
   the sentence on the page cannot disagree.

### And emit the authored twin's markup

Where the twin has a stylesheet, the bound one uses it rather than growing a
second. `loom.trend` changes nothing in `stylesheet.ts`, so a bound chart and an
authored one cannot come to disagree about what a bar's height means.

It does **add** one rule, and the exception is worth stating because it
generalises: a bound twin may add what its own situation requires and the
authored one's never does. Here that is the column count. An author chose four
figures; an answer carried twelve, and under the shared rule twelve columns on a
phone came out nineteen pixels wide with their figures overlapping. The twin
gives a column a floor and scrolls, which is what this library already does with
a table too wide for the screen. **The rule to apply is: share what decides the
meaning, add only what the difference in situation forces.** Where the markup is inline
styles, it moves to a shared module — `quote-content.ts`, on
`perk-content.ts`'s precedent — and both primitives call it.

The stake is higher than ordinary duplication, and this is the reason the clause
is here rather than left to taste: **the authored card is what the catalogue
photographs and the bound card is what a deployment serves.** A drift between
them is a drift nobody sees until it is live.

## Consequences

**Three twins are admitted and the library goes to 106**, which the gap
inventory's own ceiling of 110–120 has room for and which its recommendation —
*hold the vocabulary near 110 and spend the week on compositions* — leaves
space for by design.

| twin | authored | the system of record |
| --- | --- | --- |
| `loom.plate` | `loom.media` | a media library, a CMS, a product table |
| `loom.trend` | `loom.stat-chart` | a metrics or analytics table |
| `loom.voices` | `loom.quote-grid` of `loom.quote` | a reviews table, a CRM, a survey |

**`loom.voices` is a container and a leaf at once**, which nothing else in the
library is: it arranges n cards and holds no child nodes, because the cards are
rows. [0054](0054-a-container-is-its-childs-name-plus-the-arrangement.md) names
a container after its child's type plus the arrangement, and there is no child
type to name this after — so it is named for the content. The exception is
narrow and this clause is its whole extent: it applies only where the repeated
thing is an answer's rows, which are never nodes under any configuration.

**What this closes, and what it does not.** The 5 October finding recommended a
binding to unblock the seven primitives no band can reach for want of an image
source. Read against clause one, a binding closes **one** of the seven: a
binding is read by a primitive that declares `reads`, so reaching
`loom.embed`, `loom.lightbox`, `loom.carousel`, `loom.overlay`, `loom.pin` and
`loom.before-after` this way would mean six more twins, and none of the six
passes clause one — an embedded document, a tile that opens and a wipe are
*arrangements of* a picture, not records. The recommendation was right about the
mechanism and wrong about the count, and the finding is re-filed saying so.

**The rule is a floor on writing twins, not a licence.** A fourth candidate
meets clause one easily — a team roster, a changelog, a logo wall, an events
list all live in systems of record — and each must still clear clauses two and
three on its own and be argued in a report. Nothing here pre-approves a bound
twin for anything.

## Alternatives considered

**A `bound: true` prop on each authored primitive.** Rejected by clause three,
which is `loom.tally`'s whole argument: it makes a required field optional and
puts an invalid tree within reach of every stored tree in existence.

**A generic `loom.rows` that any primitive could be filled from.** This is the
field-mapping shape with the mapping moved up a level, and it fails clause two
for clause two's reason — the join is authored by a model that can see neither
schema. It also has no rendering of its own, so it would be a primitive whose
appearance depends on a prop naming another primitive, which is code generation
with extra steps (0001).

**Wait for a host to ask.** The posture [0114](0114-a-primitive-declares-what-part-it-plays-and-the-registry-is-asked.md)
takes for a second `role`, and it is right there and wrong here: a `role` costs
nothing to add later, whereas every page built in the meantime has its
testimonials, its figures and its pictures authored — which for a testimonial
means invented. The cost of waiting is not symmetric with the cost of acting.
