# 0060 — A primitive owns a string, and a deployment may replace it

**Status:** Accepted
**Date:** 2026-08-16
**Section:** §4f → §3, §4

## Context

Almost every user-facing string on a Loom page comes from the tree. A model
proposed it, the Gate weighed it, a revision records it, and the portal can show
what it replaced. That is the property the whole system is built on.

A few strings cannot come from there. The primitives routine hit the first ones
on 16 August and filed them: `loom.perk` renders a marker glyph for each of
three states, and two of the three carry an accessible name — "Not included",
"Coming soon" — that the perk's visible label does not say. A screen-reader user
who is read "Priority support" with no marker is told the opposite of what the
page shows.

Three ways to get that string, and the first two were already ruled out by
records that exist:

- **A prop.** It puts an accessible name inside the space a model writes. That
  is the shape [0053](0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md)
  refused for URLs and [0055](0055-motion-is-a-static-stylesheet-the-primitive-emits.md)
  refused for motion: things a proposal should not be able to author, because
  what they promise is about the component rather than about the content.
- **Inline in the component.** Correct, and untranslatable. A German deployment
  registering the starter library gets an English "Not included" in the middle
  of a German pricing table, with nowhere to fix it that is not a fork.
- **Declared by the primitive, replaceable by the deployment.** This record.

It is one string in one primitive today. It is recorded now because the answer
changes `definePrimitive`, and because the count only goes up: every disclosure
control, every dismiss button and every state marker in the remaining fifty
blocks has one.

## Decision

**A primitive declares the strings it owns, in its author's language. A host may
supply a dictionary that replaces them. What reaches the primitive is always
complete.**

1. **`definePrimitive` takes `text`** — a map of camelCase keys to strings, in
   the author's own language. Optional; most primitives own no strings. The keys
   are inferred into the component's type, so a component may read exactly what
   it declared and a typo is a compile error at the declaration, which is the
   same bargain the props schema already makes.

2. **A key is camelCase and never contains a dot.** A dictionary addresses one
   string as `${primitive type}.${key}`, and a key with a dot in it would make
   that address ambiguous between two primitives. Registration refuses a bad key
   and refuses a blank string.

3. **`loom.text` is always present and always complete.** Every declared key is
   there, carrying the host's translation where there is one and the declared
   string where there is not. A primitive reads `loom.text.excluded` and gets a
   string — never `undefined`, because a control whose accessible name went
   missing when nobody translated it is precisely the failure this seam exists to
   prevent. It arrives beside `props` rather than merged into them, for the
   reason [0058](0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)
   keeps data separate: props are what the tree says, and these are not.

4. **A registry is a `TextResolver` over its own declarations.** So a deployment
   that translates nothing is correct with no wiring, and translating is
   `textResolverFor` laying a dictionary over that same registry. The
   untranslated case is the base case, not a fallback that only runs when
   something is missing.

5. **Merging happens once per dictionary, not once per node.** The resolver is
   built ahead of the walk and the walk does one map read per element, so a page
   with fifty markers does fifty lookups and no string work.

6. **A missing translation is not a render diagnostic.** It is a property of a
   library and a dictionary, knowable once at startup: `textCoverage` reports
   what a dictionary answers, what it does not, and which of its keys name
   nothing. Reported, never enforced — the bargain
   [0012](0012-conformance-is-probed-and-reported-not-enforced.md) struck for
   conformance. A partly translated deployment is a normal state.

7. **The framework never decides which language a visitor gets.** It takes a
   dictionary. Reading a header, a path segment or a stored preference is the
   host's, and a host serving several languages keeps one resolver per
   dictionary.

8. **Declared strings are not in the model-facing catalogue.** `catalogueOf` is
   what a model is told it may build ([0013](0013-the-registry-is-what-the-model-is-told-it-may-build.md));
   these are the one part of the page it must not write. `textCatalogue` is a
   separate projection, for a translator.

## Consequences

- **A primitive can own a string without owning a language.** The library can
  carry accessible names, and a deployment in another language is a JSON file
  rather than a fork.
- **The page is still a function of the tree, the deployment, and now the
  dictionary.** 0050's property was already weakened by 0058 for data; this
  weakens it in the same way and no further. A revision does not pin the strings
  a reviewer saw, exactly as it does not pin the data they saw — and the answer
  is the same one 0058 recorded: decide it when a review needs it, not before.
- **A primitive that reads a string it did not declare does not compile.** The
  key union is carried through `LoomPrimitiveProps` and `LoomRenderContext`,
  defaulting to `never`, so a primitive that declares no text can read none.
- **Wiring is a choice, and a wrong one is quiet.** A render given no
  `TextResolver` hands every primitive an empty map, including its own declared
  strings. That mirrors `themes` and `data`, and it is the cost of keeping the
  seams separable; the mitigation is that the registry satisfies the interface,
  so the ordinary wiring is the same object again.
- **No interpolation, no plurals, no formatting.** A declared string is a
  string. What that rules out is stated below.
- **`probeEditableDecoration` and `probeSlotPlacement` take declared text**, so a
  primitive that reads its own strings is probeable instead of reading as
  `not-probeable` for a failure the probe invented.

## Alternatives considered

- **A string as a prop, with a default in the schema.** The simplest thing that
  could work, and it hands a model the accessible name of a control it did not
  write. Refused for the reason 0053 and 0055 give.
- **The locale in the tree, like the theme is ([0049](0049-a-theme-is-three-ids-in-the-tree.md)).**
  Tempting, because the theme really is in the tree. But a theme is a design
  decision somebody proposed and a reviewer approved, and a language is a
  property of the visitor. Putting it in the tree would mean one revision per
  language and a `configure` to change what a French visitor reads — and two
  deployments serving one revision could no longer differ, which is the property
  §4e's data seam was built to preserve.
- **The framework negotiating the language** from `Accept-Language` or a path
  segment. It would be convenient once and wrong forever: routing is the host's,
  and a framework that guesses would have to be argued out of the guess by every
  host with its own scheme.
- **ICU message format, with interpolation and plurals.** A real need
  eventually — "3 items" is not "3 item" in most languages. Refused for now
  because it puts a formatting language inside the seam, and because nothing in
  the library needs it yet: the strings that exist are fixed accessible names.
  When something does need it, it is an additive change to what a value may be,
  not a change to who owns the string.
- **A diagnostic per untranslated node.** Symmetric with `data-unavailable`, and
  wrong: data is answered per node and text is not. A page with fifty markers
  would carry a hundred diagnostics saying the same thing on every request
  forever, which is how a diagnostics list becomes something nobody reads.
- **Failing registration on an incomplete dictionary.** It would make a
  half-translated deployment impossible to ship, which is not the framework's
  call. `textCoverage` is there to be asserted on by a host that wants that, in
  a test where a failure stops a release rather than a request.
- **A wrapper component applying the declared strings**, so no host wiring could
  ever be wrong. It defeats the conformance probe — the wrapper returns the inner
  element and carries no decoration of its own — and it puts a component between
  the renderer and every primitive to solve a problem that the registry
  satisfying the interface already mostly solves.
- **Keeping the strings in the tree as a `loom:text` reserved prop.** It would
  reuse 0050's namespace, and it would make the accessible name of a control
  something a delta can change: the same objection as the prop, one level of
  indirection further away from where anyone would look for it.
