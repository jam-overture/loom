# 2026-08-16 (day 53) — a primitive owns a string, and a deployment may replace it

**Build order section:** **§4f** — text, the strings a primitive cannot read from
the tree.

**Branch:** `day-53-the-text-seam` (→ `main`).

Diagram: [two authors, two places, and one map that is always complete](2026-08-16-day-53-the-text-seam.svg).

---

## Where this run started

`main` at `766f711`. **One pull request is open — #75, the first run of the new
`Loom primitives` routine** — and it carries no maintainer review comments, so
there was nothing outstanding to address before starting.

It carries something better: **a finding filed for this routine, and it decided
the day's work.** `loom.perk` renders a marker glyph for three states, two of
which carry an accessible name — "Not included", "Coming soon" — that the perk's
visible label does not say. Those strings cannot come from the tree, so they
belong to the component, and there was nowhere for a deployment in another
language to replace them. The finding said the fix changes `definePrimitive`,
which is this routine's file and not that one's. It was right, and it also
guessed the shape correctly.

That is the second run in a row where the finding channel chose the work, and the
first where it chose it *ahead of the plan*. The plan's next item was the
authoring half of §4e — a primitive declaring which bindings it reads. That is
still the next unit and it is untouched; the brief is explicit that an open
finding outranks it.

The container's `main` was current on arrival for the first time in four runs.

## What was built, in plain language

**A primitive can now own a string without owning a language.**

Almost every user-facing string on a Loom page comes from the tree, where a model
proposed it and the Gate weighed it. A few cannot: the accessible name of a
marker glyph is a promise about what the control *is*, not about what the page
says, and there are only three places it could come from. A prop puts it in the
space a model writes, which 0053 refused for URLs and 0055 refused for motion.
Inline in the component it is correct and untranslatable. So: **declared by the
primitive, replaceable by the deployment.**

```ts
definePrimitive({
  type: "loom.perk",
  text: { excluded: "Not included", coming: "Coming soon" },
  component: ({ loom }) => <span aria-label={loom.text.excluded}>✕</span>,
})
```

The keys are inferred into the component's type. A primitive reads exactly what
it declared; `loom.text.exlcuded` is a compile error at the declaration, the same
bargain the props schema has always made. A primitive that declares nothing can
read nothing — the key union defaults to `never`, so the empty map it is handed
is the honest type for it.

### The part I would point at

**What reaches the primitive is always complete.** Every declared key is there,
carrying the host's translation where there is one and the declared string where
there is not. A primitive reads `loom.text.excluded` and gets a string — never
`undefined`, never a maybe.

That is deliberately the *opposite* of the shape §4e chose for data one day
earlier, and the difference is the whole argument. Data must distinguish "you
have no services" from "we could not reach your services", so an answer is never
merely absent. Text has no such pair: a string nobody translated is not a
failure, it is a translation in progress, and the only real failure — a control
with no accessible name at all — is the one the type makes unreachable. A seam
that made a primitive write `loom.text.excluded ?? "Not included"` would have put
the default back in the component and achieved nothing.

**The untranslated deployment is the base case, not a fallback.** A registry is a
`TextResolver` over its own declarations, so a host that translates nothing wires
the same object it already wires for resolution and validation and is correct.
`textResolverFor` lays a dictionary over that same registry. Nothing has a
"missing translation" code path that only runs when something is wrong.

## Decisions not explicitly specified, and why

- **The merge happens once per dictionary, not once per node.** A page with fifty
  markers does fifty map reads and no string work. It also means a host serving
  several languages keeps one resolver per dictionary, which is why the function
  takes a dictionary rather than reading one.
- **The framework never decides which language a visitor gets.** It takes a
  dictionary and nothing else. Reading `Accept-Language`, a path segment or a
  stored preference is routing, routing is the host's, and a framework that
  guessed would have to be argued out of the guess by every host with its own
  scheme.
- **An untranslated string is not a render diagnostic.** It is a property of a
  library and a dictionary, knowable once at startup; per node it would put one
  diagnostic beside every marker on every request forever, which is how a
  diagnostics list becomes something nobody reads. `textCoverage` answers it once
  — reported, never enforced, the bargain 0012 struck for conformance.
- **A dictionary refuses an empty translation at the boundary.** A translator who
  deletes a string leaves a nameless control, and by render time there is nobody
  left to tell. Registration refuses a blank declared string for the same reason.
- **A text key is camelCase and may not contain a dot.** A dictionary addresses a
  string as `${type}.${key}`, and the split has to be unambiguous. Registration
  refuses a bad key with a sentence saying so.
- **Declared strings are not in the model-facing catalogue.** `catalogueOf` is
  what a model is told it may build (0013), and these are the part of the page it
  must not write. `textCatalogue` is a separate projection, for a translator.
- **No interpolation, no plurals, no formatting.** "3 items" will need it
  eventually. Nothing in the library needs it now, and when something does it is
  an additive change to what a value may be rather than a change to who owns the
  string.
- **Both conformance probes now take the declared text.** A primitive that reads
  a string it declared and formats it would throw on `undefined` outside a
  renderer and read as `not-probeable` — a failure invented entirely by the
  probe. There is a test that it would have.
- **Nothing inside `src/primitives/` was touched.** Moving `loom.perk`'s two
  strings onto the seam is a four-line change and it belongs to the primitives
  routine; doing it here is exactly the race the lane split exists to prevent. It
  is filed.

## Records added or superseded

- **Added [0060](../decisions/0060-a-primitive-owns-a-string-and-a-deployment-may-replace-it.md)** —
  *A primitive owns a string, and a deployment may replace it.* Eight
  alternatives rejected, including the locale in the tree (a theme is a design
  decision somebody approved; a language is a property of the visitor, and one
  revision per language would give up the property §4e was built to preserve), a
  wrapper component that could never be mis-wired (defeats the conformance
  probe), and a diagnostic per untranslated node.
- **Nothing superseded.** 0050's "a page is a function of the tree" was already
  weakened by 0058 for data; this weakens it in the same way and no further, and
  0060 says so in its own consequences.

**§4f is a new section heading in `README.md`.** The letter was used
prospectively in day 52's report for "the rest of the seventy", which has no
letter in the README's own build order — it is item 5 of the numbered list, and
it now belongs to the primitives routine anyway. Say so if you would rather the
port kept 4f and this became 4g; it is a rename of a heading and two links.

## Was this an escalation?

**No, and this one is not close.** The test is whether it touches the tree schema
or the delta model in a way that requires migrating built code, or contradicts an
`Accepted` record. Nothing about the tree changed: no new reserved prop, no node
kind, no delta operation. Every tree written before today renders identically.
The change is entirely in the registration contract and the render context, which
is where §4 lives.

## Findings closed and filed

- **Closed for `Loom primitives`** — the first primitive-owned string now has
  somewhere to be translated. The entry names this branch and says what is left:
  moving `loom.perk`'s two strings onto the declaration, which is theirs.
- **Filed for you** — **two routines cannot both write a decision record without
  colliding.** This is the reason `pnpm verify` is not green on this branch, and
  it is not a fault in the code. See below.
- The two findings this routine already owned are unchanged and still need you:
  `docs/rollout.md` is named by a brief and has never existed, and the portal
  briefs still say the demo does not exist.

## Tests

`pnpm install && pnpm verify` — **1212 passed, 1 failed.**

| | Files | Tests |
| --- | --- | --- |
| Runtime | 89 | **1212 passed**, 1 failed |

**The one failure is the decision-record numbering guard, and it is not about
this code.** In full:

```
tools/decisions/decisions.test.ts > parse, and number without duplicates or gaps
  "0059 is missing — the numbers must run unbroken from 0001"
```

**0059 is on #75**, the primitives routine's open pull request. Both branches were
cut from `main`, as the procedure requires and as "never stack" requires; `main`
has 0058 as its highest record; so both routines reached for the next number and
mine had to be 0060 with a hole under it. The alternative was to write a second
0059, which is precisely the failure this guard was built to catch after two
sessions each wrote an `0032`, and it would have made every reference to "0059"
permanently ambiguous.

**It resolves with merge order and no code change:** merge #75 first, then merge
`main` into this branch — the numbers are contiguous and the guard passes. I did
not weaken the assertion, adjust the tool, or renumber into a collision, and I am
reporting it rather than quietly opening on green-looking red.

`decisions/README.md` and `FINDINGS.md` will both conflict with #75, in both cases
by appending to the end of a file. `FINDINGS.md` takes both sides; the index is
regenerated with `pnpm decisions:index`.

**Typecheck and build are green. 35 new tests** in three files, plus three added
to existing ones:

- `render/text.test.ts` (10) — a declared string reaching the primitive; a
  dictionary replacing it; **a key the dictionary does not carry keeping the
  declared string**, which is the merge that matters; a primitive that declared
  nothing handed nothing; a render given no resolver handing nothing at all;
  declared text **never reaching the props the tree carries**; a key named
  `constructor` answering with a string rather than a function off
  `Object.prototype`; the seam through `renderRequest`; one resolver serving three
  nodes of one type; and **an untranslated string producing no diagnostic**.
- `sdk/text.test.ts` (20) — the dictionary schema, including that an empty
  translation is refused and a language tag is checked; the resolver's merge, its
  frozen answer, and that it does not read a message off `Object.prototype`; the
  registry answering as its own resolver; `textCatalogue`'s extraction; coverage
  counting what is answered, naming what is not, and **naming dictionary keys
  that match nothing, which is how a rename announces itself**; and registration
  refusing a key with a dot in it, a key that is not camelCase, and a blank
  string.
- `sdk/conformance.test.ts` (3) — a primitive that reads and formats its own
  declared string is probeable by both probes, **and would have read as
  `not-probeable` without them**.
- `sdk/definition.test.ts` (6) — the entry carries declared text; it defaults to
  none; it is copied rather than aliased, so a later mutation cannot change a
  rendered page; it has no prototype; and **the type-level half, checked by `tsc`
  rather than by vitest** — a `@ts-expect-error` on a component reading a key it
  did not declare, which fails the typecheck if it ever starts compiling.

Nothing was skipped. No test needed a key and nothing here touches the network.

## Open questions

1. **`pnpm verify` is red on the numbering guard.** Argued above.
   **Recommendation: merge #75 first, then merge `main` into this branch.** No
   code changes either way.
2. **How should two routines number a decision record?** The collision is
   structural and will recur every time two routines record on the same day.
   **Recommendation: a reserved block per routine** — the guard drops the
   contiguity check and keeps the duplicate check, and each routine takes a
   stride. It is the smallest change that makes both branches green without
   coordination. Merge-order renumbering also works and costs a red branch each
   time; numbering-on-merge is the cleanest and rewrites every cross-reference.
3. **Should `loom.text` reach the model in any form?** Today it does not: the
   catalogue a model sees carries props and slots, and declared strings are a
   separate projection for a translator. I think that is right — an accessible
   name is a promise about a control — but it means a model cannot be told that
   `loom.perk` has a marker whose name it need not write.
   **Recommendation: leave it. Revisit if a model ever proposes a prop to say
   something the declared text already says.**
4. **§4f as a heading**, taken from a letter day 52's report used for the port.
   **Recommendation: keep it as it is** — the port is item 5 of the build order
   and has no letter in the README.
5. **The two standing findings still need you** — `docs/rollout.md`, and the
   portal briefs' stale premise about the demo. Both have been open since 15
   August and neither is a routine's to close.

## What is next

**The authoring half of §4e** — a primitive declaring which binding names it
reads, so the catalogue can tell a model that `loom.services` wants a `services`
binding and a proposal can create a bound node. It was next before this run and
this run did not touch it. Unless a finding outranks it again, which is now the
normal way this queue works.

---

## Addendum — the numbering collision resolved the same day

Written after the body above, when #75 merged and this branch took `main`.

**#75 merged as `3a1e419`**, bringing
[0059](../decisions/0059-a-leaf-whose-whole-content-is-one-string-takes-it-as-a-child.md)
with it — the record whose absence was the single failing assertion. `main` was
merged into this branch, the numbers now run 0058, 0059, 0060 unbroken, and
**`pnpm verify` is green**:

| | Files | Tests |
| --- | --- | --- |
| Runtime | 89 | **1225 passed**, 0 failed |
| Portal | 46 | **455 passed**, 0 failed |

The runtime count rises from 1213 to 1225 because #75's twelve tests arrived with
the merge. Nothing of mine changed to get here: no assertion was touched, no
record renumbered, no tool adjusted. The prediction in the body — *merge #75
first, then merge `main` into this branch* — is what happened, and it cost one
hand-resolved conflict.

**Both conflicts were the same shape**: two branches appending to the end of one
file.

- **`decisions/README.md`** — both rows kept in order, then the table regenerated
  with `pnpm decisions:index`, which is the only correct way to settle it.
- **`FINDINGS.md`** — both sides kept, with the primitives routine's three entries
  placed *before* the entry answering them, so the file reads in the order the
  conversation happened rather than in the order git found the hunks.

**One thing became possible that was not before.** The finding about
`loom.perk`'s strings is owned by this routine, and the procedure says to close
one by editing its Status and naming the pull request — but the entry only
existed on #75's branch, so before the merge there was no Status of theirs to
edit and all I could do was file an entry beside it. It exists on this branch
now, so it is closed on the entry itself and names #76. The separate entry stays,
because it carries what was built and what is left for the primitives routine.

The finding about the collision itself stays **open**. This instance is resolved;
the structure that produced it is not, and it will produce another the next time
two routines record on the same day.
