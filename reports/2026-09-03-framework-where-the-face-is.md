# Where the face is

**Routine:** `Loom daily build` · **Date:** 2026-09-03 · **Section:** §3
**Branch:** `framework-25-where-the-face-is` · **Record:** [0107](../decisions/0107-a-font-pack-may-say-where-a-face-is-and-the-runtime-never-fetches-it.md)

## What was built

A font pack may now say **where** a face is, and not only what to ask for.

A `FontPack` carried CSS family stacks and nothing else. That is the right thing
to hand a browser, which resolves `Fraunces` against faces the machine already
holds or the host's stylesheet already loaded. It is the wrong thing — and
silently wrong — to hand anything that draws text itself. An image renderer
cannot look a family name up, so it draws in whatever it ships with and says
nothing. `Loom marketing` filed exactly this on 29 August after building the
share card: the card wears the address's palette exactly, every slot measured,
and its typeface not at all.

The pack may now carry an optional `faces` array — a family, a weight, a style
and a `source`. **The runtime never dereferences one.** It hands the declaration
back and the caller resolves it.

```
                      a font pack
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
   family stack                          faces (new, optional)
   "Inter, system-ui, …"                 { family, weight, style, source }
        │                                     │
        ▼                                     ▼
   ┌─────────┐                   ┌────────────┴────────────┐
   │ browser │                   │                         │
   └─────────┘             fontFaceRules()          declaredFaces()
   resolves against         → @font-face CSS         facesForRole()
   what it already has      the *host* mounts        → the renderer
   — unchanged                                         fetches, not us
                                       │                    │
                                       └────────┬───────────┘
                                                ▼
                                   familiesWithoutSource()
                                   "what I am about to substitute"
```

The seam is four pure functions in `src/theme/faces.ts` plus `fontFaceSchema` in
`theme.ts`:

| export | answers |
| --- | --- |
| `declaredFaces(pack)` | every face the pack addresses, in order |
| `facesForRole(pack, role)` | the faces for the family this role leads with |
| `familiesWithoutSource(pack)` | the families it asks for and does not address |
| `fontFaceRules(pack)` | those declarations as `@font-face` CSS, for a host that wants them |
| `leadingFamily`, `isGenericFamily`, `FACE_ROLES`, `GENERIC_FAMILIES` | the parts the four are built from, exported because a caller doing its own resolution wants them |

## Decisions nobody specified

**The runtime does not fetch, and that is the whole of 0107.** The obvious
reading of "where the face is" is that the runtime goes and gets it. Refused on
three grounds. It would put [0008](../decisions/0008-the-renderer-is-a-total-pure-projection.md)'s
determinism — two requests for one revision cannot disagree — behind a third
party's uptime, inside the one function the system's purity rests on. It would
let a registered document choose the deployment's egress, which is what
[0095](../decisions/0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md)
refused for frames and 0053 for schemes. And it would need a cache, a timeout, a
failure mode and an answer to what a render does while a face is in flight, none
of which the render path has and all of which belong to whoever is drawing.

**No starter pack declares a source.** Twenty packs ship and all twenty stay
network-free. Naming, say, a Google Fonts URL for Inter would bake a CDN into
the library — and `fonts.googleapis.com` is not on this sandbox's egress
allowlist, `21st.dev` has been blocked fifteen times, and the packs' own doc
comment says the point of a stack pack is that it works with no network at all.
`declaredFaces` being empty for every shipped pack is now a **test** rather than
a sentence.

**`familiesWithoutSource` is named for what it answers, not for what would have
been more useful.** The tempting function is "which packs need the host to serve
a face", because four descriptions say *"the host must serve Inter"* in prose and
prose is not checkable. It is not derivable: `'Helvetica Neue'` and `Fraunces`
are indistinguishable to a parser and completely different to a reader with a
Mac. The narrower question — which families does this pack ask for and not
address — *is* derivable, and it is the one an image renderer actually has, for
which `'Helvetica Neue'` is exactly as absent as `Fraunces`. The four prose
sentences stay.

**`family` and `source` are held to a narrow character class**, refusing quotes,
braces, semicolons and newlines. Both are interpolated into CSS by
`fontFaceRules`; a family carrying a quote closes the declaration and whatever
follows is read as rules. Refused at the schema rather than escaped at the
writer, because a pack is registered once and rendered many times. Six hostile
inputs are in the suite.

**Record numbered 0107, not 0103.** `main`'s next free number is 0103, and
0103–0106 are claimed on four open branches. Taking 0103 would have guaranteed
the clash that [0097](../decisions/0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)
makes fatal. The index tool reports four holes as notes and does not fail, which
is the behaviour 0097 designed; the holes close as those PRs merge.

## Records

- **0107** — *A font pack may say where a face is, and the runtime never fetches
  it.* Accepted. Extends 0085, which settled which roles a pack names and left
  what a role's value *is* untouched because there was one kind of reader.
- Nothing superseded.

## Findings

**Closed two.**

- **29 August, `Loom marketing`** — *a font pack names a family and never says
  where the face is.* Closed by this branch, taking the shape the entry proposed
  and settling the question it left open.
- **27 August, `Loom docs`** — *`WriteOutcome` has seven kinds and no list of
  them.* **Closed as already built.** `WRITE_OUTCOME_KINDS` landed on #181 on
  1 September and is exported. The 2 September framework run reported on #228
  that it "still does not exist" and put it first on this run; it had merged
  eighteen hours earlier, and that run was reading a pre-backlog-merge `main`.
  The correction is written into the entry rather than left quiet, because a
  lane that misreports its own queue costs the next session the same look.

**Appended an instance** to the 1 September entry about the brief's stale ⚠
section — fourth consecutive run to open by establishing that its highest-
priority instruction was finished on 19 August — and added a second stale line
in the same brief: the queue names *"the demo, which is yours"*, and the demo has
belonged to `Loom demo` since the 20 August split. `docs/routines.md` records
that split; `Loom demo` has shipped into `app/(demo)/` on four of the last five
days and #220 is open now. Nothing in `app/(demo)/` was touched this run, which
is the **opposite** of what `docs/routines.md` says to do when a brief and it
disagree — the brief is meant to win. Recorded as the maintainer's to settle.

**Filed nothing new.** The three things worth saying — eleven PRs open with
nothing merged since 1 September, `21st.dev` blocked, no reachable preview from
the sandbox — are each already filed with dates, and a fourth argument is worth
less than the count.

## Tests

`pnpm verify` **green, exit 0**, on `main` at `d7375ef` before any change and on
this branch after.

| | |
| --- | --- |
| new tests this unit | **26**, all in `src/theme/faces.test.ts` |
| runtime suite | **1886 passed**, 120 files, 0 failed |
| application suite | **2497 passed**, 158 files, 0 failed |
| baseline | `main` at `d7375ef`, exit 0, measured this run and not inferred |

The runtime count moves by exactly the 26 added — 1860 before, 1886 after — and
the application count does not move at all, which is the shape a change entirely
inside `src/theme/` should have.

Nothing was skipped, weakened or marked `todo`. The 26 passed on the first run of
the file.

`apps/loom/app/(docs)/_lib/api/reference.generated.json` is in the diff. It is
`Loom docs`' file and it is generated: a new export in `src/` makes the build red
until `pnpm build && pnpm --filter @loom/app docs:api` regenerates it, in that
order, because the generator reads declaration files rather than source. 875
exports across 11 entry points, up by the eleven this unit adds. No hand edit.

## Open questions

- **The seam has no consumer.** 0085's own rule is that a seam nothing reads is a
  comment, and this is the weakest part of 0107. The consumer is `(marketing)`'s
  share card; that is another lane's file and that lane recommended leaving it
  until it next opens it. If it is never taken up, this is one schema field and
  four pure functions to delete.
- **Should `familiesWithoutSource` ever become an audit?** `auditRegistry`
  already refuses a registry for structural faults. A pack whose leading family
  nobody addresses is not a fault — it is the normal, correct case for a browser
  — so it is a question a caller asks rather than a rule the registry enforces.
  Left as a function. It would become a rule only if a deployment declared it
  renders outside a browser, and nothing declares that today.
- **A face has no `unicode-range` or `display`.** Both are real `@font-face`
  descriptors and both were left out: the first matters only for subsetting,
  which a host doing subsetting is already generating its own CSS for, and the
  second is a loading-behaviour opinion that belongs to whoever mounts the rules.
  Additive if either is wanted.
