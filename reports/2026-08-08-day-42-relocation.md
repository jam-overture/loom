# 2026-08-08 (day 42) — the same relocation, phrased two ways, judged twice

**Build order section:** §2 — Composition Runtime. A defect in what the Gate is
allowed to see, found by the lessons routine on #58 and handed to this routine
unfixed.

**Branch:** `day-42-relocation`, off `day-41-both-ways`.
**PR:** against `day-41-both-ways`, so the diff is this unit alone.

---

## Where this run started

Second run of 8 August; day 41 was twelve hours ago. Nine PRs open, all mine,
**none with maintainer feedback**. Every human-looking comment on #49–#58 is one
of my own report comments or Vercel's deploy bot, and the one genuine human
comment in recent history is still *"tell me more about item number 2"* on #45,
answered in full on 4 August. That fork is still yours.

So nothing to act on before continuing — but not nothing to pick up. The lessons
routine posted lesson 07 on #58 four hours ago and handed this routine two items
found while writing it, both in §2. **§2 is earlier in the build order than §5**,
where day 41 was working and where its own recommendation pointed, so this run
went to §2. Same call day 39 made for the same reason.

## What was built

### The defect, stated exactly

The lessons routine executed this and reported the table. Under a policy
declaring `loom.card` protected:

| Delta | `touchedPrimitiveTypes` | Stakes |
| --- | --- | --- |
| `remove main` | `["loom.card"]` | `critical` |
| `move card → header` | `["loom.card"]` | `high` |
| `move main → header` | `[]` | `medium` |

The bottom two rows are **the same physical relocation**. The card ends up under
the header either way; the deltas differ only in which node they name. One of
them raises a protected-primitive factor and the other names nothing at all, and
they differ by a whole stake level.

The same split ran through the other axis. `irreversibilityReasons` filtered
`touchedPrimitiveTypes` against `outOfTreeEffectTypes`, so a move that named a
live checkout was irreversible and a move that named its parent slot was not.

Where it came from is not carelessness. `tallyOperation` walks the whole subtree
for `insert` and `remove` and stops at the named node for `move` and `configure`.
For `configure` that is exactly right — configuring a parent does not
reconfigure its children. For `move` it made the field depend on a choice the
author was free to make either way.

### Why I did not take the recommendation

The lessons routine recommended **document, do not change behaviour**: a couple
of lines saying a subtree riding along on a move is not touched. It reached that
from the field's *name* — "touched" licensing a reading the code does not
implement — and on those terms it is right.

I reached a different answer from the *verdict*, which is the thing that has to
be defensible. A delta is drafted by a model, and a model has a free choice
between naming the slot and naming the card. A Gate whose answer moves with that
choice is not gateable in the sense this project claims — the same proposal,
worded twice, gets two answers. That is a correctness problem in §2, not a naming
problem, and a comment describing it accurately would leave it standing.

I have said so plainly on the PR rather than quietly overriding them.

### The rule

**The analysis answers the same for the same physical change, whichever node the
delta names.** Where phrasing-independence forces a choice between two answers,
take the more conservative one.

A move is now measured over the subtree it carries:

- **`relocatedNodeCount`** — every node a move carried, the one it named
  included. `movedNodeCount` keeps its meaning, nodes a move *named*, and is now
  documented as such. One operation moving two hundred nodes was a fact with no
  field.
- **`relocatedPrimitiveTypes`** — element types across the whole moved subtree.
- **`touchedPrimitiveTypes` means created, destroyed, or reconfigured.** A move
  contributes nothing to it whichever node it names — one definition holding for
  all four operations, instead of a different reach per operation.
- **`protected-type-relocated`**, a new stake factor at `high`. The same level
  `protected-type-touched` carries, so a directly-named move keeps the stakes it
  had and a riding-along one gains them.
- **Reversibility reads touched *and* relocated types** against
  `outOfTreeEffectTypes`.

The two rows now agree: both are `high`, both name the card, and both say
*relocates* rather than *touches*, which is the sentence that is true.

### The tie-break, since it is the part worth arguing with

Whether relocating a live payment flow fires anything outside the tree is
genuinely open. What is not open is that the phrasing should not decide it — so
one answer had to be picked for both, and I picked the conservative one. A change
wrongly called irreversible is offered to a person for confirmation; one wrongly
called reversible is applied. Those are not symmetrical mistakes.

This is the one place the run **raises** what the runtime does: a move of a
subtree containing a protected type goes `medium` → `high`, and one containing an
out-of-tree-effect type becomes irreversible. A host whose ceiling sits at
`medium` will see confirmation requests for relocations it used to auto-apply.
That is the point of the change, and it is worth knowing before it lands.

### `affectedNodeIds` deliberately did not move

It is the input to `broad-change`, a breadth measure, and it is documented as
directly-touched nodes. Making it subtree-wide would turn every move of a large
subtree into a broad change as a side effect of a fix about types. Breadth of
relocation is a different question from breadth of rewriting, and it now has its
own number to be asked with.

### The second item: three facts that were not crossing into telemetry

The lessons routine's other finding: `removedPrimitiveTypes` is bounded,
non-identifying, already a subset of a field that *is* retained, and the input to
the only `critical` stake factor — and it was not in `assessmentSummarySchema`.
A corpus could group by "the Gate saw `commerce.checkout`" but not by "the Gate
saw `commerce.checkout` **destroyed**". Agreed, and added, along with the two new
fields for the same reason.

That turned out to need a rule rather than three lines. Telemetry records are
**parsed on the way back out** — `telemetryPostgres` runs every page through
`telemetryRecordSchema`, and a record that does not parse fails the whole page as
`unavailable`. Added the ordinary way, the new fields would have made every
`change-assessed` record written before today either unreadable or silently
re-described. So they are optional and never defaulted, and 0045 makes that the
rule for every later addition.

## Decisions I made that were not specified

**`relocatedNodeCount` has no stakes threshold.** Stakes measure damage; a
relocation destroys nothing and is fully reversible, so its size is not damage in
the sense `large-removal` measures. The number is recorded because §6 keeps facts
before v2 consumes them, and because it is the only place a relocation's size
appears at all. If a host ever shows that moving enough of a page is dangerous on
size alone, the field is already there and the factor is small.

**The relocated set includes the moved node itself.** Excluding it would make
`move card` and `move main` disagree again, one level down — which is the whole
defect.

**`protected-type-relocated` is a new factor rather than a wider reading of
`protected-type-touched`.** The two sentences a reviewer needs are different: one
says the card was rewritten, the other says it is somewhere else now. Widening the
existing factor would have printed "touches protected loom.card" for a card
nothing wrote to.

**`protected-type-touched` is not retired**, and dispositions already written
under it still mean what they meant. For a pure move the Gate now emits the
relocated code instead — same level, so no disposition changes, only the sentence.

**Deduplicating the out-of-tree list.** A type both touched and relocated in one
delta is named once in the reason, not twice. There is a test.

## Decision records

- **0044 — A move relocates a subtree, and the analysis measures the subtree,
  not the phrasing** (§2). The rule, the tie-break, and the three alternatives
  rejected, including the lessons routine's own recommendation and my reason for
  not taking it.
- **0045 — A telemetry field added later is optional, and never defaulted** (§6).
  The fourth narrowing rule, now beside the other three in `event.ts`.

**Nothing superseded, and nothing contradicted.** 0002 still holds — two axes and
a policy, with this changing what the axes are computed from and not how many
there are. 0023's narrowing rules gain a fourth that constrains how the schema
grows rather than what crosses it. No escalation: `LoomTree`, the delta model,
and `TREE_SCHEMA_VERSION` are untouched.

## Test coverage and status

`pnpm verify` green end to end: build, typecheck, both suites, portal build.

- **Runtime: 993 tests / 78 files**, all passing, **nothing skipped** — up from
  980 / 78. Thirteen new tests, no new file; every one landed in a suite that
  already existed.
- **Portal: 313 tests / 28 files**, unchanged. Nothing in the portal reads these
  fields yet.
- **Both live API tests ran and passed** against `claude-opus-5`, twice during
  this session including in the final verify. No model id changed; nothing in
  this unit calls a model, since analysis is entirely deterministic.

What they hold down:

- **The analysis:** a move counts every node it carried, the one it named
  included; a delta with no move relocates nothing; the two phrasings of one
  relocation produce the same relocated types; neither phrasing puts a type in
  `touchedPrimitiveTypes`; and a delta that both moves and reconfigures keeps the
  two apart.
- **The stakes:** a relocated protected primitive is `high` and says "relocates";
  a pure move no longer reports `protected-type-touched`; and relocating still
  ranks below destroying.
- **The Gate, end to end from a real delta:** both phrasings of the relocation
  reach the same disposition at the same stakes, and the reason names the card.
  This is the lessons routine's table, executed as a test.
- **Reversibility:** an out-of-tree type is read the same way whichever node the
  move named, and a type both touched and relocated is named once.
- **Telemetry:** the destroyed and relocated types cross into the summary, and a
  record written before those fields existed parses with them absent rather than
  defaulted.

**Nothing weakened. Nothing skipped.**

### Not verified in a browser

No UI changed, and no portal page reads the new fields. The Vercel preview on the
PR is day 41's portal.

## Open questions and blockers for the next session

1. **Lesson 07 (#58) documents the behaviour this PR changes.** Its exercise D is
   built on the executed table above, and once this lands two of those three rows
   read differently. The lesson's written answer argues both sides and a third
   position, so it does not become nonsense — but it does become out of date.
   **Recommendation: land #58 before this branch**, and let the lessons routine
   correct lesson 07 the way it corrected lesson 04 in #49. This is the second
   instance of the same collision (#52/#54 is the first), which is now a pattern
   rather than an accident.
2. **`/history` still cannot be given a revision by typing one** (day 41).
   **Recommendation: a revision box on `/history`, next §5 unit.** Unchanged, and
   still the smallest remaining §5 gap.
3. **Still nothing scheduled** — telemetry prune (day 34) and snapshot audit
   (day 28). **Recommendation: one nightly Vercel cron covering both**, once you
   are happy with the 90-day default. Longest-carried item, unanswered across
   eight runs.
4. **Nine PRs are open** — #49, #50 → #51 → #53 → #54 → #56 → #57 → this one,
   #52 → #55 → #58. The build stack is seven deep. **Recommendation: land #50**;
   it is the bottom of the build stack, and #49 is independent and also ready.
5. **Merge order between #52 and #54 still matters** and is unchanged: #54 fixes
   the behaviour lesson 05's exercise D documents. Detail is on #52.
6. **Carried, still yours — sign-in lockout history** (option B, #45/#50).
   **Recommendation: not yet**; it is a governance call about retaining failed
   attempts against a public form.
7. **ARCHITECTURAL, from day 35, still yours: should a tree carry the ids it has
   retired?** Unchanged. **Recommendation: not yet.**
8. **Carried, unchanged:** a contained emit failure is invisible by design
   (day 39); a sink can still block (day 39); telemetry written before day 37
   keeps `interpreter-unavailable` on failures that were really rejections; RLS
   fails closed for a non-owner role (day 34, by design); the portal has no
   component test harness (day 26); a missed `db:push` is still a sign-in outage
   (day 32); `policyId` is a name rather than a fingerprint (day 31); calibration
   does not segment by policy (day 31); and the reply schema sits near its
   3500-byte guard.

**§7 — Marketplace — remains the only section I will not start without you saying
so.** Sections 1–6 are functional end to end; what is left in each is the list
above.
