# What an adapter owes the runtime — the suite that makes a second one checkable

**Routine:** `Loom daily build` (framework, `src/` except `src/primitives/`)
**Date:** 2026-10-01
**Section:** §2, completing 0005
**Branch:** `framework-61-what-an-adapter-must-do`, off `main` at `7257ad2`
**Records added:** [0209](../decisions/0209-what-an-adapter-owes-the-runtime-is-a-suite-not-a-sentence.md). None superseded
**Findings filed:** three. Closed: none

## Why this and not an adapter

The maintainer asked, on 30 September, for out-of-the-box adapters beside
Anthropic — OpenAI, Gemini and Grok named as candidates. The architecture already
allows it:
[0005](../decisions/0005-model-access-is-an-optional-adapter.md) says *"swapping
vendors is one file. Adding a second is a second entry point."*

Reading the seam before building anything turned up three facts that change the
order of the work, and all three are filed:

1. **`ModelClient` is the only published seam with no contract suite.**
   `TreeStore`, `HoldStore`, `TelemetryJournal` and `ReaderSignal` each got one
   as soon as there were two implementations. `ModelClient` — the seam a host is
   *likeliest* to implement, since 0005 made even the Anthropic adapter opt-in —
   has had its promises held by `anthropic.test.ts` and by nothing a host can
   run.
2. **No provider credentials are present in this environment**, including
   `ANTHROPIC_API_KEY`, which the routine brief says is there. So an adapter
   written today can be unit-tested and *cannot be shown to work* against a real
   service — which is the one thing 0005 built the live smoke test for.
3. **Grok may not be a third module.** xAI's API is OpenAI-compatible, so it may
   be the OpenAI adapter with a different base URL — a config line rather than an
   entry point.

So the unblocked, order-independent piece is the suite. It is what makes the
second adapter a known quantity instead of a hand-check, and it needed no
credential and no answer to the open design question.

## What shipped

`describeModelClientContract`, published from
`@jam-overture/loom/testing/contracts`.

### A host supplies situations, not a client

The other four suites take `makeStore()` and drive it. This one cannot — nobody
can make a real service return a 402 on demand — so the unit is a **situation**,
in terms every vendor has rather than one vendor's, and the host wires each to
whatever their vendor does in it.

| situation | the only correct answer |
| --- | --- |
| `answers` | `ok`, text unchanged, serving model reported |
| `answers-without-text` | `incomplete` |
| `truncates` | `incomplete` |
| `refuses` | `refused` |
| `refuses-the-caller` (401, 402, 403) | `misconfigured` |
| `refuses-the-request` (400, 404, 413, 422) | `rejected` |
| `asks-for-later` (408, 409, 429, 5xx) | `unavailable` |
| `never-answers` (closed socket, DNS, TLS) | `unavailable` |

Statuses are grouped by the answer they require rather than listed, because the
question is never *is 402 handled* — it is *does this implementation know that
only an operator can clear a 402*.

### Decisions nothing specified

**A record keyed by every situation, not a list of the covered ones.**
`everyMemberOf` makes it compile-time: a situation added here stops every host's
call compiling until they answer it. A list would have gone quietly out of date
at the first addition, which is what `closed-set.ts` exists to prevent.

**`not-expressible` is a claim, not a skip.** A vendor may truly have no distinct
refusal signal, and an adapter inventing a `refused` for it would be worse than
one saying so. Spelled out rather than permitted by omission — the same
distinction 0122, 0181 and 0208 each turn on. `answers` is the one member that
may not be `not-expressible`, and the suite throws rather than skipping: a
client that cannot answer is not a `ModelClient`.

**Run against the adapter this package ships.**
`anthropic.contract.test.ts` overlaps `anthropic.test.ts` on purpose. A suite
handed to a host writing the second adapter is worth what it is worth against the
first, and the only way to know that is to run it there.

**It asserts nothing about `effort`**, deliberately, so it does not prejudge the
open question below.

## The suite caught eight of nine, and the ninth is the one worth reading

A contract suite that passes proves nothing. The honest test is whether it
catches a broken adapter, so nine defects were restored on `anthropic.ts` one at
a time and **only the contract suite** was run — which is what a host's third
adapter would be held to.

| defect restored in the adapter | caught by |
| --- | --- |
| lets a transport error escape as a throw | **12** |
| drops the detail an operator reads | **4** |
| believes a truncated answer is whole | **2** |
| collapses `misconfigured` into `unavailable` | **1** |
| collapses `rejected` into `unavailable` | **1** |
| treats a rate limit as the caller's fault | **1** |
| reports a refusal as merely `incomplete` | **1** |
| echoes the requested model as `servedBy` | **1** |
| **trims the reply on the way through** | **0 → 1** |

**The last row failed first, and it is the row this suite most needed.** The
seam's own line is that the reply crosses *unchanged* — parsing and deciding what
a malformed answer means live above it (0005), so an adapter that trims has moved
a decision below the line where nothing watches it. I had written a whole
`describe` block asserting exactly that, and an adapter mutated to
`text.trim().replace(/^```json/, "")` passed all twenty-five cases.

The reason is the fixture, not the assertion: `CONTRACT_REPLY` was the bare
reply, so cleaning it was a no-op and a no-op is indistinguishable from doing
nothing. It is now deliberately wrapped in a code fence with newlines around it —
which is what a real reply sometimes looks like and exactly what an adapter must
not clean up. The constant carries that reasoning, including that it was found by
breaking it.

Nine of nine after the fix. Files restored from byte-for-byte copies between
runs; `git diff` clean over `anthropic.ts` afterwards.

## Tests

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command.

| | `main` at `7257ad2` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 169 files / 3,362 | **170 / 3,387** |
| `@loom/app` | 345 / 5,993 | 345 / 5,993 — untouched |
| findings ledger | 903 entries, 0 malformed | **906, 0 malformed** |

119 prerendered pages, 1,385 text junctions, 0 run together; 3 metadata
conventions, 0 unserved.

**+25 tests** in one new file, none weakened, skipped or deleted.

**The baseline was measured, and the first version of this table was wrong.** I
wrote `339 / 5,851` for the app from yesterday's run against `f4eca0d`, which is
two merges behind: #457 landed between then and this branch. Measuring `7257ad2`
in a separate worktree gives 345 / 5,993 on both sides — the app is untouched by
this branch, and the 142 tests I would otherwise have appeared to add are
`Loom portal`'s. Quoting a stale baseline is how a report claims credit for
somebody else's work by accident.

## Findings

**Filed — three, none closed.** All three are about the adapter work the
maintainer asked for, and all three are things a run should know before planning
it rather than after.

1. **`ModelEffort` is a five-level scale borrowed from one vendor**, and every
   new adapter will have to invent a mapping. A mapping that silently rounds
   means a deployment asked for one amount of thinking and got another, at the
   one step where being wrong is expensive. Three shapes are laid out; **I
   recommend the third** — keep five levels and make the rounding *reportable*,
   because 0005 already decided that the model which served a request is
   recorded rather than assumed, and effort is the same kind of fact currently
   being assumed. The decision is the maintainer's.
2. **No provider credentials in this environment**, `ANTHROPIC_API_KEY`
   included. Checked by presence, never by value. The gating fact: `schema.ts`
   emits `const` 25 times and `anyOf` 3 times inside closed objects, and whether
   a given service accepts that is measurable and not inferable — this
   repository measures such things, which is why `GRAMMAR_BUDGET_BYTES` carries
   a date and a band rather than a guess.
3. **Grok may not be a third adapter.** Cheapest way to find out: build the
   OpenAI adapter, point it at xAI's base URL with a Grok model id, run 0209's
   contract plus one live call. One outcome is a config line; the other is an
   honest second module.

## Open questions

**Should a completion report the effort that was actually used?** Finding 1's
recommendation, stated here as the design rather than the choice. `servedBy`
exists because the model that answers may differ from the one asked for; effort
has the identical property the moment a second adapter maps a five-level scale
onto a three-level one, and nothing records it.

**Does the contract belong to `ModelClient` or to the interpreter above it?**
Everything asserted here is about the client. But the reason each assertion
matters is a decision the *interpreter* makes with the answer — `unavailable`
means it may retry, `rejected` means it may not. If those readings ever move, the
contract is where they are written down twice. Not a problem today; worth knowing
where the second copy is.

**No adapter was written.** That is the gap this run leaves on purpose, and the
two findings above say what it would take to close it honestly.

## Scope

`src/testing/model-contract.ts` (new), `src/testing/contracts.ts` (the export and
one line of its doc comment), `src/interpretation/anthropic.contract.test.ts`
(new). **No runtime code changed** — `git diff` is empty for every non-test file
under `src/` except `testing/contracts.ts`'s export list. Nothing in
`src/primitives/` was opened.

Outside this lane: `app/(docs)/_lib/api/reference.generated.json`, regenerated
with `pnpm --filter @loom/app docs:api`, the command its own failing test names.
