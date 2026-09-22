# 0180. A primitive that draws an answer declares the shape it can draw, and a row that came from a database is never a node

**Status:** Accepted
**Date:** 2026-09-22
**Section:** §4b → §4e

> **Why this number.** `0178` is the highest on `main`; `0176` is claimed by the
> open #353 and `0179` by the open #360, so `0180` is the next free one
> everywhere.
>
> **Why `Accepted`.** It decides how two new primitives are built. It changes no
> schema, adds no node kind, and supersedes nothing. It is the *authoring half*
> [0058](0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)
> named as the next unit and left unbuilt for five weeks, and it answers a limit
> [0156](0156-the-two-states-a-bound-region-is-in-are-primitives-and-not-props-on-every-container.md)
> filed rather than one it decided. The one thing 0156 said this lane may not
> decide — *a node whose presence depends on an answer* — is still not decided
> here, and the last section says why this is not that.

## Context

0058 gave the tree a way to ask a question of a registered source on 15 August
and ended with the thing it had not built:

> **No primitive in the starter library binds anything yet.** The seam exists
> and is proved by tests; what is not yet built is the authoring half.

Five weeks later that was still true, and it is the largest single gap in the
library: every word on every Loom page is a word somebody typed into a tree.
Four of Hermes' five bound blocks — `services`, `products`, `feed`, `marquee` —
bind **a list**, and the fifth binds a record. A creator toolkit whose services
list has to be retyped into a page is not the block anyone used, and a landing
page whose *trusted by 12,000 teams* is only true until somebody forgets to
edit it is the ordinary condition of the web.

Building the first two of them forces four questions the library has never had
to answer, because for ninety-six primitives **the content had arrived**.

## Decision

### 1. A row that came from a database is never a node

[0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md) says
repeated content becomes child nodes, and it does not reach here. Its argument
is entirely about what happens to the content *afterwards*: an FAQ item is a
node so that adding one is an `insert` a reviewer weighs, dropping one is a
`remove` whose inverse restores that question, and whoever proposed it is
attributed.

**None of those operations exist for a row a source returned.** No `move`
addresses the third post; no `configure` re-words it; nobody is attributed for
it; its inverse is not a change to this page. Nodes would buy none of what nodes
are for — and a tree holding them would be a cache of somebody's database, which
is the shape 0058 rejected when it refused to put answers in props.

So `docs/primitive-granularity.md`'s test — *does changing this prop change the
set of nodes?* — comes back the way it does for `loom.rating`'s five stars and
`loom.waiting-state`'s bars. The repeated thing is never a node under any
configuration, so it is interior rather than structure.

### 2. The primitive declares the shape of answer it can draw

An answer reaches a component as `JsonValue`. 0058 validates it against the
**source's** output schema, which is a claim about a host's database and says
nothing about what can go on a page. So a bound primitive carries its own schema
for what it draws — `loom.feed` reads `{ title, detail?, meta?, href? }`,
`loom.tally` reads a string or a finite number — and reads the answer against
it.

**Unknown keys are stripped, not refused.** A real row carries an `id`, a
`createdAt` and half a dozen columns nothing will draw, and a `.strict()` here
would refuse every row a real source returns.

### 3. Three answers, three renderings; the empty region is a slot and the
failure is declared text

0058 is explicit that *nothing to report* and *could not be reached* are
different answers and that collapsing them is the mistake. So rows draw rows, a
`ready` answer of none places the `empty` region the tree supplied, and an
answer that did not arrive — or arrived in a shape this cannot draw — is a
declared line, announced with `role="status"`.

**Only the empty region is a slot, and that is a limit rather than a taste.**
`auditRegistry` probes a primitive across its closed prop choices and reports
any slot nothing ever places; it cannot supply an answer, so a region a
primitive places *only when a source failed* is a region the audit correctly
reads as dropped content. **A bound primitive may therefore declare only the
regions it places without an answer**, and everything else it says is declared
text ([0060](0060-a-primitive-owns-a-string-and-a-deployment-may-replace-it.md)).
Filed as a finding, because the probe is the framework's.

### 4. A row it cannot read is skipped and said; an answer where none reads is a
shape it cannot draw

[0175](0175-a-listing-skips-the-row-it-cannot-read-and-fails-the-one-it-cannot-place.md)
decided this for the hold store two days ago and the reasoning transfers whole:
one row written by a schema this build is older than must not take the whole
band off the page, because every other row goes unmentioned with it. The note
saying what was dropped is **visible**, not merely announced — a note only a
screen reader meets is the silent omission the record refuses, wearing an
accessibility feature as a disguise.

The other half is the one a naive implementation gets wrong. An answer where
*nothing* reads is not a list with holes in it; it is an answer to a question
this primitive did not ask, and *some entries could not be shown* over an empty
region is the least useful true sentence available.

### 5. Formatting a figure belongs to the adapter

`loom.tally` prints `1284`, not `1,284`. `Intl.NumberFormat` with no locale
reads the **server's** default, which would make two renders of one revision on
two machines disagree — the property that makes `renderLoomTree` what it is
([0008](0008-the-renderer-is-a-total-pure-projection.md)). With a locale
argument it would be this library choosing a host's. So the grouped string is
the adapter's to return, which is where 0058 already put every other claim about
a host's data. `prefix` and `suffix` stay props, because the `$` and the `+`
belong to how this band puts it rather than to the row.

### 6. A band in the catalogue ships unbound

A composition that declared `loom:data` would name a source id, and a source id
is a thing a host registers. Every deployment that had not registered that exact
id would serve a page reporting a binding it never agreed to make, and every
surface that renders the catalogue without resolving data would report it too.

So `feedBand` drops in a `loom.feed` that asks nothing and shows its designed
empty region — a real state of a real page — and connecting it afterwards is a
`configure` adding the binding, weighed like any other change
([0163](0163-a-binding-is-weighed-like-a-destination.md)). That is the starting-
composition argument reaching the data seam: structure that can be bound later,
rather than configuration that had to be predicted.

## Consequences

- **The library reads `loom.data` for the first time.** 0058's last consequence
  is closed for the list and the figure; the record shape (`about` binding three
  fields of one profile) is not built and is not blocked.
- **`loom.waiting-state` is unreachable from anything bound, by construction.**
  Resolution happens before the walk, so by the time a component runs every
  binding is `ready` or `unavailable` and none is pending. A skeleton drawn from
  a binding would be a picture of a state this runtime is never in. It remains
  the right primitive for a region a *host* fills on the client, and nothing in
  this library can place it. Filed.
- **The catalogue cannot say which binding a primitive wants.** `definePrimitive`
  has no `binds` declaration, so a model reading the catalogue learns that
  `loom.feed` takes a `binding` prop and not that the name has to match a
  `loom:data` key on the same node. 0058 predicted this exact gap — *"a primitive
  declaring which binding names it reads"* — and said it changes
  `definePrimitive`, which is not this lane's. Filed; built around with a prop
  whose default (`entries`, `value`) is what a node binding one thing will call
  it.
- **A URL now reaches a page from a host's data rather than from a tree.** The
  Gate never saw it, so the scheme allowlist
  ([0053](0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md)) is
  the only thing between a row and a `javascript:` address. `loom.feed` holds
  `href` to `linkUrlSchema` and draws a row whose address fails as an entry that
  is not a link, rather than dropping the post over a field nobody can see.
- **A bound node draws a different page per deployment**, so a screenshot of one
  is evidence about one host's data. The specimen and the fixtures photograph
  the states rather than a page.
- **Reach moves 71 → 73 of 98**, `loom.feed` and `loom.empty-state`, on one
  band and no new part. `loom.tally` is registered and unreachable: a figure has
  no designed absence the way a list does, and a band of four tallies on a
  phrasebook nobody has bound is four words where four numbers go.

## What this deliberately does not decide

0156 filed a limit and said whose it was:

> A tree cannot say *this node when the list is empty, that one otherwise* …
> the shape of a fix — **a node whose presence depends on an answer** — is a
> question about the render seam and the tree, which this lane may not decide.

**That question is still open and nothing here answers it.** What a bound
primitive does is place its own regions, which is what every primitive in this
library has always done and what
[0051](0051-a-slot-is-a-region-the-primitive-places.md) exists to describe: the
hero places its media slot or does not, the empty state places its glyph above
its title. No node's presence depends on an answer — the `empty` region is a
child of the feed and is rendered by the walk either way; the feed chooses where
it goes, exactly as `loom.section` chooses where its heading goes.

The general facility 0156 wanted — *any* node, anywhere in a tree, present or
absent by the state of a binding — would need the render seam or the tree to
change, and remains an escalation.

## Alternatives considered

**A field mapping in props** — `{ title: "name", detail: "summary" }`, which is
what every CMS block ships. Rejected: it makes a model author the join between
two schemas it can see neither of, and a mapping naming a column the source
stopped returning fails silently at the one point nobody is looking. Declaring
the shape puts the adaptation in the adapter, where 0058 already put the claim
about the database, and leaves one thing to get wrong instead of two.

**A `loom.bound` wrapper with `ready` / `empty` / `unavailable` regions, beside
an ordinary container.** The tidier decomposition, and the one that would serve
a second bound primitive without repeating this logic. Rejected for a mechanical
reason rather than an aesthetic one: `loom.data` is keyed *per node*, so the
wrapper and the container would each have to declare the same binding, and a
`configure` that changed the params of one and not the other would leave a
region reporting one question while drawing the answer to another. Worth
revisiting if a third bound primitive arrives and the seam grows a way for a
child to read its parent's answer — which is a framework question, not this one.

**A binding on `loom.stat` rather than a second primitive.** The content model is
identical, and this is the tempting one. Rejected because `value` would have to
become optional, and a `loom.stat` with no value and no binding would then be a
valid tree — the guarantee its schema exists to make, lost for every authored
stat in every stored tree, to save one registration. The second reason is that
an authored stat cannot fail and a bound one can, and a primitive that is
sometimes infallible is two primitives sharing a name.

**Bound rows as nodes after all**, built by the composition interpreter at
insert time from a sample answer. Rejected: it makes the tree a snapshot of a
query, so the page goes stale exactly when the data moves, and every reviewer
weighing an `insert` of forty nodes would be weighing somebody's database rather
than a decision.

**A band that ships bound to a source this library provides.** It would make
every band draw content on every surface with nothing to register, and it is a
fixture wearing a data seam: the library would be answering questions about a
host's business with invented rows. Rejected, and the empty region is the honest
picture of a band nobody has connected.

**Drawing a waiting state when a source reports a timeout.** It is the one
`DataUnavailable` reason that reads like *not yet*, and a skeleton there would
look better than a sentence. Rejected because it would be a lie with moving
parts: nothing is fetching, no second render is coming, and a skeleton that
never resolves is the worst rendering of a failure available.
