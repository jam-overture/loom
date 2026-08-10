# 0041. Authorship is derived from the log, not carried on a node

**Status:** Accepted
**Date:** 2026-08-06
**Section:** §1 → §5

## Context

Loom's claim about AI-authored change is that every proposal is "inspectable,
gateable, attributable, and reversible". Three of those were real. Attribution
was real only in the aggregate.

The log carries provenance on every entry (0016), so "who asked for revision 12,
who wrote it, and who allowed it" has always been answerable. But nothing joined
that to a node. A reviewer looking at a rendered tree and pointing at a heading —
which is the moment attribution is actually wanted, and the one the portal puts
in front of them — had no way to ask who put it there short of reading the whole
log by eye and mentally replaying it.

That gap has been carried in the report tail since day 26 as "there is no
node-level provenance". The obvious fix is the one a reasonable engineer reaches
for first: put the author on the node. Give `LoomNode` a `provenance` field, or
an `authoredBy`, stamped when the node is inserted. It reads directly, costs one
field, and needs no log at all.

It is also wrong, and the reasons are worth writing down because the same
argument will come up again for every other derived fact somebody wants to reach
for quickly.

## Decision

**A node carries no authorship. Who placed a node is derived from the tree's log
on demand, by a bounded walk backwards from the newest entry.**

`attributeTree(reader, tree)` returns, for every node in the tree it was handed,
the log entry that placed it and the entries that have touched it since. The
tree schema is untouched: no field, no `TREE_SCHEMA_VERSION` bump, no migration,
nothing stored twice.

### The walk goes backwards, and stops early

For a node that is in the tree now, the first insert carrying it that a
backwards walk meets *is* the one that put it there. Anything that removed it
afterwards would need a later insert to bring it back, and that later insert is
the one the walk would have met first. So the walk stops at the placement rather
than folding the log, and a recently placed node is answered by one page.

This is what makes the derived approach affordable. A fold would have made
attribution cost the whole history and grow with it — the exact objection that
made the snapshot exist in the first place (0016).

### Three outcomes, because a bounded read must be able to say so

Every read in Loom is bounded, and this one is no exception: it gives up after a
page budget. So a node is `placed` (the walk found the insert), `seeded` (the
walk reached the start of the log and found none, so it was there from the
beginning), or `undetermined` (the walk ran out first).

Collapsing the last two would be the tempting simplification and a lie of
exactly the kind Loom exists to avoid: it would credit the seed with work
somebody did, on the basis that we stopped looking.

### An insert names one node and carries the rest

An insert brings a whole subtree, so every node in it was placed by that
revision — but only the root was asked for. A touch records `named` to keep those
apart. "The model added a card" and "the model added the heading inside a card it
added" are different sentences, and a reviewer deserves the one that is true.

### It attributes the tree it was handed

`attributeTree` takes a `LoomTree`, not a `TreeId`, and ignores log entries newer
than that tree's revision. A portal that rendered revision 5 and then attributed
against a head that had moved to 7 would credit nodes with placements nothing on
screen reflects. The same reasoning `auditSnapshot` uses when it reports both
trees rather than making its caller re-read one.

## Consequences

- Attribution is available for any tree any `TreeReader` can reach, including
  historical ones, with no schema version to negotiate and nothing to backfill.
  Every tree ever written is attributable retroactively — a stored field would
  have been null for all of them.
- There is exactly one copy of "who authored this", and it is the log. A field on
  the node would have been a second copy of a fact the log already determines,
  free to disagree with it after a replay, a revert, or a hand-authored delta.
- Attribution costs a read. The portal's tree page now does a bounded log read it
  did not do before. It is one page for a young tree and capped for an old one,
  and it is on a review page rather than a render path.
- A node placed further back than the budget reaches is honestly unattributed
  rather than wrongly attributed. A caller that needs certainty raises the
  budget; the answer never silently degrades into a wrong one.
- Removals are invisible to this. A node the log removed for good is not in the
  tree being attributed, so nothing asks about it. "What was deleted, and by
  whom" is a different question, answered by `/history` and by telemetry.

## Alternatives considered

**A `provenance` field on `LoomNode`, stamped at insert.** Rejected, and it is
the one worth arguing with. It reads without a log, needs no walk, and answers
instantly. Against that: it changes the tree schema, which bumps
`TREE_SCHEMA_VERSION` and migrates every stored tree and every fixture; it
duplicates a fact the log already holds, so a replay that produced a differently
stamped node would be a divergence in something that is not really data; and it
answers only for nodes inserted after the field existed, leaving every tree built
so far permanently anonymous. Worst, it is per-node storage that grows with the
tree for a fact that is per-revision — a card and its twelve descendants would
carry thirteen identical copies of one provenance record.

**A stored attribution index, maintained on append.** A table from node id to the
revision that placed it, written alongside the log. Rejected for the reason 0016
gives: a materialised view is only safe when the thing it summarises can rebuild
it, and this one would be a second write on the one path that must not grow more
ways to fail. The snapshot earns that cost because §3 renders per request; a
review pane does not.

**A forward fold, reusing `replayTree`.** The machinery exists, it already
produces consecutive states, and `IdHistory` rides along on it (0038). Rejected
because the cost profile is exactly backwards: a fold reads the entire log to
answer a question about the newest end of it, and gets slower the longer a tree
has been edited. The backwards walk is not merely an optimisation of the fold —
it terminates on a property the fold cannot exploit.

**Attributing one node at a time, on selection.** A narrower read, and it was the
first shape tried. Rejected because the caller that wants this wants it for
whatever the user clicks next, so per-node reads mean one log read per click and
a pane that visibly loads. Attributing the whole tree shares the walk: the
backwards read that resolves one node has already passed every entry that
resolves the others.

**Recording a move of an ancestor as a touch on its descendants.** Rejected as
noise. A node whose grandparent moved did not change; its position relative to
its own parent is exactly what it was. Reporting it would put a line under every
node in a subtree every time the subtree moved, and bury the touches that were
about the node itself.
