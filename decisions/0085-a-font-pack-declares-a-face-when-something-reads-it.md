# 0085. A font pack declares a face when something reads it

**Status:** Accepted
**Date:** 2026-08-22
**Section:** §4b

## Context

Two findings filed by `Loom primitives` on 21 August, a day apart, are the same
question asked from both ends.

**`accentFamily` is emitted as a variable no primitive reads.** `fontPackSchema`
has declared an optional `accentFamily` since the theme vocabulary was ported;
`apply.ts` emitted it as `--loom-accent-family` when a pack set one. None of the
twenty registered packs ever set one, and none of the fifty primitives ever
read one. `tokens.ts` exports `family(role: "heading" | "body")` and there is no
third role. The finding put it exactly right: *it is a seam with no other end.*

**A font pack declares three families and none of them is monospace.**
`loom.code` and `loom.kbd` need a monospace face and the vocabulary had no word
for one. The primitives routine worked around it in the only way that does not
hard-code a literal below the root, and the workaround is the reason this record
is cheap: `tokens.ts` asks for

```ts
`var(--loom-mono-family, ${MONOSPACE_STACK})`
```

— a `var()` whose **fallback** is the system stack. So the reader has existed
since 21 August, addressed a variable nothing emitted, and resolved to a system
face in the meantime.

Read together the two findings say the vocabulary has one word too many and one
too few, and the same sentence fixes both.

## Decision

**A font pack declares a face for each role the library reads, and no others.**

`monoFamily` joins `fontPackSchema`. `apply.ts` emits `--loom-mono-family` when a
pack declares one — the name `tokens.ts` already asks for, so `loom.code` and
`loom.kbd` in every deployment pick it up with nothing in `src/primitives/`
changed.

`accentFamily` is removed. Nothing read it, no registered pack set it, and it was
therefore never emitted by any deployment — so its removal changes no rendered
page. A variable a host may set and no primitive consults is worse than an absent
one: it looks like a seam and behaves like a comment.

**`monoFamily` is optional where `headingFamily` and `bodyFamily` are required**,
and the asymmetry is the interesting half. A palette declares every slot
([0049](0049-a-theme-is-three-ids-in-the-tree.md)) because an undeclared colour
has no universal fallback — a re-theme would leave a primitive reading a variable
that resolves to nothing. An undeclared *face* has one: every operating system
ships a monospace, and the reader already names it. So a pack with no opinion
about code costs a reader nothing, and a pack built around a particular mono gets
to say so.

**Six of the twenty starter packs declare one**, and the restraint is deliberate.
The two built out of a monospace and `typewriter` name their own face; `space`
and `workhorse` name the mono sibling of a family a host serving the pack is
almost certainly already serving; and `minimal-sans` — the pack all four surfaces
wear — names Geist Mono, which the `(docs)` route group *already links for its
own chrome*. That last one is the whole point in miniature: a code panel on the
documentation site rendered in the system stack, beside prose set in Geist and a
`<pre>` set in Geist Mono, because the library had no way to ask for the face the
page had already loaded. The other fourteen packs stay silent, because pairing
Garamond with an arbitrary mono asserts a relationship its designer never chose.

## Consequences

- **The seam has an other end on the day it ships**, which is the property
  `accentFamily` lacked for as long as it existed. A test asserts at least one
  registered pack declares a mono; if that ever drops to zero, the field has
  become a comment and the test says so.
- **Nothing in `src/primitives/` changes**, exactly as the finding predicted. The
  workaround needed nothing undone.
- **One comment in another lane is now stale.** `src/primitives/tokens.ts` says a
  pack declares "`headingFamily`, `bodyFamily` and `accentFamily` — none of which
  is one". Two of those three are still true and the third names a field that no
  longer exists. Filed for `Loom primitives`; not edited here.
- **`accentFamily` is gone from a published schema.** A host passing one now gets
  a Zod error rather than a silently-ignored key, which is the right failure —
  but it is a breaking change to `@loom/runtime`'s theme exports, and the reason
  it is affordable is that the field never did anything. Pre-production alpha,
  no registered pack, no reader.
- **A display face is now a thing Loom does not have.** If a primitive ever wants
  one — `loom.hero`'s headline and `loom.quote` are the candidates the finding
  named — it comes back with its reader in the same change, under this record's
  own rule rather than as a field waiting for a purpose.
- **The catalogue is unchanged.** A pack's `description` is what a model is
  shown, and none of them mention a family; the prompt does not grow.

## Alternatives considered

**Give `accentFamily` a reader instead of removing it — a display face for
`loom.hero`, a pull-quote face for `loom.quote`.** The option the finding ranked
first, and the one most likely to be right eventually. Rejected for this change
on two grounds. The reader would live in `src/primitives/tokens.ts` and at least
one primitive, which is `Loom primitives`' lane, so this routine would be
declaring a field and filing the half that makes it real — which is precisely
the state the finding was complaining about. And a display face is a genuine
typographic decision that wants a designer to look at seventeen packs and say
what each one's accent *is*; inventing twenty values to justify a field already
in the schema is the tail wagging the dog.

**Keep `accentFamily` and document it as reserved for a host's own components.**
The cheapest option, and it stops the next person rediscovering the gap. Rejected
because the documentation would be a promise Loom cannot keep. A host's own
components can read any variable they like and a host can emit its own on any
element it renders; what `--loom-accent-family` adds is Loom's word that this is
a supported seam, which is a word better spent on roles Loom actually serves.

**Make `monoFamily` required, so every pack answers.** Consistent with
`paletteSlotSchema`'s normalisation, and rejected because the analogy does not
hold. The reason every palette declares every slot is that there is no sensible
default for a colour; there is an entirely sensible default for a monospace, it
is already written down in `tokens.ts`, and it is what a reader's own operating
system uses for code. Requiring it would also invalidate all twenty registered
packs and force fourteen invented answers, which is how a vocabulary fills up
with values nobody chose.

**A general `families: Record<FamilyRole, string>` map, with the roles a closed
enum.** The shape `paletteSlotSchema` uses, and the one to reach for if a fourth
role ever appears. Rejected as premature: it rewrites twenty pack literals and
every test that reads `headingFamily` off one, to express three roles that are
already three fields, and buys nothing until there is a fourth.
