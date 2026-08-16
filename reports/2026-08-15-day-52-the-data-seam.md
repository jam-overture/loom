# 2026-08-15 (day 52) — a binding is a question, not an answer

**Build order section:** **§4e** — data, the seam the port hits at the first
primitive that needs any.

**Branch:** `day-52-the-data-seam` (→ `main`).

Diagram: [the three steps, the two bags, and the distinction the shape protects](2026-08-15-day-52-the-data-seam.svg).

---

## Where this run started

`main` at `7f7b615`, with #71 merged. **One pull request is open — #72, the
portal routine's**, and it carries no maintainer review comments, so there was
nothing outstanding to address first. Its own comment raised three things, two of
which are findings owned by me; both are answered below.

Two of the five documents this brief says to read first **did not exist**:
`FINDINGS.md` and `docs/routines.md`. `FINDINGS.md` is created by #72 and is
therefore visible on that branch, which is where I read it. What was there
mattered: two open findings owned by this routine, which is exactly what the file
is for and the first time it has carried anything.

The container's `main` was stale on arrival again — third run in a row — and
`git fetch origin main` fixed it.

## What was built, in plain language

**The data seam.** Until today a Loom page could only show what was written into
its tree. That is fine for a headline and useless for a services list, and the
README's port table has named the gap in one line since §4b started: Hermes
resolves `binding` fields from a profile and from integrations; Loom has "plain
JSON props, no resolution layer". Five of the seventy blocks depend on it —
`about` binds three fields to one profile, and `services`, `products`, `feed` and
`marquee` bind a list to a connected integration. Ported without an answer they
become an author typing their own services in by hand, which is not the block
anyone used.

**A node can now ask a question, and the host answers it.** A node carries
`loom:data` naming a registered source and the params to ask it with; the answer
never touches the tree. Two deployments serving one revision show the same page
asking the same questions and differ only where their data differs.

The shape is forced by one constraint worth stating, because it is the reason the
seam looks the way it does. **`renderLoomTree` is a pure synchronous function**,
which is what lets it run inside a Server Component and what makes two renders of
one revision agree. Fetching a profile is IO. So the asking cannot happen in the
walk, and it does not: `planTreeData` reads every binding out of the tree in a
pure pass and deduplicates it, `resolveDataPlan` asks every question at once, and
the walk receives finished answers and stays exactly as synchronous as it was.
`renderRequest` is where the three meet, and it was already async.

**A source is registered the way a primitive is.** `defineSource` declares an id,
a line for the catalogue, a Zod schema for what it accepts and one for what it
answers, and the adapter. The registry is the allowlist a binding can reach.
Params are checked before the adapter is called and the answer after — the
adapter's types are a claim about a database, and the schema is what makes the
claim true on the day the column changed. `dataCatalogue` projects it the way
`catalogueOf` projects primitives.

### The part I would point at

**An answer is `ready` or `unavailable` with a reason — never merely absent.**
There is deliberately no way to say "empty" as a failure and no way to say
"unavailable" as a missing key, so a primitive cannot write
`loom.data.services ?? []` and cannot compile the mistake.

That mistake is not hypothetical and it is not mine to have noticed: the portal
routine spent its whole 15 August run undoing it, in six places, and wrote the
sentence that decided this shape — a reader who takes "we could not reach your
services" for "you have no services" concludes their data is gone. It cost them a
run; it cost me a type. The finding channel worked, on the first day it existed,
without anyone having to ask.

## Was this an escalation?

The brief says to expect one at §4e. **I judged it is not, and that judgement is
the thing to overrule if any of this is wrong.**

The test the brief sets is: does it touch the tree schema or the delta model in a
way that requires migrating built code, or contradict an `Accepted` record.

- **No schema change.** `loom:data` is the second key in the reserved namespace
  0050 opened, and 0050 predicted this exact cost in its consequences — "a key
  and a diagnostic rather than another record". A node kind was the obvious
  alternative and it is argued and rejected in 0058.
- **Nothing migrates.** Every tree written before today has no `loom:data`,
  renders identically, and the 1121 tests that existed this morning all still
  pass untouched.
- **No `Accepted` record is contradicted** — but one is *weakened*, and that is
  the real content of this decision.

**A page is no longer a function of the tree alone.** 0050's consequences claim
that property in those words, and a tree that asks a question does not have it.
What survives is weaker and still load-bearing: *the tree alone determines what
is asked*. Which questions, of which sources, with which params, is fixed by the
revision; only the answers vary, at named points somebody proposed and the Gate
weighed.

I recorded 0058 as **Accepted** rather than `Proposed` because it clears the
brief's stated test and because a `Proposed` record with the code shipped under it
would be a status the repo cannot honestly hold. The reversal cost is deliberately
low: **no primitive binds anything yet**, so nothing depends on the seam but its
own tests. If you would rather the property in 0050 were kept whole, say so and
0058 gets superseded before anything is built on it — which is a smaller
conversation this week than in a month.

## Decisions not explicitly specified, and why

- **Data reaches the primitive beside its props, not merged into them.** Merging
  is friendlier — one bag, one schema — and it makes the tree a cache of
  somebody's database: a `configure` against a node last filled by a database
  write is a proposal against content nobody authored, and its inverse restores
  data rather than a decision.
- **Identical questions are asked once**, with param key order canonicalised so
  that params a model happened to write in a different order are still one
  question. Hermes' `about` bound three fields to one profile; three round trips
  for one row is a cost paid on every request forever.
- **Every failure is total and named.** Six reasons — unregistered source,
  refused params, an answer failing its own schema, an adapter that threw, and
  the adapter's own timeout and refusal — each producing a diagnostic and a node
  that still renders. The single `try` in the runtime's own code is the one around
  a host adapter, because an adapter is not Loom's code and one integration's bad
  afternoon must not be why a page 500s.
- **`src/data/` imports nothing from `render/`.** The dependency runs one way, so
  a host can plan and resolve a tree's data without loading the renderer — which
  is what a cache warmer or a static export wants.
- **No caching inside the seam**, though every host will want it. It belongs
  behind the adapter where a host can key and invalidate it deliberately, for the
  same reason `TreeSource` holds the tree cache.
- **No starter primitive binds anything.** Shipping one would put a primitive in
  the library that renders empty in every deployment that has not wired an
  adapter. The seam is proved by tests and by fixture sources instead.

## Records added or superseded

- **Added [0058](../decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)** —
  *A binding is a question the tree asks, answered before the walk.* Seven
  alternatives rejected, including an async render walk (gives up the property
  that makes the renderer what it is), a binding as a new node kind (migrates
  every built tree for something that is a property of a node), and reporting
  unavailability as an absent key (the nicest to write, and it makes the portal's
  mistake unavoidable rather than merely possible).
- **Nothing superseded.** 0050 is weakened rather than contradicted, and 0058
  says so in its own consequences rather than quietly.

Index regenerated with `pnpm decisions:index`.

**One structural change inside the framework.** `partitionReservedProps` and the
`loom:` prefix moved from `render/theme.ts` to a top-level `reserved-props.ts`,
because the namespace acquired a second reader that is not part of rendering.
`render/theme.ts` re-exports them, so `@loom/runtime/react` is unchanged and no
consumer was touched.

**`README.md` updated** — §4e now exists as a section, and `src/data/` and
`reserved-props.ts` are in the layout.

**One duplication removed rather than added.** `defineSource` needed the same Zod
introspection `definePrimitive` uses to enumerate declared fields for the
catalogue. Rather than copy twenty-five lines, the helper moved to `catalogue.ts`
as `catalogueFields` — which is where a projection into `CataloguedProp` belonged
once there were two callers — and `definePrimitive` now uses it.

## Findings closed and filed

Both open findings owned by this routine were left by the portal routine on #72.

- **The missing documents — partly closed.** `docs/routines.md` **now exists**.
  The portal routine was right that a routine cannot write the governance it is
  bound by; what it can do is copy governance that already exists, in four briefs,
  into the one place all four point at. It is a transcription — the framework
  brief in full, plus the portal brief as that routine reported it — and it says
  so at the top, along with the rule that a brief wins wherever the two disagree.
  **`docs/rollout.md` is still missing and stays open**: no brief quotes it, so no
  routine has seen it, and I will not invent a phased plan.
- **The stale premise — confirmed, still open.** #71 merged as `c603c8e` on
  12 August and `/demo` is live. The finding is accurate. A routine cannot edit
  its own brief, so this one needs you.
- **Filed for the portal routine:** the seam exists and `apps/` does not use it —
  a bound node in the demo would be the first thing in the runtime a visitor can
  watch *fail well*, and `data-unavailable` diagnostics are available to the
  review surfaces. Neither is urgent; recorded so it is not rediscovered from a
  diff.
- **Filed and closed for myself:** no framework gaps, recorded because absence is
  worth knowing.

## Tests

`pnpm install && pnpm verify` — **green**.

| | Files | Tests |
| --- | --- | --- |
| Runtime | 87 | **1175 passed**, 0 failed |
| Portal | 40 | **429 passed**, 0 failed |

**Nothing failed and nothing was skipped.** The 1121 runtime tests that existed
this morning pass unchanged, which is the evidence for the "nothing migrates"
claim above.

**54 new tests** in five files:

- `data/adapter.test.ts` (15) — a source that answers; params refused *without
  the adapter being called*; the adapter's two refusals kept apart; a thrown
  error and a rejected promise both caught; an answer that fails its own schema;
  host context passed through untouched; a registry refusing a bad id and a
  duplicate; **no adapter called during registration**, so an import cannot run
  someone's query; and the catalogue saying "I cannot enumerate these" rather
  than "there are none".
- `data/resolve.test.ts` (11) — an answer filed under the node that asked; one
  ask for a question two nodes share; **three independent sources in flight at
  once**, asserted by peak concurrency rather than by timing; an unregistered
  source naming what *is* registered; one source down costing one region and not
  the page; a tree that binds nothing asking nothing at all; and three on
  `buildDataResolution` directly, including a binding named `constructor`
  answering correctly rather than with a function off `Object.prototype`.
- `data/plan.test.ts` (9) — deduplication; params in a different key order being
  the same question and different params being different ones; **array order
  staying significant**, because there it means something; a malformed
  declaration recorded against its node while the rest of the tree still plans;
  and the plan being a pure function of the tree.
- `data/binding.test.ts` (8) — the parse, including that the whole map is refused
  when one entry is bad and the error names the entry.
- `render/data.test.ts` (11) — the seam through React: data reaching the
  primitive that asked; **`ready` with an empty list and `unavailable` rendering
  differently**, which is the distinction the whole shape exists to protect; a
  node still rendering when its data could not be answered; an empty bag for a
  node that binds nothing; the `data-unresolved`, `data-misdeclared` and
  `data-unavailable` diagnostics; the binding declaration **never reaching the
  primitive's own props**; and `renderRequest` resolving between the load and the
  render with the request's context reaching the adapters.

No test needed a key, and nothing here touches the network.

## Open questions

1. **Was this an escalation?** Argued above. **Recommendation: accept 0058 as
   written.** It clears the brief's own test, nothing migrates, and the property
   it weakens is weakened by any design of data binding rather than by this one.
   If you disagree, now is much the cheapest moment — no primitive binds anything.
2. **A revision no longer pins what a reviewer saw.** Approving a change to a
   bound node approves the question, not the answer that was on screen. §6 records
   diagnostics but not which answers a render used. **Recommendation: leave it
   until something is actually bound**, then decide whether a review needs the
   answers recorded beside the proposal. Named in 0058's consequences so it is not
   lost.
3. **The authoring half is not built.** A primitive cannot yet declare which
   binding names it reads, so the catalogue cannot tell a model that
   `loom.services` wants a `services` binding — which means a bound tree is
   hand-authored today and no AI can propose one. **Recommendation: that is the
   next unit**, and it changes `definePrimitive` rather than anything 0058
   decided. It is the smaller half.
4. **`docs/rollout.md`.** Named as read-first by at least one brief, never seen by
   any routine. **Recommendation: either add it or drop it from the briefs** — as
   it stands, every routine every run reports the same absence.
5. **The portal briefs still say the demo does not exist.** Only you can fix a
   brief. **Recommendation: update them**, since the blocked work they describe is
   open and the portal routine has already said it will not re-plan off a premise
   its own brief flags as provisional.
6. **`FINDINGS.md` is added by both #72 and this branch**, so whichever merges
   second will conflict on it. Mine is #72's file **verbatim** plus my entries, so
   the resolution is "take this branch's version". Flagged rather than left to
   surprise you.

## What is next

**The authoring half of §4e** — a primitive declaring the bindings it reads, so
the catalogue can offer sources to a model and a proposal can create a bound node.
Then **§4f, the rest of the seventy**, where `about` and `services` are now
portable rather than blocked.
