# 0263 — A page is a base tree and the deltas an audience earns

**Status:** Accepted
**Date:** 2026-10-12
**Section:** §1, §3, §5

> **Why it is raised.** The maintainer, 12 October: *"It needs to support
> updating a tree per site, per region, per user, etc. They need to be able to
> bifurcate across whichever they see fit."* Nothing in Loom serves two readers
> differently today, and the shape chosen for it decides what a page **is** —
> which is the tree schema's business and §1's to settle before a screen is
> built on either answer.
>
> **Why this number.** `0262` is raised on the same branch and takes the number
> below.
>
> **Accepted on 13 October** — *"Yes, I continue to like audience scoped
> deltas."* It is the largest engineering commitment of the five accepted that
> day: the store grows a dimension and a composing `TreeSource` joins
> `treeSourceFromStore`. Clause 5 is what the adaptation plan's measurement rests
> on, and it is why the five signal tables take both dimensions in one
> migration.

## Context

**The seam already exists and nothing uses it.** `RenderRequest` carries an
opaque host context, and `TreeSource.load` is handed the whole request:

```ts
export type RenderRequest = {
  readonly treeId: TreeId
  readonly editMode: boolean
  readonly addressed?: boolean
  /** Opaque host context — audience, locale, flags — passed through to the source. */
  readonly context?: JsonObject
}
```

§3 defined that seam deliberately and left it for a host to fill. The adapter
that ships ignores it: `treeSourceFromStore` does `store.head(request.treeId)`
and returns one tree per id, whoever is asking.

So *serving two readers differently* is already expressible by a host writing
its own `TreeSource`. What does not exist is any notion, in the store or in the
portal, that a page **has** more than one form — which is what makes it
ungovernable rather than merely unbuilt. A host can already serve a variant
Loom has never seen, never judged and cannot report on.

## Decision

**A page is one base tree, plus deltas that apply when an audience matches. The
match is evaluated in the customer's app, on every request.**

1. **An audience is a predicate over the opaque render context**, not a new
   identity. Site, region, locale, cohort, flag — whatever the host puts in
   `context`. Loom never learns what the values mean, which is the same contract
   `PolicySource` already keeps.

2. **A variant is a delta, not a tree.** It is held, judged, logged and inverted
   by the machinery that already does those things for every other change. A
   change to the base reaches every audience; a fix made once is made
   everywhere.

3. **Per-user does not mean a tree per user.** It means rules mapping a
   visitor's context to a set of deltas. The set is bounded, the rules are
   small, and both are cacheable beside the base — which is what keeps clause 4
   affordable.

4. **Composition happens in the data plane, per request**
   ([0262](0262-the-control-plane-is-hosted-and-the-render-path-stays-in-the-customers-app.md)).
   Base plus matched deltas, locally, with no call to the control plane and
   nothing about the reader leaving the customer's process.

5. **A signal names the audience it was collected under**, or the measurement
   is worthless. Two variants folded into one tally cannot be told apart
   afterwards, and the whole point of serving two is to compare them.

## Alternatives considered

**A full tree per variant.** The obvious shape and it fails on maintenance
rather than on storage. Every variant needs its own review, every copy fix is
made N times, and the N drift apart in exactly the places nobody is looking.
It also makes *what changed for this audience* unanswerable: two trees diff
into noise, where a delta says it in the vocabulary the portal already speaks.

**A variant as a whole second page, with its own id.** Cheap today — it needs
nothing from §1 — and it moves the problem rather than solving it: the portal
would list eleven pages where the customer has three, with no way to say which
are the same page.

**Resolve the audience in the control plane.** Rejected with 0262: it puts a
request to Loom in front of every page view, carrying who the reader is. Both
records stand or fall together.

**Leave it to the host's own `TreeSource`.** What is possible today, and it is
the status quo this record exists to end: a host serving a variant Loom has
never judged is the one thing a governance product cannot shrug at.

## Consequences

- **The store gains an audience dimension.** A page's row is no longer one
  snapshot; it is a base plus a set of audience-scoped deltas, each with its own
  standing. This is a schema change on top of
  [0260](0260-a-project-is-the-unit-loom-stores-governs-and-measures-under.md)'s
  and is §1's, not a portal routine's.
- **The signal tables need the audience too**, per clause 5, and they are being
  scoped for the project dimension right now. **Both dimensions should land in
  one migration rather than two**, which is the single most actionable thing in
  this record.
- **The portal's Pages screens change meaning** — a page is a thing with forms,
  not a thing with a shape. Worth settling before those screens are rebuilt on
  the prototype's layout, or they are built twice.
- The Gate judges a variant as it judges anything else, so nothing in §2 moves.
  An audience-scoped delta that would be refused on the base is refused here.
- `treeSourceFromStore` gains a composing sibling rather than being replaced:
  one tree per id stays the right answer for a deployment that wants it.
- If this is **refused**, the honest fallback is the second alternative — a
  variant is a separate page — and the portal should say that is what it is
  rather than implying a relationship it cannot keep.
