# 2026-08-11 (day 49) — ten primitives, and a slot that finally means something

**Build order section:** **§4b step 2**, with a reactive fix in §3 and two in §4.

**Branch:** `day-49-ten-primitives` (→ `main`).

---

## Where this run started

`main` is current at `5203247`: **#67 is merged**, so the theme mount landed.
`gh pr list --state open` is empty and there are **no review comments** on #67 or
anywhere else — the only comment on it is the report I posted last run — so
nothing outranked the plan.

The §4b order names step 2 as *ten primitives, not seventy*. That is what this
run built. Nothing in a finished section was opened for polish; the three things
that changed inside §1–§6 all changed because the port broke them, and each is
named below.

## What was built, in plain language

**The registry is no longer empty.** `@loom/runtime/primitives` ships ten
primitives, ported from the Hermes source, and a page assembled from all ten
renders under both starter palettes with no diagnostics.

They were chosen to cover the *contract*, not the catalogue. The port of the
remaining sixty is worth doing only if the shape is right, and the way to find
out whether it is right is to pick ten that each stress a different part of it:

| Primitive | Why this one |
| --- | --- |
| `loom.page` | The root. The only one that mounts a theme, so 0050's contract is exercised by a real primitive rather than a test double. |
| `loom.section` | Composes, and declares **one** region (`heading`) — the minimal case that proves a region is placed differently from children. |
| `loom.split` | Composes, and declares **two** (`start`, `end`). The port of Hermes' `side-by-side` layout, which was a page-level setting and is now an ordinary primitive that can nest. This is the one that broke slots. |
| `loom.stat-grid` + `loom.stat` | The **decomposition pair**. Hermes held stats in an `items` array; here the grid is a primitive and each stat is a node. Two of the ten, because how a list block decomposes governs about forty of the remaining sixty. |
| `loom.heading` | Text as child nodes rather than a `text` field — the difference 0001 asked for, applied to real copy. |
| `loom.prose` | The other half of that, and the most-used leaf on any page. |
| `loom.divider` | The **enum-driven display mode**: three genuinely different renderings behind one prop. |
| `loom.media` | The **rich schema**: seven props, a URL, a cross-field rule. It broke the catalogue. |
| `loom.action` | The one thing on a page that asks the reader to do something. It broke URL validation. |

Ten covers four that compose, five leaves, two regions, one decomposition, one
display enum and one rich schema. What it does not cover is a primitive that
needs client state, because none of the seventy does — Hermes' only interactive
block, `faq`, used `<details>` and no JavaScript, and the port keeps that.

### The three things the port broke, and how each was fixed

**Slots were a claim with no mechanism** (fixed, [0051](../decisions/0051-a-slot-is-a-region-the-primitive-places.md)).
A primitive could declare `slots: ["start", "end"]`, and the catalogue would
tell a model those regions existed, and then the renderer handed both of them to
the primitive inline inside `children` with nothing to say which was which. The
only way to express "the image goes on the left" was "the image is the first
child" — a convention no schema states, every `move` can break, and no reviewer
can check. An element's slot children now arrive on `loom.slots`, keyed by name,
and are **not** in `children`. Only direct slot children route; two sharing a
name are both placed; the map has a null prototype; host projection is unchanged
and reaches the primitive through the same named region.

This is a **behaviour change**, and the honest cost is that a primitive which
does not place a region renders nothing for it. Inside the repo it broke the two
test primitive sets, which now place what they are handed — the same way they
grew to apply `loom.theme` when 0050 landed. Nothing outside the repo consumes
it yet.

**The catalogue went blank for the one primitive that most needed explaining**
(fixed in `sdk/definition.ts`). `loom.media`'s rule — alt text required unless
the image says it is decorative — is a cross-field constraint, so it is a
`.refine()`, and refining an object schema returns a `ZodEffects` rather than a
`ZodObject`. `declaredPropsOf` stopped at the wrapper and answered "I cannot
enumerate these props", which is what the model would have been told about the
richest schema in the library. It now unwraps the effect and reads the object
inside. Nothing else changed: the constraint still lives in validation, not in
the catalogue.

**`z.string().url()` accepts `javascript:alert(1)`** (fixed,
[0053](../decisions/0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md)).
Found by a test written to assert the opposite. The check is doing what it says
— that string *is* a well-formed URL — but props in a Loom tree are AI-authored
and the renderer emits what the tree says, so an `href` schema that accepts any
parseable URL accepts script execution from the one part of the system whose
purpose is to bound what a model may produce. The Gate cannot help: setting a
URL is small, low-stakes and perfectly reversible by every measure it has. URLs
are now checked against an allowlist — `http`/`https`/`mailto`/`tel` for a
destination, `http`/`https` for an image — and a refusal invalidates the node
with a diagnostic rather than rewriting it into something safe.

## Decisions not explicitly specified, and why

- **The library lives in the runtime, at `@loom/runtime/primitives`.** It is
  shipped vocabulary, like the starter theme library, and a host that wants none
  of it simply does not import the entry point. Building it in the portal
  instead would have made the demo's primitives unavailable to anyone else.
- **`tokens.ts` is the only way a primitive names a colour or a length.** The
  rule "renders under both palettes without hard-coded colour" is enforced by a
  test on the output, but routing every value through `colour()` / `space()` /
  `size()` means the mistake has to be made deliberately rather than by
  forgetting. No primitive imports a literal.
- **The type ramp and spacing scale are now fixed-length (8).** They were
  `.min(2)`. A primitive reading `--loom-spacing-7` would have been silently
  unstyled under a preset with four steps, which makes "renders under both
  palettes" a property of which two you happened to pick. Palettes were already
  normalised for exactly this reason; the ramps were not, and the port is what
  noticed. Both starter font packs and both presets already had eight.
- **Responsiveness comes from intrinsic layout, never a media query.**
  Rendering is a pure function with no stylesheet to attach, so `loom.split`
  wraps by flex-basis and `loom.stat-grid` by `auto-fit`/`minmax`. Nothing reads
  a viewport.
- **`loom.action` is an anchor and has no handler prop.** A prop naming a
  callback would be a string in the tree that some host maps back to a function
  — an indirection an AI proposal could point anywhere. A destination is data
  the Gate can read and a reviewer can check.
- **`loom.heading`'s size follows from its level and is not separately
  settable.** A model that wants a smaller headline picks a lower level, which
  keeps the document outline honest rather than letting a page look structured
  while its heading levels say otherwise.
- **Leaves ignore children they cannot place.** `loom.stat` holds its value and
  label as props, so a text child under it has nowhere to go. It renders the
  stat and drops the stray text rather than inventing a place for it. See open
  question 2.

## Records added or superseded

- **Added [0051](../decisions/0051-a-slot-is-a-region-the-primitive-places.md)** —
  *A slot is a region the primitive places, not content inline in its children.*
  Five alternatives recorded as rejected, including keeping slots in `children`
  as well (duplicate `data-loom-node` ids) and routing every slot in the subtree
  to its nearest element ancestor (silently relocates content).
- **Added [0052](../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)** —
  *A repeated item is a node; a fixed field is a prop.* The rule the remaining
  sixty are ported against, argued from what an eight-item FAQ costs each way in
  the analysis, the Gate, the inverse and attribution. Rejects a `list` node kind
  explicitly, because that would be a tree schema change.
- **Added [0053](../decisions/0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md)** —
  *A URL in the tree is checked against a scheme allowlist.*
- **Nothing superseded.** None of the three contradicts an existing record; 0051
  gives `slots` the meaning 0013 already advertised, and 0052 applies 0001's
  reasoning about text to repeated content.

Index regenerated with `pnpm decisions:index`.

## Tests

`pnpm install && pnpm verify` — **green**.

| | Files | Tests |
| --- | --- | --- |
| Runtime | 82 | **1092 passed**, 0 failed |
| Portal | 34 | **381 passed**, 0 failed |

**Nothing failed and nothing was skipped**, with the one standing exception
unchanged from previous runs: the live Anthropic smoke test skips cleanly when
`LOOM_ANTHROPIC_API_KEY` is absent, which it is in this environment.

**31 new tests** — 24 in `src/primitives/library.test.ts`, 7 added to
`src/render/render.test.ts`.

The renderer tests cover: a slot child reaching its primitive as a named region
and not as a child; the shared empty map for a node with no slot children; no
region read off the map's prototype; two slot children sharing a name; the
host's projection routing through the region rather than around it; a slot
nested in another slot's fallback staying where it sits; and a region its
primitive does not place rendering nothing.

The library tests cover: all ten registering in order; the whole library passing
the edit-mode conformance audit; every primitive's props enumerable in the
catalogue, `loom.media` included; the declared regions appearing in the
catalogue; a page using all ten rendering with zero diagnostics; the section's
heading region placed above its content; the split's two regions in separate
columns in ratio order; every element node addressable in edit mode (14 nodes,
3 of them stats); **the re-theme guarantee** — the same page under both starter
palettes, byte-identical below the root and with no literal hex, `rgb()` or
`hsl()` anywhere in the body; every palette slot mounted at the root; the schema
refusals (heading level, undeclared prop, missing alt text, disallowed URL
scheme for both a link and an image); the divider's three ornaments producing
structurally different markup; purity across repeated renders; a leaf given
children it cannot place still rendering; and the starter registry refusing a
host primitive that collides with a library type.

## Open questions

1. **Should `auditRegistry` probe for slot placement?** A primitive that
   declares `slots: ["end"]` and never reads `loom.slots.end` silently drops
   whatever a tree puts there — the same failure shape as ignoring
   `loom.editable`, which `probeEditableDecoration` exists to catch, and now
   more likely because a declared slot is a promise the author can forget to
   keep. Unlike the theme mount (last run's question 1, still answered "leave
   it"), this one **is** scoped: the probe knows exactly which names the
   primitive declared, so it can hand it a marker per declared slot and look for
   each in the output. **Recommendation: build it next run**, alongside the real
   page — it is a contained addition to an existing probe and it protects the
   contract 0051 just created.
2. **Should the renderer diagnose children under a primitive that declares no
   slots and renders none?** `loom.stat` given a text child drops it, and
   nothing says so. The registry knows a primitive's declared slots but not
   whether it renders `children`, so the renderer cannot tell "leaf" from
   "container" today. A `composes: boolean` on the definition would say it
   outright. **Recommendation: fold it into question 1** — a probe that already
   calls the component to check slot placement can see whether `children`
   reached the output, which answers this without a new declaration.
3. **Should the model's catalogue include the theme registry?** Carried forward
   from last run unchanged: `themeRegistry.catalogue()` is still wired to
   nothing, so "make it warmer" resolves against a vocabulary the model was
   never shown. Last run recommended joining them during the primitive step;
   this run did not, because the step had no model in it and the guess still
   cannot be observed. **Recommendation: join them in the real-page step**,
   which is the first one that puts an interpreter in front of this library.
4. **`loom.split`'s wrap threshold is a constant.** It stacks below roughly
   `18rem` per column, which is not a theme variable and not a prop. It is the
   right default and the wrong kind of thing to be uncontrollable. Not urgent —
   flagging it before sixty more primitives inherit the pattern.
5. **The remaining sixty need a naming convention for decomposed pairs.**
   `loom.stat-grid`/`loom.stat` reads well; `loom.faq`/`loom.faq-item` and
   `loom.pricing-tiers`/`loom.pricing-tier` do not agree with each other or with
   it. Worth deciding once, before it is decided sixty times.

## What is next

**§4b step 3: one real page**, assembled from these ten and edited through the
portal. It is the first end-to-end test of §1–§6 against something not written
to pass its own tests, and it is the demo. The library test already builds a
page from all ten and asserts it renders; what step 3 adds is that the page
lives in a store, an interpreter proposes changes to it, the Gate weighs them
and a person reviews them in the portal.

Step 4 — the remaining sixty — is mechanical against 0052 once step 3 has shown
the shape survives contact with a model.
