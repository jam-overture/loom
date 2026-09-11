# 0120. A starting composition is a subtree a catalogue hands to the ordinary seam

**Status:** Accepted
**Date:** 2026-09-09
**Section:** §4b

> **Why this number.** `0116` through `0119` are skipped deliberately, which
> [0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)
> permits in as many words. The highest record on `main` is `0102`, this branch
> already carries `0106`, `0110` and `0115`, and roughly thirty pull requests
> have been open since 1 September — every one of them able to claim the next
> free number without seeing the others. A clash is fatal to every lane's
> `pnpm verify`; a hole costs one line in the index. `0096` was claimed by ten
> branches at once and the repair took a run.
>
> **Why `Accepted`.** It decides where a thing that did not exist lives and what
> it is called. It refines no `Accepted` record, changes no schema, and touches
> neither the tree nor the delta model — it is an application of
> [0057](0057-a-preset-is-a-deterministic-interpreter.md) to a second case,
> which that record was written to generalise.

## Context

This library is decomposed on purpose, and the argument for it is finished.
[0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md) rules that
repeated content becomes child nodes;
[`docs/primitive-granularity.md`](../docs/primitive-granularity.md) gives the
reasoning, which is that a prop enumerates the adaptations somebody predicted
and structure permits the ones nobody did. Eighty-nine primitives have been
built to that rule and the Hermes ledger closed against it on 8 September.

The argument has a second half. The granularity doc states it as an objection
and answers it in the same breath:

> The obvious objection to composition is convenience. If a hero is six nodes,
> does every hero start as six operations?
>
> No — because `insert` carries a whole subtree, not a single node. So a
> starting composition is **one `insert` operation** carrying a six-node hero.

**Nothing built it.** For twenty-seven runs the library has paid decomposition's
price without collecting what the doc promised in exchange, and the bill is
visible in the port map:
[`docs/hermes-port-map.md`](../docs/hermes-port-map.md) files thirteen Hermes
blocks under *compositions — nothing to build*, with `cta` at the top of the
list and this sentence beside it:

> Building these as primitives would be the exact mistake the granularity doc
> names: a `loom.cta` with `title`, `desc`, `btnText` and `btnUrl` is four props
> impersonating four nodes.

That verdict is right, and *nothing to build* is true of the registry and false
of the page. The cheapest band in Hermes became one of the more expensive ones
in Loom: eight operations to put a call to action anywhere, and forty-two for
a pricing band, because every one of them was decomposed and none of them was
ever assembled.

So the question this record answers is not *should the convenience exist* —
that is settled and the doc settled it — but **what shape it takes, so that the
first person to want it does not invent a page builder beside the delta model.**

## Decision

**A starting composition is a pure function from an `IdFactory` to a subtree,
listed in a catalogue, and reaching a tree only as an ordinary
`ChangeInterpreter`.**

Four parts, and each one refuses a thing:

1. **It is a subtree, not a primitive.** Every node it builds is a type already
   in the registry. It registers nothing, renders nothing, and has no props of
   its own. A `loom.cta` that took four strings would be the fat primitive the
   granularity doc spent four pages refusing; this is the same band with the
   same pixels and eleven addressable nodes behind it.

2. **It reaches the tree through the interpretation seam.** One `insert`
   carrying the whole subtree, wrapped in a `ChangeInterpreter` and handed to
   `commitIntent` like anything else — so it is assessed, gated, held for a
   person when the policy says so, appended to the log, attributed, and
   revertable. `interpreter: "loom/composition"`, `authoredBy: "runtime"`,
   `confidence: 1`, for the reason
   [0031](0031-calibration-is-a-reader-not-a-controller.md) gives: a computed
   subtree has no self-grade to be right or wrong about, and calibration
   segments it out rather than letting a catalogue walk a model's record to a
   perfect score it never earned.

3. **It re-plans against the tree it is handed.** The parent is resolved and the
   index computed at `interpret` time, never at the time the band was chosen. A
   band picked against a page that has since grown two more appends after them;
   a band whose named parent is gone declines rather than proposing an operation
   the runtime would refuse.

4. **It leaves no trace of itself.** Nothing in the inserted nodes records which
   composition built them, and nothing can. What lands is ordinary nodes,
   indistinguishable from nodes a model wrote one at a time — which is the
   property that keeps a catalogue a convenience *over* the delta model rather
   than a second way to author one.

**It lives in `src/primitives/`,** because a composition is knowledge about this
library — which types go together, in what order, with what in their slots — and
has no meaning apart from it. It is published on the existing
`@loom/runtime/primitives` entry point and needs no new door.

**A composition is named for the band it starts,** not for its root primitive.
`cta`, `pricing`, `faq` — a lower-case word or two, no `loom.` prefix, because
the prefix names a registered type and a composition is not one.
[0054](0054-a-container-is-its-childs-name-plus-the-arrangement.md) governs
container names and deliberately does not reach here: a container is named for
what it does with its children, and a composition is named for what a person
came to the catalogue to add.

## Consequences

- **The granularity argument is now whole.** *Props enumerate the adaptations
  you predicted; structure permits the ones you did not* — and the tedium that
  buys is paid once, in a catalogue, rather than on every page.

- **A band's cost is one review, not forty-two.** A reviewer weighs a pricing band
  as one operation carrying a subtree they can read, and the Gate assesses it as
  one change. That is a smaller ask of a person than forty-two consecutive
  inserts, and it is the same tree at the end.

- **The catalogue can rot, so a test holds it.** A composition names its
  primitive types in string literals, and a primitive that is renamed or whose
  schema tightens leaves the literals behind. `compositions.test.ts` renders
  every band under both starter palettes and fails on any diagnostic, which
  turns a band that would silently lose nodes on a host's page into a red build
  here.

- **A composition ships copy, and the rule is generic but real.** Nine bands of
  "Lorem ipsum" would not read as a page, which is the whole thing a starting
  composition is for. So the copy is ordinary product English a page would keep
  and edit — with one line drawn: nothing that would be a *claim about a third
  party* if it were left in. No named customers, no attributed testimonials, no
  outbound links. Every destination is a same-origin path
  ([0102](0102-a-same-origin-path-is-decided-by-resolving-it.md)), so a band
  arrives with no dependency on anything outside the deployment.

- **No composition ships an image.** `mediaUrlSchema` refuses `data:`
  deliberately and a same-origin path names a file this library cannot put in a
  host's `public/`, so a `src` in a catalogue band would be either a broken
  image or a live request to a third party from a page nobody has read yet.
  Media slots ship empty.

- **The order of the catalogue is information.** `STARTER_COMPOSITIONS` is a
  list, not a map, because taken in sequence the nine bands are a landing page
  and taken at random they are nine bands. Nothing enforces it.

## Alternatives considered

**A `loom.cta` primitive with four props, and the same for each band.** The
convenience without the catalogue. Rejected by 0052 and the granularity doc
before this record existed: "move the button above the description" would be
unreachable forever, and the port map already recorded the refusal.

**A surface that builds the subtree and writes it to the store.** What a page
builder would do, and the shortest path from here to a band on a page. Rejected
because it is the one thing the primitives brief forbids by name — *a catalogue
of them must never become a parallel channel into the tree* — and because a band
that arrived without passing the Gate would be the only change on the page
nobody judged.

**A composition as a registered thing with an id in the tree.** Tempting for the
reviewing surface: a node that says *this band came from the pricing
composition* would let a portal offer "reset this band". Rejected because it
would make the catalogue addressable, which the brief names as an escalation,
and because it would be false the moment somebody moved a node — leaving a
label claiming provenance for a band that no longer matches it.

**Presets in the demo's own directory, as `apps/loom/app/(demo)/_lib` already
has.** Those are demonstrations of the pipeline against one known page and they
belong where they are. A band a *host* drops into *their* page is a different
thing with a different audience, and putting it behind a surface's private
directory would mean every host that wanted one copied it.

**Parameterising the bands** — `pricingBand({ tiers: 4 })`. Rejected as the
original mistake wearing a function signature: a parameter that decides how many
children exist is `insert` and `remove` smuggled into an argument list, and the
answer is the same as it is for props. Insert the band, then insert a tier.
