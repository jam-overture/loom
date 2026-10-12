# 0262 — A page is put back by proposing the change that puts it back, and a store never deletes

**Status:** Accepted
**Date:** 2026-10-12
**Section:** §2, §6

> **Why this number.** `0261` is the highest record on `main` at `03ce8ba`. `#598`
> adds none — it cites `0260`, which is already here — and the two records open
> branches add both claim `0259`, which is a clash between those two and not with
> this.
>
> **Why `Accepted` rather than `Proposed`.** It contradicts no `Accepted` record
> and needs nothing from another lane. It declines to extend `TreeStore`, which is
> the cheapest of the shapes available and the one that leaves every other open.
> The question it does *not* settle — what a reseed may do when the authored page
> wants an id the log cannot hand back — is marked below as open and nothing here
> depends on the answer.

## Context

[0259](0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md)
made this site's three pages rows in the store rather than trees built on every
request, and seeding is deliberately create-if-absent: a page that exists has a
history, and a deploy that re-seeded over the top would throw it away on every
release.

`Loom portal` filed the consequence on 12 October, in the module where somebody
reaching for the undo will be standing:

> **Once a page is in the store, editing its builder stops changing the site, and
> there is no supported way to undo that.** The authored version is still in the
> repository and can still be built; it cannot be put back on the shelf. A
> deployment in that position has two options and neither is the product: append
> its way back to the shape it wants, or open a SQL client.

`TreeStore` is `create`, `head`, `revisions`, `list` and `append`. There is no
delete, in the contract or in either implementation.

The entry was explicit that it was not asking for `delete(treeId)`, and it was
right not to: a store whose rows are the audit trail has a good reason not to
offer one. *The row is gone* is a worse answer than *the row says it was
replaced*. What it asked for was closer to a **reseed** — an append that carries
the tree back to what the builder produces now, recorded with its own provenance,
so the log says *this page was put back on this date* instead of the history
simply ending.

## Decision

**1. `TreeStore` does not grow a method.** Not a delete, not a reseed, not a
reset. The five it has are the five it has, and going back is expressed with the
one that already writes.

**2. Putting a page back is a change like any other.** It is a sequence of the
four operations against a known base revision, carrying provenance, judged by the
Gate before it is applied, appended to the log, and invertible by `planRevert`
afterwards. There is no privileged path that writes a tree without being
proposed, because a path like that is exactly the one whose entries nobody can
account for later.

**3. The plan is computed, not stored, and it decides nothing.**
`planReseed(stored, authored)` in `src/store/reseed.ts` is `planRevert`'s
sibling and has its manners: it produces the operations and the obstacles, and
something else proposes them. A revert undoes one entry in the log; a reseed
carries the whole page to a tree somebody else built.

**4. The four operations are enough, and that is a property of ids rather than
luck.** Node ids are minted once (0003), and a builder is pure with a
deterministic id factory, so the authored tree names the same nodes the stored
one does. The join key is therefore exact: the difference between two builds of
one page is a set join and a position pass, with no structural alignment and no
heuristic. `configure` reaching a text node's `value` and a slot's `name` is what
makes the result exact rather than nearly exact — a builder whose headline
changed produces a text node with the *same* id and a new value, which is the
likeliest reseed there is.

**5. A plan that did not land is not returned.** Every operation is planned
against a simulation of the tree it will be applied to, and the simulation is
compared to the authored tree before the plan is handed back. Two facets cannot
be closed by any plan — a node's `kind`, and an element's primitive `type`, which
are what a node *is* — and a page that differs by one of those is reported as
`unexpressible`, naming the nodes, rather than reseeded into something else.

**6. What a reseed costs is carried on the plan, not judged by it.** `retires` is
what the reseed writes over; `revives` is the ids the authored tree wants that the
stored page no longer holds. Both are properties, in `discards`' sense (0035):
the Gate decides what a reseed that revives an address is worth, and whether a
revived id is a node *restored* or an address *recycled* is a question only the
log can answer — `idReturnsIn` is what answers it (0038).

## Consequences

A deployment that wants its authored page back now has a supported route, and it
is the route everything else in Loom takes: build the page, plan the reseed,
propose it, let the Gate weigh it, and read in the log afterwards that it
happened and who asked. Nothing in the history is lost, and the undo of a reseed
is an ordinary revert.

The surface that filed this gets what it needs without a store method, so
`memoryTreeStore` and `postgresTreeStore` are untouched and the contract two
implementations have to keep stays five methods wide.

`compareTrees` keeps its claim (0016): it is still a description and never a
recipe. Here it decides what the recipe may attempt and then proves that it
worked, which is the one direction between the two that cannot put an entry in
the log nobody proposed.

`NODE_FACETS` is new in `src/tree/compare.ts`, which makes the facet list
walkable and means the two a reseed cannot close are checked against the whole
set where they are written. A sixth facet stops `reseed.test.ts` compiling until
somebody says which kind it is.

**The open question this does not settle.** A reseed is exact or it is refused,
and refusal is the right answer today because the alternative is a decision about
identity that is not a framework routine's to take. If the authored page wants an
id the log cannot hand back as the same node, the only way to serve it is to
re-identify — to put back a page that *looks* like the authored one with fresh ids
where the old ones could not return. That is cheap to build and expensive to mean:
reader counts are keyed on node ids, so a re-identified page starts every part's
readership at zero, and attribution loses the thread at the same moment. Named
here, recommended against on a schedule, and left for whoever is told that an
exact reseed was refused and still wants the page back.

## Alternatives considered

**`delete(treeId)` on `TreeStore`, and re-seed.** The shape the finding went out
of its way not to ask for, and the reason stands: a log that can end is a log that
cannot be trusted to say what happened. It would also make the seeding path, which
is create-if-absent on purpose, the thing standing between a deploy and a
deployment's history.

**A fifth tree operation — `replace`, taking a whole root.** Rejected on 0009's own
grounds, which this case does not weaken. A whole-tree replacement collapses a
reviewable change into one opaque one: the Gate could weigh *this page was
replaced* and nothing finer, and a reseed is exactly the change where a reviewer
wants to see that the footer is coming back and the banner is going. The four
operations express it, and express it legibly.

**A `reseed` method on the store, writing the authored tree directly.** Cheaper to
call and worse in every other way: it is a second path that changes a tree, so the
claim that `append` is the only one (0001) stops being true, and the entry it
writes has no proposal behind it. Every argument for the Gate is an argument
against this.

**Turning `TreeDifference` into operations.** The obvious implementation and the
one `compare.ts` refuses in as many words, because a second shape that describes
change gets applied by somebody eventually. The planner produces operations
directly and uses the comparison only to check itself, so the description never
becomes a recipe.

**Minimal operations by a general tree diff.** Not attempted. A diff that has to
align two trees without a join key is a heuristic, and a heuristic that is wrong
writes a wrong page. Ids make the alignment exact, and the two passes the plan
makes — claim every child to its authored parent, then order each container — are
near-minimal in the cases that matter and provably correct in all of them, which
is the better half of that trade.
