# 0359 — An audience rule is a conjunction of scalar clauses, and a composed page is a projection of a revision

**Status:** Accepted
**Date:** 2026-11-05
**Section:** §1, §3

> **Renumbered 6 November 2026, 0355 → 0356 → 0359.** Written as `0355` on
> 5 November, the same number `Loom signals` took on #780 a minute earlier; the
> framework routine moved it to `0356` rather than leave it for `Loom merge` to
> move at merge time. `0356` was then taken on `main` by `Loom signals`' *page
> views are counted under the hour they began in* (#786), which merged first, so
> `Loom merge` moved this record again on 6 November when it merged `main` into
> #781. `0359` is the next number free on `main` — `0353` is claimed by the open
> #778, `0357` is this branch's own, and `0358` merged on `main`. What this
> record decides is unchanged, and every link and citation to it moved with it.

> **Why it is raised.** [0263](0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md)
> is Accepted and says *a page is one base tree, plus deltas that apply when an
> audience matches*, with the match *evaluated in the customer's app, on every
> request*. It settles what a page **is** and deliberately leaves three things
> open that cannot be left open by anything that runs: what a rule may say, what
> order two matched deltas apply in, and what the thing that comes out is called.
> `docs/portal.md` unit 9 asks for *a record before any build*; this is it, with
> the build it describes.
>
> **Why this number.** `main` holds up to `0354`; `0353` is claimed on #778,
> which is open.

## Context

0263's clause 5 landed as [0284](0284-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md):
every reader table carries an `audience_id`, and a counter's identity is
`(application, audience, tree, revision)`. Clauses 1 to 4 — the predicate, the
delta-not-a-tree, the bounded rules, the composition in the data plane — had
nothing built and nothing written down.

Three questions block any of it, and none is answered in 0263:

1. **What is a rule?** 0263 says *a predicate over the opaque render context* and
   *the rules are small*. Those are bounds, not a language.
2. **Two audiences match. What then?** 0263 says a reader earns the deltas of
   the audiences they are in, which means more than one delta reaching one tree,
   which means an order, which means a tie-break for two deltas touching one
   node.
3. **What is the composed tree?** Every delta here is authored against the same
   published revision, and `applyDelta` refuses a delta whose `baseRevision` is
   not the tree's current one. So composition cannot be a chain of appends, and
   the thing it produces needs an identity before anything can measure it.

There is also an apparent conflict to resolve before a line is written. 0284
says *the predicate... lives in the control plane's rules* and *no column holds
a rule, an expression, a context key or a matched value*. 0262 says the render
path stays in the customer's app. Taken naively, the predicate may not be in
`src/` — and then clause 4 is unimplementable.

## Decision

**A rule is authored in the control plane, shipped to the data plane, and
evaluated there. A composed page is a projection of the base revision and never
a revision of its own.**

### 1. Authored there, evaluated here

0284's *the predicate is not here* is about **storage**: Loom's reader tables
hold an opaque id and never a rule. It is not about evaluation. A rule is
written in the portal, kept there, and **shipped** to the customer's app, where
it is evaluated beside the base tree — the only place it can be evaluated
without a request to Loom in front of every page view (0262). `src/` therefore
holds a rule *evaluator* and stores no rule: a rule arrives as data, is read
once, and answers a list of ids. The control plane says what `aud_eu` is; the
data plane says whether this reader is in it.

### 2. A rule is a conjunction of clauses over JSON scalars

```ts
type AudienceClause = { key: string; anyOf: readonly AudienceValue[] }  // anyOf non-empty
type AudienceRule = { audienceId: AudienceId; clauses: readonly AudienceClause[] }  // clauses non-empty
```

- **`anyOf` rather than one value**, because *locale is one of en-GB, en-IE* is
  the ordinary case and the alternative is one audience per locale, each with its
  own copy of the same delta — the maintenance failure 0263 rejected a tree per
  variant over, arriving one level down.
- **A conjunction, with no `or`.** Two rules both matching is already the answer
  to *or*: every audience that matched earns its delta. An `or` inside a rule
  would be a second way to say what the list of rules says.
- **JSON scalars only.** A host with structure in its context flattens it into
  keys. An absent key, and a key holding an object or an array, are *not in this
  audience* rather than an error: a context is the host's to shape, so a
  mismatch is a rule that does not apply rather than a request that cannot be
  served.
- **At least one clause.** A rule matching every reader is `aud_everyone`, which
  the base already serves by being the base; a second way to say *everyone* is a
  delta that silently applies to a deployment that thought it had none.

### 3. Order is the deployment's, and it is the rule order

`audiencesFor` answers the matched audiences **in the order the rules were
given**, and the deltas apply in that order, so **the last matching rule wins a
contested node**. The order has to be something a deployment sets and reads
back, rather than something a map's iteration or an id's spelling decides. An
audience named by two matching rules appears once, at its first position: its
delta is one delta, and applying it twice would double whatever it inserted.

### 4. A composed page is a projection of a revision

The composed tree keeps the base's `treeId` **and the base's `revision`**, and
nothing about it is appended anywhere. Three reasons, and the third decided it:

- A revision is a thing the log can replay and attribute. A composition is
  derived per request from rules that may change between two requests; it has no
  author, no timestamp and no place in the history.
- Bumping it would make a reader's revision depend on which audience they fell
  into, so two readers of one published page would report different revisions.
- **The measurement joins on it.** 0284 made a counter's identity
  `(application, audience, tree, revision)`. If a composition carried its own
  revision, the audience dimension and the revision dimension would move
  together, and *compare these two audiences on this revision* — the whole point
  of serving two — would have nothing to compare.

Composition therefore walks operations with `applyOperation` and checks each
delta's `baseRevision` **against the base and never against the accumulator**,
because every delta here is authored against the same published revision and
chaining `applyDelta` would refuse the second for being one behind a number
composition had just moved.

### 5. A composition that cannot be served is refused, whole

A matched audience with no delta, a delta against a revision the page has left,
a delta for another page, or operations that do not apply: each refuses the
request, and **the base is not served in its place**.

A composition that quietly dropped a stale delta would serve the base tree to a
reader the deployment has already decided is in `aud_eu` — and the signals that
page sends would be filed under `aud_eu` anyway, so the comparison clause 5
exists for would be between one audience's form and another audience's *name
over the base's form*. A measurement that is quietly wrong is worse than a page
that is honestly missing, which is the argument `origins` is closed by default
on.

All-or-nothing per request for the same reason: two matched deltas of which one
applied is a form nobody authored, judged or asked for. A context matching
nothing is **not** a failure — it is the base tree, which is what every
deployment that has never heard of an audience is already being served.

### 6. The store dimension is not in this record

`composingTreeSourceFromStore` takes an `AudienceOverlaySource` — a seam, not a
table. 0263's store dimension is a schema change on top of 0260's; the
composition needs none of it to be built, tested or reviewed, and the portal
ships several times a day over that store. A deployment holding its forms in a
module satisfies the seam today; the store will satisfy it when the dimension
lands.

### 7. The audience a page reports is the host's to name

`TreeSource.load` returns the tree and nothing else, so the composing source
cannot hand back which audiences it served. `composeTreeForContext` does — it
answers `{ tree, audiences }` — and `audiencesFor` is published, so a host names
the audience on the signals the page sends by evaluating the same rules over the
same context. Deterministic, and the same answer.

## Alternatives considered

**An expression language with `and`, `or`, `not` and comparisons.** More
expressive and it buys nothing yet: `or` is the rule list, `and` is the clause
list, and `not` has no caller. It would need its own safety story — a predicate
is evaluated on every page view in the customer's process — and a grammar to
version. Available later without moving anything built here, because a clause
list is a special case of one.

**A host-supplied predicate function.** One line to accept and ungovernable: a
function cannot be stored in the control plane, shipped to the data plane,
reviewed by a person, or judged by the Gate. It is also what a host can already
do by writing its own `TreeSource`, which is the status quo 0263 exists to end.

**Equality on one value per clause.** Smaller, and it forces one audience per
accepted value with a duplicated delta under each — the failure 0263 named.

**The id's spelling or the overlay's list order as the application order.**
Rejected: the first makes `aud_a` beat `aud_b` for no reason a deployment chose,
and the second splits the ordering across two values a host must keep agreeing.
Rules are an ordered list and they are the only order.

**Bumping the revision per applied delta**, so a composed page says how many
deltas made it. Rejected in clause 4: it breaks the join the measurement is
built on, and the number would mean something different from every other
revision in the system.

**Dropping a stale delta and serving the base**, which is what a cache or a CDN
would do. Rejected in clause 5: it is the one failure mode that corrupts the
measurement instead of interrupting the page.

**Widening `TreeSourceError` with a `stale-form` code.** `TreeSourceError` is
published and switched on exhaustively by hosts, and what a caller does about an
uncomposable page is what it does about any other page it cannot have. The
sentence naming the audience and the revision is what somebody acts on, and it
is in `detail`.

## Consequences

- **0263 clauses 1 to 4 are built**, in `src/audience/rule.ts` and
  `src/audience/compose.ts`, with the composing `TreeSource` 0263 names beside
  `treeSourceFromStore`. Published through `./store`, which already carries
  `audienceIdSchema`, so no new entry point and nothing for the documentation
  site to grow a page for.
- **Nothing about today's deployments changes.** `treeSourceFromStore` is
  untouched, a deployment with no rules composes to the base, and a request with
  no context matches nothing.
- **`docs/portal.md` unit 9 has its record.** What it still needs before a
  screen is the store dimension (clause 6) and a portal surface for authoring a
  rule, neither of which is here.
- **The last matching rule wins**, so a deployment orders its rules from general
  to specific. That is a thing a portal rule editor has to show, and it is the
  one part of this record a person has to understand.
- **A base edit stales every audience delta.** A deployment serving three
  audiences cannot publish a base change without rebasing three deltas, or those
  three audiences stop being served. That is the honest cost of clause 5, it is
  the same shape 0340 gave a waiting proposal, and the portal will need the same
  *stale / conflicts* reading over audience deltas that it has over proposals.
- Composition runs no invariant check of its own. `insert` already refuses a
  node whose id the tree holds, which is the only invariant
  `validateTreeInvariants` has, so two deltas that both insert one node id fail
  on the second rather than making a tree to invalidate. A defensive check was
  written, shown unreachable by a planted mutation, and removed; the reason is a
  comment where the check was.
