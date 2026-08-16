# When is a thing one primitive, and when is it a composition?

Every primitive added to the registry answers this question, usually without
anyone noticing it was asked. This is the rule for answering it deliberately.

## The question

A hero section can be built two ways.

As **one primitive** with a dozen props — `headline`, `subhead`, `imageUrl`,
`imagePosition`, `ctaLabel`, `ctaHref`, `secondaryCtaLabel`, `align`, `showBadge`
— it registers once and drops in whole.

As a **composition** — `section > stack > heading + prose + button` — it is six
nodes a model or a person can rearrange.

Both render the same page. They differ in what can happen next.

## Why the usual argument does not apply here

Frameworks have favoured composition over modification for a long time, and the
reason was **maintenance cost**. Adding a thirteenth prop meant a person reading
a long component, holding twelve interacting flags in their head, and not
breaking the other callers. Building `HeroB` out of `HeroA` meant editing
`HeroA`.

That argument is much weaker than it was. Writing a second hero from scratch is
now cheap, and a primitive with twelve props is no longer expensive to author or
to extend. Taken on its own, this is a real case for keeping things atomic, and
it should not be waved away.

**But it is an argument about build time, and Loom's constraint is at runtime.**

Cheap authoring helps the developer on a Tuesday afternoon. It does nothing for
the visitor whose page has to adapt *now*. When someone says "move the CTA above
the headline", the runtime can emit exactly one thing against a twelve-prop
hero:

```
configure(hero, { ctaPosition: "above" })
```

and that works only if somebody predicted `ctaPosition`. If nobody did, the
change is not expensive. It is **unreachable**. The runtime cannot write and
register a new primitive mid-session — that is code generation, which is the
thing Loom exists not to do ([0001](../decisions/0001-tree-and-delta-as-the-unit-of-change.md)).

So the principle is not about the cost of change. It is about range:

> **Props enumerate the adaptations you predicted. Structure permits the ones
> you did not.**

## The test

**A prop that a delta could have expressed is a delta in disguise.**

Read each prop and ask which of the four operations it is impersonating.

| Prop | The operation it is really | Verdict |
| --- | --- | --- |
| `imagePosition: "left" \| "right"` | `move` | decompose |
| `ctas: Cta[]`, `items: FaqItem[]` | `insert` / `remove` | decompose |
| `showBadge: boolean` | `insert` / `remove` | decompose |
| `align: "start" \| "center"` | none — no operation reorders glyphs | real prop |
| `text`, `href`, `alt`, `label` | none — content | real prop |
| `animationSpeed`, `parallaxDepth` | none — parameterises indivisible behaviour | real prop |

Props that encode **the presence, count, or arrangement of children** are
structure smuggled into a prop bag. Props that encode **content**, or tune
behaviour that cannot be split into nodes, are real props.

### The distinction that is easy to get wrong

**A prop that decides how many children exist** is `insert`/`remove` in
disguise. **A prop that decides how however-many children are laid out** is a
real prop, and looks almost identical.

`loom.feature-grid` has a `columns` prop, and it passes the test: it is a
minimum column width fed to `auto-fit`, so it is a floor rather than a count,
and it changes nothing about which features exist. A `columns` that truncated
the list at three would fail.

Ask the sharper question — *does changing this prop change the set of nodes?* —
rather than pattern-matching on the prop's name.

## What to do when both readings are defensible

Decompose.

The two mistakes do not cost the same thing:

- **Over-decomposing costs tedium.** A hero is six nodes to review instead of
  one, and six lines in a projection.
- **Under-decomposing costs reachability.** The adaptation cannot be proposed at
  all, by anyone, ever, without a developer shipping a new prop.

Tedium is recoverable at any time. Unreachability is a wall, and it is invisible
until a visitor hits it.

## What bounds it

Decomposition is not free, and "decompose everything" is the opposite error.
Every node is a node the Gate assesses, a node in the projection the model is
shown, and a node against the compiled-grammar budget
([0014](../decisions/0014-the-reply-schema-must-fit-a-grammar-budget.md)). A
page of forty atoms is worse than a page of eight composites that each carve at
a joint someone would actually want to change.

Two things stay atomic regardless of how many props they carry:

1. **Indivisible behaviour.** An animated gradient, a marquee, a canvas effect,
   anything that measures itself. Splitting these produces nodes that mean
   nothing alone, and their behaviour belongs in the registered component
   ([0009](../decisions/0009-primitives-receive-props-in-a-bag.md)).
2. **Things with no interesting interior.** A badge is a badge.

## Starting compositions: the part that makes this cheap

The obvious objection to composition is convenience. If a hero is six nodes,
does every hero start as six operations?

No — because `insert` carries a whole subtree, not a single node:

```ts
export const insertOperationSchema = z.object({
  op: z.literal("insert"),
  parentId: nodeIdSchema,
  index: z.number().int().nonnegative(),
  node: loomNodeSchema,     // <- a subtree
})
```

So a starting composition is **one `insert` operation** carrying a six-node
hero. Drop in the whole thing in a single reviewable step, then rearrange it
freely afterwards because it is structure rather than configuration.

This needs no new concept and no new registry surface. It is an instance of the
pattern [0057](../decisions/0057-a-preset-is-a-deterministic-interpreter.md)
already accepted: a pure function from the current tree to a list of operations,
wrapped in an ordinary `ChangeInterpreter`, assessed and gated and logged like
any other change. So it re-plans against the tree it is handed, its provenance
says it was computed rather than guessed, and its inverse is free.

A catalogue of starting compositions is a convenience over the delta model,
never a parallel channel into the tree. If one ever needs addressable surface of
its own, that is an escalation.

## Where this was already decided

[0052](../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)
reached the same rule from the porting side — *repeated content becomes child
nodes, fixed fields stay props* — and worked out the consequences for analysis,
stakes, inversion and attribution. It is the ruling; this page is the reasoning
a person needs to apply it to a primitive nobody has ported yet, and the reason
the usual composition-over-modification argument is not the one doing the work
here.
